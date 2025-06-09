"""
Claude Provider Implementation

Implements the BaseLLMProvider interface for Anthropic's Claude models
including Claude-3.5-Sonnet, Claude-3-Opus, and Claude-3-Haiku.
"""

import asyncio
import time
import logging
from typing import Dict, List, Optional, Any, AsyncIterator, Union

import anthropic
from anthropic import AsyncAnthropic

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


class ClaudeProvider(BaseLLMProvider):
    """
    Anthropic Claude provider implementation.
    
    Features:
    - Support for Claude-3.5-Sonnet, Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku
    - Streaming and non-streaming completions
    - Token counting and cost estimation
    - Proper message format conversion
    - System message handling
    """
    
    # Current model pricing (per 1K tokens) as of 2024
    MODEL_PRICING = {
        # Claude 3.5 models
        "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
        "claude-3-5-sonnet-20240620": {"input": 0.003, "output": 0.015},
        "claude-3-5-haiku-20241022": {"input": 0.001, "output": 0.005},
        
        # Claude 3 models
        "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
        "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
        "claude-3-haiku-20240307": {"input": 0.0025, "output": 0.0125},
        
        # Legacy models (for compatibility)
        "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-opus": {"input": 0.015, "output": 0.075},
        "claude-3-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-haiku": {"input": 0.0025, "output": 0.0125},
    }
    
    # Model context windows
    MODEL_CONTEXT_WINDOWS = {
        # Claude 3.5 models
        "claude-3-5-sonnet-20241022": 200000,
        "claude-3-5-sonnet-20240620": 200000,
        "claude-3-5-haiku-20241022": 200000,
        
        # Claude 3 models
        "claude-3-opus-20240229": 200000,
        "claude-3-sonnet-20240229": 200000,
        "claude-3-haiku-20240307": 200000,
        
        # Legacy aliases
        "claude-3-5-sonnet": 200000,
        "claude-3-opus": 200000,
        "claude-3-sonnet": 200000,
        "claude-3-haiku": 200000,
    }
    
    # Maximum output tokens by model
    MODEL_MAX_OUTPUT = {
        # All Claude 3 and 3.5 models support 4096 max output
        "claude-3-5-sonnet-20241022": 8192,
        "claude-3-5-sonnet-20240620": 4096,
        "claude-3-5-haiku-20241022": 8192,
        "claude-3-opus-20240229": 4096,
        "claude-3-sonnet-20240229": 4096,
        "claude-3-haiku-20240307": 4096,
        "claude-3-5-sonnet": 8192,
        "claude-3-opus": 4096,
        "claude-3-sonnet": 4096,
        "claude-3-haiku": 4096,
    }
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        default_model: str = "claude-3-5-sonnet-20241022",
        timeout: int = 30,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Initialize Claude provider.
        
        Args:
            api_key: Anthropic API key
            base_url: Optional custom base URL
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
        return "claude"
    
    @property
    def supported_models(self) -> List[str]:
        return list(self.MODEL_PRICING.keys())
    
    @property
    def default_models(self) -> Dict[str, str]:
        return {
            "best": "claude-3-5-sonnet-20241022",
            "fast": "claude-3-5-haiku-20241022",
            "cheap": "claude-3-haiku-20240307",
            "balanced": "claude-3-5-sonnet-20241022",
        }
    
    def _setup_client(self):
        """Set up the Anthropic async client."""
        try:
            self._client = AsyncAnthropic(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout,
                max_retries=self.max_retries
            )
        except Exception as e:
            raise LLMProviderError(f"Failed to initialize Claude client: {e}")
    
    def _convert_messages_to_claude_format(
        self, 
        messages: List[Dict[str, str]]
    ) -> tuple[Optional[str], List[Dict[str, str]]]:
        """
        Convert OpenAI-style messages to Claude format.
        
        Claude separates system messages from conversation messages.
        
        Args:
            messages: OpenAI-style messages
            
        Returns:
            Tuple of (system_message, conversation_messages)
        """
        system_message = None
        conversation_messages = []
        
        for message in messages:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role == "system":
                # Combine multiple system messages if present
                if system_message:
                    system_message += f"\n\n{content}"
                else:
                    system_message = content
            elif role in ["user", "assistant"]:
                conversation_messages.append({
                    "role": role,
                    "content": content
                })
            else:
                # Handle other roles by converting to user messages
                conversation_messages.append({
                    "role": "user",
                    "content": f"[{role}]: {content}"
                })
        
        return system_message, conversation_messages
    
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
        Generate completion using Claude API.
        
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
        model = model or self.default_model or "claude-3-5-sonnet-20241022"
        
        if not self.supports_model(model):
            raise ModelNotFoundError(f"Model {model} not supported by Claude provider")
        
        # Convert messages to Claude format
        system_message, conversation_messages = self._convert_messages_to_claude_format(messages)
        
        if not conversation_messages:
            raise InvalidRequestError("No valid conversation messages provided")
        
        # Ensure we have a reasonable max_tokens
        if not max_tokens:
            max_tokens = min(4096, self._get_max_output_tokens(model))
        else:
            max_tokens = min(max_tokens, self._get_max_output_tokens(model))
        
        # Prepare request parameters
        params = {
            "model": model,
            "messages": conversation_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": stream,
            **kwargs
        }
        
        if system_message:
            params["system"] = system_message
        
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
            response = await self._client.messages.create(**params)
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract response data
            content = ""
            if response.content:
                # Claude returns content as a list of blocks
                for block in response.content:
                    if hasattr(block, 'text'):
                        content += block.text
                    elif isinstance(block, dict) and 'text' in block:
                        content += block['text']
            
            # Extract usage information
            usage = TokenUsage(
                input_tokens=response.usage.input_tokens if response.usage else 0,
                output_tokens=response.usage.output_tokens if response.usage else 0,
                total_tokens=(response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0
            )
            
            # Calculate cost
            cost = self._calculate_cost(params["model"], usage)
            
            return LLMResponse(
                content=content,
                model=response.model,
                provider=self.provider_name,
                finish_reason=response.stop_reason or "stop",
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
            async with self._client.messages.stream(**params) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        # Text delta from Claude
                        if hasattr(event.delta, 'text'):
                            yield LLMStreamChunk(
                                content=event.delta.text,
                                model=params["model"]
                            )
                    elif event.type == "message_stop":
                        # End of stream
                        yield LLMStreamChunk(
                            content="",
                            finish_reason="stop",
                            model=params["model"]
                        )
                    elif event.type == "message_delta":
                        # Stream metadata (stop reason, etc.)
                        if hasattr(event.delta, 'stop_reason') and event.delta.stop_reason:
                            yield LLMStreamChunk(
                                content="",
                                finish_reason=event.delta.stop_reason,
                                model=params["model"]
                            )
                
                # Get final usage from the stream
                if hasattr(stream, 'get_final_message'):
                    final_message = stream.get_final_message()
                    if final_message and final_message.usage:
                        usage = TokenUsage(
                            input_tokens=final_message.usage.input_tokens,
                            output_tokens=final_message.usage.output_tokens,
                            total_tokens=final_message.usage.input_tokens + final_message.usage.output_tokens
                        )
                        yield LLMStreamChunk(
                            content="",
                            usage=usage,
                            model=params["model"]
                        )
                
        except Exception as e:
            raise self._handle_error(e, {"model": params["model"]})
    
    async def validate_api_key(self) -> Dict[str, Any]:
        """Validate Claude API key."""
        try:
            # Try a small test request to validate the key
            test_messages = [{"role": "user", "content": "Hi"}]
            
            response = await self._client.messages.create(
                model="claude-3-haiku-20240307",  # Use cheapest model for validation
                messages=test_messages,
                max_tokens=1,
                temperature=0.0
            )
            
            return {
                "valid": True,
                "provider": self.provider_name,
                "available_models": self.supported_models,
                "model_tested": response.model,
                "usage": {
                    "input_tokens": response.usage.input_tokens if response.usage else 0,
                    "output_tokens": response.usage.output_tokens if response.usage else 0
                }
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
        model = model or self.default_model or "claude-3-5-sonnet-20241022"
        
        if model not in self.MODEL_PRICING:
            logger.warning(f"No pricing info for model {model}, using Claude-3.5-Sonnet pricing")
            model = "claude-3-5-sonnet-20241022"
        
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
        Count tokens for Claude messages.
        
        Claude uses a different tokenizer than OpenAI, but we can approximate
        using the standard 4 characters per token estimate.
        """
        try:
            # Convert to Claude format first
            system_message, conversation_messages = self._convert_messages_to_claude_format(messages)
            
            total_chars = 0
            
            # Count system message tokens
            if system_message:
                total_chars += len(system_message)
            
            # Count conversation message tokens
            for message in conversation_messages:
                content = message.get("content", "")
                role = message.get("role", "")
                
                # Add role overhead (approximately 3-5 tokens per message)
                total_chars += len(content) + len(role) + 10  # 10 chars for formatting
            
            # Approximate: 4 characters per token for Claude
            estimated_tokens = total_chars // 4
            
            # Add some overhead for Claude's message formatting
            return estimated_tokens + len(conversation_messages) * 3
            
        except Exception as e:
            logger.warning(f"Token counting failed for Claude model {model}: {e}")
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
        return self.MODEL_CONTEXT_WINDOWS.get(model, 200000)
    
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
        """Handle Claude-specific errors."""
        context = context or {}
        
        if isinstance(error, anthropic.AuthenticationError):
            return AuthenticationError(
                message="Invalid Claude API key",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="authentication_error"
            )
        
        elif isinstance(error, anthropic.RateLimitError):
            return RateLimitError(
                message="Claude rate limit exceeded",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="rate_limit_exceeded"
            )
        
        elif isinstance(error, anthropic.PermissionDeniedError):
            return QuotaExceededError(
                message="Claude quota exceeded or permission denied",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="quota_exceeded"
            )
        
        elif isinstance(error, anthropic.NotFoundError):
            return ModelNotFoundError(
                message=f"Claude model not found: {context.get('model', 'unknown')}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="model_not_found"
            )
        
        elif isinstance(error, anthropic.BadRequestError):
            return InvalidRequestError(
                message=f"Invalid request to Claude: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="invalid_request"
            )
        
        elif isinstance(error, (anthropic.InternalServerError, anthropic.APITimeoutError)):
            return ProviderUnavailableError(
                message="Claude service temporarily unavailable",
                provider=self.provider_name,
                model=context.get("model"),
                error_code="service_unavailable"
            )
        
        else:
            return LLMProviderError(
                message=f"Claude API error: {str(error)}",
                provider=self.provider_name,
                model=context.get("model"),
                error_code=getattr(error, 'code', 'unknown_error')
            ) 