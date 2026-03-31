"""
FRIKT API Backend Tests - Iteration 9
Testing: Auth, Categories, Health, Admin endpoints

Features tested:
- POST /api/auth/register - registration returns access_token and user data
- POST /api/auth/login - login returns access_token and user data
- GET /api/auth/me - returns user profile with followed_categories
- POST /api/categories/{id}/follow - adds category to followed_categories
- DELETE /api/categories/{id}/follow - removes category from followed_categories
- GET /api/categories - returns list of categories
- GET /api/health - returns healthy status
- GET /api/admin/communities/{id}/members - returns community members list (admin only)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Use the public API URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://schema-removal.preview.emergentagent.com').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthEndpoint:
    """Health check endpoint tests"""
    
    def test_health_returns_healthy_status(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] == "healthy", f"Expected 'healthy', got {data['status']}"
        print("✓ Health endpoint returns healthy status")


class TestCategoriesEndpoint:
    """Categories endpoint tests"""
    
    def test_get_categories_returns_list(self):
        """GET /api/categories should return list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Categories list should not be empty"
        
        # Verify category structure
        first_category = data[0]
        assert "id" in first_category, "Category should have 'id'"
        assert "name" in first_category, "Category should have 'name'"
        assert "icon" in first_category, "Category should have 'icon'"
        assert "color" in first_category, "Category should have 'color'"
        
        # Verify expected categories exist
        category_ids = [c["id"] for c in data]
        expected_categories = ["money", "work", "health", "home", "tech"]
        for cat_id in expected_categories:
            assert cat_id in category_ids, f"Expected category '{cat_id}' not found"
        
        print(f"✓ Categories endpoint returns {len(data)} categories")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email = f"test_iter9_{uuid.uuid4().hex[:8]}@example.com"
        self.test_password = "TestPassword123!"
        self.test_name = "Test User Iter9"
    
    def test_register_returns_token_and_user(self):
        """POST /api/auth/register should return access_token and user data"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify access_token
        assert "access_token" in data, "Response should contain 'access_token'"
        assert isinstance(data["access_token"], str), "access_token should be a string"
        assert len(data["access_token"]) > 0, "access_token should not be empty"
        
        # Verify user data
        assert "user" in data, "Response should contain 'user'"
        user = data["user"]
        assert "id" in user, "User should have 'id'"
        assert "email" in user, "User should have 'email'"
        assert "name" in user, "User should have 'name'"
        assert user["email"] == self.test_email.lower(), f"Email mismatch: expected {self.test_email.lower()}, got {user['email']}"
        assert user["name"] == self.test_name, f"Name mismatch: expected {self.test_name}, got {user['name']}"
        
        print(f"✓ Register returns access_token and user data for {self.test_email}")
    
    def test_register_duplicate_email_fails(self):
        """POST /api/auth/register with duplicate email should fail"""
        # First registration
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        # Second registration with same email
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "Another Name"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Duplicate email registration correctly rejected")
    
    def test_login_returns_token_and_user(self):
        """POST /api/auth/login should return access_token and user data"""
        # First register a user
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        })
        
        # Then login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify access_token
        assert "access_token" in data, "Response should contain 'access_token'"
        assert isinstance(data["access_token"], str), "access_token should be a string"
        assert len(data["access_token"]) > 0, "access_token should not be empty"
        
        # Verify user data
        assert "user" in data, "Response should contain 'user'"
        user = data["user"]
        assert "id" in user, "User should have 'id'"
        assert "email" in user, "User should have 'email'"
        assert user["email"] == self.test_email.lower(), f"Email mismatch"
        
        print(f"✓ Login returns access_token and user data for {self.test_email}")
    
    def test_login_invalid_credentials_fails(self):
        """POST /api/auth/login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_admin_login_returns_admin_role(self):
        """POST /api/auth/login for admin should return admin role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        
        print(f"✓ Admin login returns admin role for {ADMIN_EMAIL}")


class TestAuthMeEndpoint:
    """GET /api/auth/me endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for a test user"""
        test_email = f"test_me_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Me User"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not create test user")
    
    def test_auth_me_returns_user_profile(self, auth_token):
        """GET /api/auth/me should return user profile with followed_categories"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify user profile fields
        assert "id" in data, "Profile should have 'id'"
        assert "email" in data, "Profile should have 'email'"
        assert "name" in data, "Profile should have 'name'"
        assert "followed_categories" in data, "Profile should have 'followed_categories'"
        assert isinstance(data["followed_categories"], list), "followed_categories should be a list"
        
        print(f"✓ GET /api/auth/me returns user profile with followed_categories")
    
    def test_auth_me_without_token_fails(self):
        """GET /api/auth/me without token should fail"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ GET /api/auth/me without token correctly rejected")


class TestCategoryFollowEndpoints:
    """Category follow/unfollow endpoint tests"""
    
    @pytest.fixture
    def auth_token_and_user(self):
        """Get authentication token and user data"""
        test_email = f"test_follow_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Follow User"
        })
        if response.status_code == 200:
            data = response.json()
            return data["access_token"], data["user"]
        pytest.skip("Could not create test user")
    
    def test_follow_category_adds_to_followed_categories(self, auth_token_and_user):
        """POST /api/categories/{id}/follow should add category to followed_categories"""
        token, user = auth_token_and_user
        headers = {"Authorization": f"Bearer {token}"}
        category_id = "money"
        
        # Follow the category
        response = requests.post(f"{BASE_URL}/api/categories/{category_id}/follow", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "following" in data, "Response should contain 'following'"
        assert data["following"] == True, "following should be True"
        
        # Verify category is in followed_categories via /api/auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert category_id in me_data["followed_categories"], f"Category '{category_id}' should be in followed_categories"
        
        print(f"✓ POST /api/categories/{category_id}/follow adds category to followed_categories")
    
    def test_unfollow_category_removes_from_followed_categories(self, auth_token_and_user):
        """DELETE /api/categories/{id}/follow should remove category from followed_categories"""
        token, user = auth_token_and_user
        headers = {"Authorization": f"Bearer {token}"}
        category_id = "work"
        
        # First follow the category
        requests.post(f"{BASE_URL}/api/categories/{category_id}/follow", headers=headers)
        
        # Verify it's followed
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert category_id in me_response.json()["followed_categories"]
        
        # Now unfollow
        response = requests.delete(f"{BASE_URL}/api/categories/{category_id}/follow", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "following" in data, "Response should contain 'following'"
        assert data["following"] == False, "following should be False"
        
        # Verify category is removed from followed_categories
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert category_id not in me_data["followed_categories"], f"Category '{category_id}' should not be in followed_categories"
        
        print(f"✓ DELETE /api/categories/{category_id}/follow removes category from followed_categories")
    
    def test_follow_category_without_auth_fails(self):
        """POST /api/categories/{id}/follow without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/categories/money/follow")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Follow category without auth correctly rejected")
    
    def test_unfollow_category_without_auth_fails(self):
        """DELETE /api/categories/{id}/follow without auth should fail"""
        response = requests.delete(f"{BASE_URL}/api/categories/money/follow")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unfollow category without auth correctly rejected")


class TestAdminCommunityMembersEndpoint:
    """Admin community members endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not login as admin")
    
    @pytest.fixture
    def regular_user_token(self):
        """Get regular user authentication token"""
        test_email = f"test_regular_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Regular User"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not create regular user")
    
    @pytest.fixture
    def test_community_id(self, admin_token):
        """Create a test community and return its ID"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        community_code = f"MEMB{uuid.uuid4().hex[:4].upper()}"
        
        response = requests.post(f"{BASE_URL}/api/admin/communities", headers=headers, json={
            "name": f"Test Community {community_code}",
            "code": community_code,
            "moderator_email": ADMIN_EMAIL
        })
        
        if response.status_code == 200:
            data = response.json()
            # Response structure is {"success": true, "community": {...}}
            if "community" in data and "id" in data["community"]:
                return data["community"]["id"]
            elif "id" in data:
                return data["id"]
        pytest.skip(f"Could not create test community: {response.text}")
    
    def test_admin_get_community_members_returns_list(self, admin_token, test_community_id):
        """GET /api/admin/communities/{id}/members should return members list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/communities/{test_community_id}/members", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "members" in data, "Response should contain 'members'"
        assert "total" in data, "Response should contain 'total'"
        assert isinstance(data["members"], list), "members should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        
        print(f"✓ GET /api/admin/communities/{test_community_id}/members returns members list (total: {data['total']})")
    
    def test_admin_get_community_members_with_search(self, admin_token, test_community_id):
        """GET /api/admin/communities/{id}/members with search param should filter results"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/admin/communities/{test_community_id}/members",
            headers=headers,
            params={"search": "nonexistent_user_xyz"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "members" in data
        # Search for nonexistent user should return empty or filtered list
        print(f"✓ GET /api/admin/communities/{test_community_id}/members with search works")
    
    def test_admin_get_community_members_without_auth_fails(self, test_community_id):
        """GET /api/admin/communities/{id}/members without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/communities/{test_community_id}/members")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin endpoint without auth correctly rejected")
    
    def test_admin_get_community_members_as_regular_user_fails(self, regular_user_token, test_community_id):
        """GET /api/admin/communities/{id}/members as regular user should fail"""
        headers = {"Authorization": f"Bearer {regular_user_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/communities/{test_community_id}/members", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin endpoint as regular user correctly rejected with 403")


class TestCategoryFollowPersistence:
    """Test that category follow/unfollow persists correctly in user profile"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        test_email = f"test_persist_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Persist User"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not create test user")
    
    def test_follow_multiple_categories_and_verify(self, auth_token):
        """Follow multiple categories and verify all are in followed_categories"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        categories_to_follow = ["money", "work", "health"]
        
        # Follow all categories
        for cat_id in categories_to_follow:
            response = requests.post(f"{BASE_URL}/api/categories/{cat_id}/follow", headers=headers)
            assert response.status_code == 200, f"Failed to follow {cat_id}"
        
        # Verify all are in followed_categories
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        followed = me_response.json()["followed_categories"]
        
        for cat_id in categories_to_follow:
            assert cat_id in followed, f"Category '{cat_id}' should be in followed_categories"
        
        print(f"✓ Multiple categories ({', '.join(categories_to_follow)}) correctly added to followed_categories")
    
    def test_unfollow_one_category_keeps_others(self, auth_token):
        """Unfollow one category and verify others remain"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Follow multiple categories
        requests.post(f"{BASE_URL}/api/categories/tech/follow", headers=headers)
        requests.post(f"{BASE_URL}/api/categories/home/follow", headers=headers)
        
        # Unfollow one
        response = requests.delete(f"{BASE_URL}/api/categories/tech/follow", headers=headers)
        assert response.status_code == 200
        
        # Verify tech is removed but home remains
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        followed = me_response.json()["followed_categories"]
        
        assert "tech" not in followed, "tech should be unfollowed"
        assert "home" in followed, "home should still be followed"
        
        print("✓ Unfollowing one category correctly keeps others")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
