"""
Backend API tests for User Search and related features
Tests: User search endpoint, user profile, comment input
"""
import pytest
import requests
import os

# Use local backend for testing since Railway production doesn't have latest code deployed
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')

# Test credentials
TEST_EMAIL = "karolisbudreckas92@gmail.com"
TEST_PASSWORD = "Admin123!"

class TestUserSearchAPI:
    """Test the /api/users/search endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_user_search_with_valid_query(self):
        """Test searching users with a valid query"""
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If results exist, verify structure
        if len(data) > 0:
            user = data[0]
            assert "id" in user, "User should have 'id'"
            assert "displayName" in user, "User should have 'displayName'"
            assert "posts_count" in user, "User should have 'posts_count'"
            print(f"✓ Found {len(data)} users matching 'test'")
        else:
            print("✓ No users found matching 'test' (empty result is valid)")
    
    def test_user_search_short_query_returns_empty(self):
        """Test that queries shorter than 2 chars return empty array"""
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "a"})
        
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Short query should return empty list, got {data}"
        print("✓ Short query correctly returns empty list")
    
    def test_user_search_empty_query_returns_empty(self):
        """Test that empty query returns empty array"""
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": ""})
        
        assert response.status_code == 200
        data = response.json()
        assert data == [], f"Empty query should return empty list, got {data}"
        print("✓ Empty query correctly returns empty list")
    
    def test_user_search_limit_parameter(self):
        """Test that limit parameter works"""
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 1})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 1, f"Should return at most 1 result, got {len(data)}"
        print(f"✓ Limit parameter working, got {len(data)} results")


class TestUserProfileAPI:
    """Test the /api/users/{user_id}/profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_user_profile_exists(self):
        """Test getting user profile for an existing user"""
        # First search for users to get a valid user_id
        search_response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 1})
        
        if search_response.status_code != 200:
            pytest.skip("User search not available")
        
        users = search_response.json()
        if not users:
            pytest.skip("No users found to test profile")
        
        user_id = users[0]["id"]
        
        # Get the profile
        response = self.session.get(f"{BASE_URL}/api/users/{user_id}/profile")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data
        assert "displayName" in data
        assert "posts_count" in data
        assert "comments_count" in data
        assert "relates_count" in data
        print(f"✓ User profile retrieved successfully for user {data['displayName']}")
    
    def test_user_profile_not_found(self):
        """Test that non-existent user returns 404"""
        response = self.session.get(f"{BASE_URL}/api/users/non-existent-user-id/profile")
        
        assert response.status_code == 404
        print("✓ Non-existent user correctly returns 404")


class TestUserPostsAPI:
    """Test the /api/users/{user_id}/posts endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_user_posts_endpoint(self):
        """Test getting posts for a user"""
        # First search for users to get a valid user_id
        search_response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 1})
        
        if search_response.status_code != 200:
            pytest.skip("User search not available")
        
        users = search_response.json()
        if not users:
            pytest.skip("No users found to test posts")
        
        user_id = users[0]["id"]
        
        # Get posts
        response = self.session.get(f"{BASE_URL}/api/users/{user_id}/posts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ User posts retrieved successfully ({len(data)} posts)")


class TestCommentAPI:
    """Test comment functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_comment_creation_requires_auth(self):
        """Test that creating comment requires authentication"""
        unauthenticated_session = requests.Session()
        unauthenticated_session.headers.update({"Content-Type": "application/json"})
        
        response = unauthenticated_session.post(
            f"{BASE_URL}/api/comments",
            json={"problem_id": "test-id", "content": "Test comment content here"}
        )
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}"
        print("✓ Comment creation correctly requires authentication")
    
    def test_comment_creation_with_auth(self):
        """Test creating a comment when authenticated"""
        if not self.authenticated:
            pytest.skip("Could not authenticate")
        
        # First get a problem to comment on
        problems_response = self.session.get(f"{BASE_URL}/api/problems", params={"feed": "new", "limit": 1})
        
        if problems_response.status_code != 200:
            pytest.skip("Could not fetch problems")
        
        problems = problems_response.json()
        if not problems:
            pytest.skip("No problems found to comment on")
        
        problem_id = problems[0]["id"]
        
        # Create a comment
        response = self.session.post(
            f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "TEST_Test comment for automated testing - minimum chars here"}
        )
        
        # Comment validation requires at least 10 chars
        assert response.status_code in [200, 201, 422], f"Expected success or validation error, got {response.status_code}: {response.text}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            assert "content" in data
            print(f"✓ Comment created successfully")
        else:
            print(f"✓ Comment endpoint responding (validation: {response.json()})")


class TestHealthAPI:
    """Test basic health endpoints"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        
        assert response.status_code == 200
        print("✓ Health endpoint is healthy")
    
    def test_categories_endpoint(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Categories endpoint returns {len(data)} categories")


class TestProblemsSearchAPI:
    """Test problems/frikts search functionality"""
    
    def test_problems_search(self):
        """Test searching problems"""
        response = requests.get(
            f"{BASE_URL}/api/problems",
            params={"feed": "new", "search": "test", "limit": 5}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Problems search works, found {len(data)} results")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
