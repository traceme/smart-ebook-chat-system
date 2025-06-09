"""
Abstract Base Provider for LLM services.

Defines the common interface that all LLM providers must implement
for unified access to different language models.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, AsyncIterator, Union
from dataclasses import dataclass, field
from enum import Enum
import time
import logging

logger = logging.getLogger(__name__)


class LLMProviderError(Exception):
    """Base exception for LLM provider errors."""
    
    def __init__(
        self, 
        message: str, 
        provider: str = None,
        model: str = None,
        error_code: str = None,
        retry_after: int = None
    ):
        super().__init__(message)
        self.provider = provider
        self.model = model
        self.error_code = error_code
        self.retry_after = retry_after


class RateLimitError(LLMProviderError):
    """Raised when rate limits are exceeded."""
    pass


class AuthenticationError(LLMProviderError):
    """Raised when authentication fails."""
    pass


class QuotaExceededError(LLMProviderError):
    """Raised when quota is exceeded."""
    pass


class ModelNotFoundError(LLMProviderError):
    """Raised when requested model is not available."""
    pass


class InvalidRequestError(LLMProviderError):
    """Raised when request parameters are invalid."""
    pass


class ProviderUnavailableError(LLMProviderError):
    """Raised when provider service is unavailable."""
    pass


@dataclass
class TokenUsage:
    """Token usage information."""
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    
    def __post_init__(self):
        if self.total_tokens == 0:
            self.total_tokens = self.input_tokens + self.output_tokens


@dataclass
class LLMResponse:
    """Response from LLM provider."""
    
    # Response content
    content: str
    
    # Metadata
    model: str
    provider: str
    finish_reason: str = "stop"
    
    # Usage statistics
    usage: TokenUsage = field(default_factory=TokenUsage)
    
    # Cost information
    cost: float = 0.0
    
    # Timing information
    response_time_ms: int = 0
    
    # Raw provider response (for debugging)
    raw_response: Optional[Dict[str, Any]] = None
    
    # Request metadata
    request_id: Optional[str] = None
    created_at: Optional[float] = field(default_factory=time.time)


@dataclass 
class LLMStreamChunk:
    """Single chunk from streaming response."""
    
    content: str = ""
    finish_reason: Optional[str] = None
    usage: Optional[TokenUsage] = None
    model: Optional[str] = None
    delta_time_ms: Optional[int] = None


@dataclass
class LLMStreamResponse:
    """Streaming response from LLM provider."""
    
    # Metadata
    model: str
    provider: str
    request_id: Optional[str] = None
    
    # Final accumulated data (populated when stream completes)
    content: str = ""
    usage: TokenUsage = field(default_factory=TokenUsage)
    cost: float = 0.0
    response_time_ms: int = 0
    finish_reason: str = "stop"
    
    # Stream tracking
    chunks_received: int = 0
    started_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None
    
    def add_chunk(self, chunk: LLMStreamChunk):
        """Add a chunk to the response."""
        self.content += chunk.content
        self.chunks_received += 1
        
        if chunk.finish_reason:
            self.finish_reason = chunk.finish_reason
            self.completed_at = time.time()
            self.response_time_ms = int((self.completed_at - self.started_at) * 1000)
        
        if chunk.usage:
            self.usage = chunk.usage


class BaseLLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    All LLM provider implementations must inherit from this class
    and implement the required abstract methods.
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: int = 30,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Initialize the provider.
        
        Args:
            api_key: API key for the provider
            base_url: Optional custom base URL
            default_model: Default model to use
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
            **kwargs: Additional provider-specific options
        """
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model
        self.timeout = timeout
        self.max_retries = max_retries
        self.options = kwargs
        
        # Initialize provider-specific client
        self._client = None
        self._setup_client()
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of this provider."""
        pass
    
    @property
    @abstractmethod
    def supported_models(self) -> List[str]:
        """Return list of supported model names."""
        pass
    
    @property
    @abstractmethod
    def default_models(self) -> Dict[str, str]:
        """Return default models for different use cases."""
        pass
    
    @abstractmethod
    def _setup_client(self):
        """Set up the provider-specific client."""
        pass
    
    @abstractmethod
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
        Generate completion for the given messages.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model to use (defaults to provider default)
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
            **kwargs: Additional model-specific parameters
            
        Returns:
            LLMResponse for non-streaming, AsyncIterator[LLMStreamChunk] for streaming
        """
        pass
    
    @abstractmethod
    async def validate_api_key(self) -> Dict[str, Any]:
        """
        Validate the API key and return provider information.
        
        Returns:
            Dictionary with validation status and provider info
        """
        pass
    
    @abstractmethod
    def estimate_cost(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None
    ) -> float:
        """
        Estimate the cost for a completion request.
        
        Args:
            messages: List of message dictionaries
            model: Model to use for estimation
            max_tokens: Maximum tokens to generate
            
        Returns:
            Estimated cost in USD
        """
        pass
    
    @abstractmethod
    def count_tokens(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None
    ) -> int:
        """
        Count tokens in the input messages.
        
        Args:
            messages: List of message dictionaries
            model: Model to use for token counting
            
        Returns:
            Number of input tokens
        """
        pass
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the provider.
        
        Returns:
            Dictionary with health status information
        """
        try:
            start_time = time.time()
            
            # Simple test request
            test_messages = [{"role": "user", "content": "Hello"}]
            response = await self.complete(
                messages=test_messages,
                model=self.get_fastest_model(),
                max_tokens=1,
                temperature=0.0
            )
            
            response_time = int((time.time() - start_time) * 1000)
            
            return {
                "status": "healthy",
                "provider": self.provider_name,
                "response_time_ms": response_time,
                "model_tested": response.model if hasattr(response, 'model') else None,
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "provider": self.provider_name,
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": time.time()
            }
    
    def get_fastest_model(self) -> str:
        """Get the fastest model for this provider."""
        return self.default_models.get("fast", self.supported_models[0])
    
    def get_best_model(self) -> str:
        """Get the best quality model for this provider."""
        return self.default_models.get("best", self.supported_models[0])
    
    def get_cheapest_model(self) -> str:
        """Get the cheapest model for this provider."""
        return self.default_models.get("cheap", self.supported_models[0])
    
    def supports_model(self, model: str) -> bool:
        """Check if provider supports the given model."""
        return model in self.supported_models
    
    def get_model_info(self, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Get information about a model.
        
        Args:
            model: Model name (defaults to default model)
            
        Returns:
            Dictionary with model information
        """
        model = model or self.default_model or self.supported_models[0]
        
        return {
            "model": model,
            "provider": self.provider_name,
            "supported": self.supports_model(model),
            "context_window": self._get_context_window(model),
            "max_output_tokens": self._get_max_output_tokens(model),
            "cost_per_1k_input": self._get_input_cost(model),
            "cost_per_1k_output": self._get_output_cost(model),
        }
    
    @abstractmethod
    def _get_context_window(self, model: str) -> int:
        """Get context window size for model."""
        pass
    
    @abstractmethod
    def _get_max_output_tokens(self, model: str) -> int:
        """Get maximum output tokens for model."""
        pass
    
    @abstractmethod
    def _get_input_cost(self, model: str) -> float:
        """Get input cost per 1K tokens for model."""
        pass
    
    @abstractmethod
    def _get_output_cost(self, model: str) -> float:
        """Get output cost per 1K tokens for model."""
        pass
    
    def _handle_error(self, error: Exception, context: Dict[str, Any] = None) -> LLMProviderError:
        """
        Convert provider-specific errors to standardized errors.
        
        Args:
            error: Original exception
            context: Additional context information
            
        Returns:
            Standardized LLMProviderError
        """
        context = context or {}
        
        # This method should be overridden by specific providers
        # to handle their specific error types
        return LLMProviderError(
            message=str(error),
            provider=self.provider_name,
            model=context.get("model"),
            error_code=getattr(error, 'code', None)
        )
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if hasattr(self._client, 'close'):
            await self._client.close()
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(provider={self.provider_name}, models={len(self.supported_models)})" 