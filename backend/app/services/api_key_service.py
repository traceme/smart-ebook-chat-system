"""
API Key Management Service

Provides high-level API key management functionality including:
- Secure storage and retrieval of API keys
- Key validation against provider APIs
- Usage tracking and analytics
- Key rotation and lifecycle management
"""

import asyncio
import httpx
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
import uuid

from app.models.api_key import APIKey, APIKeyUsageLog, APIKeyValidation, APIProviderType
from app.services.api_key_encryption import (
    encryption_service,
    EncryptedAPIKey,
    create_encrypted_key_from_db,
    extract_db_fields_from_encrypted_key,
    APIKeyEncryptionError
)
from app.db.session import SessionLocal
from app import crud

logger = logging.getLogger(__name__)


class APIKeyValidationError(Exception):
    """Raised when API key validation fails."""
    pass


class APIKeyNotFoundError(Exception):
    """Raised when API key is not found."""
    pass


class APIKeyServiceError(Exception):
    """Base exception for API key service errors."""
    pass


class APIKeyService:
    """
    High-level service for managing API keys securely.
    
    Provides functionality for:
    - Adding and managing API keys
    - Encrypting and decrypting keys
    - Validating keys against providers
    - Tracking usage and costs
    - Key lifecycle management
    """
    
    def __init__(self):
        """Initialize API key service."""
        self.encryption_service = encryption_service
        
        # Provider validation endpoints
        self.validation_endpoints = {
            APIProviderType.OPENAI: {
                "url": "https://api.openai.com/v1/models",
                "headers": lambda key: {"Authorization": f"Bearer {key}"},
                "success_codes": [200],
                "timeout": 10,
            },
            APIProviderType.ANTHROPIC: {
                "url": "https://api.anthropic.com/v1/messages",
                "headers": lambda key: {
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                "method": "POST",
                "data": {
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "test"}]
                },
                "success_codes": [200, 400],  # 400 is OK for validation
                "timeout": 15,
            },
            APIProviderType.GOOGLE: {
                "url": "https://generativelanguage.googleapis.com/v1/models",
                "headers": lambda key: {},
                "params": lambda key: {"key": key},
                "success_codes": [200],
                "timeout": 10,
            },
        }
    
    async def add_api_key(
        self,
        user_id: str,
        name: str,
        provider: str,
        api_key: str,
        endpoint_url: Optional[str] = None,
        validate_key: bool = True,
        set_as_active: bool = False,
        client_ip: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add a new API key for a user.
        
        Args:
            user_id: User UUID
            name: Human-readable name for the key
            provider: Provider type (openai, anthropic, etc.)
            api_key: The actual API key to encrypt and store
            endpoint_url: Optional endpoint URL (for Azure, etc.)
            validate_key: Whether to validate the key against provider
            set_as_active: Whether to set this as the active key
            client_ip: Client IP address for audit trail
            
        Returns:
            Dictionary with key information and validation results
        """
        try:
            db = SessionLocal()
            
            # Validate provider
            if provider not in [p.value for p in APIProviderType]:
                raise APIKeyServiceError(f"Unsupported provider: {provider}")
            
            # Check if user already has a key with this name
            existing_key = db.query(APIKey).filter(
                and_(
                    APIKey.user_id == uuid.UUID(user_id),
                    APIKey.name == name,
                    APIKey.deleted_at.is_(None)
                )
            ).first()
            
            if existing_key:
                raise APIKeyServiceError(f"Key with name '{name}' already exists")
            
            # Encrypt the API key
            try:
                encrypted_key = self.encryption_service.encrypt_api_key(api_key)
            except APIKeyEncryptionError as e:
                raise APIKeyServiceError(f"Failed to encrypt API key: {e}")
            
            # If this is the first key for the user, set it as active
            if set_as_active or not self._user_has_active_key(db, user_id):
                # Deactivate other keys
                db.query(APIKey).filter(
                    and_(
                        APIKey.user_id == uuid.UUID(user_id),
                        APIKey.is_active == True,
                        APIKey.deleted_at.is_(None)
                    )
                ).update({"is_active": False})
                set_as_active = True
            
            # Create database record
            db_fields = extract_db_fields_from_encrypted_key(encrypted_key)
            db_key = APIKey(
                user_id=uuid.UUID(user_id),
                name=name,
                provider=provider,
                encrypted_key=db_fields['encrypted_key'],
                key_salt=db_fields['key_salt'],
                key_hash=db_fields['key_hash'],
                endpoint_url=endpoint_url,
                is_active=set_as_active,
                created_from_ip=client_ip,
                encryption_version=db_fields['encryption_version'],
                metadata={}
            )
            
            # Handle GCM fields if available
            if 'encryption_iv' in db_fields:
                db_key.metadata['encryption_iv'] = db_fields['encryption_iv']
            if 'encryption_tag' in db_fields:
                db_key.metadata['encryption_tag'] = db_fields['encryption_tag']
            
            db.add(db_key)
            db.commit()
            db.refresh(db_key)
            
            result = {
                "id": str(db_key.id),
                "name": db_key.name,
                "provider": db_key.provider,
                "is_active": db_key.is_active,
                "created_at": db_key.created_at.isoformat(),
                "validation": None
            }
            
            # Validate the key if requested
            if validate_key:
                try:
                    validation_result = await self.validate_api_key(str(db_key.id))
                    result["validation"] = validation_result
                except Exception as e:
                    logger.warning(f"Key validation failed for {db_key.id}: {e}")
                    result["validation"] = {
                        "is_valid": False,
                        "error": str(e),
                        "validated_at": datetime.utcnow().isoformat()
                    }
            
            db.close()
            return result
            
        except Exception as e:
            if 'db' in locals():
                db.rollback()
                db.close()
            logger.error(f"Failed to add API key: {e}")
            raise APIKeyServiceError(f"Failed to add API key: {e}")
    
    async def get_user_api_keys(
        self,
        user_id: str,
        include_deleted: bool = False,
        include_usage: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get all API keys for a user.
        
        Args:
            user_id: User UUID
            include_deleted: Whether to include soft-deleted keys
            include_usage: Whether to include usage statistics
            
        Returns:
            List of API key information (without decrypted keys)
        """
        try:
            db = SessionLocal()
            
            query = db.query(APIKey).filter(APIKey.user_id == uuid.UUID(user_id))
            
            if not include_deleted:
                query = query.filter(APIKey.deleted_at.is_(None))
            
            keys = query.order_by(desc(APIKey.created_at)).all()
            
            result = []
            for key in keys:
                key_info = {
                    "id": str(key.id),
                    "name": key.name,
                    "provider": key.provider,
                    "endpoint_url": key.endpoint_url,
                    "is_active": key.is_active,
                    "is_validated": key.is_validated,
                    "validation_details": key.validation_details,
                    "created_at": key.created_at.isoformat(),
                    "updated_at": key.updated_at.isoformat(),
                    "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
                    "validated_at": key.validated_at.isoformat() if key.validated_at else None,
                    "is_deleted": key.is_deleted,
                    "is_expired": key.is_expired,
                    "is_usable": key.is_usable,
                }
                
                if include_usage:
                    key_info["usage"] = {
                        "total_requests": int(key.total_requests or "0"),
                        "total_tokens": int(key.total_tokens or "0"),
                        "total_cost": float(key.total_cost or "0.00"),
                    }
                
                result.append(key_info)
            
            db.close()
            return result
            
        except Exception as e:
            logger.error(f"Failed to get user API keys: {e}")
            raise APIKeyServiceError(f"Failed to get user API keys: {e}")
    
    async def get_api_key(
        self,
        key_id: str,
        user_id: Optional[str] = None,
        decrypt: bool = False
    ) -> Dict[str, Any]:
        """
        Get a specific API key by ID.
        
        Args:
            key_id: API key UUID
            user_id: User UUID (for authorization)
            decrypt: Whether to decrypt and include the actual key
            
        Returns:
            API key information
        """
        try:
            db = SessionLocal()
            
            query = db.query(APIKey).filter(APIKey.id == uuid.UUID(key_id))
            
            if user_id:
                query = query.filter(APIKey.user_id == uuid.UUID(user_id))
            
            key = query.first()
            
            if not key:
                raise APIKeyNotFoundError(f"API key not found: {key_id}")
            
            result = {
                "id": str(key.id),
                "name": key.name,
                "provider": key.provider,
                "endpoint_url": key.endpoint_url,
                "is_active": key.is_active,
                "is_validated": key.is_validated,
                "validation_details": key.validation_details,
                "created_at": key.created_at.isoformat(),
                "updated_at": key.updated_at.isoformat(),
                "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
                "usage": {
                    "total_requests": int(key.total_requests or "0"),
                    "total_tokens": int(key.total_tokens or "0"),
                    "total_cost": float(key.total_cost or "0.00"),
                },
            }
            
            if decrypt:
                try:
                    # Reconstruct encrypted key from database
                    encrypted_key = create_encrypted_key_from_db(
                        encrypted_data=key.encrypted_key,
                        salt=key.key_salt,
                        iv=key.metadata.get('encryption_iv'),
                        tag=key.metadata.get('encryption_tag'),
                        key_hash=key.key_hash,
                        version=key.encryption_version
                    )
                    
                    decrypted_key = self.encryption_service.decrypt_api_key(encrypted_key)
                    result["decrypted_key"] = decrypted_key
                    result["masked_key"] = self._mask_key(decrypted_key)
                    
                except APIKeyEncryptionError as e:
                    logger.error(f"Failed to decrypt API key {key_id}: {e}")
                    result["decryption_error"] = str(e)
            
            db.close()
            return result
            
        except Exception as e:
            logger.error(f"Failed to get API key: {e}")
            raise APIKeyServiceError(f"Failed to get API key: {e}")
    
    async def validate_api_key(self, key_id: str) -> Dict[str, Any]:
        """
        Validate an API key against its provider.
        
        Args:
            key_id: API key UUID
            
        Returns:
            Validation result with details
        """
        try:
            db = SessionLocal()
            
            key = db.query(APIKey).filter(APIKey.id == uuid.UUID(key_id)).first()
            
            if not key:
                raise APIKeyNotFoundError(f"API key not found: {key_id}")
            
            # Decrypt the key
            encrypted_key = create_encrypted_key_from_db(
                encrypted_data=key.encrypted_key,
                salt=key.key_salt,
                iv=key.metadata.get('encryption_iv'),
                tag=key.metadata.get('encryption_tag'),
                key_hash=key.key_hash,
                version=key.encryption_version
            )
            
            decrypted_key = self.encryption_service.decrypt_api_key(encrypted_key)
            
            # Validate against provider
            validation_config = self.validation_endpoints.get(APIProviderType(key.provider))
            
            if not validation_config:
                raise APIKeyValidationError(f"Validation not supported for provider: {key.provider}")
            
            validation_result = await self._validate_with_provider(
                decrypted_key, 
                validation_config, 
                key.endpoint_url
            )
            
            # Update database with validation result
            key.is_validated = validation_result["is_valid"]
            key.validated_at = datetime.utcnow()
            key.validation_details = validation_result
            
            # Log validation attempt
            validation_log = APIKeyValidation(
                api_key_id=key.id,
                validation_type="manual",
                is_valid=validation_result["is_valid"],
                response_time_ms=str(validation_result.get("response_time_ms", 0)),
                error_code=validation_result.get("error_code"),
                error_message=validation_result.get("error_message"),
                provider_models=validation_result.get("models"),
                quota_info=validation_result.get("quota_info"),
                metadata=validation_result
            )
            
            db.add(validation_log)
            db.commit()
            db.close()
            
            return validation_result
            
        except Exception as e:
            if 'db' in locals():
                db.rollback()
                db.close()
            logger.error(f"API key validation failed: {e}")
            raise APIKeyValidationError(f"Validation failed: {e}")
    
    async def _validate_with_provider(
        self,
        api_key: str,
        config: Dict[str, Any],
        endpoint_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate API key with specific provider.
        
        Args:
            api_key: Decrypted API key
            config: Provider validation configuration
            endpoint_url: Optional custom endpoint (for Azure)
            
        Returns:
            Validation result dictionary
        """
        start_time = datetime.utcnow()
        
        try:
            url = endpoint_url or config["url"]
            headers = config["headers"](api_key)
            timeout = config.get("timeout", 10)
            method = config.get("method", "GET")
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                
                if method == "POST":
                    response = await client.post(
                        url,
                        headers=headers,
                        json=config.get("data", {}),
                        params=config.get("params", lambda k: {})(api_key)
                    )
                else:
                    response = await client.get(
                        url,
                        headers=headers,
                        params=config.get("params", lambda k: {})(api_key)
                    )
                
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                is_valid = response.status_code in config["success_codes"]
                
                result = {
                    "is_valid": is_valid,
                    "status_code": response.status_code,
                    "response_time_ms": int(response_time),
                    "validated_at": datetime.utcnow().isoformat(),
                }
                
                if is_valid:
                    try:
                        response_data = response.json()
                        
                        # Extract provider-specific information
                        if "data" in response_data:  # OpenAI format
                            result["models"] = [model["id"] for model in response_data["data"]]
                        elif "models" in response_data:  # Google format
                            result["models"] = [model["name"] for model in response_data["models"]]
                        
                        result["provider_response"] = response_data
                        
                    except Exception:
                        pass  # JSON parsing failed, that's OK
                        
                else:
                    result["error_code"] = str(response.status_code)
                    result["error_message"] = response.text[:500]  # Limit error message length
                
                return result
                
        except httpx.TimeoutException:
            return {
                "is_valid": False,
                "error_code": "timeout",
                "error_message": "Request timed out",
                "response_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                "validated_at": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            return {
                "is_valid": False,
                "error_code": "network_error",
                "error_message": str(e),
                "response_time_ms": int((datetime.utcnow() - start_time).total_seconds() * 1000),
                "validated_at": datetime.utcnow().isoformat(),
            }
    
    async def update_api_key(
        self,
        key_id: str,
        user_id: str,
        name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """
        Update API key metadata (not the key itself).
        
        Args:
            key_id: API key UUID
            user_id: User UUID
            name: New name for the key
            endpoint_url: New endpoint URL
            is_active: Whether to set as active
            
        Returns:
            Updated key information
        """
        try:
            db = SessionLocal()
            
            key = db.query(APIKey).filter(
                and_(
                    APIKey.id == uuid.UUID(key_id),
                    APIKey.user_id == uuid.UUID(user_id),
                    APIKey.deleted_at.is_(None)
                )
            ).first()
            
            if not key:
                raise APIKeyNotFoundError(f"API key not found: {key_id}")
            
            # Update fields
            if name is not None:
                # Check for name conflicts
                existing_key = db.query(APIKey).filter(
                    and_(
                        APIKey.user_id == uuid.UUID(user_id),
                        APIKey.name == name,
                        APIKey.id != uuid.UUID(key_id),
                        APIKey.deleted_at.is_(None)
                    )
                ).first()
                
                if existing_key:
                    raise APIKeyServiceError(f"Key with name '{name}' already exists")
                
                key.name = name
            
            if endpoint_url is not None:
                key.endpoint_url = endpoint_url
            
            if is_active is not None:
                if is_active:
                    # Deactivate other keys
                    db.query(APIKey).filter(
                        and_(
                            APIKey.user_id == uuid.UUID(user_id),
                            APIKey.is_active == True,
                            APIKey.id != uuid.UUID(key_id),
                            APIKey.deleted_at.is_(None)
                        )
                    ).update({"is_active": False})
                
                key.is_active = is_active
            
            key.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(key)
            
            result = {
                "id": str(key.id),
                "name": key.name,
                "provider": key.provider,
                "endpoint_url": key.endpoint_url,
                "is_active": key.is_active,
                "updated_at": key.updated_at.isoformat(),
            }
            
            db.close()
            return result
            
        except Exception as e:
            if 'db' in locals():
                db.rollback()
                db.close()
            logger.error(f"Failed to update API key: {e}")
            raise APIKeyServiceError(f"Failed to update API key: {e}")
    
    async def delete_api_key(self, key_id: str, user_id: str) -> bool:
        """
        Soft delete an API key.
        
        Args:
            key_id: API key UUID
            user_id: User UUID
            
        Returns:
            True if deleted successfully
        """
        try:
            db = SessionLocal()
            
            key = db.query(APIKey).filter(
                and_(
                    APIKey.id == uuid.UUID(key_id),
                    APIKey.user_id == uuid.UUID(user_id),
                    APIKey.deleted_at.is_(None)
                )
            ).first()
            
            if not key:
                raise APIKeyNotFoundError(f"API key not found: {key_id}")
            
            # Soft delete
            key.deleted_at = datetime.utcnow()
            key.is_active = False
            
            # If this was the active key, activate another one if available
            if key.is_active:
                other_key = db.query(APIKey).filter(
                    and_(
                        APIKey.user_id == uuid.UUID(user_id),
                        APIKey.id != uuid.UUID(key_id),
                        APIKey.deleted_at.is_(None)
                    )
                ).first()
                
                if other_key:
                    other_key.is_active = True
            
            db.commit()
            db.close()
            
            return True
            
        except Exception as e:
            if 'db' in locals():
                db.rollback()
                db.close()
            logger.error(f"Failed to delete API key: {e}")
            raise APIKeyServiceError(f"Failed to delete API key: {e}")
    
    async def record_usage(
        self,
        key_id: str,
        model_name: str,
        request_type: str,
        input_tokens: int,
        output_tokens: int,
        cost: float,
        success: bool = True,
        error_message: Optional[str] = None,
        latency_ms: Optional[int] = None,
        request_metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record API key usage for tracking and billing.
        
        Args:
            key_id: API key UUID
            model_name: Name of the model used
            request_type: Type of request (completion, embedding, etc.)
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            cost: Cost of the request
            success: Whether the request was successful
            error_message: Error message if failed
            latency_ms: Request latency in milliseconds
            request_metadata: Additional metadata
            
        Returns:
            True if recorded successfully
        """
        try:
            db = SessionLocal()
            
            key = db.query(APIKey).filter(APIKey.id == uuid.UUID(key_id)).first()
            
            if not key:
                logger.warning(f"API key not found for usage recording: {key_id}")
                return False
            
            total_tokens = input_tokens + output_tokens
            
            # Record usage log
            usage_log = APIKeyUsageLog(
                api_key_id=key.id,
                user_id=key.user_id,
                model_name=model_name,
                request_type=request_type,
                input_tokens=str(input_tokens),
                output_tokens=str(output_tokens),
                total_tokens=str(total_tokens),
                cost=str(cost),
                success=success,
                error_message=error_message,
                latency_ms=str(latency_ms) if latency_ms else None,
                metadata=request_metadata or {}
            )
            
            db.add(usage_log)
            
            # Update key totals
            if success:
                key.total_requests = str(int(key.total_requests or "0") + 1)
                key.total_tokens = str(int(key.total_tokens or "0") + total_tokens)
                key.total_cost = str(float(key.total_cost or "0.00") + cost)
                key.last_used_at = datetime.utcnow()
            
            db.commit()
            db.close()
            
            return True
            
        except Exception as e:
            if 'db' in locals():
                db.rollback()
                db.close()
            logger.error(f"Failed to record API key usage: {e}")
            return False
    
    def _user_has_active_key(self, db: Session, user_id: str) -> bool:
        """Check if user has any active API keys."""
        return db.query(APIKey).filter(
            and_(
                APIKey.user_id == uuid.UUID(user_id),
                APIKey.is_active == True,
                APIKey.deleted_at.is_(None)
            )
        ).first() is not None
    
    def _mask_key(self, api_key: str) -> str:
        """Mask API key for display."""
        if len(api_key) <= 8:
            return "***"
        return api_key[:4] + "***" + api_key[-4:]


# Global service instance
api_key_service = APIKeyService() 