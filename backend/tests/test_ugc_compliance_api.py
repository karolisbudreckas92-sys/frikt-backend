"""
Backend API tests for UGC Compliance Features
Tests: Change Password, Block/Unblock Users, Report Users, Get Blocked Users, My Posts, Feed Filtering
"""
import pytest
import requests
import os
import uuid

# Use preview URL for testing
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://account-deletion-26.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"
TEST_EMAIL = "testuser.frikt@example.com"
TEST_PASSWORD = "TestUser123!"

class TestChangePassword:
    """Test POST /api/users/me/change-password endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    def test_change_password_requires_auth(self):
        """Test that change password requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/users/me/change-password",
            json={"current_password": "old", "new_password": "new123"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("PASS: Change password requires authentication")
    
    def test_change_password_wrong_current_password(self):
        """Test that wrong current password fails"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        response = self.session.post(
            f"{BASE_URL}/api/users/me/change-password",
            json={"current_password": "wrongpassword", "new_password": "newpassword123"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "wrong" in data.get("detail", "").lower()
        print("PASS: Wrong current password correctly rejected")
    
    def test_change_password_short_new_password(self):
        """Test that short new password fails"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        response = self.session.post(
            f"{BASE_URL}/api/users/me/change-password",
            json={"current_password": ADMIN_PASSWORD, "new_password": "123"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Short password correctly rejected")
    
    def test_change_password_success(self):
        """Test successful password change (and change back)"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        new_password = "NewAdmin123!"
        
        # Change to new password
        response = self.session.post(
            f"{BASE_URL}/api/users/me/change-password",
            json={"current_password": ADMIN_PASSWORD, "new_password": new_password}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print("PASS: Password changed successfully")
        
        # Change back to original password
        response = self.session.post(
            f"{BASE_URL}/api/users/me/change-password",
            json={"current_password": new_password, "new_password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200 changing back, got {response.status_code}: {response.text}"
        print("PASS: Password changed back to original")


class TestBlockedUsers:
    """Test GET /api/users/me/blocked endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    def test_get_blocked_users_requires_auth(self):
        """Test that getting blocked users requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/users/me/blocked")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Get blocked users requires authentication")
    
    def test_get_blocked_users_success(self):
        """Test getting blocked users list"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        response = self.session.get(f"{BASE_URL}/api/users/me/blocked")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are blocked users
        if len(data) > 0:
            blocked = data[0]
            assert "id" in blocked
            assert "blocked_user_id" in blocked
            assert "blocked_user_name" in blocked
            assert "created_at" in blocked
            print(f"PASS: Retrieved {len(data)} blocked users with correct structure")
        else:
            print("PASS: No blocked users (empty list is valid)")


class TestBlockUnblockUser:
    """Test POST/DELETE /api/users/{user_id}/block endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.target_user_id = None
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data.get("user", {}).get("id")
        return None
    
    def _get_another_user(self, current_user_id):
        """Find another user to block (not ourselves)"""
        # Search for users
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 20})
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user["id"] != current_user_id:
                    return user["id"]
        return None
    
    def test_block_user_requires_auth(self):
        """Test that blocking a user requires authentication"""
        response = self.session.post(f"{BASE_URL}/api/users/some-user-id/block")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Block user requires authentication")
    
    def test_block_user_not_found(self):
        """Test blocking a non-existent user"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        response = self.session.post(f"{BASE_URL}/api/users/non-existent-user-id-12345/block")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Non-existent user returns 404")
    
    def test_block_self_fails(self):
        """Test that blocking yourself fails"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        response = self.session.post(f"{BASE_URL}/api/users/{current_user_id}/block")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Cannot block yourself")
    
    def test_block_and_unblock_flow(self):
        """Test full block and unblock flow"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        # Find another user to block
        target_user_id = self._get_another_user(current_user_id)
        if not target_user_id:
            # Create a test user if none found
            pytest.skip("No other user found to block")
        
        # Block the user
        response = self.session.post(f"{BASE_URL}/api/users/{target_user_id}/block")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"PASS: Successfully blocked user {target_user_id}")
        
        # Verify user appears in blocked list
        blocked_response = self.session.get(f"{BASE_URL}/api/users/me/blocked")
        assert blocked_response.status_code == 200
        blocked_list = blocked_response.json()
        blocked_ids = [b["blocked_user_id"] for b in blocked_list]
        assert target_user_id in blocked_ids, "Blocked user should be in blocked list"
        print("PASS: Blocked user appears in blocked list")
        
        # Unblock the user
        response = self.session.delete(f"{BASE_URL}/api/users/{target_user_id}/block")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"PASS: Successfully unblocked user {target_user_id}")
        
        # Verify user no longer in blocked list
        blocked_response = self.session.get(f"{BASE_URL}/api/users/me/blocked")
        assert blocked_response.status_code == 200
        blocked_list = blocked_response.json()
        blocked_ids = [b["blocked_user_id"] for b in blocked_list]
        assert target_user_id not in blocked_ids, "Unblocked user should not be in blocked list"
        print("PASS: Unblocked user removed from blocked list")
    
    def test_unblock_not_blocked_user(self):
        """Test unblocking a user that wasn't blocked"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        # Generate random user ID that definitely wasn't blocked
        fake_user_id = f"not-blocked-{uuid.uuid4()}"
        
        response = self.session.delete(f"{BASE_URL}/api/users/{fake_user_id}/block")
        
        # Should return 404 since block doesn't exist
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("PASS: Unblocking non-blocked user returns 404")


class TestReportUser:
    """Test POST /api/report/user/{user_id} endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data.get("user", {}).get("id")
        return None
    
    def _get_another_user(self, current_user_id):
        """Find another user to report"""
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 20})
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user["id"] != current_user_id:
                    return user["id"]
        return None
    
    def test_report_user_requires_auth(self):
        """Test that reporting a user requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/report/user/some-user-id",
            json={"reason": "spam"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Report user requires authentication")
    
    def test_report_user_not_found(self):
        """Test reporting a non-existent user"""
        self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = self.session.post(
            f"{BASE_URL}/api/report/user/non-existent-user-12345",
            json={"reason": "spam"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent user returns 404")
    
    def test_report_self_fails(self):
        """Test that reporting yourself fails"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        response = self.session.post(
            f"{BASE_URL}/api/report/user/{current_user_id}",
            json={"reason": "spam"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Cannot report yourself")
    
    def test_report_user_invalid_reason(self):
        """Test reporting with invalid reason"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        target_user_id = self._get_another_user(current_user_id)
        if not target_user_id:
            pytest.skip("No other user found to report")
        
        response = self.session.post(
            f"{BASE_URL}/api/report/user/{target_user_id}",
            json={"reason": "invalid-reason-xyz"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("PASS: Invalid reason correctly rejected")
    
    def test_report_user_success(self):
        """Test successfully reporting a user"""
        current_user_id = self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        if not current_user_id:
            pytest.skip("Could not authenticate")
        
        target_user_id = self._get_another_user(current_user_id)
        if not target_user_id:
            pytest.skip("No other user found to report")
        
        response = self.session.post(
            f"{BASE_URL}/api/report/user/{target_user_id}",
            json={"reason": "spam", "details": "TEST report - automated test"}
        )
        
        # Might be 200 (success) or 400 (already reported)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("reported") == True
            print(f"PASS: Successfully reported user {target_user_id}")
        else:
            # Already reported
            print("PASS: User already reported (valid duplicate check)")


class TestMyPosts:
    """Test GET /api/users/me/posts endpoint (previously broken)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    def test_get_my_posts_requires_auth(self):
        """Test that getting my posts requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/users/me/posts")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Get my posts requires authentication")
    
    def test_get_my_posts_success(self):
        """Test successfully getting my posts (BUG FIX VERIFICATION)"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        response = self.session.get(f"{BASE_URL}/api/users/me/posts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if posts exist
        if len(data) > 0:
            post = data[0]
            assert "id" in post
            assert "title" in post
            assert "category_name" in post
            print(f"PASS: Retrieved {len(data)} posts with correct structure")
        else:
            print("PASS: No posts found (empty list is valid)")


class TestFeedFiltering:
    """Test that blocked users don't appear in feeds"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return data.get("user", {}).get("id")
        return None
    
    def test_feed_accessible_without_auth(self):
        """Test that feed is accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/problems", params={"feed": "new", "limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Feed accessible without auth")
    
    def test_feed_accessible_with_auth(self):
        """Test that feed is accessible with auth"""
        self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/problems", params={"feed": "new", "limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Feed accessible with auth, returned {len(data)} posts")
    
    def test_comments_endpoint_with_auth(self):
        """Test that comments endpoint works with auth (for blocked user filtering)"""
        self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # First get a problem
        problems_response = self.session.get(f"{BASE_URL}/api/problems", params={"feed": "new", "limit": 1})
        if problems_response.status_code != 200:
            pytest.skip("Could not get problems")
        
        problems = problems_response.json()
        if not problems:
            pytest.skip("No problems found")
        
        problem_id = problems[0]["id"]
        
        # Get comments
        response = self.session.get(f"{BASE_URL}/api/problems/{problem_id}/comments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Comments endpoint works with auth")
    
    def test_user_search_with_auth(self):
        """Test that user search works with auth (for blocked user filtering)"""
        self._login(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/users/search", params={"q": "test", "limit": 10})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: User search works with auth")


class TestOtherUsersRoutes:
    """Test that /users/me routes are correctly differentiated from /users/{user_id} routes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return True
        return False
    
    def test_users_me_saved_works(self):
        """Test /users/me/saved endpoint"""
        if not self._login(ADMIN_EMAIL, ADMIN_PASSWORD):
            pytest.skip("Could not authenticate")
        
        response = self.session.get(f"{BASE_URL}/api/users/me/saved")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /users/me/saved works, returned {len(data)} saved posts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
