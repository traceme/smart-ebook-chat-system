"""
OpenAI Provider Implementation

Implements the BaseLLMProvider interface for OpenAI's GPT models
including GPT-4o, GPT-4, and GPT-3.5-turbo with streaming support.
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, AsyncIterator, Union

import openai
from openai import AsyncOpenAI
import tiktoken

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


class OpenAIProvider(BaseLLMProvider):
    """
    OpenAI provider implementation supporting GPT-4o, GPT-4, and GPT-3.5-turbo.
    
    Features:
    - Support for all current OpenAI models
    - Streaming and non-streaming completions
    - Accurate token counting with tiktoken
    - Cost estimation based on current pricing
    - Proper error handling and retries
    """
    
    # Current model pricing (per 1K tokens) as of 2024
    MODEL_PRICING = {
        # GPT-4o models
        "gpt-4o": {"input": 0.0050, "output": 0.0150},
        "gpt-4o-2024-05-13": {"input": 0.0050, "output": 0.0150},
        "gpt-4o-2024-08-06": {"input": 0.0025, "output": 0.0100},
        "gpt-4o-mini": {"input": 0.0001500, "output": 0.0006},
        "gpt-4o-mini-2024-07-18": {"input": 0.0001500, "output": 0.0006},
        
        # GPT-4 models
        "gpt-4": {"input": 0.0300, "output": 0.0600},
        "gpt-4-0613": {"input": 0.0300, "output": 0.0600},
        "gpt-4-turbo": {"input": 0.0100, "output": 0.0300},
        "gpt-4-turbo-2024-04-09": {"input": 0.0100, "output": 0.0300},
        "gpt-4-1106-preview": {"input": 0.0100, "output": 0.0300},
        "gpt-4-0125-preview": {"input": 0.0100, "output": 0.0300},
        "gpt-4-turbo-preview": {"input": 0.0100, "output": 0.0300},
        
        # GPT-3.5 models
        "gpt-3.5-turbo": {"input": 0.0015, "output": 0.0020},
        "gpt-3.5-turbo-0125": {"input": 0.0015, "output": 0.0020},
        "gpt-3.5-turbo-1106": {"input": 0.0010, "output": 0.0020},
        "gpt-3.5-turbo-instruct": {"input": 0.0015, "output": 0.0020},
    }
    
    # Model context windows
    MODEL_CONTEXT_WINDOWS = {
        # GPT-4o models
        "gpt-4o": 128000,
        "gpt-4o-2024-05-13": 128000,
        "gpt-4o-2024-08-06": 128000,
        "gpt-4o-mini": 128000,
        "gpt-4o-mini-2024-07-18": 128000,
        
        # GPT-4 models
        "gpt-4": 8192,
        "gpt-4-0613": 8192,
        "gpt-4-turbo": 128000,
        "gpt-4-turbo-2024-04-09": 128000,
        "gpt-4-1106-preview": 128000,
        "gpt-4-0125-preview": 128000,
        "gpt-4-turbo-preview": 128000,
        
        # GPT-3.5 models
        "gpt-3.5-turbo": 16385,
        "gpt-3.5-turbo-0125": 16385,
        "gpt-3.5-turbo-1106": 16385,
        "gpt-3.5-turbo-instruct": 4096,
    }
    
    # Maximum output tokens by model
    MODEL_MAX_OUTPUT = {
        # GPT-4o models
        "gpt-4o": 4096,
        "gpt-4o-2024-05-13": 4096,
        "gpt-4o-2024-08-06": 16384,
        "gpt-4o-mini": 16384,
        "gpt-4o-mini-2024-07-18": 16384,
        
        # GPT-4 models
        "gpt-4": 4096,
        "gpt-4-0613": 4096,
        "gpt-4-turbo": 4096,
        "gpt-4-turbo-2024-04-09": 4096,
        "gpt-4-1106-preview": 4096,
        "gpt-4-0125-preview": 4096,
        "gpt-4-turbo-preview": 4096,
        
        # GPT-3.5 models
        "gpt-3.5-turbo": 4096,
        "gpt-3.5-turbo-0125": 4096,
        "gpt-3.5-turbo-1106": 4096,
        "gpt-3.5-turbo-instruct": 4096,
    }
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        organization: Optional[str] = None,
        default_model: str = "gpt-4o",
        timeout: int = 30,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Initialize OpenAI provider.
        
        Args:
            api_key: OpenAI API key
            base_url: Optional custom base URL
            organization: Optional organization ID
            default_model: Default model to use
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
            **kwargs: Additional options
        """
        self.organization = organization
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
        return "openai"
    
    @property
    def supported_models(self) -> List[str]:
        return list(self.MODEL_PRICING.keys())
    
    @property
    def default_models(self) -> Dict[str, str]:
        return {
            "best": "gpt-4o",
            "fast": "gpt-4o-mini", 
            "cheap": "gpt-3.5-turbo",
            "balanced": "gpt-4o-mini",
        }
    
    def _setup_client(self):
        """Set up the OpenAI async client."""
        try:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                organization=self.organization,
                timeout=self.timeout,
                max_retries=self.max_retries
            )
        except Exception as e:
            raise LLMProviderError(f"Failed to initialize OpenAI client: {e}")
    
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
        Generate completion using OpenAI API.
        
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
        model = model or self.default_model or "gpt-4o"
        
        if not self.supports_model(model):
            raise ModelNotFoundError(f"Model {model} not supported by OpenAI provider")
        
        # Prepare request parameters
        params = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream,
            **kwargs
        }
        
        if max_tokens:
            params["max_tokens"] = min(max_tokens, self._get_max_output_tokens(model))
        
        try:
            if stream:
                return self._stream_completion(params)
            else:
                return await self._non_stream_completion(params)
                
        except Exception as e:
            raise self._handle_error(e, {"model": model})
    
    async def _non_stream_completion(self, params: Dict[str, Any]) -> LLMResponse:
        """Handle non-streaming completion."""
        start_time = time.time()
        
        try:
            response = await self._client.chat.completions.create(**params)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract response data
            choice = response.choices[0]
            content = choice.message.content or ""
            finish_reason = choice.finish_reason or "stop"
            
            # Extract usage information
            usage = TokenUsage(
                input_tokens=response.usage.prompt_tokens if response.usage else 0,
                output_tokens=response.usage.completion_tokens if response.usage else 0,
                total_tokens=response.usage.total_tokens if response.usage else 0
            )
            
            # Calculate cost
            cost = self._calculate_cost(params["model"], usage)
            
            return LLMResponse(
                content=content,
                model=response.model,
                provider=self.provider_name,
                finish_reason=finish_reason,
                usage=usage,
                cost=cost,
                response_time_ms=response_time_ms,
                request_id=getattr(response, 'id', None),
                raw_response=response.model_dump() if hasattr(response, 'model_dump') else None
            )
            
        except Exception as e:
            raise self._handle_error(e, {"model": params["model"]})
    
    async def _stream_completion(self, params: Dict[str, Any]) -> AsyncIterator[LLMStreamChunk]:
        """Handle streaming completion."""
        try:
            stream = await self._client.chat.completions.create(**params)
            
            async for chunk in stream:
                if not chunk.choices:
                    continue
                    
                choice = chunk.choices[0]
                delta = choice.delta
                
                content = delta.content or ""
                finish_reason = choice.finish_reason
                
                # Extract usage if available (usually in the last chunk)
                usage = None
                if hasattr(chunk, 'usage') and chunk.usage:
                    usage = TokenUsage(
                        input_tokens=chunk.usage.prompt_tokens,
                        output_tokens=chunk.usage.completion_tokens,
                        total_tokens=chunk.usage.total_tokens
                    )
                
                yield LLMStreamChunk(
                    content=content,
                    finish_reason=finish_reason,
                    usage=usage,
                    model=chunk.model
                )
                
        except Exception as e:
            raise self._handle_error(e, {"model": params["model"]})
    
    async def validate_api_key(self) -> Dict[str, Any]:
        """Validate OpenAI API key."""
        try:
            # Try to list models as a validation check
            models = await self._client.models.list()
            
            available_models = [
                model.id for model in models.data 
                if any(supported in model.id for supported in ["gpt-3.5", "gpt-4"])
            ]
            
            return {
                "valid": True,
                "provider": self.provider_name,
                "available_models": available_models[:10],  # Limit for response size
                "organization": self.organization,
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
        model = model or self.default_model or "gpt-4o"
        
        if model not in self.MODEL_PRICING:
            logger.warning(f"No pricing info for model {model}, using GPT-4o pricing")
            model = "gpt-4o"
        
        # Count input tokens
        input_tokens = self.count_tokens(messages, model)
        
        # Estimate output tokens (use max_tokens or 50% of context window)
        if max_tokens:
            output_tokens = max_tokens
        else:
            # Estimate based on input length (heuristic: output is usually 20-50% of input)
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
        """Count tokens using tiktoken."""
        model = model or self.default_model or "gpt-4o"
        
        try:
            # Get the encoding for the model
            if model.startswith("gpt-4o"):
                encoding = tiktoken.encoding_for_model("gpt-4o")
            elif model.startswith("gpt-4"):
                encoding = tiktoken.encoding_for_model("gpt-4")
            elif model.startswith("gpt-3.5"):
                encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
            else:
                # Fallback to cl100k_base encoding
                encoding = tiktoken.get_encoding("cl100k_base")
            
            # Count tokens for each message
            total_tokens = 0
            
            for message in messages:
                # Each message follows <|start|>{role/name}\n{content}<|end|>\n
                total_tokens += 4  # Message formatting tokens
                
                for key, value in message.items():
                    if isinstance(value, str):
                        total_tokens += len(encoding.encode(value))
                    
                    if key == "name":  # If there's a name, the role is omitted
                        total_tokens -= 1  # Role is omitted
            
            total_tokens += 3  # Every reply is primed with <|start|>assistant<|message|>
            
            return total_tokens
            
        except Exception as e:
            logger.warning(f"Token counting failed for model {model}: {e}")
            # Fallback: estimate 4 characters per token
            total_chars = sum(len(str(msg.get('content', ''))) for msg in messages)
            return total_chars // 4
    
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
        return self.MODEL_CONTEXT_WINDOWS.get(model, 8192)
    
    def _get_max_output_tokens(self, model: str) -> int:
        """Get maximum output tokens for model."""
        return self.MODEL_MAX_OUTPUT.get(model, 4096)
    
    def _get_input_cost(self, model: str) -> float:
        """Get input cost per 1K tokens."""
        return self.MODEL_PRICING.get(model, {}).get("input", 0.0)
    
    def _get_output_cost(self, model: str) -> float:
        """Get output cost per 1K tokens."""
        return self.MODEL_PRICING.get(model, {}).get("output", 0.0)
    
    def _handle_error(self, error: Exception, context: Dict[str, Any] = None) -> LLMProviderError:
        """Handle OpenAI-specific errors."""
        context = context or {}
        
        if isinstance(error, openai.AuthenticationError):
            return AuthenticationError(
                message="Invalid OpenAI API key",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="authentication_error"
            )
        
        elif isinstance(error, openai.RateLimitError):
            retry_after = getattr(error, 'retry_after', None)
            return RateLimitError(
                message="OpenAI rate limit exceeded",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="rate_limit_exceeded",
                retry_after=retry_after
            )
        
        elif isinstance(error, openai.PermissionDeniedError):
            return QuotaExceededError(
                message="OpenAI quota exceeded or permission denied",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="quota_exceeded"
            )
        
        elif isinstance(error, openai.NotFoundError):
            return ModelNotFoundError(
                message=f"OpenAI model not found: {context.get('model', 'unknown')}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="model_not_found"
            )
        
        elif isinstance(error, openai.BadRequestError):
            return InvalidRequestError(
                message=f"Invalid request to OpenAI: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="invalid_request"
            )
        
        elif isinstance(error, (openai.InternalServerError, openai.APITimeoutError)):
            return ProviderUnavailableError(
                message="OpenAI service temporarily unavailable",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="service_unavailable"
            )
        
        else:
            return LLMProviderError(
                message=f"OpenAI API error: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code=getattr(error, 'code', 'unknown_error')
            ) 