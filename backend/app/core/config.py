from pydantic_settings import BaseSettings
import secrets

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
    OPENAI_API_KEY: str = ""
    
    # Qdrant Configuration
    QDRANT_URL: str = "http://qdrant:6333"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 