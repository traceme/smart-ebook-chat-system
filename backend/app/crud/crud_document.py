import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.document import Document
from app.schemas.document import DocumentUploadInit, DocumentUploadProgress


class CRUDDocument:
    def get_by_id(self, db: Session, document_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Document]:
        """Get document by ID, ensuring it belongs to the user."""
        return db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id
        ).first()

    def get(self, db: Session, id: str) -> Optional[Document]:
        """Get document by ID (for system operations)."""
        if isinstance(id, str):
            document_id = uuid.UUID(id)
        else:
            document_id = id
        return db.query(Document).filter(Document.id == document_id).first()

    def get_by_hash(self, db: Session, file_hash: str) -> Optional[Document]:
        """Check if document with this hash already exists (deduplication)."""
        return db.query(Document).filter(Document.file_hash == file_hash).first()

    def get_user_documents(
        self, 
        db: Session, 
        user_id: uuid.UUID, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Document]:
        """Get all documents for a user with pagination."""
        return db.query(Document).filter(
            Document.user_id == user_id
        ).offset(skip).limit(limit).all()

    def create(
        self, 
        db: Session, 
        document_data: DocumentUploadInit, 
        user_id: uuid.UUID,
        storage_path: str
    ) -> Document:
        """Create a new document record."""
        db_document = Document(
            filename=document_data.filename,
            original_filename=document_data.filename,
            file_size=document_data.file_size,
            file_hash=document_data.file_hash,
            file_type=document_data.file_type,
            storage_path=storage_path,
            user_id=user_id,
            upload_status="pending"
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        return db_document

    def update_progress(
        self,
        db: Session,
        document_id: uuid.UUID,
        progress_data: DocumentUploadProgress
    ) -> Optional[Document]:
        """Update document upload progress and status."""
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.upload_progress = progress_data.upload_progress
            document.upload_status = progress_data.upload_status
            db.commit()
            db.refresh(document)
        return document

    def mark_completed(self, db: Session, document_id: uuid.UUID) -> Optional[Document]:
        """Mark document upload as completed."""
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.upload_status = "completed"
            document.upload_progress = 100
            db.commit()
            db.refresh(document)
        return document

    def update_status(
        self, 
        db: Session, 
        document_id: str, 
        status: str, 
        error_message: Optional[str] = None
    ) -> Optional[Document]:
        """Update document status and optional error message."""
        if isinstance(document_id, str):
            doc_id = uuid.UUID(document_id)
        else:
            doc_id = document_id
            
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            document.upload_status = status
            if error_message:
                document.error_message = error_message
                
            # Update related boolean fields based on status
            if status == "conversion_completed":
                document.content_extracted = True
            elif status == "indexed":
                document.vector_indexed = True
            elif status in ["conversion_failed", "indexing_failed"]:
                # Reset flags on failure
                if status == "conversion_failed":
                    document.content_extracted = False
                elif status == "indexing_failed":
                    document.vector_indexed = False
                    
            db.commit()
            db.refresh(document)
        return document

    def update_metadata(
        self, 
        db: Session, 
        document_id: str, 
        metadata: Dict[str, Any]
    ) -> Optional[Document]:
        """Update document indexing metadata."""
        if isinstance(document_id, str):
            doc_id = uuid.UUID(document_id)
        else:
            doc_id = document_id
            
        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            # Update specific metadata fields
            if "chunks_count" in metadata:
                document.chunks_count = metadata["chunks_count"]
            if "vectors_count" in metadata:
                document.vectors_count = metadata["vectors_count"]
                
            # Store all metadata in JSON field
            if document.indexing_metadata:
                document.indexing_metadata.update(metadata)
            else:
                document.indexing_metadata = metadata
                
            db.commit()
            db.refresh(document)
        return document

    def count_by_status(self, db: Session) -> Dict[str, int]:
        """Get count of documents by status."""
        from sqlalchemy import func
        
        results = db.query(
            Document.upload_status,
            func.count(Document.id)
        ).group_by(Document.upload_status).all()
        
        status_counts = {status: count for status, count in results}
        
        # Also count boolean flags
        total_docs = db.query(func.count(Document.id)).scalar()
        content_extracted = db.query(func.count(Document.id)).filter(
            Document.content_extracted == True
        ).scalar()
        vector_indexed = db.query(func.count(Document.id)).filter(
            Document.vector_indexed == True
        ).scalar()
        
        return {
            **status_counts,
            "total_documents": total_docs,
            "content_extracted_count": content_extracted,
            "vector_indexed_count": vector_indexed
        }

    def get_documents_by_status(
        self, 
        db: Session, 
        status: str, 
        limit: int = 100
    ) -> List[Document]:
        """Get documents with specific status."""
        return db.query(Document).filter(
            Document.upload_status == status
        ).limit(limit).all()

    def get_indexable_documents(self, db: Session, limit: int = 100) -> List[Document]:
        """Get documents that are ready for indexing."""
        return db.query(Document).filter(
            Document.upload_status == "conversion_completed",
            Document.content_extracted == True,
            Document.vector_indexed == False
        ).limit(limit).all()

    def delete(self, db: Session, document_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Delete a document (soft delete by marking as deleted)."""
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id
        ).first()
        if document:
            db.delete(document)
            db.commit()
            return True
        return False


# Create the crud instance
crud_document = CRUDDocument() 