from pydantic_settings import BaseSettings
import secrets
from typing import Optional, Dict, Any, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart eBook Chat System"
    API_V1_STR: str = "/api/v1"
    
    # Security Configuration
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # Enhanced Security Settings
    ENCRYPTION_KEY: str = secrets.token_urlsafe(32)
    JWT_ISSUER: str = "smart-ebook-chat"
    JWT_AUDIENCE: str = "smart-ebook-chat-users"
    
    # Password Security
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_COMPLEXITY_REQUIRED: bool = True
    PASSWORD_BCRYPT_ROUNDS: int = 13
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 30
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    DEFAULT_RATE_LIMIT_PER_MINUTE: int = 60
    DEFAULT_RATE_LIMIT_PER_HOUR: int = 1000
    STRICT_RATE_LIMITING: bool = False
    
    # Security Headers
    SECURITY_HEADERS_ENABLED: bool = True
    CONTENT_SECURITY_POLICY_ENABLED: bool = True
    FORCE_HTTPS: bool = True
    HSTS_MAX_AGE: int = 31536000  # 1 year
    
    # IP Restrictions
    IP_WHITELIST_ENABLED: bool = False
    IP_WHITELIST: List[str] = []
    IP_BLACKLIST_ENABLED: bool = True
    IP_BLACKLIST: List[str] = []
    ADMIN_IP_RESTRICTIONS: bool = True
    
    # Data Isolation and Encryption
    DATA_ENCRYPTION_ENABLED: bool = True
    ENCRYPT_USER_DATA: bool = True
    ENCRYPT_API_KEYS: bool = True
    ENCRYPT_DOCUMENTS: bool = False  # Large files, consider performance
    
    # Audit Logging
    AUDIT_LOGGING_ENABLED: bool = True
    AUDIT_LOG_FILE: str = "audit.log"
    AUDIT_LOG_RETENTION_DAYS: int = 90
    LOG_SENSITIVE_DATA: bool = False
    
    # Vulnerability Scanning
    VULNERABILITY_SCANNING_ENABLED: bool = True
    DEPENDENCY_SCAN_INTERVAL_HOURS: int = 24
    SECURITY_SCAN_ON_STARTUP: bool = False
    VULNERABILITY_ALERTS_ENABLED: bool = True
    
    # API Security
    API_KEY_ROTATION_DAYS: int = 90
    API_USAGE_TRACKING: bool = True
    API_QUOTA_ENFORCEMENT: bool = True
    CORS_ENABLED: bool = True
    CORS_ALLOWED_ORIGINS: List[str] = ["*"]  # Restrict in production
    
    # Request Validation
    REQUEST_VALIDATION_ENABLED: bool = True
    MAX_REQUEST_SIZE_MB: int = 100
    SQL_INJECTION_PROTECTION: bool = True
    XSS_PROTECTION: bool = True
    CSRF_PROTECTION: bool = True
    
    # Session Security
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "strict"
    
    # Database Security
    DATABASE_SSL_REQUIRED: bool = False
    DATABASE_CONNECTION_ENCRYPTION: bool = True
    
    # OWASP Compliance
    OWASP_TOP10_PROTECTION: bool = True
    SECURITY_TESTING_ENABLED: bool = True

    # Database
    DATABASE_URL: str = "postgresql://user:password@db/db"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    
    # MinIO/S3 Configuration
    MINIO_URL: str = "http://minio:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "ebooks"
    MINIO_SECURE: bool = False
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Qdrant Configuration
    QDRANT_URL: str = "http://qdrant:6333"
    QDRANT_API_KEY: Optional[str] = None

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
    
    @property
    def security_config(self) -> Dict[str, Any]:
        """Get comprehensive security configuration"""
        return {
            "encryption": {
                "enabled": self.DATA_ENCRYPTION_ENABLED,
                "encrypt_user_data": self.ENCRYPT_USER_DATA,
                "encrypt_api_keys": self.ENCRYPT_API_KEYS,
                "encrypt_documents": self.ENCRYPT_DOCUMENTS
            },
            "authentication": {
                "jwt_issuer": self.JWT_ISSUER,
                "jwt_audience": self.JWT_AUDIENCE,
                "access_token_expire_minutes": self.ACCESS_TOKEN_EXPIRE_MINUTES,
                "refresh_token_expire_days": self.REFRESH_TOKEN_EXPIRE_DAYS
            },
            "password_policy": {
                "min_length": self.PASSWORD_MIN_LENGTH,
                "complexity_required": self.PASSWORD_COMPLEXITY_REQUIRED,
                "bcrypt_rounds": self.PASSWORD_BCRYPT_ROUNDS,
                "max_login_attempts": self.MAX_LOGIN_ATTEMPTS,
                "lockout_duration_minutes": self.LOCKOUT_DURATION_MINUTES
            },
            "rate_limiting": {
                "enabled": self.RATE_LIMIT_ENABLED,
                "per_minute": self.DEFAULT_RATE_LIMIT_PER_MINUTE,
                "per_hour": self.DEFAULT_RATE_LIMIT_PER_HOUR,
                "strict": self.STRICT_RATE_LIMITING
            },
            "headers": {
                "enabled": self.SECURITY_HEADERS_ENABLED,
                "csp_enabled": self.CONTENT_SECURITY_POLICY_ENABLED,
                "force_https": self.FORCE_HTTPS,
                "hsts_max_age": self.HSTS_MAX_AGE
            },
            "ip_restrictions": {
                "whitelist_enabled": self.IP_WHITELIST_ENABLED,
                "whitelist": self.IP_WHITELIST,
                "blacklist_enabled": self.IP_BLACKLIST_ENABLED,
                "blacklist": self.IP_BLACKLIST,
                "admin_restrictions": self.ADMIN_IP_RESTRICTIONS
            },
            "audit": {
                "enabled": self.AUDIT_LOGGING_ENABLED,
                "log_file": self.AUDIT_LOG_FILE,
                "retention_days": self.AUDIT_LOG_RETENTION_DAYS,
                "log_sensitive_data": self.LOG_SENSITIVE_DATA
            },
            "vulnerability_scanning": {
                "enabled": self.VULNERABILITY_SCANNING_ENABLED,
                "scan_interval_hours": self.DEPENDENCY_SCAN_INTERVAL_HOURS,
                "scan_on_startup": self.SECURITY_SCAN_ON_STARTUP,
                "alerts_enabled": self.VULNERABILITY_ALERTS_ENABLED
            },
            "request_validation": {
                "enabled": self.REQUEST_VALIDATION_ENABLED,
                "max_request_size_mb": self.MAX_REQUEST_SIZE_MB,
                "sql_injection_protection": self.SQL_INJECTION_PROTECTION,
                "xss_protection": self.XSS_PROTECTION,
                "csrf_protection": self.CSRF_PROTECTION
            },
            "owasp": {
                "top10_protection": self.OWASP_TOP10_PROTECTION,
                "security_testing": self.SECURITY_TESTING_ENABLED
            }
        }

settings = Settings() 