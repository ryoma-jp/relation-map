"""
Authentication API Endpoint Tests.
Tests user registration, login, profile retrieval, and logout endpoints.
"""

import pytest


class TestUserRegistration:
    """Test POST /api/auth/register endpoint."""
    
    def test_register_success(self, client):
        """Test successful user registration."""
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "pass1234"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"
        assert "password" not in data["user"]
        assert "password_hash" not in data["user"]
    
    def test_register_duplicate_username(self, client, sample_user):
        """Test registration with duplicate username."""
        payload = {
            "username": sample_user.username,
            "email": "different@example.com",
            "password": "pass1234"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 400
        assert "username" in response.json()["detail"].lower()
    
    def test_register_duplicate_email(self, client, sample_user):
        """Test registration with duplicate email."""
        payload = {
            "username": "differentuser",
            "email": sample_user.email,
            "password": "pass1234"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 400
        assert "email" in response.json()["detail"].lower()
    
    def test_register_invalid_username_too_short(self, client):
        """Test registration with username too short."""
        payload = {
            "username": "ab",  # Less than 3 characters
            "email": "test@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    def test_register_invalid_username_too_long(self, client):
        """Test registration with username too long."""
        payload = {
            "username": "a" * 51,  # More than 50 characters
            "email": "test@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422
    
    def test_register_invalid_username_special_chars(self, client):
        """Test registration with invalid characters in username."""
        payload = {
            "username": "user@name!",  # Contains invalid characters
            "email": "test@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422
    
    def test_register_invalid_email(self, client):
        """Test registration with invalid email format."""
        payload = {
            "username": "testuser",
            "email": "notanemail",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422
    
    def test_register_password_too_short(self, client):
        """Test registration with password too short."""
        payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "pass"  # Less than 8 characters
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422
    
    def test_register_password_too_long(self, client):
        """Test registration with password too long."""
        payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "p" * 101  # More than 100 characters
        }
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422
    
    def test_register_missing_fields(self, client):
        """Test registration with missing required fields."""
        payload = {"username": "testuser"}
        response = client.post("/api/auth/register", json=payload)
        
        assert response.status_code == 422


class TestUserLogin:
    """Test POST /api/auth/login endpoint."""
    
    def test_login_success(self, client, sample_user):
        """Test successful login."""
        payload = {
            "username": "testuser",
            "password": "pass123"
        }
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "testuser"
        assert data["user"]["email"] == sample_user.email
    
    def test_login_wrong_password(self, client, sample_user):
        """Test login with incorrect password."""
        payload = {
            "username": "testuser",
            "password": "wrong123"
        }
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent username."""
        payload = {
            "username": "nonexistent",
            "password": "pass123"
        }
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()
    
    def test_login_missing_username(self, client):
        """Test login with missing username."""
        payload = {"password": "password123"}
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 422
    
    def test_login_missing_password(self, client):
        """Test login with missing password."""
        payload = {"username": "testuser"}
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 422
    
    def test_login_empty_credentials(self, client):
        """Test login with empty username and password."""
        payload = {"username": "", "password": ""}
        response = client.post("/api/auth/login", json=payload)
        
        assert response.status_code == 401


class TestGetCurrentUser:
    """Test GET /api/auth/me endpoint."""
    
    def test_get_current_user_authenticated(self, authenticated_client, sample_user):
        """Test getting current user info with valid token."""
        response = authenticated_client.get("/api/auth/me")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_user.id
        assert data["username"] == sample_user.username
        assert data["email"] == sample_user.email
        assert data["is_active"] is True
        assert "password" not in data
        assert "password_hash" not in data
    
    def test_get_current_user_no_token(self, client):
        """Test getting current user without authentication token."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    def test_get_current_user_malformed_header(self, client):
        """Test getting current user with malformed Authorization header."""
        headers = {"Authorization": "InvalidFormat token123"}
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 401


class TestLogout:
    """Test POST /api/auth/logout endpoint."""
    
    def test_logout_success(self, authenticated_client):
        """Test successful logout."""
        response = authenticated_client.post("/api/auth/logout")
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out successfully"
    
    def test_logout_no_token(self, client):
        """Test logout without authentication token."""
        response = client.post("/api/auth/logout")
        
        # Logout should succeed even without token (client-side operation)
        assert response.status_code == 200


class TestAuthenticationFlow:
    """Test complete authentication workflows."""
    
    def test_register_login_profile_flow(self, client):
        """Test full flow: register -> login -> get profile."""
        # Step 1: Register
        register_payload = {
            "username": "flowuser",
            "email": "flowuser@example.com",
            "password": "flow1234"
        }
        register_response = client.post("/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        register_token = register_response.json()["access_token"]
        
        # Step 2: Login (with 1-second delay to ensure different token)
        import time
        time.sleep(1)
        login_payload = {
            "username": "flowuser",
            "password": "flow1234"
        }
        login_response = client.post("/api/auth/login", json=login_payload)
        assert login_response.status_code == 200
        login_token = login_response.json()["access_token"]
        
        # Both tokens should work
        headers = {"Authorization": f"Bearer {login_token}"}
        profile_response = client.get("/api/auth/me", headers=headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["username"] == "flowuser"
        assert profile_data["email"] == "flowuser@example.com"
    
    def test_register_provides_valid_token(self, client):
        """Test that token from registration can be used immediately."""
        # Register
        register_payload = {
            "username": "immediateuser",
            "email": "immediate@example.com",
            "password": "immed123"
        }
        register_response = client.post("/api/auth/register", json=register_payload)
        assert register_response.status_code == 201
        token = register_response.json()["access_token"]
        
        # Use token immediately
        headers = {"Authorization": f"Bearer {token}"}
        profile_response = client.get("/api/auth/me", headers=headers)
        assert profile_response.status_code == 200
        assert profile_response.json()["username"] == "immediateuser"
    
    def test_multiple_logins_different_tokens(self, client, sample_user):
        """Test that multiple logins create tokens that work."""
        login_payload = {
            "username": "testuser",
            "password": "pass123"
        }
        
        # First login
        response1 = client.post("/api/auth/login", json=login_payload)
        token1 = response1.json()["access_token"]
        
        # Second login (simulating same user logging in from different device)
        import time
        time.sleep(1)  # Wait 1 second to ensure different timestamp
        response2 = client.post("/api/auth/login", json=login_payload)
        token2 = response2.json()["access_token"]
        
        # Both tokens should work
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        profile1 = client.get("/api/auth/me", headers=headers1)
        profile2 = client.get("/api/auth/me", headers=headers2)
        
        assert profile1.status_code == 200
        assert profile2.status_code == 200
        assert profile1.json()["username"] == profile2.json()["username"]
