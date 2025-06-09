import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.api import deps
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service

router = APIRouter()


@router.post("/message", response_model=dict)
async def send_chat_message(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    chat_request: ChatRequest,
):
    """
    Send a chat message and get AI response.
    """
    try:
        response = await chat_service.process_chat_message(
            db=db,
            user_id=current_user.id,
            message=chat_request.message,
            conversation_id=chat_request.conversation_id,
            document_ids=chat_request.document_ids
        )
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )


@router.get("/conversations")
def get_user_conversations(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """
    Get list of user conversations.
    """
    try:
        conversations = chat_service.get_user_conversations(
            db=db,
            user_id=current_user.id,
            skip=skip,
            limit=limit
        )
        return {"conversations": conversations}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}"
        )


@router.get("/conversations/{conversation_id}")
def get_conversation_history(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    conversation_id: uuid.UUID,
):
    """
    Get conversation history with all messages.
    """
    try:
        conversation = chat_service.get_conversation_history(
            db=db,
            user_id=current_user.id,
            conversation_id=conversation_id
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        return conversation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation history: {str(e)}"
        )


@router.post("/conversations")
def create_conversation(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    title: Optional[str] = None,
):
    """
    Create a new conversation.
    """
    try:
        from app.models.chat import Conversation
        from datetime import datetime
        
        conversation = Conversation(
            user_id=current_user.id,
            title=title or "New Conversation",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        return {
            "id": str(conversation.id),
            "title": conversation.title,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    conversation_id: uuid.UUID,
):
    """
    Delete a conversation and all its messages.
    """
    try:
        from app.models.chat import Conversation
        
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        db.delete(conversation)
        db.commit()
        
        return {"message": "Conversation deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )


@router.put("/conversations/{conversation_id}")
def update_conversation(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    conversation_id: uuid.UUID,
    update_data: dict,
):
    """
    Update conversation title.
    """
    try:
        from app.models.chat import Conversation
        from datetime import datetime
        
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        conversation.title = update_data.get("title", conversation.title)
        conversation.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "id": str(conversation.id),
            "title": conversation.title,
            "updated_at": conversation.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update conversation: {str(e)}"
        )


@router.get("/health")
def chat_health_check():
    """
    Health check for chat service.
    """
    return {
        "status": "healthy",
        "service": "Chat Interface",
        "features": [
            "conversational_ai",
            "document_search",
            "conversation_history",
            "multi_document_chat"
        ]
    } 