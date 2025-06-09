"""
Cost Calculator for LLM Providers

Provides comprehensive cost estimation, tracking, and analysis
across different LLM providers and models.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class CostModel(Enum):
    """Cost calculation models."""
    TOKEN_BASED = "token_based"
    CHARACTER_BASED = "character_based"
    REQUEST_BASED = "request_based"
    TIME_BASED = "time_based"


@dataclass
class ModelCosts:
    """Cost information for a specific model."""
    model_name: str
    provider: str
    input_cost_per_1k: float
    output_cost_per_1k: float
    cost_model: CostModel = CostModel.TOKEN_BASED
    minimum_cost: float = 0.0
    context_window: int = 0
    max_output_tokens: int = 0
    last_updated: datetime = field(default_factory=datetime.utcnow)
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for given token usage."""
        input_cost = (input_tokens / 1000) * self.input_cost_per_1k
        output_cost = (output_tokens / 1000) * self.output_cost_per_1k
        total_cost = input_cost + output_cost
        
        return max(total_cost, self.minimum_cost)
    
    def cost_per_token(self, is_output: bool = False) -> float:
        """Get cost per individual token."""
        if is_output:
            return self.output_cost_per_1k / 1000
        else:
            return self.input_cost_per_1k / 1000


@dataclass
class CostBreakdown:
    """Detailed cost breakdown for a request."""
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    input_cost: float
    output_cost: float
    total_cost: float
    cost_per_token: float
    estimated: bool = False
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "provider": self.provider,
            "model": self.model,
            "tokens": {
                "input": self.input_tokens,
                "output": self.output_tokens,
                "total": self.total_tokens
            },
            "costs": {
                "input": round(self.input_cost, 6),
                "output": round(self.output_cost, 6),
                "total": round(self.total_cost, 6),
                "per_token": round(self.cost_per_token, 8)
            },
            "estimated": self.estimated,
            "timestamp": self.timestamp.isoformat()
        }


class CostCalculator:
    """
    Comprehensive cost calculator for LLM providers.
    
    Features:
    - Multi-provider cost calculation
    - Cost comparison across providers
    - Usage tracking and analytics
    - Budget monitoring and alerts
    - Cost optimization recommendations
    """
    
    def __init__(self):
        """Initialize cost calculator with current pricing data."""
        self._model_costs: Dict[str, ModelCosts] = {}
        self._usage_history: List[CostBreakdown] = []
        self._load_default_pricing()
    
    def _load_default_pricing(self):
        """Load default pricing for all supported models."""
        
        # OpenAI Models
        openai_models = {
            # GPT-4o models
            "gpt-4o": ModelCosts(
                model_name="gpt-4o",
                provider="openai",
                input_cost_per_1k=0.0050,
                output_cost_per_1k=0.0150,
                context_window=128000,
                max_output_tokens=4096
            ),
            "gpt-4o-2024-05-13": ModelCosts(
                model_name="gpt-4o-2024-05-13",
                provider="openai",
                input_cost_per_1k=0.0050,
                output_cost_per_1k=0.0150,
                context_window=128000,
                max_output_tokens=4096
            ),
            "gpt-4o-2024-08-06": ModelCosts(
                model_name="gpt-4o-2024-08-06",
                provider="openai",
                input_cost_per_1k=0.0025,
                output_cost_per_1k=0.0100,
                context_window=128000,
                max_output_tokens=16384
            ),
            "gpt-4o-mini": ModelCosts(
                model_name="gpt-4o-mini",
                provider="openai",
                input_cost_per_1k=0.000150,
                output_cost_per_1k=0.000600,
                context_window=128000,
                max_output_tokens=16384
            ),
            
            # GPT-4 models
            "gpt-4": ModelCosts(
                model_name="gpt-4",
                provider="openai",
                input_cost_per_1k=0.0300,
                output_cost_per_1k=0.0600,
                context_window=8192,
                max_output_tokens=4096
            ),
            "gpt-4-turbo": ModelCosts(
                model_name="gpt-4-turbo",
                provider="openai",
                input_cost_per_1k=0.0100,
                output_cost_per_1k=0.0300,
                context_window=128000,
                max_output_tokens=4096
            ),
            
            # GPT-3.5 models
            "gpt-3.5-turbo": ModelCosts(
                model_name="gpt-3.5-turbo",
                provider="openai",
                input_cost_per_1k=0.0015,
                output_cost_per_1k=0.0020,
                context_window=16385,
                max_output_tokens=4096
            ),
        }
        
        # Claude Models
        claude_models = {
            # Claude 3.5 models
            "claude-3-5-sonnet-20241022": ModelCosts(
                model_name="claude-3-5-sonnet-20241022",
                provider="claude",
                input_cost_per_1k=0.003,
                output_cost_per_1k=0.015,
                context_window=200000,
                max_output_tokens=8192
            ),
            "claude-3-5-haiku-20241022": ModelCosts(
                model_name="claude-3-5-haiku-20241022",
                provider="claude",
                input_cost_per_1k=0.001,
                output_cost_per_1k=0.005,
                context_window=200000,
                max_output_tokens=8192
            ),
            
            # Claude 3 models
            "claude-3-opus-20240229": ModelCosts(
                model_name="claude-3-opus-20240229",
                provider="claude",
                input_cost_per_1k=0.015,
                output_cost_per_1k=0.075,
                context_window=200000,
                max_output_tokens=4096
            ),
            "claude-3-sonnet-20240229": ModelCosts(
                model_name="claude-3-sonnet-20240229",
                provider="claude",
                input_cost_per_1k=0.003,
                output_cost_per_1k=0.015,
                context_window=200000,
                max_output_tokens=4096
            ),
            "claude-3-haiku-20240307": ModelCosts(
                model_name="claude-3-haiku-20240307",
                provider="claude",
                input_cost_per_1k=0.0025,
                output_cost_per_1k=0.0125,
                context_window=200000,
                max_output_tokens=4096
            ),
        }
        
        # Gemini Models
        gemini_models = {
            # Gemini 2.0 models
            "gemini-2.0-flash-exp": ModelCosts(
                model_name="gemini-2.0-flash-exp",
                provider="gemini",
                input_cost_per_1k=0.0000,  # Free during experimental
                output_cost_per_1k=0.0000,
                context_window=1000000,
                max_output_tokens=8192
            ),
            
            # Gemini 1.5 models
            "gemini-1.5-pro": ModelCosts(
                model_name="gemini-1.5-pro",
                provider="gemini",
                input_cost_per_1k=0.0035,
                output_cost_per_1k=0.0105,
                context_window=2000000,
                max_output_tokens=8192
            ),
            "gemini-1.5-flash": ModelCosts(
                model_name="gemini-1.5-flash",
                provider="gemini",
                input_cost_per_1k=0.0001875,
                output_cost_per_1k=0.00075,
                context_window=1000000,
                max_output_tokens=8192
            ),
            "gemini-1.5-flash-8b": ModelCosts(
                model_name="gemini-1.5-flash-8b",
                provider="gemini",
                input_cost_per_1k=0.0001875,
                output_cost_per_1k=0.00075,
                context_window=1000000,
                max_output_tokens=8192
            ),
        }
        
        # Register all models
        for models in [openai_models, claude_models, gemini_models]:
            for model_name, model_costs in models.items():
                self._model_costs[model_name] = model_costs
    
    def calculate_cost(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        estimated: bool = False
    ) -> CostBreakdown:
        """
        Calculate detailed cost breakdown for a request.
        
        Args:
            provider: Provider name
            model: Model name
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            estimated: Whether this is an estimate
            
        Returns:
            Detailed cost breakdown
        """
        model_costs = self._model_costs.get(model)
        
        if not model_costs:
            logger.warning(f"No cost data for model {model}, using default rates")
            # Default fallback rates
            input_cost_per_1k = 0.001
            output_cost_per_1k = 0.002
        else:
            input_cost_per_1k = model_costs.input_cost_per_1k
            output_cost_per_1k = model_costs.output_cost_per_1k
        
        input_cost = (input_tokens / 1000) * input_cost_per_1k
        output_cost = (output_tokens / 1000) * output_cost_per_1k
        total_cost = input_cost + output_cost
        total_tokens = input_tokens + output_tokens
        
        cost_per_token = total_cost / total_tokens if total_tokens > 0 else 0
        
        breakdown = CostBreakdown(
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=total_cost,
            cost_per_token=cost_per_token,
            estimated=estimated
        )
        
        # Track usage
        if not estimated:
            self._usage_history.append(breakdown)
        
        return breakdown
    
    def estimate_cost(
        self,
        provider: str,
        model: str,
        input_tokens: int,
        estimated_output_tokens: int
    ) -> CostBreakdown:
        """
        Estimate cost for a request.
        
        Args:
            provider: Provider name
            model: Model name
            input_tokens: Number of input tokens
            estimated_output_tokens: Estimated output tokens
            
        Returns:
            Cost estimate
        """
        return self.calculate_cost(
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=estimated_output_tokens,
            estimated=True
        )
    
    def compare_costs(
        self,
        input_tokens: int,
        output_tokens: int,
        models: Optional[List[str]] = None
    ) -> List[CostBreakdown]:
        """
        Compare costs across multiple models.
        
        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            models: List of models to compare (all if None)
            
        Returns:
            List of cost breakdowns sorted by total cost
        """
        if models is None:
            models = list(self._model_costs.keys())
        
        comparisons = []
        
        for model in models:
            if model in self._model_costs:
                model_costs = self._model_costs[model]
                breakdown = self.calculate_cost(
                    provider=model_costs.provider,
                    model=model,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    estimated=True
                )
                comparisons.append(breakdown)
        
        # Sort by total cost
        comparisons.sort(key=lambda x: x.total_cost)
        
        return comparisons
    
    def get_cheapest_model(
        self,
        input_tokens: int,
        output_tokens: int,
        provider: Optional[str] = None
    ) -> Optional[CostBreakdown]:
        """
        Find the cheapest model for given token usage.
        
        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            provider: Filter by provider (optional)
            
        Returns:
            Cheapest model cost breakdown
        """
        models = list(self._model_costs.keys())
        
        if provider:
            models = [
                model for model in models 
                if self._model_costs[model].provider == provider
            ]
        
        comparisons = self.compare_costs(input_tokens, output_tokens, models)
        
        return comparisons[0] if comparisons else None
    
    def get_usage_statistics(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get usage statistics for a time period.
        
        Args:
            provider: Filter by provider (optional)
            model: Filter by model (optional)
            days: Number of days to analyze
            
        Returns:
            Usage statistics
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Filter usage history
        filtered_usage = [
            usage for usage in self._usage_history
            if usage.timestamp >= cutoff_date
            and (not provider or usage.provider == provider)
            and (not model or usage.model == model)
        ]
        
        if not filtered_usage:
            return {
                "total_requests": 0,
                "total_cost": 0.0,
                "total_tokens": 0,
                "average_cost_per_request": 0.0,
                "average_tokens_per_request": 0.0,
                "cost_by_provider": {},
                "cost_by_model": {},
                "daily_costs": []
            }
        
        # Calculate statistics
        total_requests = len(filtered_usage)
        total_cost = sum(usage.total_cost for usage in filtered_usage)
        total_tokens = sum(usage.total_tokens for usage in filtered_usage)
        
        # Group by provider
        cost_by_provider = {}
        for usage in filtered_usage:
            if usage.provider not in cost_by_provider:
                cost_by_provider[usage.provider] = 0.0
            cost_by_provider[usage.provider] += usage.total_cost
        
        # Group by model
        cost_by_model = {}
        for usage in filtered_usage:
            if usage.model not in cost_by_model:
                cost_by_model[usage.model] = 0.0
            cost_by_model[usage.model] += usage.total_cost
        
        # Daily costs
        daily_costs = {}
        for usage in filtered_usage:
            date_key = usage.timestamp.date().isoformat()
            if date_key not in daily_costs:
                daily_costs[date_key] = 0.0
            daily_costs[date_key] += usage.total_cost
        
        return {
            "total_requests": total_requests,
            "total_cost": round(total_cost, 6),
            "total_tokens": total_tokens,
            "average_cost_per_request": round(total_cost / total_requests, 6) if total_requests > 0 else 0.0,
            "average_tokens_per_request": round(total_tokens / total_requests, 1) if total_requests > 0 else 0.0,
            "cost_by_provider": {k: round(v, 6) for k, v in cost_by_provider.items()},
            "cost_by_model": {k: round(v, 6) for k, v in cost_by_model.items()},
            "daily_costs": [
                {"date": date, "cost": round(cost, 6)}
                for date, cost in sorted(daily_costs.items())
            ]
        }
    
    def get_model_info(self, model: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a model.
        
        Args:
            model: Model name
            
        Returns:
            Model information dictionary
        """
        model_costs = self._model_costs.get(model)
        
        if not model_costs:
            return None
        
        return {
            "model": model_costs.model_name,
            "provider": model_costs.provider,
            "pricing": {
                "input_cost_per_1k": model_costs.input_cost_per_1k,
                "output_cost_per_1k": model_costs.output_cost_per_1k,
                "input_cost_per_token": model_costs.cost_per_token(False),
                "output_cost_per_token": model_costs.cost_per_token(True)
            },
            "capabilities": {
                "context_window": model_costs.context_window,
                "max_output_tokens": model_costs.max_output_tokens
            },
            "cost_model": model_costs.cost_model.value,
            "minimum_cost": model_costs.minimum_cost,
            "last_updated": model_costs.last_updated.isoformat()
        }
    
    def get_all_models_info(self) -> List[Dict[str, Any]]:
        """Get information about all supported models."""
        return [
            self.get_model_info(model)
            for model in sorted(self._model_costs.keys())
        ]
    
    def update_model_pricing(
        self,
        model: str,
        input_cost_per_1k: float,
        output_cost_per_1k: float
    ):
        """
        Update pricing for a model.
        
        Args:
            model: Model name
            input_cost_per_1k: New input cost per 1K tokens
            output_cost_per_1k: New output cost per 1K tokens
        """
        if model in self._model_costs:
            model_costs = self._model_costs[model]
            model_costs.input_cost_per_1k = input_cost_per_1k
            model_costs.output_cost_per_1k = output_cost_per_1k
            model_costs.last_updated = datetime.utcnow()
            
            logger.info(f"Updated pricing for {model}: ${input_cost_per_1k}/1K input, ${output_cost_per_1k}/1K output")
        else:
            logger.warning(f"Model {model} not found for pricing update")
    
    def export_usage_data(
        self,
        format: str = "json",
        provider: Optional[str] = None,
        days: int = 30
    ) -> str:
        """
        Export usage data in specified format.
        
        Args:
            format: Export format ("json" or "csv")
            provider: Filter by provider (optional)
            days: Number of days to export
            
        Returns:
            Formatted usage data
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        filtered_usage = [
            usage for usage in self._usage_history
            if usage.timestamp >= cutoff_date
            and (not provider or usage.provider == provider)
        ]
        
        if format.lower() == "json":
            return json.dumps(
                [usage.to_dict() for usage in filtered_usage],
                indent=2
            )
        elif format.lower() == "csv":
            # Simple CSV format
            lines = ["timestamp,provider,model,input_tokens,output_tokens,total_cost,estimated"]
            for usage in filtered_usage:
                lines.append(
                    f"{usage.timestamp.isoformat()},{usage.provider},{usage.model},"
                    f"{usage.input_tokens},{usage.output_tokens},{usage.total_cost},{usage.estimated}"
                )
            return "\n".join(lines)
        else:
            raise ValueError(f"Unsupported export format: {format}")


# Global cost calculator instance
_cost_calculator: Optional[CostCalculator] = None


def get_cost_calculator() -> CostCalculator:
    """Get the global cost calculator instance."""
    global _cost_calculator
    if _cost_calculator is None:
        _cost_calculator = CostCalculator()
    return _cost_calculator 