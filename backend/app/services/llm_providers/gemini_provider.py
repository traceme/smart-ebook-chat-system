"""
Google Gemini Provider Implementation

Implements the BaseLLMProvider interface for Google's Gemini models
including Gemini-2.0-Flash, Gemini-1.5-Pro, and Gemini-1.5-Flash.
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, AsyncIterator, Union

import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from google.ai.generativelanguage_v1beta.types import GenerateContentResponse

from .base_provider import (
    BaseLLMProvider,
    LLMProviderError,
    LLMResponse,
    LLMStreamChunk,
    LLMStreamResponse,
    TokenUsage,
    RateLimitError,
    AuthenticationError,
    QuotaExceededError,
    ModelNotFoundError,
    InvalidRequestError,
    ProviderUnavailableError
)

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini provider implementation.
    
    Features:
    - Support for Gemini-2.0-Flash, Gemini-1.5-Pro, Gemini-1.5-Flash
    - Streaming and non-streaming completions
    - Token counting and cost estimation
    - Message format conversion from OpenAI style
    - Safety settings and generation config
    """
    
    # Current model pricing (per 1K tokens) as of 2024
    MODEL_PRICING = {
        # Gemini 2.0 models
        "gemini-2.0-flash-exp": {"input": 0.0000, "output": 0.0000},  # Free during experimental
        
        # Gemini 1.5 models
        "gemini-1.5-pro": {"input": 0.0035, "output": 0.0105},
        "gemini-1.5-pro-001": {"input": 0.0035, "output": 0.0105},
        "gemini-1.5-pro-002": {"input": 0.0035, "output": 0.0105},
        "gemini-1.5-flash": {"input": 0.0001875, "output": 0.00075},
        "gemini-1.5-flash-001": {"input": 0.0001875, "output": 0.00075},
        "gemini-1.5-flash-002": {"input": 0.0001875, "output": 0.00075},
        "gemini-1.5-flash-8b": {"input": 0.0001875, "output": 0.00075},
        
        # Legacy models
        "gemini-pro": {"input": 0.0005, "output": 0.0015},
        "gemini-pro-vision": {"input": 0.0025, "output": 0.01},
    }
    
    # Model context windows
    MODEL_CONTEXT_WINDOWS = {
        # Gemini 2.0 models
        "gemini-2.0-flash-exp": 1000000,
        
        # Gemini 1.5 models
        "gemini-1.5-pro": 2000000,
        "gemini-1.5-pro-001": 2000000,
        "gemini-1.5-pro-002": 2000000,
        "gemini-1.5-flash": 1000000,
        "gemini-1.5-flash-001": 1000000,
        "gemini-1.5-flash-002": 1000000,
        "gemini-1.5-flash-8b": 1000000,
        
        # Legacy models
        "gemini-pro": 32768,
        "gemini-pro-vision": 16384,
    }
    
    # Maximum output tokens by model
    MODEL_MAX_OUTPUT = {
        # Gemini 2.0 models
        "gemini-2.0-flash-exp": 8192,
        
        # Gemini 1.5 models
        "gemini-1.5-pro": 8192,
        "gemini-1.5-pro-001": 8192,
        "gemini-1.5-pro-002": 8192,
        "gemini-1.5-flash": 8192,
        "gemini-1.5-flash-001": 8192,
        "gemini-1.5-flash-002": 8192,
        "gemini-1.5-flash-8b": 8192,
        
        # Legacy models
        "gemini-pro": 4096,
        "gemini-pro-vision": 4096,
    }
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        default_model: str = "gemini-2.0-flash-exp",
        timeout: int = 30,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Initialize Gemini provider.
        
        Args:
            api_key: Google AI API key
            base_url: Optional custom base URL (not used for Gemini)
            default_model: Default model to use
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
            **kwargs: Additional options
        """
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            default_model=default_model,
            timeout=timeout,
            max_retries=max_retries,
            **kwargs
        )
    
    @property
    def provider_name(self) -> str:
        return "gemini"
    
    @property
    def supported_models(self) -> List[str]:
        return list(self.MODEL_PRICING.keys())
    
    @property
    def default_models(self) -> Dict[str, str]:
        return {
            "best": "gemini-1.5-pro",
            "fast": "gemini-2.0-flash-exp",
            "cheap": "gemini-1.5-flash",
            "balanced": "gemini-2.0-flash-exp",
        }
    
    def _setup_client(self):
        """Set up the Google Generative AI client."""
        try:
            genai.configure(api_key=self.api_key)
            self._client = genai  # Use the configured module
        except Exception as e:
            raise LLMProviderError(f"Failed to initialize Gemini client: {e}")
    
    def _convert_messages_to_gemini_format(
        self, 
        messages: List[Dict[str, str]]
    ) -> tuple[Optional[str], List[Dict[str, str]]]:
        """
        Convert OpenAI-style messages to Gemini format.
        
        Gemini uses 'user' and 'model' roles instead of 'user' and 'assistant'.
        System messages are handled separately.
        
        Args:
            messages: OpenAI-style messages
            
        Returns:
            Tuple of (system_instruction, conversation_history)
        """
        system_instruction = None
        conversation_history = []
        
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role == "system":
                # Combine multiple system messages if present
                if system_instruction:
                    system_instruction += f"\n\n{content}"
                else:
                    system_instruction = content
            elif role == "user":
                conversation_history.append({
                    "role": "user",
                    "parts": [content]
                })
            elif role == "assistant":
                conversation_history.append({
                    "role": "model",
                    "parts": [content]
                })
            else:
                # Handle other roles by converting to user messages
                conversation_history.append({
                    "role": "user",
                    "parts": [f"[{role}]: {content}"]
                })
        
        return system_instruction, conversation_history
    
    async def complete(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[LLMResponse, AsyncIterator[LLMStreamChunk]]:
        """
        Generate completion using Gemini API.
        
        Args:
            messages: List of message dictionaries
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            **kwargs: Additional parameters
            
        Returns:
            LLMResponse or AsyncIterator[LLMStreamChunk]
        """
        model = model or self.default_model or "gemini-2.0-flash-exp"
        
        if not self.supports_model(model):
            raise ModelNotFoundError(f"Model {model} not supported by Gemini provider")
        
        # Convert messages to Gemini format
        system_instruction, conversation_history = self._convert_messages_to_gemini_format(messages)
        
        if not conversation_history:
            raise InvalidRequestError("No valid conversation messages provided")
        
        # Prepare generation config
        generation_config = GenerationConfig(
            temperature=temperature,
            max_output_tokens=min(max_tokens or 4096, self._get_max_output_tokens(model)),
            **kwargs
        )
        
        try:
            if stream:
                return self._stream_completion(
                    model, conversation_history, generation_config, system_instruction
                )
            else:
                return await self._non_stream_completion(
                    model, conversation_history, generation_config, system_instruction
                )
                
        except Exception as e:
            raise self._handle_error(e, {"model": model})
    
    async def _non_stream_completion(
        self, 
        model: str, 
        conversation_history: List[Dict[str, Any]], 
        generation_config: GenerationConfig,
        system_instruction: Optional[str] = None
    ) -> LLMResponse:
        """Handle non-streaming completion."""
        start_time = time.time()
        
        try:
            # Create the model instance
            genai_model = self._client.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction
            )
            
            # Generate content
            response = await asyncio.to_thread(
                genai_model.generate_content,
                conversation_history,
                generation_config=generation_config
            )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract response data
            content = ""
            if response.text:
                content = response.text
            
            # Extract usage information
            usage = TokenUsage(
                input_tokens=response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                output_tokens=response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                total_tokens=response.usage_metadata.total_token_count if response.usage_metadata else 0
            )
            
            # Determine finish reason
            finish_reason = "stop"
            if response.candidates and response.candidates[0].finish_reason:
                reason = response.candidates[0].finish_reason.name.lower()
                if reason in ["stop", "max_tokens", "safety", "recitation", "other"]:
                    finish_reason = reason
            
            # Calculate cost
            cost = self._calculate_cost(model, usage)
            
            return LLMResponse(
                content=content,
                model=model,
                provider=self.provider_name,
                finish_reason=finish_reason,
                usage=usage,
                cost=cost,
                response_time_ms=response_time_ms,
                raw_response=self._response_to_dict(response)
            )
            
        except Exception as e:
            raise self._handle_error(e, {"model": model})
    
    async def _stream_completion(
        self, 
        model: str, 
        conversation_history: List[Dict[str, Any]], 
        generation_config: GenerationConfig,
        system_instruction: Optional[str] = None
    ) -> AsyncIterator[LLMStreamChunk]:
        """Handle streaming completion."""
        try:
            # Create the model instance
            genai_model = self._client.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction
            )
            
            # Generate streaming content
            response_stream = await asyncio.to_thread(
                genai_model.generate_content,
                conversation_history,
                generation_config=generation_config,
                stream=True
            )
            
            for chunk in response_stream:
                content = ""
                finish_reason = None
                usage = None
                
                # Extract content from chunk
                if chunk.text:
                    content = chunk.text
                
                # Check for finish reason
                if chunk.candidates and chunk.candidates[0].finish_reason:
                    reason = chunk.candidates[0].finish_reason.name.lower()
                    if reason in ["stop", "max_tokens", "safety", "recitation", "other"]:
                        finish_reason = reason
                
                # Extract usage if available (usually in last chunk)
                if chunk.usage_metadata and chunk.usage_metadata.total_token_count:
                    usage = TokenUsage(
                        input_tokens=chunk.usage_metadata.prompt_token_count,
                        output_tokens=chunk.usage_metadata.candidates_token_count,
                        total_tokens=chunk.usage_metadata.total_token_count
                    )
                
                yield LLMStreamChunk(
                    content=content,
                    finish_reason=finish_reason,
                    usage=usage,
                    model=model
                )
                
        except Exception as e:
            raise self._handle_error(e, {"model": model})
    
    async def validate_api_key(self) -> Dict[str, Any]:
        """Validate Gemini API key."""
        try:
            # Try to list models as a validation check
            models = await asyncio.to_thread(self._client.list_models)
            
            available_models = [
                model.name.split('/')[-1] for model in models 
                if 'gemini' in model.name
            ]
            
            return {
                "valid": True,
                "provider": self.provider_name,
                "available_models": available_models[:10],  # Limit for response size
                "total_models": len(available_models)
            }
            
        except Exception as e:
            return {
                "valid": False,
                "provider": self.provider_name,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    def estimate_cost(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> float:
        """Estimate cost for completion request."""
        model = model or self.default_model or "gemini-2.0-flash-exp"
        
        if model not in self.MODEL_PRICING:
            logger.warning(f"No pricing info for model {model}, using Gemini-1.5-Pro pricing")
            model = "gemini-1.5-pro"
        
        # Count input tokens
        input_tokens = self.count_tokens(messages, model)
        
        # Estimate output tokens
        if max_tokens:
            output_tokens = max_tokens
        else:
            # Estimate based on input length (heuristic)
            output_tokens = min(int(input_tokens * 0.3), 1000)
        
        return self._calculate_cost(model, TokenUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens
        ))
    
    def count_tokens(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> int:
        """
        Count tokens for Gemini messages.
        
        Uses a rough approximation since Gemini's tokenizer isn't publicly available.
        """
        try:
            # Convert to Gemini format first
            system_instruction, conversation_history = self._convert_messages_to_gemini_format(messages)
            
            total_chars = 0
            
            # Count system instruction tokens
            if system_instruction:
                total_chars += len(system_instruction)
            
            # Count conversation message tokens
            for message in conversation_history:
                parts = message.get("parts", [])
                for part in parts:
                    if isinstance(part, str):
                        total_chars += len(part)
                
                # Add role overhead (approximately 2-3 tokens per message)
                total_chars += 10  # Formatting overhead
            
            # Approximate: 3.5 characters per token for Gemini (similar to other models)
            estimated_tokens = int(total_chars / 3.5)
            
            # Add some overhead for Gemini's message formatting
            return estimated_tokens + len(conversation_history) * 2
            
        except Exception as e:
            logger.warning(f"Token counting failed for Gemini model {model}: {e}")
            # Fallback: very rough estimate
            total_content = " ".join(msg.get("content", "") for msg in messages)
            return len(total_content) // 4
    
    def _calculate_cost(self, model: str, usage: TokenUsage) -> float:
        """Calculate cost based on token usage."""
        if model not in self.MODEL_PRICING:
            logger.warning(f"No pricing info for model {model}")
            return 0.0
        
        pricing = self.MODEL_PRICING[model]
        
        input_cost = (usage.input_tokens / 1000) * pricing["input"]
        output_cost = (usage.output_tokens / 1000) * pricing["output"]
        
        return round(input_cost + output_cost, 6)
    
    def _get_context_window(self, model: str) -> int:
        """Get context window size for model."""
        return self.MODEL_CONTEXT_WINDOWS.get(model, 32768)
    
    def _get_max_output_tokens(self, model: str) -> int:
        """Get maximum output tokens for model."""
        return self.MODEL_MAX_OUTPUT.get(model, 4096)
    
    def _get_input_cost(self, model: str) -> float:
        """Get input cost per 1K tokens."""
        return self.MODEL_PRICING.get(model, {}).get("input", 0.0)
    
    def _get_output_cost(self, model: str) -> float:
        """Get output cost per 1K tokens."""
        return self.MODEL_PRICING.get(model, {}).get("output", 0.0)
    
    def _response_to_dict(self, response) -> Dict[str, Any]:
        """Convert Gemini response to dictionary for serialization."""
        try:
            return {
                "text": response.text,
                "finish_reason": response.candidates[0].finish_reason.name if response.candidates else None,
                "usage": {
                    "prompt_tokens": response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                    "completion_tokens": response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                    "total_tokens": response.usage_metadata.total_token_count if response.usage_metadata else 0,
                }
            }
        except Exception:
            return {"error": "Could not serialize response"}
    
    def _handle_error(self, error: Exception, context: Dict[str, Any] = None) -> LLMProviderError:
        """Handle Gemini-specific errors."""
        context = context or {}
        error_message = str(error).lower()
        
        # Check for authentication errors
        if "api key" in error_message or "unauthorized" in error_message or "permission" in error_message:
            return AuthenticationError(
                message="Invalid Gemini API key",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="authentication_error"
            )
        
        # Check for rate limit errors
        elif "rate limit" in error_message or "quota" in error_message:
            return RateLimitError(
                message="Gemini rate limit exceeded",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="rate_limit_exceeded"
            )
        
        # Check for model not found errors
        elif "model" in error_message and ("not found" in error_message or "unknown" in error_message):
            return ModelNotFoundError(
                message=f"Gemini model not found: {context.get('model', 'unknown')}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="model_not_found"
            )
        
        # Check for invalid request errors
        elif "invalid" in error_message or "bad request" in error_message:
            return InvalidRequestError(
                message=f"Invalid request to Gemini: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="invalid_request"
            )
        
        # Check for service unavailable errors
        elif "unavailable" in error_message or "timeout" in error_message or "server error" in error_message:
            return ProviderUnavailableError(
                message="Gemini service temporarily unavailable",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="service_unavailable"
            )
        
        else:
            return LLMProviderError(
                message=f"Gemini API error: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="unknown_error"
            ) 