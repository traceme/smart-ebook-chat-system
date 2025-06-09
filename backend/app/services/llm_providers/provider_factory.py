"""
LLM Provider Factory

Factory class for creating and managing LLM provider instances.
Supports provider selection, configuration, and fallback mechanisms.
"""

from typing import Dict, List, Optional, Type, Any
import logging
from .base_provider import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .gemini_provider import GeminiProvider

logger = logging.getLogger(__name__)

class LLMProviderFactory:
    """Factory for creating LLM provider instances."""
    
    _providers: Dict[str, Type[BaseLLMProvider]] = {
        'openai': OpenAIProvider,
        'claude': ClaudeProvider,
        'gemini': GeminiProvider,
    }
    
    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseLLMProvider]):
        """Register a new provider class."""
        cls._providers[name] = provider_class
        logger.info(f"Registered LLM provider: {name}")
    
    @classmethod
    def create_provider(cls, provider_name: str, **kwargs) -> BaseLLMProvider:
        """
        Create a provider instance.
        
        Args:
            provider_name: Name of the provider ('openai', 'claude', 'gemini')
            **kwargs: Provider-specific configuration
            
        Returns:
            Configured provider instance
            
        Raises:
            ValueError: If provider not found or configuration invalid
        """
        if provider_name not in cls._providers:
            available = list(cls._providers.keys())
            raise ValueError(f"Unknown provider '{provider_name}'. Available: {available}")
        
        provider_class = cls._providers[provider_name]
        
        try:
            return provider_class(**kwargs)
        except Exception as e:
            logger.error(f"Failed to create provider '{provider_name}': {e}")
            raise ValueError(f"Failed to create provider '{provider_name}': {e}")
    
    @classmethod
    def list_providers(cls) -> List[str]:
        """List all available provider names."""
        return list(cls._providers.keys())
    
    @classmethod
    def get_provider_class(cls, provider_name: str) -> Type[BaseLLMProvider]:
        """Get provider class by name."""
        if provider_name not in cls._providers:
            raise ValueError(f"Unknown provider '{provider_name}'")
        return cls._providers[provider_name]


def get_provider(provider_name: str, **kwargs) -> BaseLLMProvider:
    """
    Convenience function to create a provider instance.
    
    Args:
        provider_name: Name of the provider
        **kwargs: Provider configuration
        
    Returns:
        Configured provider instance
    """
    return LLMProviderFactory.create_provider(provider_name, **kwargs)


def list_available_providers() -> List[str]:
    """
    Get list of available provider names.
    
    Returns:
        List of available provider names
    """
    return LLMProviderFactory.list_providers()


def get_provider_info(provider_name: str) -> Dict[str, Any]:
    """
    Get information about a specific provider.
    
    Args:
        provider_name: Name of the provider
        
    Returns:
        Provider information dictionary
    """
    if provider_name not in LLMProviderFactory._providers:
        raise ValueError(f"Unknown provider '{provider_name}'")
    
    provider_class = LLMProviderFactory._providers[provider_name]
    
    return {
        'name': provider_name,
        'class': provider_class.__name__,
        'module': provider_class.__module__,
        'supports_streaming': hasattr(provider_class, 'stream_complete'),
        'supported_models': getattr(provider_class, 'supported_models', []),
    }


def create_provider_with_fallback(
    primary_provider: str,
    fallback_providers: List[str],
    **kwargs
) -> BaseLLMProvider:
    """
    Create a provider with fallback options.
    
    Args:
        primary_provider: Primary provider to try first
        fallback_providers: List of fallback providers
        **kwargs: Provider configuration
        
    Returns:
        Working provider instance
        
    Raises:
        ValueError: If no providers can be created
    """
    all_providers = [primary_provider] + fallback_providers
    
    for provider_name in all_providers:
        try:
            return get_provider(provider_name, **kwargs)
        except Exception as e:
            logger.warning(f"Failed to create provider '{provider_name}': {e}")
            continue
    
    raise ValueError(f"Failed to create any provider from: {all_providers}") 