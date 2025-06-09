from pydantic_settings import BaseSettings
import secrets
from typing import Optional, Dict, Any

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart eBook Chat System"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days

    # Database
    DATABASE_URL: str = "postgresql://user:password@db/db"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    
    # MinIO/S3 Configuration
    MINIO_URL: str = "http://minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "ebooks"
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Qdrant Configuration
    QDRANT_URL: str = "http://qdrant:6333"

    # LLM Provider Settings
    LLM_PROVIDER_ENABLED: bool = True
    LLM_DEFAULT_PROVIDER: str = "openai"
    LLM_FALLBACK_ENABLED: bool = True
    LLM_MAX_RETRIES: int = 3
    LLM_TIMEOUT: int = 30

    # Cost and Usage Tracking
    LLM_COST_TRACKING_ENABLED: bool = True
    LLM_USAGE_ANALYTICS_ENABLED: bool = True
    LLM_BUDGET_ALERTS_ENABLED: bool = False
    LLM_MONTHLY_BUDGET_LIMIT: Optional[float] = None

    # Provider Selection Strategy
    # Options: first_available, round_robin, lowest_cost, fastest, best_quality, random
    LLM_SELECTION_STRATEGY: str = "first_available"

    class Config:
        case_sensitive = True
        env_file = ".env"

    @property
    def llm_providers_config(self) -> Dict[str, Dict[str, Any]]:
        """Get LLM providers configuration."""
        config = {}
        
        # OpenAI Configuration
        if self.OPENAI_API_KEY:
            config["openai"] = {
                "type": "openai",
                "api_key": self.OPENAI_API_KEY,
                "enabled": True,
                "priority": 1,
                "weight": 1.0,
                "max_retries": self.LLM_MAX_RETRIES,
                "timeout": self.LLM_TIMEOUT,
                "fallback": True,
                "options": {
                    "default_model": "gpt-4o-mini",
                    "organization": None
                }
            }
        
        # Anthropic Configuration
        if self.ANTHROPIC_API_KEY:
            config["claude"] = {
                "type": "claude",
                "api_key": self.ANTHROPIC_API_KEY,
                "enabled": True,
                "priority": 2,
                "weight": 1.0,
                "max_retries": self.LLM_MAX_RETRIES,
                "timeout": self.LLM_TIMEOUT,
                "fallback": True,
                "options": {
                    "default_model": "claude-3-5-sonnet-20241022"
                }
            }
        
        # Google AI Configuration
        if self.GOOGLE_AI_API_KEY:
            config["gemini"] = {
                "type": "gemini",
                "api_key": self.GOOGLE_AI_API_KEY,
                "enabled": True,
                "priority": 3,
                "weight": 1.0,
                "max_retries": self.LLM_MAX_RETRIES,
                "timeout": self.LLM_TIMEOUT,
                "fallback": True,
                "options": {
                    "default_model": "gemini-2.0-flash-exp"
                }
            }
        
        return config

settings = Settings() 