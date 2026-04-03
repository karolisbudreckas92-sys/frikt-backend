"""
Test Cleanup Fixes (FIX 14-18) - Iteration 14
Tests for schema cleanup and field removal fixes.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frikt-bugfix-release.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestCleanupFixes:
    """Test cleanup fixes 14-18"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.admin_user_id = None
        yield
        self.session.close()
    
    def login_admin(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data["access_token"]
        self.admin_user_id = data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        return data
    
    # ==================== FIX 14: Consolidate visit streak ====================
    
    def test_fix14_auth_me_no_streak_days(self):
        """FIX 14: GET /api/auth/me should NOT have streak_days field"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        user_data = response.json()
        # streak_days should NOT be in the UserResponse
        assert "streak_days" not in user_data, f"streak_days should be removed from UserResponse, got: {user_data.keys()}"
        print("✓ FIX 14: GET /api/auth/me does NOT have streak_days field")
    
    def test_fix14_user_stats_has_streak_days(self):
        """FIX 14: GET /api/users/{user_id}/stats should have streak_days from user_stats collection"""
        login_data = self.login_admin()
        user_id = login_data["user"]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/users/{user_id}/stats")
        assert response.status_code == 200
        
        stats_data = response.json()
        # streak_days SHOULD be in the stats response
        assert "streak_days" in stats_data, f"streak_days should be in stats response, got: {stats_data.keys()}"
        assert isinstance(stats_data["streak_days"], int), f"streak_days should be int, got: {type(stats_data['streak_days'])}"
        print(f"✓ FIX 14: GET /api/users/{user_id}/stats has streak_days={stats_data['streak_days']}")
    
    # ==================== FIX 15: Remove dead fields from schemas ====================
    
    def test_fix15_auth_me_no_rocket10_completed(self):
        """FIX 15: GET /api/auth/me should NOT have rocket10_completed field"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        user_data = response.json()
        # rocket10_completed should NOT be in the UserResponse
        assert "rocket10_completed" not in user_data, f"rocket10_completed should be removed, got: {user_data.keys()}"
        assert "rocket10_day" not in user_data, f"rocket10_day should be removed, got: {user_data.keys()}"
        assert "rocket10_start_date" not in user_data, f"rocket10_start_date should be removed, got: {user_data.keys()}"
        print("✓ FIX 15: GET /api/auth/me does NOT have rocket10_* fields")
    
    def test_fix15_login_response_no_dead_fields(self):
        """FIX 15: Login response user should NOT have rocket10_completed or streak_days"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        user_data = data["user"]
        
        # Check dead fields are not present
        assert "rocket10_completed" not in user_data, f"rocket10_completed should be removed from login response"
        assert "streak_days" not in user_data, f"streak_days should be removed from login response"
        print("✓ FIX 15: Login response user does NOT have rocket10_completed or streak_days")
    
    def test_fix15_problem_response_no_willing_to_pay(self):
        """FIX 15: POST /api/problems should NOT include willing_to_pay in response"""
        self.login_admin()
        
        # Create a test problem
        unique_title = f"TEST_cleanup_fix15_{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/problems", json={
            "title": unique_title,
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 3
        })
        assert response.status_code in [200, 201], f"Problem creation failed: {response.text}"
        
        problem_data = response.json()
        # willing_to_pay should NOT be in the Problem response
        assert "willing_to_pay" not in problem_data, f"willing_to_pay should be removed from Problem, got: {problem_data.keys()}"
        print("✓ FIX 15: POST /api/problems response does NOT have willing_to_pay")
        
        # Cleanup - delete the test problem
        problem_id = problem_data["id"]
        self.session.delete(f"{BASE_URL}/api/problems/{problem_id}")
    
    # ==================== FIX 16: Store onboarding completion server-side ====================
    
    def test_fix16_auth_me_has_onboarding_completed(self):
        """FIX 16: GET /api/auth/me should have onboarding_completed=true for existing admin user"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        user_data = response.json()
        # onboarding_completed should be in the UserResponse
        assert "onboarding_completed" in user_data, f"onboarding_completed should be in UserResponse, got: {user_data.keys()}"
        # Existing admin user should have onboarding_completed=true (from startup migration)
        assert user_data["onboarding_completed"] == True, f"Existing admin should have onboarding_completed=true, got: {user_data['onboarding_completed']}"
        print("✓ FIX 16: GET /api/auth/me has onboarding_completed=true for existing admin")
    
    def test_fix16_profile_update_onboarding_only(self):
        """FIX 16: PUT /api/users/me/profile with only {onboarding_completed: false} should work"""
        self.login_admin()
        
        # Update only onboarding_completed (no displayName required)
        response = self.session.put(f"{BASE_URL}/api/users/me/profile", json={
            "onboarding_completed": False
        })
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify the change
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["onboarding_completed"] == False, f"onboarding_completed should be false, got: {user_data['onboarding_completed']}"
        print("✓ FIX 16: PUT /api/users/me/profile with only onboarding_completed works")
        
        # Restore to true
        response = self.session.put(f"{BASE_URL}/api/users/me/profile", json={
            "onboarding_completed": True
        })
        assert response.status_code == 200
        print("✓ FIX 16: Restored onboarding_completed=true")
    
    # ==================== FIX 18: Remove detail fields from search indexing ====================
    
    def test_fix18_search_finds_by_title(self):
        """FIX 18: GET /api/problems?search=UNIQUE_TITLE_WORD should find by title"""
        self.login_admin()
        
        # Create a test problem with unique title
        unique_word = f"UNIQUETITLE{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/problems", json={
            "title": f"Test problem with {unique_word} in title",
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 3
        })
        assert response.status_code in [200, 201], f"Problem creation failed: {response.text}"
        problem_id = response.json()["id"]
        
        # Search by the unique word in title
        response = self.session.get(f"{BASE_URL}/api/problems", params={"search": unique_word})
        assert response.status_code == 200
        
        problems = response.json()
        assert len(problems) >= 1, f"Should find at least 1 problem with title containing '{unique_word}'"
        found = any(p["id"] == problem_id for p in problems)
        assert found, f"Should find the created problem by title search"
        print(f"✓ FIX 18: Search by title word '{unique_word}' found the problem")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/problems/{problem_id}")
    
    def test_fix18_search_does_not_match_when_happens(self):
        """FIX 18: Search should NOT match on when_happens content"""
        self.login_admin()
        
        # Create a test problem with unique word ONLY in when_happens
        unique_word = f"UNIQUEWHEN{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/problems", json={
            "title": "Generic test problem for search test",
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 3,
            "when_happens": f"This happens when {unique_word} occurs"
        })
        assert response.status_code in [200, 201], f"Problem creation failed: {response.text}"
        problem_id = response.json()["id"]
        
        # Search by the unique word (should NOT find it since it's only in when_happens)
        response = self.session.get(f"{BASE_URL}/api/problems", params={"search": unique_word})
        assert response.status_code == 200
        
        problems = response.json()
        found = any(p["id"] == problem_id for p in problems)
        assert not found, f"Should NOT find problem by when_happens content (search should only match title)"
        print(f"✓ FIX 18: Search by when_happens word '{unique_word}' did NOT find the problem (correct)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/problems/{problem_id}")
    
    def test_fix18_search_does_not_match_who_affected(self):
        """FIX 18: Search should NOT match on who_affected content"""
        self.login_admin()
        
        # Create a test problem with unique word ONLY in who_affected
        unique_word = f"UNIQUEWHO{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/problems", json={
            "title": "Another generic test problem for search",
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 3,
            "who_affected": f"This affects {unique_word} people"
        })
        assert response.status_code in [200, 201], f"Problem creation failed: {response.text}"
        problem_id = response.json()["id"]
        
        # Search by the unique word (should NOT find it since it's only in who_affected)
        response = self.session.get(f"{BASE_URL}/api/problems", params={"search": unique_word})
        assert response.status_code == 200
        
        problems = response.json()
        found = any(p["id"] == problem_id for p in problems)
        assert not found, f"Should NOT find problem by who_affected content (search should only match title)"
        print(f"✓ FIX 18: Search by who_affected word '{unique_word}' did NOT find the problem (correct)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/problems/{problem_id}")
    
    # ==================== REGRESSION TESTS ====================
    
    def test_regression_login_returns_valid_token(self):
        """Regression: POST /api/auth/login should return valid token and user object"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "access_token" in data, "Login should return access_token"
        assert "user" in data, "Login should return user object"
        assert data["user"]["email"] == ADMIN_EMAIL.lower(), "User email should match"
        print("✓ Regression: POST /api/auth/login returns valid token and user")
    
    def test_regression_profile_update_displayname(self):
        """Regression: PUT /api/users/me/profile with displayName change should still work"""
        self.login_admin()
        
        # Get current displayName
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        current_name = response.json().get("displayName")
        
        # Update displayName
        new_name = f"TestAdmin{uuid.uuid4().hex[:4]}"
        response = self.session.put(f"{BASE_URL}/api/users/me/profile", json={
            "displayName": new_name
        })
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify the change
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        assert response.json()["displayName"] == new_name
        print(f"✓ Regression: PUT /api/users/me/profile with displayName works (changed to {new_name})")
        
        # Restore original name if it existed
        if current_name:
            self.session.put(f"{BASE_URL}/api/users/me/profile", json={
                "displayName": current_name
            })
    
    def test_regression_create_problem(self):
        """Regression: POST /api/problems should create problem successfully"""
        self.login_admin()
        
        unique_title = f"TEST_regression_problem_{uuid.uuid4().hex[:8]}"
        response = self.session.post(f"{BASE_URL}/api/problems", json={
            "title": unique_title,
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 3,
            "when_happens": "When testing",
            "who_affected": "Developers"
        })
        assert response.status_code in [200, 201], f"Problem creation failed: {response.text}"
        
        problem_data = response.json()
        assert problem_data["title"] == unique_title
        assert problem_data["category_id"] == "tech"
        assert problem_data["when_happens"] == "When testing"
        assert problem_data["who_affected"] == "Developers"
        print(f"✓ Regression: POST /api/problems creates problem successfully")
        
        # Cleanup
        problem_id = problem_data["id"]
        self.session.delete(f"{BASE_URL}/api/problems/{problem_id}")
    
    def test_health_check(self):
        """Health check: GET /api/health should return healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check: GET /api/health returns healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
