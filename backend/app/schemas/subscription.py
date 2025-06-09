"""
Subscription Management Schemas

Pydantic models for subscription management API endpoints.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.models.subscription import SubscriptionTierEnum, SubscriptionStatusEnum, UsageTypeEnum


# Base schemas
class SubscriptionTierBase(BaseModel):
    name: str = Field(..., description="Tier name (free, pro, enterprise)")
    display_name: str = Field(..., description="Display name for the tier")
    description: Optional[str] = Field(None, description="Tier description")
    price_monthly: Decimal = Field(..., description="Monthly price in USD")
    price_yearly: Decimal = Field(..., description="Yearly price in USD")
    upload_quota_mb: int = Field(..., description="Monthly upload quota in MB")
    token_quota: int = Field(..., description="Monthly token quota")
    search_quota: int = Field(..., description="Monthly search quota")
    documents_limit: int = Field(..., description="Maximum documents stored")
    features: Optional[List[str]] = Field(None, description="List of features")
    api_access: bool = Field(False, description="API access enabled")
    priority_support: bool = Field(False, description="Priority support enabled")
    custom_quotas: bool = Field(False, description="Custom quotas allowed")
    is_active: bool = Field(True, description="Tier is active")
    sort_order: int = Field(0, description="Display order")


class SubscriptionTierCreate(SubscriptionTierBase):
    pass


class SubscriptionTierUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[Decimal] = None
    price_yearly: Optional[Decimal] = None
    upload_quota_mb: Optional[int] = None
    token_quota: Optional[int] = None
    search_quota: Optional[int] = None
    documents_limit: Optional[int] = None
    features: Optional[List[str]] = None
    api_access: Optional[bool] = None
    priority_support: Optional[bool] = None
    custom_quotas: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SubscriptionTier(SubscriptionTierBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# User Subscription schemas
class UserSubscriptionBase(BaseModel):
    tier_id: UUID = Field(..., description="Subscription tier ID")
    billing_cycle: str = Field("monthly", description="Billing cycle (monthly, yearly)")
    start_date: date = Field(..., description="Subscription start date")
    end_date: Optional[date] = Field(None, description="Subscription end date")
    trial_end_date: Optional[date] = Field(None, description="Trial end date")
    next_billing_date: Optional[date] = Field(None, description="Next billing date")
    
    # Custom quotas for enterprise
    custom_upload_quota_mb: Optional[int] = Field(None, description="Custom upload quota")
    custom_token_quota: Optional[int] = Field(None, description="Custom token quota")
    custom_search_quota: Optional[int] = Field(None, description="Custom search quota")
    custom_documents_limit: Optional[int] = Field(None, description="Custom documents limit")
    
    # Payment information
    external_subscription_id: Optional[str] = Field(None, description="External subscription ID")
    payment_method_id: Optional[str] = Field(None, description="Payment method ID")


class UserSubscriptionCreate(UserSubscriptionBase):
    user_id: UUID = Field(..., description="User ID")


class UserSubscriptionUpdate(BaseModel):
    tier_id: Optional[UUID] = None
    billing_cycle: Optional[str] = None
    status: Optional[SubscriptionStatusEnum] = None
    end_date: Optional[date] = None
    trial_end_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    custom_upload_quota_mb: Optional[int] = None
    custom_token_quota: Optional[int] = None
    custom_search_quota: Optional[int] = None
    custom_documents_limit: Optional[int] = None
    external_subscription_id: Optional[str] = None
    payment_method_id: Optional[str] = None


class UserSubscription(UserSubscriptionBase):
    id: UUID
    user_id: UUID
    status: SubscriptionStatusEnum
    last_payment_date: Optional[datetime]
    last_payment_amount: Optional[Decimal]
    cancelled_at: Optional[datetime]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    
    # Related data
    tier: SubscriptionTier

    class Config:
        from_attributes = True


# Usage tracking schemas
class UsageTrackingBase(BaseModel):
    usage_type: UsageTypeEnum = Field(..., description="Type of usage")
    amount: int = Field(..., description="Amount used")
    resource_id: Optional[UUID] = Field(None, description="Related resource ID")
    operation: Optional[str] = Field(None, description="Operation performed")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    cost: Optional[Decimal] = Field(None, description="Associated cost")


class UsageTrackingCreate(UsageTrackingBase):
    user_id: UUID = Field(..., description="User ID")


class UsageTracking(UsageTrackingBase):
    id: UUID
    user_id: UUID
    subscription_id: Optional[UUID]
    usage_date: date
    usage_month: str
    created_at: datetime

    class Config:
        from_attributes = True


# Quota status schemas
class QuotaStatus(BaseModel):
    quota_type: str = Field(..., description="Type of quota")
    current_usage: int = Field(..., description="Current usage amount")
    limit: int = Field(..., description="Quota limit")
    percentage_used: float = Field(..., description="Percentage of quota used")
    remaining: int = Field(..., description="Remaining quota")
    is_exceeded: bool = Field(..., description="Whether quota is exceeded")
    reset_date: date = Field(..., description="Date when quota resets")


class QuotaStatusResponse(BaseModel):
    upload: QuotaStatus
    token: QuotaStatus
    search: QuotaStatus


# Usage analytics schemas
class UsageAnalytics(BaseModel):
    current_month: str = Field(..., description="Current month (YYYY-MM)")
    usage_by_type: Dict[str, int] = Field(..., description="Usage by type")
    quota_status: Dict[str, Dict[str, Any]] = Field(..., description="Quota status for all types")
    usage_trend: List[Dict[str, Any]] = Field(..., description="Usage trend over time")
    document_count: int = Field(..., description="Current document count")
    subscription: Optional[Dict[str, Any]] = Field(None, description="Subscription information")


# Subscription management request schemas
class SubscriptionChangeRequest(BaseModel):
    tier_id: UUID = Field(..., description="New tier ID")
    billing_cycle: Optional[str] = Field("monthly", description="Billing cycle")
    prorate: bool = Field(True, description="Whether to prorate the change")


class SubscriptionCancelRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Cancellation reason")
    cancel_at_period_end: bool = Field(True, description="Cancel at period end")


# Response schemas
class SubscriptionResponse(BaseModel):
    subscription: UserSubscription
    quota_status: QuotaStatusResponse
    usage_analytics: UsageAnalytics


class SubscriptionListResponse(BaseModel):
    subscriptions: List[UserSubscription]
    total: int
    page: int
    size: int


class TierListResponse(BaseModel):
    tiers: List[SubscriptionTier]
    total: int


# Billing and payment schemas
class PaymentMethod(BaseModel):
    id: str
    type: str
    last_four: Optional[str] = None
    brand: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool = False


class BillingHistory(BaseModel):
    id: str
    amount: Decimal
    currency: str = "USD"
    status: str
    description: str
    invoice_url: Optional[str] = None
    created_at: datetime


class BillingResponse(BaseModel):
    payment_methods: List[PaymentMethod]
    billing_history: List[BillingHistory]
    next_billing_date: Optional[date]
    current_period_end: Optional[date]


# Error response schemas
class QuotaExceededError(BaseModel):
    detail: str
    quota_type: str
    current_usage: int
    limit: int
    error_code: str = "QUOTA_EXCEEDED"


class SubscriptionError(BaseModel):
    detail: str
    error_code: str
    context: Optional[Dict[str, Any]] = None