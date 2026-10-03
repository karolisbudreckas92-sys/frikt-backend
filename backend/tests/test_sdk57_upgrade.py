"""
SDK 57 Upgrade Verification Tests
Tests to verify backend APIs work correctly after Expo SDK 57 upgrade.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://local-hub-14.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """Verify health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """Verify login works with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_login_with_invalid_credentials(self):
        """Verify login fails with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401
    
    def test_get_me_with_valid_token(self):
        """Verify /auth/me returns user data with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["access_token"]
        
        # Then get user info
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL


class TestProblemsAPI:
    """Problems (Frikts) endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_problems_feed(self, auth_token):
        """Verify problems feed returns list of problems"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify problem structure if there are problems
        if len(data) > 0:
            problem = data[0]
            assert "id" in problem
            assert "title" in problem
            assert "category_id" in problem
            assert "user_id" in problem
    
    def test_get_problems_with_feed_new(self, auth_token):
        """Verify problems feed with 'new' sort works"""
        response = requests.get(
            f"{BASE_URL}/api/problems?feed=new",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_problems_with_feed_trending(self, auth_token):
        """Verify problems feed with 'trending' sort works"""
        response = requests.get(
            f"{BASE_URL}/api/problems?feed=trending",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """Verify categories endpoint returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        category = data[0]
        assert "id" in category
        assert "name" in category
        assert "icon" in category
        assert "color" in category


class TestCommunitiesAPI:
    """Communities endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_communities_list(self, auth_token):
        """Verify communities endpoint returns list"""
        response = requests.get(
            f"{BASE_URL}/api/communities",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify community structure if there are communities
        if len(data) > 0:
            community = data[0]
            assert "id" in community
            assert "name" in community


class TestUserAPI:
    """User profile endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_user_badges(self, auth_token):
        """Verify user badges endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/users/me/badges",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unlocked" in data or "locked" in data or "total_unlocked" in data


class TestNotificationsAPI:
    """Notifications endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_get_notifications(self, auth_token):
        """Verify notifications endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns object with notifications list
        assert "notifications" in data or isinstance(data, list)


class TestAdminAPI:
    """Admin endpoint tests (for admin user)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return response.json()["access_token"]
    
    def test_admin_analytics(self, auth_token):
        """Verify admin analytics endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should have analytics data
        assert isinstance(data, dict)
    
    def test_admin_communities(self, auth_token):
        """Verify admin communities endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/admin/communities",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns object with communities list
        assert "communities" in data or isinstance(data, list)
