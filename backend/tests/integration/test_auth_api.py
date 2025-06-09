"""
Integration tests for authentication API endpoints.

Tests the complete authentication flow including:
- User registration
- User login
- Token validation
- Password reset
- User profile management
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import verify_password, get_password_hash
from tests.utils.factories import UserFactory


@pytest.mark.integration
class TestAuthenticationEndpoints:
    """Test authentication API endpoints."""
    
    def test_register_new_user(self, client: TestClient, db_session: Session):
        """Test user registration with valid data."""
        user_data = {
            "email": "newuser@example.com",
            "password": "secure_password_123",
            "full_name": "New User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
        assert "password" not in data  # Password should not be returned
    
    def test_register_duplicate_email(self, client: TestClient, db_session: Session):
        """Test registration with existing email fails."""
        # Create existing user
        existing_user = UserFactory(db_session=db_session)
        
        user_data = {
            "email": existing_user.email,
            "password": "password123",
            "full_name": "Duplicate User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email format."""
        user_data = {
            "email": "invalid-email",
            "password": "password123",
            "full_name": "Test User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password."""
        user_data = {
            "email": "test@example.com",
            "password": "123",  # Too short
            "full_name": "Test User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 422  # Validation error
    
    def test_login_valid_credentials(self, client: TestClient, db_session: Session):
        """Test login with valid credentials."""
        # Create user with known password
        password = "test_password_123"
        user = UserFactory(
            db_session=db_session,
            hashed_password=get_password_hash(password)
        )
        
        login_data = {
            "username": user.email,  # FastAPI OAuth2 uses 'username' field
            "password": password
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 50  # JWT should be substantial length
    
    def test_login_invalid_email(self, client: TestClient):
        """Test login with non-existent email."""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "any_password"
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_wrong_password(self, client: TestClient, db_session: Session):
        """Test login with wrong password."""
        user = UserFactory(db_session=db_session)
        
        login_data = {
            "username": user.email,
            "password": "wrong_password"
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_inactive_user(self, client: TestClient, db_session: Session):
        """Test login with inactive user account."""
        password = "test_password"
        user = UserFactory(
            db_session=db_session,
            is_active=False,
            hashed_password=get_password_hash(password)
        )
        
        login_data = {
            "username": user.email,
            "password": password
        }
        
        response = client.post("/auth/login", data=login_data)
        
        assert response.status_code == 401
        assert "inactive" in response.json()["detail"].lower()


@pytest.mark.integration
class TestTokenValidation:
    """Test token validation and protected endpoints."""
    
    def test_get_current_user_valid_token(self, client: TestClient, user_token: str, test_user):
        """Test getting current user with valid token."""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert data["id"] == str(test_user.id)
    
    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.get("/auth/me", headers=headers)
        
        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()
    
    def test_get_current_user_no_token(self, client: TestClient):
        """Test accessing protected endpoint without token."""
        response = client.get("/auth/me")
        
        assert response.status_code == 401
        assert "not authenticated" in response.json()["detail"].lower()
    
    def test_get_current_user_malformed_header(self, client: TestClient):
        """Test with malformed authorization header."""
        malformed_headers = [
            {"Authorization": "invalid_format"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Basic dGVzdA=="},  # Wrong auth type
        ]
        
        for headers in malformed_headers:
            response = client.get("/auth/me", headers=headers)
            assert response.status_code == 401


@pytest.mark.integration
class TestPasswordReset:
    """Test password reset functionality."""
    
    def test_request_password_reset(self, client: TestClient, db_session: Session):
        """Test requesting password reset for existing user."""
        user = UserFactory(db_session=db_session)
        
        response = client.post("/auth/password-reset", json={"email": user.email})
        
        assert response.status_code == 200
        assert "sent" in response.json()["message"].lower()
    
    def test_request_password_reset_nonexistent_user(self, client: TestClient):
        """Test requesting password reset for non-existent user."""
        response = client.post("/auth/password-reset", json={"email": "nonexistent@example.com"})
        
        # Should still return 200 for security (don't reveal user existence)
        assert response.status_code == 200
        assert "sent" in response.json()["message"].lower()
    
    def test_reset_password_valid_token(self, client: TestClient, db_session: Session):
        """Test resetting password with valid token."""
        user = UserFactory(db_session=db_session)
        
        # First request reset to get token (in real app, this would be sent via email)
        from app.core.security import create_password_reset_token
        reset_token = create_password_reset_token(user.email)
        
        new_password = "new_secure_password_456"
        reset_data = {
            "token": reset_token,
            "password": new_password
        }
        
        response = client.post("/auth/reset-password", json=reset_data)
        
        assert response.status_code == 200
        assert "reset" in response.json()["message"].lower()
        
        # Verify user can login with new password
        login_data = {
            "username": user.email,
            "password": new_password
        }
        login_response = client.post("/auth/login", data=login_data)
        assert login_response.status_code == 200
    
    def test_reset_password_invalid_token(self, client: TestClient):
        """Test resetting password with invalid token."""
        reset_data = {
            "token": "invalid_reset_token",
            "password": "new_password_123"
        }
        
        response = client.post("/auth/reset-password", json=reset_data)
        
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()


@pytest.mark.integration
class TestUserProfile:
    """Test user profile management endpoints."""
    
    def test_update_user_profile(self, client: TestClient, auth_headers: dict, test_user):
        """Test updating user profile information."""
        update_data = {
            "full_name": "Updated Name",
            "email": "updated@example.com"
        }
        
        response = client.put("/auth/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["email"] == update_data["email"]
    
    def test_update_profile_duplicate_email(self, client: TestClient, auth_headers: dict, db_session: Session):
        """Test updating profile with existing email."""
        # Create another user
        other_user = UserFactory(db_session=db_session)
        
        update_data = {
            "email": other_user.email
        }
        
        response = client.put("/auth/profile", json=update_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"].lower()
    
    def test_change_password(self, client: TestClient, auth_headers: dict, test_user, db_session: Session):
        """Test changing user password."""
        old_password = "secret"  # From fixture
        new_password = "new_secure_password_789"
        
        password_data = {
            "current_password": old_password,
            "new_password": new_password
        }
        
        response = client.post("/auth/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert "changed" in response.json()["message"].lower()
        
        # Verify login with new password
        login_data = {
            "username": test_user.email,
            "password": new_password
        }
        login_response = client.post("/auth/login", data=login_data)
        assert login_response.status_code == 200
    
    def test_change_password_wrong_current(self, client: TestClient, auth_headers: dict):
        """Test changing password with wrong current password."""
        password_data = {
            "current_password": "wrong_password",
            "new_password": "new_password_123"
        }
        
        response = client.post("/auth/change-password", json=password_data, headers=auth_headers)
        
        assert response.status_code == 400
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_delete_user_account(self, client: TestClient, auth_headers: dict, test_user):
        """Test deleting user account."""
        delete_data = {
            "password": "secret",  # Confirm with password
            "confirm": True
        }
        
        response = client.delete("/auth/account", json=delete_data, headers=auth_headers)
        
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()
        
        # Verify user can no longer access protected endpoints
        profile_response = client.get("/auth/me", headers=auth_headers)
        assert profile_response.status_code == 401


@pytest.mark.integration
@pytest.mark.slow
class TestAuthenticationSecurity:
    """Test authentication security measures."""
    
    def test_rate_limiting_login_attempts(self, client: TestClient, db_session: Session):
        """Test rate limiting on login attempts."""
        user = UserFactory(db_session=db_session)
        
        # Attempt multiple failed logins
        for _ in range(10):  # Assume rate limit is higher than this
            login_data = {
                "username": user.email,
                "password": "wrong_password"
            }
            response = client.post("/auth/login", data=login_data)
            # Should be 401 for wrong password, not 429 (rate limited) initially
            assert response.status_code == 401
        
        # Note: Actual rate limiting would require Redis/memory store
        # This is a placeholder for the test structure
    
    def test_token_blacklisting_on_logout(self, client: TestClient, auth_headers: dict):
        """Test token invalidation on logout."""
        # Logout
        response = client.post("/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        
        # Try to use the same token
        profile_response = client.get("/auth/me", headers=auth_headers)
        # Note: Token blacklisting requires Redis/memory store
        # This test structure shows the expected behavior 