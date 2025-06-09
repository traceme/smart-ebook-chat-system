"""
API Key Encryption Service

Provides secure encryption and decryption of API keys using AES-256 encryption
with PBKDF2 key derivation and unique salts per key.

Security features:
- AES-256-GCM encryption for authenticated encryption
- PBKDF2 key derivation with configurable iterations
- Unique salt per API key
- No plaintext storage of keys
- Secure key validation and verification
"""

import os
import secrets
import hashlib
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from base64 import b64encode, b64decode
import logging

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature, InvalidTag

logger = logging.getLogger(__name__)


@dataclass
class EncryptionConfig:
    """Configuration for API key encryption."""
    
    # PBKDF2 configuration
    pbkdf2_iterations: int = 100000  # Minimum recommended iterations
    pbkdf2_salt_length: int = 32  # 256 bits
    pbkdf2_key_length: int = 32  # 256 bits for AES-256
    
    # AES configuration
    aes_key_length: int = 32  # 256 bits
    aes_iv_length: int = 12  # 96 bits for GCM
    aes_tag_length: int = 16  # 128 bits
    
    # Additional security
    master_key_env_var: str = "API_KEY_MASTER_KEY"
    version: str = "1.0"


@dataclass
class EncryptedAPIKey:
    """Container for encrypted API key data."""
    
    encrypted_data: str  # Base64 encoded
    salt: str  # Base64 encoded
    iv: str  # Base64 encoded
    tag: str  # Base64 encoded for GCM authentication
    key_hash: str  # SHA-256 hash for verification
    version: str  # Encryption version
    

class APIKeyEncryptionError(Exception):
    """Base exception for API key encryption errors."""
    pass


class DecryptionError(APIKeyEncryptionError):
    """Raised when decryption fails."""
    pass


class EncryptionError(APIKeyEncryptionError):
    """Raised when encryption fails."""
    pass


class InvalidKeyError(APIKeyEncryptionError):
    """Raised when API key validation fails."""
    pass


class APIKeyEncryptionService:
    """
    Service for encrypting and decrypting API keys securely.
    
    Uses AES-256-GCM for authenticated encryption and PBKDF2 for key derivation.
    Each API key gets a unique salt for enhanced security.
    """
    
    def __init__(self, config: Optional[EncryptionConfig] = None):
        """Initialize encryption service with configuration."""
        self.config = config or EncryptionConfig()
        self._master_key = self._get_master_key()
        
    def _get_master_key(self) -> bytes:
        """
        Get or generate the master key for encryption.
        
        In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault).
        For development, it can be stored in environment variables.
        """
        master_key_b64 = os.getenv(self.config.master_key_env_var)
        
        if not master_key_b64:
            # Generate a new master key for development
            logger.warning(
                f"No master key found in {self.config.master_key_env_var}. "
                "Generating a new one. This should NOT happen in production."
            )
            master_key = secrets.token_bytes(32)  # 256 bits
            master_key_b64 = b64encode(master_key).decode('utf-8')
            
            logger.warning(
                f"Generated master key: {master_key_b64}\n"
                f"Set this in your environment: export {self.config.master_key_env_var}={master_key_b64}"
            )
            return master_key
        
        try:
            return b64decode(master_key_b64.encode('utf-8'))
        except Exception as e:
            raise APIKeyEncryptionError(f"Invalid master key format: {e}")
    
    def _derive_key(self, salt: bytes) -> bytes:
        """
        Derive encryption key from master key and salt using PBKDF2.
        
        Args:
            salt: Unique salt for this API key
            
        Returns:
            Derived encryption key
        """
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.config.pbkdf2_key_length,
            salt=salt,
            iterations=self.config.pbkdf2_iterations,
            backend=default_backend()
        )
        
        return kdf.derive(self._master_key)
    
    def _generate_salt(self) -> bytes:
        """Generate a cryptographically secure random salt."""
        return secrets.token_bytes(self.config.pbkdf2_salt_length)
    
    def _generate_iv(self) -> bytes:
        """Generate a random initialization vector for AES-GCM."""
        return secrets.token_bytes(self.config.aes_iv_length)
    
    def _hash_key(self, api_key: str) -> str:
        """
        Generate SHA-256 hash of API key for verification.
        
        This allows us to verify the key without storing it in plaintext.
        """
        return hashlib.sha256(api_key.encode('utf-8')).hexdigest()
    
    def encrypt_api_key(self, api_key: str) -> EncryptedAPIKey:
        """
        Encrypt an API key using AES-256-GCM.
        
        Args:
            api_key: The plaintext API key to encrypt
            
        Returns:
            EncryptedAPIKey containing all encrypted data and metadata
            
        Raises:
            EncryptionError: If encryption fails
        """
        try:
            if not api_key or not isinstance(api_key, str):
                raise EncryptionError("API key must be a non-empty string")
            
            # Generate unique salt and IV
            salt = self._generate_salt()
            iv = self._generate_iv()
            
            # Derive encryption key
            encryption_key = self._derive_key(salt)
            
            # Encrypt using AES-256-GCM
            cipher = Cipher(
                algorithms.AES(encryption_key),
                modes.GCM(iv),
                backend=default_backend()
            )
            encryptor = cipher.encryptor()
            
            api_key_bytes = api_key.encode('utf-8')
            ciphertext = encryptor.update(api_key_bytes) + encryptor.finalize()
            tag = encryptor.tag
            
            # Generate key hash for verification
            key_hash = self._hash_key(api_key)
            
            # Return encrypted data
            return EncryptedAPIKey(
                encrypted_data=b64encode(ciphertext).decode('utf-8'),
                salt=b64encode(salt).decode('utf-8'),
                iv=b64encode(iv).decode('utf-8'),
                tag=b64encode(tag).decode('utf-8'),
                key_hash=key_hash,
                version=self.config.version
            )
            
        except Exception as e:
            logger.error(f"API key encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt API key: {e}")
    
    def decrypt_api_key(self, encrypted_key: EncryptedAPIKey) -> str:
        """
        Decrypt an encrypted API key.
        
        Args:
            encrypted_key: EncryptedAPIKey containing encrypted data
            
        Returns:
            Decrypted plaintext API key
            
        Raises:
            DecryptionError: If decryption fails
        """
        try:
            # Decode base64 data
            ciphertext = b64decode(encrypted_key.encrypted_data.encode('utf-8'))
            salt = b64decode(encrypted_key.salt.encode('utf-8'))
            iv = b64decode(encrypted_key.iv.encode('utf-8'))
            tag = b64decode(encrypted_key.tag.encode('utf-8'))
            
            # Derive decryption key
            decryption_key = self._derive_key(salt)
            
            # Decrypt using AES-256-GCM
            cipher = Cipher(
                algorithms.AES(decryption_key),
                modes.GCM(iv, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            
            plaintext_bytes = decryptor.update(ciphertext) + decryptor.finalize()
            decrypted_key = plaintext_bytes.decode('utf-8')
            
            # Verify key hash
            if self._hash_key(decrypted_key) != encrypted_key.key_hash:
                raise DecryptionError("Key hash verification failed")
            
            return decrypted_key
            
        except InvalidTag:
            logger.error("GCM tag verification failed during decryption")
            raise DecryptionError("Authentication tag verification failed")
        except Exception as e:
            logger.error(f"API key decryption failed: {e}")
            raise DecryptionError(f"Failed to decrypt API key: {e}")
    
    def verify_api_key(self, api_key: str, encrypted_key: EncryptedAPIKey) -> bool:
        """
        Verify that a plaintext API key matches the encrypted version.
        
        Args:
            api_key: Plaintext API key to verify
            encrypted_key: Encrypted API key data
            
        Returns:
            True if keys match, False otherwise
        """
        try:
            key_hash = self._hash_key(api_key)
            return key_hash == encrypted_key.key_hash
        except Exception as e:
            logger.error(f"API key verification failed: {e}")
            return False
    
    def rotate_encryption(self, encrypted_key: EncryptedAPIKey) -> EncryptedAPIKey:
        """
        Rotate encryption by decrypting and re-encrypting with new salt/IV.
        
        This is useful for:
        - Upgrading encryption parameters
        - Regular security rotation
        - Migrating to new master keys
        
        Args:
            encrypted_key: Current encrypted API key
            
        Returns:
            New EncryptedAPIKey with updated encryption
        """
        try:
            # Decrypt the current key
            plaintext_key = self.decrypt_api_key(encrypted_key)
            
            # Re-encrypt with new parameters
            return self.encrypt_api_key(plaintext_key)
            
        except Exception as e:
            logger.error(f"Encryption rotation failed: {e}")
            raise EncryptionError(f"Failed to rotate encryption: {e}")
    
    def get_encryption_info(self, encrypted_key: EncryptedAPIKey) -> Dict[str, str]:
        """
        Get information about encrypted key without decrypting it.
        
        Args:
            encrypted_key: Encrypted API key data
            
        Returns:
            Dictionary with encryption metadata
        """
        return {
            'version': encrypted_key.version,
            'salt_length': str(len(b64decode(encrypted_key.salt.encode('utf-8')))),
            'iv_length': str(len(b64decode(encrypted_key.iv.encode('utf-8')))),
            'tag_length': str(len(b64decode(encrypted_key.tag.encode('utf-8')))),
            'ciphertext_length': str(len(b64decode(encrypted_key.encrypted_data.encode('utf-8')))),
            'hash_algorithm': 'SHA-256',
            'encryption_algorithm': 'AES-256-GCM',
            'kdf_algorithm': 'PBKDF2-HMAC-SHA256',
            'kdf_iterations': str(self.config.pbkdf2_iterations),
        }


# Utility functions for integration with database models

def create_encrypted_key_from_db(
    encrypted_data: str,
    salt: str,
    iv: str = None,
    tag: str = None,
    key_hash: str = None,
    version: str = "1.0"
) -> EncryptedAPIKey:
    """
    Create EncryptedAPIKey from database fields.
    
    Args:
        encrypted_data: Base64 encoded encrypted key
        salt: Base64 encoded salt
        iv: Base64 encoded IV (for GCM)
        tag: Base64 encoded authentication tag (for GCM)
        key_hash: SHA-256 hash of original key
        version: Encryption version
        
    Returns:
        EncryptedAPIKey instance
    """
    # Handle legacy encryption without IV/tag
    if not iv:
        iv = b64encode(b'\x00' * 12).decode('utf-8')  # Zero IV for legacy
    if not tag:
        tag = b64encode(b'\x00' * 16).decode('utf-8')  # Zero tag for legacy
    if not key_hash:
        key_hash = ""  # Empty hash for legacy
    
    return EncryptedAPIKey(
        encrypted_data=encrypted_data,
        salt=salt,
        iv=iv,
        tag=tag,
        key_hash=key_hash,
        version=version
    )


def extract_db_fields_from_encrypted_key(encrypted_key: EncryptedAPIKey) -> Dict[str, str]:
    """
    Extract database fields from EncryptedAPIKey.
    
    Args:
        encrypted_key: EncryptedAPIKey instance
        
    Returns:
        Dictionary with database field names and values
    """
    return {
        'encrypted_key': encrypted_key.encrypted_data,
        'key_salt': encrypted_key.salt,
        'key_hash': encrypted_key.key_hash,
        'encryption_version': encrypted_key.version,
        # Additional fields for GCM mode
        'encryption_iv': encrypted_key.iv,
        'encryption_tag': encrypted_key.tag,
    }


# Global service instance
encryption_service = APIKeyEncryptionService() 