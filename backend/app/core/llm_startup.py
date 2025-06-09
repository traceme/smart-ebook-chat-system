"""
LLM Provider Startup Configuration

Initializes LLM providers on application startup based on available API keys.
"""

import logging
from app.core.config import settings
from app.services.llm_providers import initialize_providers, get_provider_factory
from app.services.llm_providers.provider_factory import ProviderSelectionStrategy

logger = logging.getLogger(__name__)


async def initialize_llm_providers():
    """
    Initialize LLM providers on application startup.
    
    This function is called during FastAPI startup to configure
    all available LLM providers based on the current settings.
    """
    try:
        if not settings.LLM_PROVIDER_ENABLED:
            logger.info("LLM providers disabled in settings")
            return
        
        # Get provider configurations from settings
        providers_config = settings.llm_providers_config
        
        if not providers_config:
            logger.warning("No LLM provider API keys configured")
            return
        
        # Initialize providers
        logger.info("Initializing LLM providers...")
        registered_providers = initialize_providers(providers_config)
        
        if registered_providers:
            logger.info(f"Successfully initialized providers: {', '.join(registered_providers)}")
            
            # Configure provider selection strategy
            factory = get_provider_factory()
            strategy = getattr(
                ProviderSelectionStrategy, 
                settings.LLM_SELECTION_STRATEGY.upper(), 
                ProviderSelectionStrategy.FIRST_AVAILABLE
            )
            factory.selection_strategy = strategy
            
            logger.info(f"Provider selection strategy: {strategy.value}")
            
            # Run initial health check
            health_results = await factory.health_check_all()
            healthy_providers = [
                name for name, result in health_results.items() 
                if result.get("status") == "healthy"
            ]
            
            if healthy_providers:
                logger.info(f"Healthy providers: {', '.join(healthy_providers)}")
            else:
                logger.warning("No providers passed initial health check")
                
        else:
            logger.error("Failed to initialize any LLM providers")
            
    except Exception as e:
        logger.error(f"Error initializing LLM providers: {e}")


def get_llm_provider_info():
    """
    Get information about configured LLM providers.
    
    Returns:
        Dictionary with provider information
    """
    try:
        providers_config = settings.llm_providers_config
        
        info = {
            "enabled": settings.LLM_PROVIDER_ENABLED,
            "default_provider": settings.LLM_DEFAULT_PROVIDER,
            "selection_strategy": settings.LLM_SELECTION_STRATEGY,
            "fallback_enabled": settings.LLM_FALLBACK_ENABLED,
            "cost_tracking": settings.LLM_COST_TRACKING_ENABLED,
            "configured_providers": list(providers_config.keys()),
            "total_providers": len(providers_config)
        }
        
        return info
        
    except Exception as e:
        logger.error(f"Error getting provider info: {e}")
        return {"error": str(e)} 