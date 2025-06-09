import uuid
import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.chat import Conversation, ChatMessage, MessageSource, ConversationDocument, UserChatSettings
from app.models.document import Document
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessage as ChatMessageSchema
# Vector storage service imported dynamically to avoid circular imports
# Embedding service imported dynamically to avoid circular imports

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat conversations and AI responses."""
    
    def __init__(self):
        self.max_context_length = 4000  # Maximum context for AI response
        self.default_search_limit = 10
        
    async def process_chat_message(
        self, 
        db: Session, 
        user_id: uuid.UUID, 
        message: str,
        conversation_id: Optional[uuid.UUID] = None,
        document_ids: Optional[List[uuid.UUID]] = None
    ) -> Dict[str, Any]:
        """Process a chat message and generate AI response."""
        start_time = time.time()
        
        try:
            # Import here to avoid circular imports
            from app.services.vector_storage import VectorStorageService
            from app.services.embeddings import EmbeddingService
            from app.models.chat import Conversation, ChatMessage
            
            # Get or create conversation
            if conversation_id:
                conversation = db.query(Conversation).filter(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                ).first()
            else:
                conversation = None
                
            if not conversation:
                conversation = Conversation(
                    user_id=user_id,
                    title=self._generate_conversation_title(message),
                    created_at=datetime.utcnow()
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
            
            # Save user message
            user_msg = ChatMessage(
                conversation_id=conversation.id,
                role="user",
                content=message,
                created_at=datetime.utcnow()
            )
            db.add(user_msg)
            db.commit()
            
            # Search for relevant content
            search_results = await self._search_similar_content(
                message=message,
                user_id=user_id,
                document_ids=document_ids,
                limit=10,
                similarity_threshold=0.7
            )
            
            # Generate AI response
            ai_response = self._generate_response(message, search_results)
            
            # Save AI response
            response_time = time.time() - start_time
            ai_msg = ChatMessage(
                conversation_id=conversation.id,
                role="assistant",
                content=ai_response,
                created_at=datetime.utcnow(),
                response_time=response_time,
                search_results_count=len(search_results)
            )
            db.add(ai_msg)
            db.commit()
            
            # Format sources
            sources = []
            for result in search_results[:5]:
                sources.append({
                    "document_id": result.get("document_id"),
                    "document_title": result.get("document_title", "Unknown"),
                    "similarity_score": round(result.get("similarity_score", 0.0), 3),
                    "content_snippet": result.get("content", "")[:200] + "..."
                })
            
            return {
                "conversation_id": str(conversation.id),
                "message": ai_response,
                "sources": sources,
                "search_results_count": len(search_results),
                "response_time": response_time
            }
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            raise
    
    def _generate_response(self, user_message: str, search_results: List[Dict[str, Any]]) -> str:
        """Generate AI response based on search results."""
        if not search_results:
            return (
                "I couldn't find relevant information in your documents to answer this question. "
                "Please make sure your documents have been uploaded and processed."
            )
        
        # Combine relevant content
        context_parts = []
        for result in search_results[:3]:
            content = result.get("content", "")
            if content:
                context_parts.append(content[:500])
        
        combined_context = "\n\n".join(context_parts)
        
        # Generate response based on context
        response_parts = [
            "Based on your documents, here's what I found:",
            "",
            self._extract_relevant_info(combined_context, user_message),
            "",
            "*This response is based on content from your uploaded documents.*"
        ]
        
        return "\n".join(response_parts)
    
    def _extract_relevant_info(self, context: str, question: str) -> str:
        """Extract relevant information from context."""
        # Simple extraction - in production you'd use more sophisticated NLP
        sentences = context.split(". ")
        question_words = set(question.lower().split())
        
        relevant_sentences = []
        for sentence in sentences:
            sentence_words = set(sentence.lower().split())
            if len(question_words.intersection(sentence_words)) > 0:
                relevant_sentences.append(sentence.strip())
        
        if relevant_sentences:
            return ". ".join(relevant_sentences[:3]) + "."
        else:
            return context[:400] + "..." if len(context) > 400 else context
    
    async def _search_similar_content(
        self,
        message: str,
        user_id: uuid.UUID,
        document_ids: Optional[List[uuid.UUID]] = None,
        limit: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar content using vector search."""
        try:
            from app.services.vector_storage import VectorStorageService
            from app.services.embeddings import EmbeddingService
            from app.crud.crud_document import crud_document
            from sqlalchemy.orm import Session
            
            # Get embedding for the query
            embedding_service = EmbeddingService()
            embedding_result = await embedding_service.generate_embedding(message)
            
            # Build filter conditions
            filter_conditions = {}
            
            # Filter by user documents
            if document_ids:
                # Convert to strings for filter
                filter_conditions["document_id"] = [str(doc_id) for doc_id in document_ids]
            
            # Perform vector search
            storage_service = VectorStorageService()
            search_results = storage_service.search_similar(
                query_vector=embedding_result.embedding,
                limit=limit,
                score_threshold=similarity_threshold,
                filter_conditions=filter_conditions
            )
            
            # Format results for chat use
            formatted_results = []
            for result in search_results:
                formatted_results.append({
                    "document_id": result.payload.get("document_id"),
                    "document_title": result.payload.get("filename", "Unknown Document"),
                    "content": result.text,
                    "similarity_score": result.score,
                    "chunk_index": result.payload.get("chunk_index"),
                    "document_type": result.payload.get("document_type")
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching similar content: {e}")
            return []
    
    def _generate_conversation_title(self, first_message: str) -> str:
        """Generate conversation title from first message."""
        words = first_message.split()[:6]
        title = " ".join(words)
        return title[:50] + "..." if len(title) > 50 else title
    
    def get_conversation_history(
        self, 
        db: Session, 
        user_id: uuid.UUID, 
        conversation_id: uuid.UUID
    ) -> Optional[Dict[str, Any]]:
        """Get conversation history."""
        from app.models.chat import Conversation, ChatMessage
        
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id
        ).first()
        
        if not conversation:
            return None
        
        messages = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).order_by(ChatMessage.created_at.asc()).all()
        
        return {
            "id": str(conversation.id),
            "title": conversation.title,
            "created_at": conversation.created_at.isoformat(),
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.created_at.isoformat()
                }
                for msg in messages
            ]
        }
    
    def get_user_conversations(
        self, 
        db: Session, 
        user_id: uuid.UUID, 
        skip: int = 0, 
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get user conversations list."""
        from app.models.chat import Conversation, ChatMessage
        
        conversations = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for conv in conversations:
            message_count = db.query(ChatMessage).filter(
                ChatMessage.conversation_id == conv.id
            ).count()
            
            result.append({
                "id": str(conv.id),
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "message_count": message_count
            })
        
        return result


# Singleton instance
chat_service = ChatService() 