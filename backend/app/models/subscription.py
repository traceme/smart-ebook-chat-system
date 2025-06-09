import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Numeric, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

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
