"""
Quota Tracking Service

This service handles quota tracking, enforcement, and management for the subscription system.
"""

import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from dataclasses import dataclass
from enum import Enum

from app.models.subscription import (
    UserSubscription, 
    UsageTracking, 
    QuotaUsageSummary,
    SubscriptionTier,
    UsageTypeEnum,
    SubscriptionStatusEnum
)
from app.models.user import User
from app.models.document import Document

logger = logging.getLogger(__name__)


class QuotaExceededException(Exception):
    """Exception raised when quota limits are exceeded."""
    def __init__(self, message: str, quota_type: str, current_usage: int, limit: int):
        self.quota_type = quota_type
        self.current_usage = current_usage
        self.limit = limit
        super().__init__(message)


@dataclass
class QuotaStatus:
    """Data class for quota status information."""
    quota_type: str
    current_usage: int
    limit: int
    percentage_used: float
    remaining: int
    is_exceeded: bool
    reset_date: date


@dataclass
class UsageRecord:
    """Data class for usage recording."""
    user_id: UUID
    usage_type: UsageTypeEnum
    amount: int
    resource_id: Optional[UUID] = None
    operation: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    cost: Optional[Decimal] = None


class QuotaTrackingService:
    """Service for tracking and enforcing quota limits."""
    
    def __init__(self, db: Session):
        self.db = db
        
    def get_user_subscription(self, user_id: UUID) -> Optional[UserSubscription]:
        """Get the active subscription for a user."""
        return self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user_id,
                UserSubscription.status == SubscriptionStatusEnum.ACTIVE,
                or_(
                    UserSubscription.end_date.is_(None),
                    UserSubscription.end_date >= date.today()
                )
            )
        ).first()
    
    def get_current_month_usage(self, user_id: UUID, usage_type: UsageTypeEnum) -> int:
        """Get current month usage for a specific type."""
        current_month = date.today().strftime("%Y-%m")
        
        result = self.db.query(func.sum(UsageTracking.amount)).filter(
            and_(
                UsageTracking.user_id == user_id,
                UsageTracking.usage_type == usage_type,
                UsageTracking.usage_month == current_month
            )
        ).scalar()
        
        return int(result or 0)
    
    def get_quota_status(self, user_id: UUID, usage_type: UsageTypeEnum) -> QuotaStatus:
        """Get quota status for a user and usage type."""
        subscription = self.get_user_subscription(user_id)
        if not subscription:
            limit = self._get_default_quota_limit(usage_type)
        else:
            limit = self._get_effective_quota_limit(subscription, usage_type)
        
        current_usage = self.get_current_month_usage(user_id, usage_type)
        percentage_used = (current_usage / limit * 100) if limit > 0 else 100
        remaining = max(0, limit - current_usage)
        is_exceeded = current_usage >= limit
        
        today = date.today()
        if today.month == 12:
            reset_date = date(today.year + 1, 1, 1)
        else:
            reset_date = date(today.year, today.month + 1, 1)
        
        return QuotaStatus(
            quota_type=usage_type.value,
            current_usage=current_usage,
            limit=limit,
            percentage_used=percentage_used,
            remaining=remaining,
            is_exceeded=is_exceeded,
            reset_date=reset_date
        )
    
    def check_quota_limit(self, user_id: UUID, usage_type: UsageTypeEnum, amount: int = 1) -> bool:
        """Check if adding the specified amount would exceed quota limits."""
        quota_status = self.get_quota_status(user_id, usage_type)
        return (quota_status.current_usage + amount) <= quota_status.limit
    
    def enforce_quota_limit(self, user_id: UUID, usage_type: UsageTypeEnum, amount: int = 1) -> None:
        """Enforce quota limits, raising exception if exceeded."""
        quota_status = self.get_quota_status(user_id, usage_type)
        
        if (quota_status.current_usage + amount) > quota_status.limit:
            raise QuotaExceededException(
                f"Quota exceeded for {usage_type.value}. "
                f"Current: {quota_status.current_usage}, "
                f"Limit: {quota_status.limit}, "
                f"Requested: {amount}",
                quota_type=usage_type.value,
                current_usage=quota_status.current_usage,
                limit=quota_status.limit
            )
    
    def record_usage(self, usage_record: UsageRecord) -> UsageTracking:
        """Record usage for a user."""
        current_date = date.today()
        current_month = current_date.strftime("%Y-%m")
        
        subscription = self.get_user_subscription(usage_record.user_id)
        subscription_id = subscription.id if subscription else None
        
        tracking_record = UsageTracking(
            user_id=usage_record.user_id,
            subscription_id=subscription_id,
            usage_type=usage_record.usage_type,
            usage_date=current_date,
            usage_month=current_month,
            amount=usage_record.amount,
            cost=usage_record.cost,
            resource_id=usage_record.resource_id,
            operation=usage_record.operation,
            metadata=usage_record.metadata
        )
        
        self.db.add(tracking_record)
        self.db.commit()
        self.db.refresh(tracking_record)
        
        logger.info(f"Recorded usage: {usage_record.usage_type.value} = {usage_record.amount} for user {usage_record.user_id}")
        
        return tracking_record
    
    def _get_effective_quota_limit(self, subscription: UserSubscription, usage_type: UsageTypeEnum) -> int:
        """Get effective quota limit for a subscription and usage type."""
        if usage_type == UsageTypeEnum.UPLOAD:
            return subscription.effective_upload_quota_mb
        elif usage_type == UsageTypeEnum.TOKEN:
            return subscription.effective_token_quota
        elif usage_type == UsageTypeEnum.SEARCH:
            return subscription.effective_search_quota
        else:
            return 1000
    
    def _get_default_quota_limit(self, usage_type: UsageTypeEnum) -> int:
        """Get default quota limits for users without subscriptions (free tier)."""
        if usage_type == UsageTypeEnum.UPLOAD:
            return 100  # 100MB
        elif usage_type == UsageTypeEnum.TOKEN:
            return 10000  # 10k tokens
        elif usage_type == UsageTypeEnum.SEARCH:
            return 1000  # 1k searches
        else:
            return 100