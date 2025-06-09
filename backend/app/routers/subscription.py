 """
Subscription Management API Router

This module provides API endpoints for subscription management including
subscription tiers, user subscriptions, quota tracking, and usage analytics.
"""

import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.subscription import (
    SubscriptionTier as SubscriptionTierModel,
    UserSubscription as UserSubscriptionModel,
    UsageTracking as UsageTrackingModel,
    QuotaUsageSummary as QuotaUsageSummaryModel,
    SubscriptionTierEnum,
    SubscriptionStatusEnum,
    UsageTypeEnum
)
from app.schemas.subscription import (
    SubscriptionTier,
    SubscriptionTierCreate,
    SubscriptionTierUpdate,
    TierListResponse,
    UserSubscription,
    UserSubscriptionCreate,
    UserSubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionListResponse,
    QuotaStatus,
    QuotaStatusResponse,
    UsageAnalytics,
    UsageTracking,
    SubscriptionChangeRequest,
    SubscriptionCancelRequest,
    BillingResponse,
    QuotaExceededError
)
from app.services.quota_tracking import (
    QuotaTrackingService,
    QuotaExceededException,
    UsageRecord
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/subscription", tags=["subscription"])


# Subscription Tier Management (Admin only)
@router.get("/tiers", response_model=TierListResponse)
async def get_subscription_tiers(
    active_only: bool = Query(True, description="Return only active tiers"),
    db: Session = Depends(get_db)
):
    """Get all subscription tiers."""
    query = db.query(SubscriptionTierModel)
    
    if active_only:
        query = query.filter(SubscriptionTierModel.is_active == True)
    
    tiers = query.order_by(SubscriptionTierModel.sort_order).all()
    
    return TierListResponse(
        tiers=tiers,
        total=len(tiers)
    )


@router.get("/tiers/{tier_id}", response_model=SubscriptionTier)
async def get_subscription_tier(
    tier_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific subscription tier."""
    tier = db.query(SubscriptionTierModel).filter(
        SubscriptionTierModel.id == tier_id
    ).first()
    
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription tier not found"
        )
    
    return tier


@router.post("/tiers", response_model=SubscriptionTier)
async def create_subscription_tier(
    tier_data: SubscriptionTierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new subscription tier (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create subscription tiers"
        )
    
    # Check if tier name already exists
    existing_tier = db.query(SubscriptionTierModel).filter(
        SubscriptionTierModel.name == tier_data.name
    ).first()
    
    if existing_tier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription tier with this name already exists"
        )
    
    tier = SubscriptionTierModel(**tier_data.dict())
    db.add(tier)
    db.commit()
    db.refresh(tier)
    
    logger.info(f"Created subscription tier: {tier.name} by user {current_user.id}")
    
    return tier


@router.put("/tiers/{tier_id}", response_model=SubscriptionTier)
async def update_subscription_tier(
    tier_id: UUID,
    tier_data: SubscriptionTierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a subscription tier (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update subscription tiers"
        )
    
    tier = db.query(SubscriptionTierModel).filter(
        SubscriptionTierModel.id == tier_id
    ).first()
    
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription tier not found"
        )
    
    # Update tier with provided data
    update_data = tier_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tier, field, value)
    
    tier.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(tier)
    
    logger.info(f"Updated subscription tier: {tier.name} by user {current_user.id}")
    
    return tier


# User Subscription Management
@router.get("/my-subscription", response_model=SubscriptionResponse)
async def get_my_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's subscription details."""
    quota_service = QuotaTrackingService(db)
    
    # Get user's active subscription
    subscription = quota_service.get_user_subscription(current_user.id)
    
    if not subscription:
        # Create default free subscription if none exists
        free_tier = db.query(SubscriptionTierModel).filter(
            SubscriptionTierModel.name == "free"
        ).first()
        
        if not free_tier:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No free tier available"
            )
        
        subscription = UserSubscriptionModel(
            user_id=current_user.id,
            tier_id=free_tier.id,
            status=SubscriptionStatusEnum.ACTIVE,
            billing_cycle="monthly",
            start_date=date.today()
        )
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
    
    # Get quota status
    quota_status = quota_service.get_all_quota_status(current_user.id)
    quota_response = QuotaStatusResponse(
        upload=quota_status[UsageTypeEnum.UPLOAD.value],
        token=quota_status[UsageTypeEnum.TOKEN.value],
        search=quota_status[UsageTypeEnum.SEARCH.value]
    )
    
    # Get usage analytics
    analytics = quota_service.calculate_usage_analytics(current_user.id)
    usage_analytics = UsageAnalytics(**analytics)
    
    return SubscriptionResponse(
        subscription=subscription,
        quota_status=quota_response,
        usage_analytics=usage_analytics
    )


@router.post("/subscribe", response_model=UserSubscription)
async def subscribe_to_tier(
    subscription_data: SubscriptionChangeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Subscribe to a new tier or change existing subscription."""
    quota_service = QuotaTrackingService(db)
    
    # Validate tier exists
    tier = db.query(SubscriptionTierModel).filter(
        and_(
            SubscriptionTierModel.id == subscription_data.tier_id,
            SubscriptionTierModel.is_active == True
        )
    ).first()
    
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription tier not found or inactive"
        )
    
    # Get existing subscription
    existing_subscription = quota_service.get_user_subscription(current_user.id)
    
    if existing_subscription:
        # Update existing subscription
        existing_subscription.tier_id = subscription_data.tier_id
        existing_subscription.billing_cycle = subscription_data.billing_cycle
        existing_subscription.updated_at = datetime.utcnow()
        
        # If upgrading, activate immediately
        # If downgrading, might want to schedule for next billing cycle
        if subscription_data.prorate:
            existing_subscription.start_date = date.today()
        
        db.commit()
        db.refresh(existing_subscription)
        
        logger.info(f"Updated subscription for user {current_user.id} to tier {tier.name}")
        
        return existing_subscription
    else:
        # Create new subscription
        new_subscription = UserSubscriptionModel(
            user_id=current_user.id,
            tier_id=subscription_data.tier_id,
            status=SubscriptionStatusEnum.ACTIVE,
            billing_cycle=subscription_data.billing_cycle,
            start_date=date.today()
        )
        
        db.add(new_subscription)
        db.commit()
        db.refresh(new_subscription)
        
        logger.info(f"Created subscription for user {current_user.id} to tier {tier.name}")
        
        return new_subscription


@router.post("/cancel")
async def cancel_subscription(
    cancel_data: SubscriptionCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel current subscription."""
    quota_service = QuotaTrackingService(db)
    
    subscription = quota_service.get_user_subscription(current_user.id)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )
    
    if cancel_data.cancel_at_period_end:
        # Schedule cancellation at period end
        subscription.status = SubscriptionStatusEnum.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        # Set end_date to next billing date or end of current period
        if subscription.next_billing_date:
            subscription.end_date = subscription.next_billing_date
        else:
            # Default to end of current month
            today = date.today()
            if today.month == 12:
                subscription.end_date = date(today.year + 1, 1, 1)
            else:
                subscription.end_date = date(today.year, today.month + 1, 1)
    else:
        # Cancel immediately
        subscription.status = SubscriptionStatusEnum.CANCELLED
        subscription.cancelled_at = datetime.utcnow()
        subscription.end_date = date.today()
    
    # Add cancellation reason to metadata
    if not subscription.metadata:
        subscription.metadata = {}
    subscription.metadata["cancellation_reason"] = cancel_data.reason
    subscription.metadata["cancelled_at"] = datetime.utcnow().isoformat()
    
    db.commit()
    
    logger.info(f"Cancelled subscription for user {current_user.id}")
    
    return {"message": "Subscription cancelled successfully"}


# Quota and Usage Management
@router.get("/quota", response_model=QuotaStatusResponse)
async def get_quota_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current quota status for the user."""
    quota_service = QuotaTrackingService(db)
    quota_status = quota_service.get_all_quota_status(current_user.id)
    
    return QuotaStatusResponse(
        upload=quota_status[UsageTypeEnum.UPLOAD.value],
        token=quota_status[UsageTypeEnum.TOKEN.value],
        search=quota_status[UsageTypeEnum.SEARCH.value]
    )


@router.get("/usage", response_model=List[UsageTracking])
async def get_usage_history(
    days: int = Query(30, description="Number of days to retrieve", ge=1, le=365),
    usage_type: Optional[UsageTypeEnum] = Query(None, description="Filter by usage type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage history for the current user."""
    quota_service = QuotaTrackingService(db)
    
    # Get usage history
    usage_records = quota_service.get_usage_history(current_user.id, days)
    
    # Filter by usage type if specified
    if usage_type:
        usage_records = [r for r in usage_records if r.usage_type == usage_type]
    
    return usage_records


@router.get("/analytics", response_model=UsageAnalytics)
async def get_usage_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed usage analytics for the current user."""
    quota_service = QuotaTrackingService(db)
    analytics = quota_service.calculate_usage_analytics(current_user.id)
    
    return UsageAnalytics(**analytics)


# Admin endpoints
@router.get("/admin/subscriptions", response_model=SubscriptionListResponse)
async def get_all_subscriptions(
    page: int = Query(1, description="Page number", ge=1),
    size: int = Query(50, description="Page size", ge=1, le=100),
    status: Optional[SubscriptionStatusEnum] = Query(None, description="Filter by status"),
    tier_id: Optional[UUID] = Query(None, description="Filter by tier"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all subscriptions (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all subscriptions"
        )
    
    query = db.query(UserSubscriptionModel)
    
    # Apply filters
    if status:
        query = query.filter(UserSubscriptionModel.status == status)
    if tier_id:
        query = query.filter(UserSubscriptionModel.tier_id == tier_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    subscriptions = query.offset(offset).limit(size).all()
    
    return SubscriptionListResponse(
        subscriptions=subscriptions,
        total=total,
        page=page,
        size=size
    )


@router.get("/admin/usage-stats")
async def get_usage_statistics(
    start_date: Optional[date] = Query(None, description="Start date for statistics"),
    end_date: Optional[date] = Query(None, description="End date for statistics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage statistics across all users (admin only)."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view usage statistics"
        )
    
    # Default to current month if no dates provided
    if not start_date:
        today = date.today()
        start_date = date(today.year, today.month, 1)
    if not end_date:
        end_date = date.today()
    
    # Get usage statistics
    usage_stats = db.query(
        UsageTrackingModel.usage_type,
        func.sum(UsageTrackingModel.amount).label('total_usage'),
        func.count(UsageTrackingModel.id).label('total_operations'),
        func.count(func.distinct(UsageTrackingModel.user_id)).label('unique_users')
    ).filter(
        and_(
            UsageTrackingModel.usage_date >= start_date,
            UsageTrackingModel.usage_date <= end_date
        )
    ).group_by(UsageTrackingModel.usage_type).all()
    
    # Get subscription distribution
    subscription_stats = db.query(
        SubscriptionTierModel.name,
        func.count(UserSubscriptionModel.id).label('subscriber_count')
    ).join(
        UserSubscriptionModel, SubscriptionTierModel.id == UserSubscriptionModel.tier_id
    ).filter(
        UserSubscriptionModel.status == SubscriptionStatusEnum.ACTIVE
    ).group_by(SubscriptionTierModel.name).all()
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "usage_statistics": [
            {
                "usage_type": stat.usage_type.value,
                "total_usage": stat.total_usage,
                "total_operations": stat.total_operations,
                "unique_users": stat.unique_users
            }
            for stat in usage_stats
        ],
        "subscription_distribution": [
            {
                "tier_name": stat.name,
                "subscriber_count": stat.subscriber_count
            }
            for stat in subscription_stats
        ]
    }


# Utility endpoints
@router.post("/check-quota/{usage_type}")
async def check_quota_limit(
    usage_type: UsageTypeEnum,
    amount: int = Query(1, description="Amount to check", ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check if user can perform an operation without exceeding quota."""
    quota_service = QuotaTrackingService(db)
    
    try:
        can_proceed = quota_service.check_quota_limit(current_user.id, usage_type, amount)
        quota_status = quota_service.get_quota_status(current_user.id, usage_type)
        
        return {
            "can_proceed": can_proceed,
            "quota_status": quota_status.__dict__
        }
    except Exception as e:
        logger.error(f"Error checking quota: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking quota limits"
        )


@router.post("/record-usage")
async def record_usage(
    usage_data: UsageRecord,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record usage for the current user (internal use)."""
    quota_service = QuotaTrackingService(db)
    
    # Override user_id with current user
    usage_data.user_id = current_user.id
    
    try:
        usage_record = quota_service.record_usage(usage_data)
        return {"message": "Usage recorded successfully", "usage_id": usage_record.id}
    except Exception as e:
        logger.error(f"Error recording usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error recording usage"
        )