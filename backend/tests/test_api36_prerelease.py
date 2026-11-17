"""
Pre-release API Regression Tests for Google Play Submission
Tests all backend APIs before creating EAS build for API 36 targeting
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://local-hub-14.preview.emergentagent.com')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_health_endpoint_returns_healthy(self):
        """GET /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check: {data}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_admin_credentials(self):
        """POST /api/auth/login with admin credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL.lower()
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful, user role: {data['user']['role']}")
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected with 401")
    
    def test_get_me_without_auth(self):
        """GET /api/auth/me without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated /me request correctly rejected")


class TestProblemsAPI:
    """Problems (Frikts) endpoint tests - API returns list directly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_problems_feed(self):
        """GET /api/problems with auth returns problems list"""
        response = requests.get(f"{BASE_URL}/api/problems", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns list directly
        assert isinstance(data, list)
        if len(data) > 0:
            # Verify problem structure
            problem = data[0]
            assert "id" in problem
            assert "title" in problem
            assert "category_id" in problem
        print(f"✓ Problems feed returned {len(data)} items")
    
    def test_get_problems_with_pagination(self):
        """GET /api/problems supports pagination"""
        response = requests.get(f"{BASE_URL}/api/problems?limit=5&skip=0", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        print(f"✓ Pagination works, returned {len(data)} items")
    
    def test_get_problems_by_category(self):
        """GET /api/problems?category_id=work filters by category"""
        response = requests.get(f"{BASE_URL}/api/problems?category_id=work", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned problems are in work category
        for problem in data:
            assert problem.get("category_id") == "work"
        print(f"✓ Category filter works, returned {len(data)} work problems")
    
    def test_get_problems_feed_new(self):
        """GET /api/problems?feed=new returns newest first"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=new", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ New feed works, returned {len(data)} items")
    
    def test_get_problems_feed_trending(self):
        """GET /api/problems?feed=trending returns trending"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=trending", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Trending feed works, returned {len(data)} items")


class TestCommunitiesAPI:
    """Communities endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_communities_list(self):
        """GET /api/communities with auth returns community data"""
        response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Communities list returned {len(data)} communities")
    
    def test_get_user_community(self):
        """GET /api/communities/my returns user's community"""
        response = requests.get(f"{BASE_URL}/api/communities/my", headers=self.headers)
        # Can be 200 (has community) or 404 (no community)
        assert response.status_code in [200, 404]
        print(f"✓ User community endpoint works, status: {response.status_code}")


class TestCategoriesAPI:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """GET /api/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        first_cat = data[0]
        assert "id" in first_cat
        assert "name" in first_cat
        assert "icon" in first_cat
        assert "color" in first_cat
        print(f"✓ Categories returned {len(data)} categories")
        print(f"  Sample: {first_cat['name']} ({first_cat['id']})")


class TestUserProfileAPI:
    """User profile endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.user = response.json()["user"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_user_me(self):
        """GET /api/users/me with auth returns user data"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL.lower()
        print(f"✓ User profile returned: {data['email']}")
    
    def test_get_user_stats(self):
        """GET /api/users/{id}/stats returns user stats"""
        user_id = self.user["id"]
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns stats with posts_count, comments_count, relates_count
        assert "posts_count" in data or "total_posts" in data
        print(f"✓ User stats returned: posts={data.get('posts_count', data.get('total_posts', 'N/A'))}")
    
    def test_get_user_badges(self):
        """GET /api/users/{id}/badges returns user badges"""
        user_id = self.user["id"]
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/badges", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "unlocked" in data or "badges" in data or isinstance(data, dict)
        print(f"✓ User badges returned")


class TestNotificationsAPI:
    """Notifications endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_notifications(self):
        """GET /api/notifications with auth returns notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {notifications: [], unread_count: N}
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        print(f"✓ Notifications returned {len(data['notifications'])} items, unread: {data.get('unread_count', 0)}")


class TestAdminAPI:
    """Admin endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.user = response.json()["user"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            if self.user.get("role") != "admin":
                pytest.skip("User is not admin")
        else:
            pytest.skip("Authentication failed")
    
    def test_get_admin_communities(self):
        """GET /api/admin/communities returns communities list"""
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {communities: [], total: N}
        assert "communities" in data
        assert isinstance(data["communities"], list)
        print(f"✓ Admin communities returned {len(data['communities'])} communities")
    
    def test_get_admin_reports(self):
        """GET /api/admin/reports returns reports list"""
        response = requests.get(f"{BASE_URL}/api/admin/reports", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns {reports: [], total: N}
        assert "reports" in data
        assert isinstance(data["reports"], list)
        print(f"✓ Admin reports returned {len(data['reports'])} reports")
    
    def test_get_admin_users(self):
        """GET /api/admin/users returns users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # API returns list or {users: [], total: N}
        if isinstance(data, list):
            print(f"✓ Admin users returned {len(data)} users")
        else:
            assert "users" in data
            print(f"✓ Admin users returned {len(data.get('users', []))} users")


class TestCommentsAPI:
    """Comments endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and find a problem to comment on"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            # Get a problem to test comments - API returns list directly
            problems_resp = requests.get(f"{BASE_URL}/api/problems?limit=1", headers=self.headers)
            if problems_resp.status_code == 200:
                problems = problems_resp.json()
                if isinstance(problems, list) and len(problems) > 0:
                    self.problem_id = problems[0]["id"]
                else:
                    self.problem_id = None
            else:
                self.problem_id = None
        else:
            pytest.skip("Authentication failed")
    
    def test_get_comments_for_problem(self):
        """GET /api/problems/{id}/comments returns comments"""
        if not self.problem_id:
            pytest.skip("No problem available for testing")
        response = requests.get(f"{BASE_URL}/api/problems/{self.problem_id}/comments", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Comments for problem returned {len(data)} comments")


class TestSearchAPI:
    """Search endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_search_problems(self):
        """GET /api/search/problems?q=test searches problems"""
        response = requests.get(f"{BASE_URL}/api/search/problems?q=test", headers=self.headers)
        # Search might return 200 or 404 if no results
        assert response.status_code in [200, 404]
        print(f"✓ Problem search works, status: {response.status_code}")
    
    def test_search_users(self):
        """GET /api/search/users?q=admin searches users"""
        response = requests.get(f"{BASE_URL}/api/search/users?q=admin", headers=self.headers)
        assert response.status_code in [200, 404]
        print(f"✓ User search works, status: {response.status_code}")


class TestMissionAPI:
    """Mission of the day endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_get_mission_of_day(self):
        """GET /api/mission returns mission of the day"""
        response = requests.get(f"{BASE_URL}/api/mission", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "theme" in data or "prompt" in data or "mission" in data
        print(f"✓ Mission of day returned: {data}")


class TestPasswordResetAPI:
    """Password reset endpoint tests"""
    
    def test_forgot_password_endpoint_exists(self):
        """POST /api/auth/forgot-password endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "test@example.com"
        })
        # Should return 200 even for non-existent email (security best practice)
        assert response.status_code == 200
        data = response.json()
        assert "success" in data or "message" in data
        print(f"✓ Forgot password endpoint works")


class TestRelateAPI:
    """Relate (like) endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and find a problem to relate to"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            # Get a problem to test relate
            problems_resp = requests.get(f"{BASE_URL}/api/problems?limit=1", headers=self.headers)
            if problems_resp.status_code == 200:
                problems = problems_resp.json()
                if isinstance(problems, list) and len(problems) > 0:
                    self.problem_id = problems[0]["id"]
                else:
                    self.problem_id = None
            else:
                self.problem_id = None
        else:
            pytest.skip("Authentication failed")
    
    def test_relate_toggle(self):
        """POST /api/problems/{id}/relate toggles relate status"""
        if not self.problem_id:
            pytest.skip("No problem available for testing")
        response = requests.post(f"{BASE_URL}/api/problems/{self.problem_id}/relate", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Should return related status
        assert "related" in data or "relates_count" in data or "user_has_related" in data
        print(f"✓ Relate toggle works: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
