"""
LLM Providers API Router

Provides REST endpoints for LLM provider management, completions,
cost estimation, and provider health monitoring.
"""

import logging
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import BaseModel, Field
import asyncio

from app.core.auth import get_current_user
from app.models.user import User
from app.services.llm_providers import (
    get_provider_factory,
    initialize_providers,
    get_provider,
    list_available_providers
)
from app.services.llm_providers.cost_calculator import get_cost_calculator
from app.services.llm_providers.token_counter import get_token_counter, estimate_tokens
from app.services.api_key_service import APIKeyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm-providers", tags=["LLM Providers"])


# Request Models
class CompletionRequest(BaseModel):
    """Request model for LLM completion."""
    messages: List[Dict[str, str]] = Field(..., description="List of messages")
    model: Optional[str] = Field(None, description="Specific model to use")
    provider: Optional[str] = Field(None, description="Preferred provider")
    temperature: float = Field(0.7, ge=0.0, le=1.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, gt=0, le=8192, description="Maximum tokens to generate")
    stream: bool = Field(False, description="Whether to stream the response")
    fallback: bool = Field(True, description="Whether to fallback to other providers")


class CostEstimationRequest(BaseModel):
    """Request model for cost estimation."""
    messages: List[Dict[str, str]] = Field(..., description="List of messages")
    model: Optional[str] = Field(None, description="Model to estimate for")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum tokens to generate")
    providers: Optional[List[str]] = Field(None, description="Providers to compare")


class TokenCountRequest(BaseModel):
    """Request model for token counting."""
    text: Union[str, List[Dict[str, str]]] = Field(..., description="Text or messages to count")
    model: Optional[str] = Field(None, description="Model for accurate counting")
    provider: Optional[str] = Field(None, description="Provider for estimation")


class ProviderConfigRequest(BaseModel):
    """Request model for provider configuration."""
    providers: Dict[str, Dict[str, Any]] = Field(..., description="Provider configurations")


# Response Models
class CompletionResponse(BaseModel):
    """Response model for LLM completion."""
    content: str
    model: str
    provider: str
    finish_reason: str
    usage: Dict[str, int]
    cost: float
    response_time_ms: int
    request_id: Optional[str] = None


class CostEstimationResponse(BaseModel):
    """Response model for cost estimation."""
    estimations: List[Dict[str, Any]]
    cheapest: Dict[str, Any]
    most_expensive: Dict[str, Any]
    total_models_compared: int


class TokenCountResponse(BaseModel):
    """Response model for token counting."""
    tokens: int
    method: str
    confidence: float
    model: Optional[str] = None


class ProviderStatusResponse(BaseModel):
    """Response model for provider status."""
    providers: Dict[str, Dict[str, Any]]
    total_providers: int
    available_providers: int
    healthy_providers: int


class ProviderHealthResponse(BaseModel):
    """Response model for provider health check."""
    provider: str
    status: str
    response_time_ms: Optional[int] = None
    error: Optional[str] = None
    models_available: int


# Endpoints

@router.post("/complete", response_model=CompletionResponse)
async def create_completion(
    request: CompletionRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate completion using the best available provider.
    
    This endpoint automatically selects the best provider based on
    configuration and fallback settings.
    """
    try:
        factory = get_provider_factory()
        
        # Generate completion
        response = await factory.complete(
            messages=request.messages,
            preferred_provider=request.provider,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream,
            fallback=request.fallback
        )
        
        if not response:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No available providers could handle the request"
            )
        
        return CompletionResponse(
            content=response.content,
            model=response.model,
            provider=response.provider,
            finish_reason=response.finish_reason,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens
            },
            cost=response.cost,
            response_time_ms=response.response_time_ms,
            request_id=response.request_id
        )
        
    except Exception as e:
        logger.error(f"Completion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Completion failed: {str(e)}"
        )


@router.post("/estimate-cost", response_model=CostEstimationResponse)
async def estimate_completion_cost(
    request: CostEstimationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Estimate cost for completion across different providers.
    
    Useful for cost optimization and provider selection.
    """
    try:
        factory = get_provider_factory()
        calculator = get_cost_calculator()
        
        # Count input tokens
        token_counter = get_token_counter()
        input_count = token_counter.count_tokens(request.messages)
        input_tokens = input_count.tokens
        
        # Estimate output tokens
        output_tokens = request.max_tokens or min(int(input_tokens * 0.3), 1000)
        
        # Get cost estimates from all providers
        if request.providers:
            # Specific providers requested
            estimations = []
            for provider_name in request.providers:
                provider = await get_provider(provider_name)
                if provider:
                    try:
                        model = request.model or provider.get_cheapest_model()
                        cost = provider.estimate_cost(request.messages, model, output_tokens)
                        estimations.append({
                            "provider": provider_name,
                            "model": model,
                            "input_tokens": input_tokens,
                            "output_tokens": output_tokens,
                            "estimated_cost": cost,
                            "cost_per_1k_tokens": (cost / (input_tokens + output_tokens)) * 1000 if (input_tokens + output_tokens) > 0 else 0
                        })
                    except Exception as e:
                        logger.warning(f"Cost estimation failed for {provider_name}: {e}")
        else:
            # Compare all available providers
            estimations = []
            available_providers = list_available_providers()
            
            for provider_name in available_providers:
                provider = await get_provider(provider_name)
                if provider:
                    try:
                        model = request.model or provider.get_cheapest_model()
                        if request.model and not provider.supports_model(request.model):
                            continue  # Skip if model not supported
                        
                        cost = provider.estimate_cost(request.messages, model, output_tokens)
                        estimations.append({
                            "provider": provider_name,
                            "model": model,
                            "input_tokens": input_tokens,
                            "output_tokens": output_tokens,
                            "estimated_cost": cost,
                            "cost_per_1k_tokens": (cost / (input_tokens + output_tokens)) * 1000 if (input_tokens + output_tokens) > 0 else 0
                        })
                    except Exception as e:
                        logger.warning(f"Cost estimation failed for {provider_name}: {e}")
        
        if not estimations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No providers available for cost estimation"
            )
        
        # Sort by cost
        estimations.sort(key=lambda x: x["estimated_cost"])
        
        cheapest = estimations[0]
        most_expensive = estimations[-1]
        
        return CostEstimationResponse(
            estimations=estimations,
            cheapest=cheapest,
            most_expensive=most_expensive,
            total_models_compared=len(estimations)
        )
        
    except Exception as e:
        logger.error(f"Cost estimation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cost estimation failed: {str(e)}"
        )


@router.post("/count-tokens", response_model=TokenCountResponse)
async def count_tokens(
    request: TokenCountRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Count tokens in text or messages.
    
    Provides accurate token counting for different providers and models.
    """
    try:
        counter = get_token_counter()
        result = counter.count_tokens(
            text=request.text,
            model=request.model,
            provider=request.provider
        )
        
        return TokenCountResponse(
            tokens=result.tokens,
            method=result.method.value,
            confidence=result.confidence,
            model=result.model
        )
        
    except Exception as e:
        logger.error(f"Token counting failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token counting failed: {str(e)}"
        )


@router.get("/providers", response_model=ProviderStatusResponse)
async def get_provider_status(
    current_user: User = Depends(get_current_user)
):
    """
    Get status of all registered providers.
    
    Shows which providers are available, healthy, and their capabilities.
    """
    try:
        factory = get_provider_factory()
        provider_status = factory.get_provider_status()
        
        # Format status for response
        formatted_status = {}
        available_count = 0
        healthy_count = 0
        
        for name, status in provider_status.items():
            formatted_status[name] = {
                "available": status.available,
                "last_check": status.last_check,
                "response_time_ms": status.response_time_ms,
                "error_count": status.error_count,
                "success_count": status.success_count,
                "last_error": status.last_error,
                "success_rate": status.success_count / (status.success_count + status.error_count) if (status.success_count + status.error_count) > 0 else 0
            }
            
            if status.available:
                available_count += 1
                if status.error_count == 0 or status.success_count > status.error_count:
                    healthy_count += 1
        
        return ProviderStatusResponse(
            providers=formatted_status,
            total_providers=len(provider_status),
            available_providers=available_count,
            healthy_providers=healthy_count
        )
        
    except Exception as e:
        logger.error(f"Getting provider status failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Getting provider status failed: {str(e)}"
        )


@router.post("/health-check")
async def run_health_check(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    """
    Run health check on all providers.
    
    This can be run in the background to update provider status.
    """
    try:
        factory = get_provider_factory()
        
        # Run health check in background
        background_tasks.add_task(factory.health_check_all)
        
        return {"message": "Health check initiated"}
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/health-check/{provider_name}", response_model=ProviderHealthResponse)
async def check_provider_health(
    provider_name: str,
    current_user: User = Depends(get_current_user)
):
    """
    Check health of a specific provider.
    
    Provides detailed health information for a single provider.
    """
    try:
        provider = await get_provider(provider_name)
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Provider {provider_name} not found"
            )
        
        health_result = await provider.health_check()
        
        return ProviderHealthResponse(
            provider=provider_name,
            status=health_result.get("status", "unknown"),
            response_time_ms=health_result.get("response_time_ms"),
            error=health_result.get("error"),
            models_available=len(provider.supported_models)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Provider health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Provider health check failed: {str(e)}"
        )


@router.get("/models")
async def list_supported_models(
    provider: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    List supported models across providers.
    
    Optionally filter by provider.
    """
    try:
        if provider:
            provider_instance = await get_provider(provider)
            if not provider_instance:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Provider {provider} not found"
                )
            
            return {
                "provider": provider,
                "models": provider_instance.supported_models,
                "default_models": provider_instance.default_models
            }
        else:
            # Get models from all providers
            factory = get_provider_factory()
            available_providers = list_available_providers()
            
            all_models = {}
            for provider_name in available_providers:
                provider_instance = await get_provider(provider_name)
                if provider_instance:
                    all_models[provider_name] = {
                        "models": provider_instance.supported_models,
                        "default_models": provider_instance.default_models
                    }
            
            return {
                "providers": all_models,
                "total_providers": len(all_models)
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Listing models failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Listing models failed: {str(e)}"
        )


@router.get("/usage-statistics")
async def get_usage_statistics(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """
    Get usage statistics for LLM providers.
    
    Provides cost and usage analytics.
    """
    try:
        calculator = get_cost_calculator()
        
        stats = calculator.get_usage_statistics(
            provider=provider,
            model=model,
            days=days
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Getting usage statistics failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Getting usage statistics failed: {str(e)}"
        )


@router.post("/configure")
async def configure_providers(
    request: ProviderConfigRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Configure LLM providers.
    
    Requires admin privileges to update provider configurations.
    """
    # Note: In a real implementation, you'd want to check admin privileges
    try:
        registered = initialize_providers(request.providers)
        
        return {
            "message": f"Successfully configured {len(registered)} providers",
            "registered_providers": registered
        }
        
    except Exception as e:
        logger.error(f"Provider configuration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Provider configuration failed: {str(e)}"
        ) 