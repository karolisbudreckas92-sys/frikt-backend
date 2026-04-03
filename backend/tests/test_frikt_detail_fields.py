"""
FRIKT API Backend Tests - Iteration 11
Testing: Detail fields (when_happens, who_affected, what_tried) in frikt creation and update

Features tested:
- POST /api/problems - creating a frikt WITH detail fields should save them
- POST /api/problems - creating a frikt WITHOUT detail fields should work normally
- PATCH /api/problems/{id} - updating detail fields should persist changes
- GET /api/problems/{id} - fetching a problem should return detail fields if they were set
- GET /api/health - health check
- POST /api/auth/login - login works
- POST /api/auth/register - register works
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Use the public API URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://frikt-bugfix-release.preview.emergentagent.com').rstrip('/')

# Test credentials
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


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_register_returns_token_and_user(self):
        """POST /api/auth/register should return access_token and user data"""
        test_email = f"test_detail_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Detail User"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == test_email.lower()
        print(f"✓ Register returns access_token and user data")
    
    def test_login_returns_token_and_user(self):
        """POST /api/auth/login should return access_token and user data"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        print(f"✓ Login returns access_token and user data")


class TestFriktCreationWithDetailFields:
    """Test creating frikts with and without detail fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for a test user"""
        test_email = f"test_create_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Create User"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not create test user")
    
    def test_create_frikt_with_all_detail_fields(self, auth_token):
        """POST /api/problems with all detail fields should save them"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create frikt with all detail fields
        frikt_data = {
            "title": "This is a test frikt with all detail fields included",
            "category_id": "tech",
            "frequency": "daily",
            "pain_level": 4,
            "when_happens": "This happens every morning when I start my computer",
            "who_affected": "All developers in my team are affected by this issue",
            "what_tried": "I tried restarting, clearing cache, and reinstalling"
        }
        
        response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json=frikt_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all detail fields are returned
        assert "when_happens" in data, "Response should contain 'when_happens'"
        assert "who_affected" in data, "Response should contain 'who_affected'"
        assert "what_tried" in data, "Response should contain 'what_tried'"
        
        assert data["when_happens"] == frikt_data["when_happens"], f"when_happens mismatch"
        assert data["who_affected"] == frikt_data["who_affected"], f"who_affected mismatch"
        assert data["what_tried"] == frikt_data["what_tried"], f"what_tried mismatch"
        
        print(f"✓ Created frikt with all detail fields - ID: {data['id']}")
        return data["id"]
    
    def test_create_frikt_with_partial_detail_fields(self, auth_token):
        """POST /api/problems with only some detail fields should work"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create frikt with only when_happens
        frikt_data = {
            "title": "This is a test frikt with only when_happens field",
            "category_id": "work",
            "when_happens": "This happens during meetings"
        }
        
        response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json=frikt_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify when_happens is set, others are null
        assert data["when_happens"] == frikt_data["when_happens"]
        assert data.get("who_affected") is None, "who_affected should be null"
        assert data.get("what_tried") is None, "what_tried should be null"
        
        print(f"✓ Created frikt with partial detail fields - ID: {data['id']}")
    
    def test_create_frikt_without_detail_fields(self, auth_token):
        """POST /api/problems without detail fields should work normally"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create frikt without any detail fields
        frikt_data = {
            "title": "This is a test frikt without any detail fields",
            "category_id": "money",
            "frequency": "weekly",
            "pain_level": 3
        }
        
        response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json=frikt_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify frikt was created
        assert "id" in data, "Response should contain 'id'"
        assert data["title"] == frikt_data["title"]
        
        # Detail fields should be null
        assert data.get("when_happens") is None, "when_happens should be null"
        assert data.get("who_affected") is None, "who_affected should be null"
        assert data.get("what_tried") is None, "what_tried should be null"
        
        print(f"✓ Created frikt without detail fields - ID: {data['id']}")


class TestFriktUpdateWithDetailFields:
    """Test updating frikts with detail fields using PATCH"""
    
    @pytest.fixture
    def auth_token_and_frikt(self):
        """Create a test user and frikt, return token and frikt ID"""
        test_email = f"test_update_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Update User"
        })
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a frikt without detail fields
        frikt_response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json={
            "title": "This is a test frikt for update testing purposes",
            "category_id": "health"
        })
        
        if frikt_response.status_code != 200:
            pytest.skip(f"Could not create test frikt: {frikt_response.text}")
        
        frikt_id = frikt_response.json()["id"]
        return token, frikt_id
    
    def test_patch_frikt_add_detail_fields(self, auth_token_and_frikt):
        """PATCH /api/problems/{id} should add detail fields"""
        token, frikt_id = auth_token_and_frikt
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update with detail fields
        update_data = {
            "when_happens": "Updated: This happens in the evening",
            "who_affected": "Updated: My family is affected",
            "what_tried": "Updated: I tried meditation"
        }
        
        response = requests.patch(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify detail fields are updated
        assert data["when_happens"] == update_data["when_happens"], "when_happens not updated"
        assert data["who_affected"] == update_data["who_affected"], "who_affected not updated"
        assert data["what_tried"] == update_data["what_tried"], "what_tried not updated"
        
        print(f"✓ PATCH added detail fields to frikt {frikt_id}")
    
    def test_patch_frikt_update_single_detail_field(self, auth_token_and_frikt):
        """PATCH /api/problems/{id} should update only specified detail field"""
        token, frikt_id = auth_token_and_frikt
        headers = {"Authorization": f"Bearer {token}"}
        
        # First add all detail fields
        requests.patch(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers, json={
            "when_happens": "Initial when_happens",
            "who_affected": "Initial who_affected",
            "what_tried": "Initial what_tried"
        })
        
        # Now update only when_happens
        update_data = {
            "when_happens": "Only when_happens is updated now"
        }
        
        response = requests.patch(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify only when_happens is updated, others remain
        assert data["when_happens"] == update_data["when_happens"], "when_happens not updated"
        assert data["who_affected"] == "Initial who_affected", "who_affected should not change"
        assert data["what_tried"] == "Initial what_tried", "what_tried should not change"
        
        print(f"✓ PATCH updated single detail field on frikt {frikt_id}")
    
    def test_patch_frikt_update_title_and_detail_fields(self, auth_token_and_frikt):
        """PATCH /api/problems/{id} should update title and detail fields together"""
        token, frikt_id = auth_token_and_frikt
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update title and detail fields together
        update_data = {
            "title": "Updated title with at least ten characters",
            "when_happens": "Combined update: when it happens",
            "who_affected": "Combined update: who is affected"
        }
        
        response = requests.patch(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify all fields are updated
        assert data["title"] == update_data["title"], "title not updated"
        assert data["when_happens"] == update_data["when_happens"], "when_happens not updated"
        assert data["who_affected"] == update_data["who_affected"], "who_affected not updated"
        
        print(f"✓ PATCH updated title and detail fields on frikt {frikt_id}")


class TestFriktGetWithDetailFields:
    """Test fetching frikts returns detail fields"""
    
    @pytest.fixture
    def auth_token_and_frikt_with_details(self):
        """Create a test user and frikt with detail fields"""
        test_email = f"test_get_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Get User"
        })
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a frikt with detail fields
        detail_fields = {
            "when_happens": "GET test: This happens at night",
            "who_affected": "GET test: Night shift workers",
            "what_tried": "GET test: Tried sleeping earlier"
        }
        
        frikt_response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json={
            "title": "This is a test frikt for GET testing with details",
            "category_id": "health",
            **detail_fields
        })
        
        if frikt_response.status_code != 200:
            pytest.skip(f"Could not create test frikt: {frikt_response.text}")
        
        frikt_id = frikt_response.json()["id"]
        return token, frikt_id, detail_fields
    
    def test_get_frikt_returns_detail_fields(self, auth_token_and_frikt_with_details):
        """GET /api/problems/{id} should return detail fields if set"""
        token, frikt_id, expected_details = auth_token_and_frikt_with_details
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify detail fields are returned
        assert "when_happens" in data, "Response should contain 'when_happens'"
        assert "who_affected" in data, "Response should contain 'who_affected'"
        assert "what_tried" in data, "Response should contain 'what_tried'"
        
        assert data["when_happens"] == expected_details["when_happens"], "when_happens mismatch"
        assert data["who_affected"] == expected_details["who_affected"], "who_affected mismatch"
        assert data["what_tried"] == expected_details["what_tried"], "what_tried mismatch"
        
        print(f"✓ GET /api/problems/{frikt_id} returns detail fields correctly")
    
    def test_get_frikt_without_details_returns_null(self):
        """GET /api/problems/{id} should return null for unset detail fields"""
        test_email = f"test_getnull_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Get Null User"
        })
        if reg_response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a frikt without detail fields
        frikt_response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json={
            "title": "This is a test frikt without any detail fields set",
            "category_id": "other"
        })
        
        if frikt_response.status_code != 200:
            pytest.skip(f"Could not create test frikt: {frikt_response.text}")
        
        frikt_id = frikt_response.json()["id"]
        
        # GET the frikt
        response = requests.get(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify detail fields are null
        assert data.get("when_happens") is None, "when_happens should be null"
        assert data.get("who_affected") is None, "who_affected should be null"
        assert data.get("what_tried") is None, "what_tried should be null"
        
        print(f"✓ GET /api/problems/{frikt_id} returns null for unset detail fields")


class TestFriktDetailFieldsPersistence:
    """Test that detail fields persist correctly after update"""
    
    def test_detail_fields_persist_after_patch(self):
        """Detail fields should persist after PATCH and be retrievable via GET"""
        test_email = f"test_persist_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test Persist User"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        token = reg_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a frikt without detail fields
        create_response = requests.post(f"{BASE_URL}/api/problems", headers=headers, json={
            "title": "This is a test frikt for persistence testing",
            "category_id": "tech"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        frikt_id = create_response.json()["id"]
        
        # PATCH to add detail fields
        detail_fields = {
            "when_happens": "Persistence test: happens during deployment",
            "who_affected": "Persistence test: DevOps team",
            "what_tried": "Persistence test: tried rollback"
        }
        
        patch_response = requests.patch(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers, json=detail_fields)
        assert patch_response.status_code == 200, f"PATCH failed: {patch_response.text}"
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/problems/{frikt_id}", headers=headers)
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        data = get_response.json()
        
        # Verify detail fields persisted
        assert data["when_happens"] == detail_fields["when_happens"], "when_happens not persisted"
        assert data["who_affected"] == detail_fields["who_affected"], "who_affected not persisted"
        assert data["what_tried"] == detail_fields["what_tried"], "what_tried not persisted"
        
        print(f"✓ Detail fields persist correctly after PATCH - verified via GET")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
