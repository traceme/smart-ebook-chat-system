"""
API Key model for secure storage of user API keys with encryption.

This model stores encrypted API keys for various AI providers with
proper security measures including AES-256 encryption and PBKDF2 key derivation.
"""

import uuid
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum

from app.db.base_class import Base


class APIProviderType(str, Enum):
    """Supported AI API providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    AZURE = "azure"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"
    REPLICATE = "replicate"
    LOCAL = "local"


class APIKey(Base):
    """
    API Key model for secure storage of encrypted API keys.
    
    Security features:
    - AES-256 encryption for key storage
    - PBKDF2 key derivation with unique salts
    - No plaintext storage of keys
    - Audit trail for key usage
    """
    __tablename__ = "api_keys"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # User association
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Key identification
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False, index=True)  # APIProviderType
    
    # Encrypted key storage
    encrypted_key = Column(Text, nullable=False)  # AES-256 encrypted API key
    key_salt = Column(String(64), nullable=False)  # Unique salt for this key
    key_hash = Column(String(128), nullable=False)  # PBKDF2 hash for verification
    
    # Optional endpoint (for Azure, self-hosted models)
    endpoint_url = Column(String(512), nullable=True)
    
    # Key metadata
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    is_validated = Column(Boolean, default=False, nullable=False)
    validation_details = Column(JSONB, nullable=True)  # Last validation result
    
    # Usage tracking
    total_requests = Column(String, default="0", nullable=False)  # Using string for large numbers
    total_tokens = Column(String, default="0", nullable=False)
    total_cost = Column(String, default="0.00", nullable=False)  # Decimal as string
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Security metadata
    created_from_ip = Column(String(45), nullable=True)  # IPv6 support
    last_accessed_from_ip = Column(String(45), nullable=True)
    encryption_version = Column(String(10), default="1.0", nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration
    
    # Soft delete
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Additional metadata
    metadata = Column(JSONB, nullable=True)  # Provider-specific settings, rate limits, etc.
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    usage_logs = relationship("APIKeyUsageLog", back_populates="api_key", cascade="all, delete-orphan")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_api_keys_user_provider', 'user_id', 'provider'),
        Index('ix_api_keys_active_keys', 'user_id', 'is_active', 'deleted_at'),
        Index('ix_api_keys_usage_tracking', 'last_used_at', 'total_requests'),
    )
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', provider='{self.provider}', user_id={self.user_id})>"
    
    @property
    def is_deleted(self) -> bool:
        """Check if the API key is soft deleted."""
        return self.deleted_at is not None
    
    @property
    def is_expired(self) -> bool:
        """Check if the API key has expired."""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_usable(self) -> bool:
        """Check if the API key can be used."""
        return (
            not self.is_deleted and 
            not self.is_expired and 
            self.is_validated and
            self.encrypted_key is not None
        )
    
    @property
    def masked_key(self) -> str:
        """Return a masked version of the key for display."""
        if not hasattr(self, '_decrypted_key') or not self._decrypted_key:
            return "***"
        
        key = self._decrypted_key
        if len(key) <= 8:
            return "***"
        return key[:4] + "***" + key[-4:]
    
    def get_provider_config(self) -> dict:
        """Get provider-specific configuration."""
        provider_configs = {
            APIProviderType.OPENAI: {
                "base_url": "https://api.openai.com/v1",
                "key_format": "sk-*",
                "models": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
                "rate_limits": {"requests_per_minute": 3500, "tokens_per_minute": 90000}
            },
            APIProviderType.ANTHROPIC: {
                "base_url": "https://api.anthropic.com",
                "key_format": "sk-ant-*",
                "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                "rate_limits": {"requests_per_minute": 1000, "tokens_per_minute": 40000}
            },
            APIProviderType.GOOGLE: {
                "base_url": "https://generativelanguage.googleapis.com/v1",
                "key_format": "AIza*",
                "models": ["gemini-pro", "gemini-pro-vision"],
                "rate_limits": {"requests_per_minute": 60, "tokens_per_minute": 32000}
            },
            APIProviderType.AZURE: {
                "base_url": self.endpoint_url or "https://*.openai.azure.com",
                "key_format": "*",
                "models": ["gpt-4", "gpt-35-turbo"],
                "rate_limits": {"requests_per_minute": 240, "tokens_per_minute": 40000}
            }
        }
        
        return provider_configs.get(self.provider, {
            "base_url": "",
            "key_format": "*",
            "models": [],
            "rate_limits": {"requests_per_minute": 60, "tokens_per_minute": 10000}
        })


class APIKeyUsageLog(Base):
    """
    API Key usage logging for tracking and analytics.
    
    Records individual API calls for usage tracking, cost calculation,
    and security monitoring.
    """
    __tablename__ = "api_key_usage_logs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign keys
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # Usage details
    model_name = Column(String(100), nullable=False)
    request_type = Column(String(50), nullable=False)  # completion, embedding, etc.
    
    # Metrics
    input_tokens = Column(String, default="0", nullable=False)
    output_tokens = Column(String, default="0", nullable=False)
    total_tokens = Column(String, default="0", nullable=False)
    cost = Column(String, default="0.00", nullable=False)
    latency_ms = Column(String, nullable=True)
    
    # Request metadata
    request_ip = Column(String(45), nullable=True)
    user_agent = Column(String(512), nullable=True)
    request_id = Column(String(100), nullable=True)  # Provider request ID
    
    # Status and error tracking
    status_code = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    success = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Additional metadata
    metadata = Column(JSONB, nullable=True)  # Request parameters, response details, etc.
    
    # Relationships
    api_key = relationship("APIKey", back_populates="usage_logs")
    user = relationship("User")
    
    # Indexes for analytics queries
    __table_args__ = (
        Index('ix_usage_logs_analytics', 'user_id', 'api_key_id', 'created_at'),
        Index('ix_usage_logs_costs', 'created_at', 'cost', 'success'),
        Index('ix_usage_logs_models', 'model_name', 'request_type', 'created_at'),
    )
    
    def __repr__(self):
        return f"<APIKeyUsageLog(id={self.id}, api_key_id={self.api_key_id}, model='{self.model_name}', tokens={self.total_tokens})>"


class APIKeyValidation(Base):
    """
    API Key validation history for tracking key health and status.
    
    Stores validation attempts and results for monitoring
    key validity over time.
    """
    __tablename__ = "api_key_validations"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False, index=True)
    
    # Validation details
    validation_type = Column(String(50), nullable=False)  # manual, automatic, scheduled
    is_valid = Column(Boolean, nullable=False, index=True)
    response_time_ms = Column(String, nullable=True)
    
    # Error details
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Provider response
    provider_models = Column(JSONB, nullable=True)  # Available models
    quota_info = Column(JSONB, nullable=True)  # Quota and limits
    
    # Timestamps
    validated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Additional metadata
    metadata = Column(JSONB, nullable=True)
    
    # Relationship
    api_key = relationship("APIKey")
    
    # Indexes
    __table_args__ = (
        Index('ix_validations_status', 'api_key_id', 'is_valid', 'validated_at'),
    )
    
    def __repr__(self):
        return f"<APIKeyValidation(id={self.id}, api_key_id={self.api_key_id}, is_valid={self.is_valid}, validated_at={self.validated_at})>" 