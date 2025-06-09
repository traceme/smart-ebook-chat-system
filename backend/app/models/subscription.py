import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Boolean, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class SubscriptionTierEnum(PyEnum):
    """Subscription tier types."""
    FREE = "free"
    PRO = "pro" 
    ENTERPRISE = "enterprise"


class SubscriptionStatusEnum(PyEnum):
    """Subscription status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRIAL = "trial"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    SUSPENDED = "suspended"


class UsageTypeEnum(PyEnum):
    """Usage tracking types."""
    UPLOAD = "upload"
    TOKEN = "token"
    SEARCH = "search"
    DOCUMENT = "document"
    API_CALL = "api_call"

class SubscriptionTier(Base):
    __tablename__ = 'subscription_tiers'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=False, default=0.00)
    upload_quota_mb = Column(Integer, nullable=False, default=100)
    token_quota = Column(Integer, nullable=False, default=10000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    sort_order = Column(Integer, default=0)


class UserSubscription(Base):
    __tablename__ = 'user_subscriptions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    tier_id = Column(UUID(as_uuid=True), ForeignKey('subscription_tiers.id'), nullable=False)
    status = Column(Enum(SubscriptionStatusEnum), nullable=False, default=SubscriptionStatusEnum.ACTIVE)
    billing_cycle = Column(String, nullable=False, default="monthly")
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    tier = relationship("SubscriptionTier")


class UsageTracking(Base):
    __tablename__ = 'usage_tracking'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    usage_type = Column(Enum(UsageTypeEnum), nullable=False)
    amount = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    

class QuotaUsageSummary(Base):
    __tablename__ = 'quota_usage_summary'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    usage_type = Column(Enum(UsageTypeEnum), nullable=False)
    month = Column(String, nullable=False)  # Format: YYYY-MM
    total_usage = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
