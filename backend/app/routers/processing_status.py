"""
Processing status tracking API endpoints.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app import crud, models
from app.api import deps
from app.services.processing_status_tracker import (
    processing_status_tracker, 
    ProcessingStage, 
    ProcessingStatus
)

router = APIRouter()


@router.get("/processing/{processing_id}")
def get_processing_status(
    *,
    processing_id: str,
    current_user: models.User = Depends(deps.get_current_user),
):
    """Get detailed processing status by processing ID."""
    status_info = processing_status_tracker.get_processing_status(processing_id) 