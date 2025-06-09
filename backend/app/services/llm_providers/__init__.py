"""
LLM Provider Abstraction Layer

This package provides a unified interface for working with different
Large Language Model providers including OpenAI, Anthropic Claude, 
Google Gemini, and others.

Features:
- Unified completion interface
- Streaming response support
- Token counting and cost estimation
- Provider selection and fallback mechanisms
- Rate limiting and error handling
"""

from .base_provider import BaseLLMProvider, LLMProviderError, LLMResponse, LLMStreamResponse
from .openai_provider import OpenAIProvider
from .claude_provider import ClaudeProvider
from .gemini_provider import GeminiProvider
from .provider_factory import LLMProviderFactory, get_provider, list_available_providers
from .cost_calculator import CostCalculator, ModelCosts
from .token_counter import TokenCounter, estimate_tokens

__all__ = [
    # Base classes
    'BaseLLMProvider',
    'LLMProviderError', 
    'LLMResponse',
    'LLMStreamResponse',
    
    # Provider implementations
    'OpenAIProvider',
    'ClaudeProvider', 
    'GeminiProvider',
    
    # Factory and utilities
    'LLMProviderFactory',
    'get_provider',
    'list_available_providers',
    
    # Cost and token utilities
    'CostCalculator',
    'ModelCosts',
    'TokenCounter',
    'estimate_tokens',
]

# Version info
__version__ = "1.0.0"

# Default configuration
DEFAULT_PROVIDERS = [
    'openai',
    'claude', 
    'gemini',
]

# Model aliases for easier access
MODEL_ALIASES = {
    # OpenAI models
    'gpt-4o': 'gpt-4o-2024-05-13',
    'gpt-4': 'gpt-4-0613',
    'gpt-3.5': 'gpt-3.5-turbo',
    
    # Claude models  
    'claude-3.5': 'claude-3-5-sonnet-20241022',
    'claude-3': 'claude-3-opus-20240229',
    'claude-sonnet': 'claude-3-sonnet-20240229',
    'claude-haiku': 'claude-3-haiku-20240307',
    
    # Gemini models
    'gemini-2.5': 'gemini-2.0-flash-exp',
    'gemini-pro': 'gemini-1.5-pro',
    'gemini-flash': 'gemini-1.5-flash',
}

def resolve_model_name(model_alias: str) -> str:
    """
    Resolve model alias to actual model name.
    
    Args:
        model_alias: Model alias or actual name
        
    Returns:
        Actual model name
    """
    return MODEL_ALIASES.get(model_alias, model_alias) 