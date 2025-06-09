import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_URL,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name='us-east-1'  # MinIO default
        )
        self.bucket_name = settings.MINIO_BUCKET
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                print(f"Created bucket: {self.bucket_name}")
            except ClientError as e:
                print(f"Error creating bucket: {e}")
        except Exception as e:
            print(f"Error connecting to MinIO: {e}")
    
    def generate_storage_path(self, user_id: uuid.UUID, filename: str, file_hash: str) -> str:
        """Generate a unique storage path for the document."""
        # Use hash prefix for deduplication and organization
        hash_prefix = file_hash[:2]
        hash_suffix = file_hash[2:8]
        
        # Create path: documents/{hash_prefix}/{hash_suffix}/{user_id}/{filename}
        return f"documents/{hash_prefix}/{hash_suffix}/{user_id}/{filename}"
    
    def generate_presigned_upload_url(
        self, 
        storage_path: str, 
        expiration: int = 3600
    ) -> str:
        """Generate a presigned URL for uploading a file."""
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': storage_path,
                    'ContentType': 'application/octet-stream'
                },
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def generate_presigned_download_url(
        self, 
        storage_path: str, 
        expiration: int = 3600
    ) -> str:
        """Generate a presigned URL for downloading a file."""
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': storage_path
                },
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            print(f"Error generating download URL: {e}")
            return None
    
    def check_file_exists(self, storage_path: str) -> bool:
        """Check if a file exists in storage."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=storage_path)
            return True
        except ClientError:
            return False
    
    def delete_file(self, storage_path: str) -> bool:
        """Delete a file from storage."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_path)
            return True
        except ClientError as e:
            print(f"Error deleting file: {e}")
            return False
    
    def get_file_size(self, storage_path: str) -> Optional[int]:
        """Get the size of a file in storage."""
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=storage_path)
            return response['ContentLength']
        except ClientError:
            return None

# Create a singleton instance
storage_service = StorageService() 