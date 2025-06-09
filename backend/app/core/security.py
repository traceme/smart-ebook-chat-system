import secrets
import hashlib
import base64
import ipaddress
from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional, List, Dict
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

from jose import jwt, JWTError
from passlib.context import CryptContext
from passlib.hash import pbkdf2_sha256

from app.core.config import settings

# Set up logging
logger = logging.getLogger(__name__)

# Password context with enhanced security
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=13,  # Increased rounds for better security
)

# JWT Configuration
ALGORITHM = "HS256"
JWT_ISSUER = "smart-ebook-chat"
JWT_AUDIENCE = "smart-ebook-chat-users"

# Security Constants
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 30
PASSWORD_MIN_LENGTH = 12
PASSWORD_COMPLEXITY_REQUIRED = True

class SecurityError(Exception):
    """Base security exception"""
    pass

class AuthenticationError(SecurityError):
    """Authentication failed"""
    pass

class AuthorizationError(SecurityError):
    """Authorization failed"""
    pass

class RateLimitError(SecurityError):
    """Rate limit exceeded"""
    pass

class EncryptionError(SecurityError):
    """Encryption/Decryption failed"""
    pass

# ============================================================================
# DATA ENCRYPTION AND SECURE STORAGE
# ============================================================================

class DataEncryption:
    """AES-256 encryption for sensitive data with PBKDF2 key derivation"""
    
    def __init__(self, master_key: str = None):
        self.master_key = master_key or settings.SECRET_KEY
        self._encryption_key = None
        
    def _derive_key(self, salt: bytes, password: str = None) -> bytes:
        """Derive encryption key using PBKDF2 with SHA-256"""
        password = (password or self.master_key).encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,  # OWASP recommended minimum
        )
        return kdf.derive(password)
    
    def encrypt(self, data: str, password: str = None) -> str:
        """Encrypt data using AES-256 with PBKDF2 key derivation"""
        try:
            # Generate random salt
            salt = secrets.token_bytes(16)
            
            # Derive key
            key = self._derive_key(salt, password)
            
            # Create cipher
            fernet = Fernet(base64.urlsafe_b64encode(key))
            
            # Encrypt data
            encrypted_data = fernet.encrypt(data.encode())
            
            # Combine salt + encrypted data and encode
            combined = salt + encrypted_data
            return base64.urlsafe_b64encode(combined).decode()
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            raise EncryptionError(f"Failed to encrypt data: {e}")
    
    def decrypt(self, encrypted_data: str, password: str = None) -> str:
        """Decrypt AES-256 encrypted data"""
        try:
            # Decode the combined data
            combined = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Extract salt and encrypted data
            salt = combined[:16]
            encrypted_bytes = combined[16:]
            
            # Derive key
            key = self._derive_key(salt, password)
            
            # Create cipher
            fernet = Fernet(base64.urlsafe_b64encode(key))
            
            # Decrypt data
            decrypted_data = fernet.decrypt(encrypted_bytes)
            return decrypted_data.decode()
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            raise EncryptionError(f"Failed to decrypt data: {e}")

# Global encryption instance
data_encryption = DataEncryption()

# ============================================================================
# SECURE API KEY STORAGE
# ============================================================================

class SecureAPIKeyStorage:
    """Secure storage for API keys with encryption"""
    
    def __init__(self):
        self.encryption = DataEncryption()
    
    def store_api_key(self, user_id: str, provider: str, api_key: str) -> str:
        """Store encrypted API key and return storage ID"""
        try:
            # Create unique key for this API key
            storage_key = f"{user_id}:{provider}:{secrets.token_urlsafe(16)}"
            
            # Encrypt the API key
            encrypted_key = self.encryption.encrypt(api_key, storage_key)
            
            # In production, store in secure database or vault
            # For now, we'll return the encrypted key as storage ID
            return encrypted_key
            
        except Exception as e:
            logger.error(f"Failed to store API key: {e}")
            raise SecurityError(f"Failed to store API key: {e}")
    
    def retrieve_api_key(self, user_id: str, provider: str, storage_id: str) -> str:
        """Retrieve and decrypt API key"""
        try:
            # Create the same unique key
            storage_key = f"{user_id}:{provider}:{storage_id.split(':')[-1] if ':' in storage_id else storage_id}"
            
            # Decrypt the API key
            api_key = self.encryption.decrypt(storage_id, storage_key)
            
            return api_key
            
        except Exception as e:
            logger.error(f"Failed to retrieve API key: {e}")
            raise SecurityError(f"Failed to retrieve API key: {e}")
    
    def validate_api_key_format(self, provider: str, api_key: str) -> bool:
        """Validate API key format for different providers"""
        patterns = {
            "openai": lambda k: k.startswith("sk-") and len(k) > 20,
            "anthropic": lambda k: k.startswith("sk-ant-") and len(k) > 30,
            "google": lambda k: len(k) > 20 and k.replace("-", "").replace("_", "").isalnum(),
        }
        
        validator = patterns.get(provider.lower())
        return validator(api_key) if validator else len(api_key) > 10

# ============================================================================
# ENHANCED JWT AUTHENTICATION
# ============================================================================

class JWTManager:
    """Enhanced JWT token management with security features"""
    
    @staticmethod
    def create_access_token(
        subject: Union[str, Any],
        scopes: List[str] = None,
        client_ip: str = None,
        user_agent: str = None,
        expires_delta: timedelta = None
    ) -> str:
        """Create access token with enhanced security claims"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        # Enhanced JWT claims
        claims = {
            "sub": str(subject),
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "iss": JWT_ISSUER,
            "aud": JWT_AUDIENCE,
            "jti": secrets.token_urlsafe(16),  # JWT ID for tracking
            "typ": "access"
        }
        
        # Add optional security claims
        if scopes:
            claims["scopes"] = scopes
        if client_ip:
            claims["ip"] = client_ip
        if user_agent:
            claims["ua"] = hashlib.sha256(user_agent.encode()).hexdigest()[:16]
        
        return jwt.encode(claims, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def create_refresh_token(subject: Union[str, Any]) -> str:
        """Create refresh token"""
        expire = datetime.now(timezone.utc) + timedelta(days=30)
        claims = {
            "sub": str(subject),
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "iss": JWT_ISSUER,
            "aud": JWT_AUDIENCE,
            "jti": secrets.token_urlsafe(16),
            "typ": "refresh"
        }
        return jwt.encode(claims, settings.SECRET_KEY, algorithm=ALGORITHM)
    
    @staticmethod
    def verify_token(
        token: str,
        client_ip: str = None,
        user_agent: str = None,
        expected_type: str = "access"
    ) -> Dict[str, Any]:
        """Verify and validate JWT token with security checks"""
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[ALGORITHM],
                issuer=JWT_ISSUER,
                audience=JWT_AUDIENCE
            )
            
            # Verify token type
            if payload.get("typ") != expected_type:
                raise AuthenticationError("Invalid token type")
            
            # Verify IP address if provided
            if client_ip and "ip" in payload:
                if payload["ip"] != client_ip:
                    logger.warning(f"IP mismatch for token {payload.get('jti')}: {client_ip} vs {payload['ip']}")
                    raise AuthenticationError("Token IP mismatch")
            
            # Verify user agent if provided
            if user_agent and "ua" in payload:
                ua_hash = hashlib.sha256(user_agent.encode()).hexdigest()[:16]
                if payload["ua"] != ua_hash:
                    logger.warning(f"User agent mismatch for token {payload.get('jti')}")
                    raise AuthenticationError("Token user agent mismatch")
            
            return payload
            
        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            raise AuthenticationError("Invalid token")
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise AuthenticationError("Token verification failed")

# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC)
# ============================================================================

class Permission:
    """Permission constants"""
    # Document permissions
    DOCUMENT_READ = "document:read"
    DOCUMENT_WRITE = "document:write"
    DOCUMENT_DELETE = "document:delete"
    DOCUMENT_SHARE = "document:share"
    
    # Chat permissions
    CHAT_READ = "chat:read"
    CHAT_WRITE = "chat:write"
    CHAT_DELETE = "chat:delete"
    
    # User permissions
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    
    # Admin permissions
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    ADMIN_USERS = "admin:users"
    ADMIN_SYSTEM = "admin:system"
    
    # API permissions
    API_KEYS_MANAGE = "api:keys:manage"
    API_USAGE_VIEW = "api:usage:view"

class Role:
    """Role definitions with permissions"""
    
    GUEST = {
        "name": "guest",
        "permissions": [Permission.DOCUMENT_READ]
    }
    
    USER = {
        "name": "user",
        "permissions": [
            Permission.DOCUMENT_READ,
            Permission.DOCUMENT_WRITE,
            Permission.DOCUMENT_DELETE,
            Permission.CHAT_READ,
            Permission.CHAT_WRITE,
            Permission.CHAT_DELETE,
            Permission.USER_READ,
            Permission.USER_WRITE,
            Permission.API_KEYS_MANAGE,
            Permission.API_USAGE_VIEW
        ]
    }
    
    PREMIUM = {
        "name": "premium",
        "permissions": [
            *USER["permissions"],
            Permission.DOCUMENT_SHARE,
        ]
    }
    
    ADMIN = {
        "name": "admin",
        "permissions": [
            *PREMIUM["permissions"],
            Permission.ADMIN_READ,
            Permission.ADMIN_WRITE,
            Permission.ADMIN_USERS,
            Permission.ADMIN_SYSTEM,
            Permission.USER_DELETE
        ]
    }

class RBACManager:
    """Role-Based Access Control Manager"""
    
    @staticmethod
    def check_permission(user_role: str, required_permission: str) -> bool:
        """Check if user role has required permission"""
        role_permissions = {
            "guest": Role.GUEST["permissions"],
            "user": Role.USER["permissions"],
            "premium": Role.PREMIUM["permissions"],
            "admin": Role.ADMIN["permissions"]
        }
        
        permissions = role_permissions.get(user_role, [])
        return required_permission in permissions
    
    @staticmethod
    def get_user_permissions(user_role: str) -> List[str]:
        """Get all permissions for a user role"""
        role_permissions = {
            "guest": Role.GUEST["permissions"],
            "user": Role.USER["permissions"],
            "premium": Role.PREMIUM["permissions"],
            "admin": Role.ADMIN["permissions"]
        }
        
        return role_permissions.get(user_role, [])

# ============================================================================
# IP-BASED RESTRICTIONS
# ============================================================================

class IPRestrictionManager:
    """IP-based access control"""
    
    def __init__(self):
        # In production, load from database
        self.blocked_ips = set()
        self.allowed_networks = [
            ipaddress.ip_network("10.0.0.0/8"),
            ipaddress.ip_network("172.16.0.0/12"),
            ipaddress.ip_network("192.168.0.0/16"),
        ]
        self.admin_only_networks = [
            ipaddress.ip_network("10.0.0.0/24"),  # Admin network
        ]
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        try:
            return ipaddress.ip_address(ip) in self.blocked_ips
        except ValueError:
            return True  # Invalid IP format
    
    def is_ip_allowed_for_admin(self, ip: str) -> bool:
        """Check if IP is allowed for admin access"""
        try:
            ip_addr = ipaddress.ip_address(ip)
            return any(ip_addr in network for network in self.admin_only_networks)
        except ValueError:
            return False
    
    def block_ip(self, ip: str, reason: str = None):
        """Block an IP address"""
        try:
            self.blocked_ips.add(ipaddress.ip_address(ip))
            logger.warning(f"Blocked IP {ip}: {reason}")
        except ValueError:
            logger.error(f"Invalid IP format: {ip}")

# ============================================================================
# ENHANCED PASSWORD SECURITY
# ============================================================================

class PasswordSecurity:
    """Enhanced password security with complexity requirements"""
    
    @staticmethod
    def validate_password_complexity(password: str) -> tuple[bool, List[str]]:
        """Validate password complexity"""
        errors = []
        
        if len(password) < PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long")
        
        if not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def check_password_strength(password: str) -> str:
        """Check password strength and return rating"""
        score = 0
        
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        if any(c.isupper() for c in password):
            score += 1
        if any(c.islower() for c in password):
            score += 1
        if any(c.isdigit() for c in password):
            score += 1
        if any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            score += 1
        if len(set(password)) > len(password) * 0.7:  # Character diversity
            score += 1
        
        if score <= 2:
            return "weak"
        elif score <= 4:
            return "medium"
        elif score <= 6:
            return "strong"
        else:
            return "very_strong"

# ============================================================================
# LEGACY FUNCTIONS (Enhanced)
# ============================================================================

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: timedelta = None,
    scopes: List[str] = None,
    client_ip: str = None,
    user_agent: str = None
) -> str:
    """Enhanced version of the original function"""
    return JWTManager.create_access_token(
        subject=subject,
        expires_delta=expires_delta,
        scopes=scopes,
        client_ip=client_ip,
        user_agent=user_agent
    )

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password with enhanced security"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Get password hash with enhanced security"""
    # Validate password complexity if required
    if PASSWORD_COMPLEXITY_REQUIRED:
        is_valid, errors = PasswordSecurity.validate_password_complexity(password)
        if not is_valid:
            raise SecurityError(f"Password complexity requirements not met: {', '.join(errors)}")
    
    return pwd_context.hash(password)

# ============================================================================
# SECURITY UTILITIES
# ============================================================================

def generate_secure_token(length: int = 32) -> str:
    """Generate cryptographically secure random token"""
    return secrets.token_urlsafe(length)

def constant_time_compare(val1: str, val2: str) -> bool:
    """Constant time string comparison to prevent timing attacks"""
    return secrets.compare_digest(val1.encode(), val2.encode())

def hash_sensitive_data(data: str, salt: str = None) -> str:
    """Hash sensitive data with salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    return hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000).hex()

# ============================================================================
# GLOBAL INSTANCES
# ============================================================================

jwt_manager = JWTManager()
rbac_manager = RBACManager()
ip_restriction_manager = IPRestrictionManager()
api_key_storage = SecureAPIKeyStorage()
password_security = PasswordSecurity() 