"""
Authentication utility functions tests.
Tests password hashing, JWT token creation/validation.
"""

import pytest
from datetime import timedelta
from jose import JWTError
from fastapi import HTTPException
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


class TestPasswordHashing:
    """Test password hashing and verification."""
    
    def test_hash_password_creates_hash(self):
        """Test that hash_password creates a hash string."""
        password = "pass123"
        hashed = hash_password(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed != password
        assert len(hashed) > 0
    
    def test_hash_password_different_each_time(self):
        """Test that hash_password creates different hashes each time (salt)."""
        password = "pass123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Bcrypt adds random salt, so hashes should be different
        assert hash1 != hash2
    
    def test_verify_password_correct(self):
        """Test verify_password with correct password."""
        password = "pass123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test verify_password with incorrect password."""
        password = "pass123"
        wrong_password = "wrong123"
        hashed = hash_password(password)
        
        assert verify_password(wrong_password, hashed) is False
    
    def test_verify_password_empty(self):
        """Test verify_password with empty password."""
        password = "pass123"
        hashed = hash_password(password)
        
        assert verify_password("", hashed) is False


class TestJWTTokens:
    """Test JWT token creation and decoding."""
    
    def test_create_access_token_basic(self):
        """Test creating a basic access token."""
        data = {"sub": "123", "username": "testuser"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
        # JWT tokens have 3 parts separated by dots
        assert token.count('.') == 2
    
    def test_create_access_token_with_expiry(self):
        """Test creating a token with custom expiry."""
        data = {"sub": "123", "username": "testuser"}
        expires_delta = timedelta(minutes=15)
        token = create_access_token(data, expires_delta)
        
        assert token is not None
        assert isinstance(token, str)
    
    def test_decode_access_token_valid(self):
        """Test decoding a valid token."""
        data = {"sub": "123", "username": "testuser"}
        token = create_access_token(data)
        
        decoded = decode_access_token(token)
        
        assert decoded is not None
        assert decoded["sub"] == "123"
        assert decoded["username"] == "testuser"
        assert "exp" in decoded  # Expiration should be added automatically
    
    def test_decode_access_token_invalid(self):
        """Test decoding an invalid token."""
        invalid_token = "invalid.token.here"
        
        with pytest.raises(HTTPException):
            decode_access_token(invalid_token)
    
    def test_decode_access_token_malformed(self):
        """Test decoding a malformed token."""
        malformed_token = "notavalidtoken"
        
        with pytest.raises(HTTPException):
            decode_access_token(malformed_token)
    
    def test_token_contains_expiry(self):
        """Test that created tokens contain expiry."""
        data = {"sub": "123"}
        token = create_access_token(data)
        decoded = decode_access_token(token)
        
        assert "exp" in decoded
        assert isinstance(decoded["exp"], int)
        # Expiry should be in the future
        import time
        assert decoded["exp"] > time.time()
    
    def test_token_preserves_custom_data(self):
        """Test that custom data in token is preserved."""
        data = {
            "sub": "123",
            "username": "testuser",
            "email": "test@example.com",
            "custom_field": "custom_value"
        }
        token = create_access_token(data)
        decoded = decode_access_token(token)
        
        assert decoded["sub"] == "123"
        assert decoded["username"] == "testuser"
        assert decoded["email"] == "test@example.com"
        assert decoded["custom_field"] == "custom_value"


class TestTokenRoundTrip:
    """Test full token creation and verification workflow."""
    
    def test_password_and_token_workflow(self):
        """Test complete auth workflow: hash password, create token, verify."""
        # Step 1: User registers, password is hashed
        plain_password = "pass123"
        password_hash = hash_password(plain_password)
        
        # Step 2: User logs in, password is verified
        assert verify_password(plain_password, password_hash) is True
        
        # Step 3: Create JWT token for authenticated user
        user_data = {"sub": "456", "username": "newuser"}
        token = create_access_token(user_data)
        
        # Step 4: Decode token in subsequent requests
        decoded = decode_access_token(token)
        assert decoded["sub"] == "456"
        assert decoded["username"] == "newuser"
    
    def test_multiple_users_separate_tokens(self):
        """Test that different users get different tokens."""
        user1_data = {"sub": "1", "username": "user1"}
        user2_data = {"sub": "2", "username": "user2"}
        
        token1 = create_access_token(user1_data)
        token2 = create_access_token(user2_data)
        
        # Tokens should be different
        assert token1 != token2
        
        # Each token should decode to its own user
        decoded1 = decode_access_token(token1)
        decoded2 = decode_access_token(token2)
        
        assert decoded1["sub"] == "1"
        assert decoded1["username"] == "user1"
        assert decoded2["sub"] == "2"
        assert decoded2["username"] == "user2"
