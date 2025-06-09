"""
Unit tests for security functionality.

Tests for:
- JWT token creation and verification
- Password hashing and verification
- Access token management
- Security utilities
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from app.core.security import (
    create_access_token,
    verify_token,
    verify_password,
    get_password_hash,
    create_password_reset_token,
    verify_password_reset_token,
)
from app.core.config import settings


class TestPasswordSecurity:
    """Test password hashing and verification."""
    
    def test_password_hashing(self):
        """Test password hashing generates different hashes for same password."""
        password = "test_password_123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        assert hash1 != hash2  # Different salts should produce different hashes
        assert len(hash1) > 50  # Reasonable hash length
        assert hash1.startswith("$2b$")  # bcrypt format
    
    def test_password_verification_success(self):
        """Test successful password verification."""
        password = "secure_password_456"
        password_hash = get_password_hash(password)
        
        assert verify_password(password, password_hash) is True
    
    def test_password_verification_failure(self):
        """Test failed password verification."""
        password = "correct_password"
        wrong_password = "wrong_password"
        password_hash = get_password_hash(password)
        
        assert verify_password(wrong_password, password_hash) is False
    
    def test_password_verification_empty_password(self):
        """Test password verification with empty password."""
        password_hash = get_password_hash("some_password")
        
        assert verify_password("", password_hash) is False
        assert verify_password(None, password_hash) is False


class TestJWTSecurity:
    """Test JWT token creation and verification."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "user123", "role": "user"}
        token = create_access_token(data=data)
        
        assert isinstance(token, str)
        assert len(token) > 50  # Reasonable token length
        assert "." in token  # JWT format (header.payload.signature)
    
    def test_create_access_token_with_expiry(self):
        """Test access token creation with custom expiry."""
        data = {"sub": "user123"}
        expires_delta = timedelta(minutes=60)
        token = create_access_token(data=data, expires_delta=expires_delta)
        
        # Verify token can be decoded
        payload = verify_token(token)
        assert payload is not None
        assert payload.get("sub") == "user123"
    
    def test_verify_valid_token(self):
        """Test verification of valid token."""
        data = {"sub": "user456", "email": "test@example.com"}
        token = create_access_token(data=data)
        
        payload = verify_token(token)
        assert payload is not None
        assert payload.get("sub") == "user456"
        assert payload.get("email") == "test@example.com"
        assert "exp" in payload  # Expiration should be set
    
    def test_verify_invalid_token(self):
        """Test verification of invalid token."""
        invalid_token = "invalid.jwt.token"
        payload = verify_token(invalid_token)
        assert payload is None
    
    def test_verify_expired_token(self):
        """Test verification of expired token."""
        data = {"sub": "user789"}
        past_time = timedelta(seconds=-1)  # Already expired
        token = create_access_token(data=data, expires_delta=past_time)
        
        payload = verify_token(token)
        assert payload is None
    
    def test_verify_token_malformed(self):
        """Test verification of malformed tokens."""
        malformed_tokens = [
            "",
            "not.a.jwt",
            "header.payload",  # Missing signature
            "too.many.parts.here.error",
        ]
        
        for token in malformed_tokens:
            payload = verify_token(token)
            assert payload is None


class TestPasswordResetSecurity:
    """Test password reset token functionality."""
    
    def test_create_password_reset_token(self):
        """Test password reset token creation."""
        email = "test@example.com"
        token = create_password_reset_token(email)
        
        assert isinstance(token, str)
        assert len(token) > 50
    
    def test_verify_password_reset_token_valid(self):
        """Test verification of valid password reset token."""
        email = "reset@example.com"
        token = create_password_reset_token(email)
        
        verified_email = verify_password_reset_token(token)
        assert verified_email == email
    
    def test_verify_password_reset_token_invalid(self):
        """Test verification of invalid password reset token."""
        invalid_token = "invalid.reset.token"
        verified_email = verify_password_reset_token(invalid_token)
        assert verified_email is None
    
    def test_verify_password_reset_token_expired(self):
        """Test verification of expired password reset token."""
        email = "expired@example.com"
        
        # Mock time to create an expired token
        with patch('app.core.security.datetime') as mock_datetime:
            # Set current time to past for token creation
            past_time = datetime.utcnow() - timedelta(hours=2)
            mock_datetime.utcnow.return_value = past_time
            token = create_password_reset_token(email)
        
        # Verify with real current time (token should be expired)
        verified_email = verify_password_reset_token(token)
        assert verified_email is None


class TestSecurityConfiguration:
    """Test security configuration and settings."""
    
    def test_secret_key_exists(self):
        """Test that secret key is configured."""
        assert hasattr(settings, 'SECRET_KEY')
        assert settings.SECRET_KEY is not None
        assert len(settings.SECRET_KEY) > 10  # Reasonable minimum length
    
    def test_token_expiry_configuration(self):
        """Test token expiry configuration."""
        assert hasattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES')
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0
        assert settings.ACCESS_TOKEN_EXPIRE_MINUTES <= 1440  # Max 24 hours
    
    def test_algorithm_configuration(self):
        """Test JWT algorithm configuration."""
        from app.core.security import ALGORITHM
        assert ALGORITHM == "HS256"  # Expected algorithm


@pytest.mark.performance
class TestSecurityPerformance:
    """Test security performance characteristics."""
    
    def test_password_hashing_performance(self):
        """Test password hashing performance."""
        import time
        
        password = "performance_test_password"
        start_time = time.time()
        
        # Hash 10 passwords
        for _ in range(10):
            get_password_hash(password)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert duration < 2.0  # 2 seconds for 10 hashes
    
    def test_token_creation_performance(self):
        """Test JWT token creation performance."""
        import time
        
        data = {"sub": "user123", "email": "test@example.com"}
        start_time = time.time()
        
        # Create 100 tokens
        for _ in range(100):
            create_access_token(data=data)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly
        assert duration < 1.0  # 1 second for 100 tokens
    
    def test_token_verification_performance(self):
        """Test JWT token verification performance."""
        import time
        
        data = {"sub": "user123"}
        token = create_access_token(data=data)
        
        start_time = time.time()
        
        # Verify 100 tokens
        for _ in range(100):
            verify_token(token)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete quickly
        assert duration < 1.0  # 1 second for 100 verifications 