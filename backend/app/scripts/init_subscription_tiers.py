 """
Initialize Default Subscription Tiers

This script creates the default subscription tiers for the application.
"""

import sys
import os
from decimal import Decimal

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.subscription import SubscriptionTier


def create_default_tiers(db: Session):
    """Create default subscription tiers."""
    
    # Check if tiers already exist
    existing_tiers = db.query(SubscriptionTier).count()
    if existing_tiers > 0:
        print("Subscription tiers already exist. Skipping initialization.")
        return
    
    # Free Tier
    free_tier = SubscriptionTier(
        name="free",
        display_name="Free",
        description="Perfect for getting started with basic document processing",
        price_monthly=Decimal("0.00"),
        price_yearly=Decimal("0.00"),
        upload_quota_mb=100,  # 100MB per month
        token_quota=10000,    # 10k tokens per month
        search_quota=1000,    # 1k searches per month
        documents_limit=10,   # Max 10 documents
        features=[
            "Basic document upload",
            "Text extraction",
            "Basic search",
            "Community support"
        ],
        api_access=False,
        priority_support=False,
        custom_quotas=False,
        is_active=True,
        sort_order=1
    )
    
    # Pro Tier
    pro_tier = SubscriptionTier(
        name="pro",
        display_name="Pro",
        description="Enhanced features for power users and small teams",
        price_monthly=Decimal("19.99"),
        price_yearly=Decimal("199.99"),  # 2 months free
        upload_quota_mb=1024,  # 1GB per month
        token_quota=100000,    # 100k tokens per month
        search_quota=10000,    # 10k searches per month
        documents_limit=100,   # Max 100 documents
        features=[
            "Everything in Free",
            "Advanced search with reranking",
            "Semantic search",
            "Vector indexing",
            "Priority processing",
            "Email support",
            "Usage analytics"
        ],
        api_access=True,
        priority_support=True,
        custom_quotas=False,
        is_active=True,
        sort_order=2
    )
    
    # Enterprise Tier
    enterprise_tier = SubscriptionTier(
        name="enterprise",
        display_name="Enterprise",
        description="Unlimited power for large organizations with custom needs",
        price_monthly=Decimal("99.99"),
        price_yearly=Decimal("999.99"),  # 2 months free
        upload_quota_mb=10240,  # 10GB per month (can be customized)
        token_quota=1000000,    # 1M tokens per month (can be customized)
        search_quota=100000,    # 100k searches per month (can be customized)
        documents_limit=1000,   # Max 1000 documents (can be customized)
        features=[
            "Everything in Pro",
            "Custom quotas",
            "Dedicated support",
            "SLA guarantees",
            "Advanced analytics",
            "Custom integrations",
            "On-premise deployment options",
            "Priority feature requests"
        ],
        api_access=True,
        priority_support=True,
        custom_quotas=True,
        is_active=True,
        sort_order=3
    )
    
    # Add all tiers to database
    db.add(free_tier)
    db.add(pro_tier)
    db.add(enterprise_tier)
    
    try:
        db.commit()
        print("Successfully created default subscription tiers:")
        print(f"- {free_tier.display_name}: ${free_tier.price_monthly}/month")
        print(f"- {pro_tier.display_name}: ${pro_tier.price_monthly}/month")
        print(f"- {enterprise_tier.display_name}: ${enterprise_tier.price_monthly}/month")
    except Exception as e:
        db.rollback()
        print(f"Error creating subscription tiers: {e}")
        raise


def main():
    """Main function to initialize subscription tiers."""
    print("Initializing default subscription tiers...")
    
    db = SessionLocal()
    try:
        create_default_tiers(db)
    finally:
        db.close()
    
    print("Subscription tier initialization complete!")


if __name__ == "__main__":
    main()