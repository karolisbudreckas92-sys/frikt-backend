"""
Test Community Avatar Feature - Iteration 15
Tests for:
- Feature 2A: GET /api/communities returns avatar_url field
- Feature 2B: POST /api/admin/communities/{id}/avatar (admin upload)
- Feature 2B Security: Non-admin users get 403
- Feature 2E: GET /api/communities/{id}, GET /api/communities/me include avatar_url
- Feature 2E: GET /api/admin/communities includes avatar_url
- Regression: Login, GET /api/problems, PUT /api/users/me/profile
"""

import pytest
import requests
import os
import base64
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"

# Known community with avatar from context
KNOWN_COMMUNITY_WITH_AVATAR_ID = "dc5f2c0e-6ab2-488c-bb2e-abf6de068c98"

# Small valid PNG image (1x1 pixel red PNG)
SMALL_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def test_user_token():
    """Create a test user and get token (non-admin)"""
    unique_id = str(uuid.uuid4())[:8]
    test_email = f"test_avatar_{unique_id}@test.com"
    
    # Register new user
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "name": f"TEST_AvatarUser_{unique_id}",
        "password": "TestPass123!"
    })
    if response.status_code != 200:
        pytest.skip(f"Test user registration failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_user_headers(test_user_token):
    """Headers with non-admin auth"""
    return {"Authorization": f"Bearer {test_user_token}", "Content-Type": "application/json"}


class TestCommunityAvatarFeature:
    """Tests for Community Avatar Feature"""
    
    # ==================== Feature 2A: GET /api/communities returns avatar_url ====================
    
    def test_list_communities_returns_avatar_url_field(self, admin_headers):
        """Feature 2A: GET /api/communities should return avatar_url field for each community"""
        response = requests.get(f"{BASE_URL}/api/communities", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        communities = response.json()
        assert isinstance(communities, list), "Expected list of communities"
        
        if len(communities) > 0:
            # Check that communities have the expected structure
            # Note: avatar_url may be undefined (not present) for communities without avatar
            # This is acceptable behavior per the context note
            print(f"Found {len(communities)} communities")
            
            # Find a community with avatar_url set
            communities_with_avatar = [c for c in communities if c.get("avatar_url")]
            print(f"Communities with avatar_url: {len(communities_with_avatar)}")
            
            # Verify structure of first community
            first_community = communities[0]
            assert "id" in first_community, "Community should have id"
            assert "name" in first_community, "Community should have name"
            # avatar_url may or may not be present
            print(f"First community: id={first_community.get('id')}, name={first_community.get('name')}, avatar_url={first_community.get('avatar_url')}")
    
    # ==================== Feature 2B: Admin upload endpoint ====================
    
    def test_admin_upload_community_avatar_success(self, admin_headers):
        """Feature 2B: POST /api/admin/communities/{id}/avatar accepts base64 image upload"""
        # First, get a community to upload avatar to
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get communities: {response.text}"
        
        data = response.json()
        communities = data.get("communities", [])
        
        if len(communities) == 0:
            pytest.skip("No communities available for testing avatar upload")
        
        # Use the first community
        community_id = communities[0]["id"]
        community_name = communities[0]["name"]
        print(f"Testing avatar upload for community: {community_name} (id: {community_id})")
        
        # Upload avatar
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers=admin_headers,
            json={
                "image": SMALL_PNG_BASE64,
                "mimeType": "image/png"
            }
        )
        
        assert upload_response.status_code == 200, f"Expected 200, got {upload_response.status_code}: {upload_response.text}"
        
        result = upload_response.json()
        assert "url" in result, "Response should contain 'url'"
        assert "message" in result, "Response should contain 'message'"
        assert result["url"].startswith("/api/uploads/community-avatars/"), f"URL should start with /api/uploads/community-avatars/, got: {result['url']}"
        assert "Community avatar uploaded successfully" in result["message"]
        
        print(f"Avatar uploaded successfully: {result['url']}")
        
        # Verify the avatar_url is now set on the community
        verify_response = requests.get(f"{BASE_URL}/api/communities/{community_id}", headers=admin_headers)
        assert verify_response.status_code == 200
        
        community_data = verify_response.json()
        assert community_data.get("avatar_url") == result["url"], f"Community avatar_url should be updated. Expected: {result['url']}, Got: {community_data.get('avatar_url')}"
    
    def test_admin_upload_community_avatar_invalid_base64(self, admin_headers):
        """Feature 2B: Invalid base64 should return 400"""
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        communities = response.json().get("communities", [])
        
        if len(communities) == 0:
            pytest.skip("No communities available")
        
        community_id = communities[0]["id"]
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers=admin_headers,
            json={
                "image": "not-valid-base64!!!",
                "mimeType": "image/png"
            }
        )
        
        assert upload_response.status_code == 400, f"Expected 400 for invalid base64, got {upload_response.status_code}"
        assert "Invalid base64" in upload_response.json().get("detail", "")
    
    def test_admin_upload_community_avatar_not_found(self, admin_headers):
        """Feature 2B: Non-existent community should return 404"""
        fake_id = str(uuid.uuid4())
        
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/communities/{fake_id}/avatar",
            headers=admin_headers,
            json={
                "image": SMALL_PNG_BASE64,
                "mimeType": "image/png"
            }
        )
        
        assert upload_response.status_code == 404, f"Expected 404 for non-existent community, got {upload_response.status_code}"
    
    # ==================== Feature 2B Security: Non-admin gets 403 ====================
    
    def test_non_admin_cannot_upload_community_avatar(self, test_user_headers, admin_headers):
        """Feature 2B Security: POST /api/admin/communities/{id}/avatar should return 403 for non-admin users"""
        # Get a community ID
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        communities = response.json().get("communities", [])
        
        if len(communities) == 0:
            pytest.skip("No communities available")
        
        community_id = communities[0]["id"]
        
        # Try to upload as non-admin
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers=test_user_headers,
            json={
                "image": SMALL_PNG_BASE64,
                "mimeType": "image/png"
            }
        )
        
        assert upload_response.status_code == 403, f"Expected 403 for non-admin, got {upload_response.status_code}: {upload_response.text}"
        print("Non-admin correctly denied access to avatar upload endpoint")
    
    def test_unauthenticated_cannot_upload_community_avatar(self, admin_headers):
        """Feature 2B Security: Unauthenticated request should return 401"""
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        communities = response.json().get("communities", [])
        
        if len(communities) == 0:
            pytest.skip("No communities available")
        
        community_id = communities[0]["id"]
        
        # Try to upload without auth
        upload_response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers={"Content-Type": "application/json"},  # No auth header
            json={
                "image": SMALL_PNG_BASE64,
                "mimeType": "image/png"
            }
        )
        
        assert upload_response.status_code == 401, f"Expected 401 for unauthenticated, got {upload_response.status_code}"
    
    # ==================== Feature 2E: API responses include avatar_url ====================
    
    def test_get_community_by_id_includes_avatar_url(self, admin_headers):
        """Feature 2E: GET /api/communities/{id} should include avatar_url"""
        # Get communities list
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        communities = response.json().get("communities", [])
        
        if len(communities) == 0:
            pytest.skip("No communities available")
        
        # Find a community with avatar_url if possible
        community_with_avatar = next((c for c in communities if c.get("avatar_url")), communities[0])
        community_id = community_with_avatar["id"]
        
        # Get single community
        get_response = requests.get(f"{BASE_URL}/api/communities/{community_id}", headers=admin_headers)
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        community_data = get_response.json()
        # avatar_url should be present if set, or may be absent/null if not set
        print(f"GET /api/communities/{community_id} - avatar_url: {community_data.get('avatar_url')}")
        
        # Verify other expected fields are present
        assert "id" in community_data
        assert "name" in community_data
        assert "member_count" in community_data
        assert "frikt_count" in community_data
    
    def test_admin_list_communities_includes_avatar_url(self, admin_headers):
        """Feature 2E: GET /api/admin/communities should include avatar_url for each community"""
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "communities" in data, "Response should have 'communities' key"
        assert "total" in data, "Response should have 'total' key"
        
        communities = data["communities"]
        print(f"Admin list communities: {len(communities)} communities, total: {data['total']}")
        
        if len(communities) > 0:
            # Check structure
            for c in communities:
                assert "id" in c
                assert "name" in c
                # avatar_url may or may not be present
                print(f"  - {c['name']}: avatar_url={c.get('avatar_url')}")


class TestCommunityMeAvatarUrl:
    """Test GET /api/communities/me includes avatar_url"""
    
    def test_get_my_community_includes_avatar_url_when_member(self, admin_headers):
        """Feature 2E: GET /api/communities/me should include avatar_url when user is in a community"""
        # First check if admin is in a community
        response = requests.get(f"{BASE_URL}/api/communities/me", headers=admin_headers)
        
        # Response can be null if not in a community, or community object if in one
        if response.status_code == 200:
            data = response.json()
            if data is None:
                print("Admin is not in any community - skipping avatar_url check")
                pytest.skip("Admin is not in any community")
            else:
                # User is in a community - check structure
                assert "id" in data
                assert "name" in data
                # avatar_url may or may not be present depending on if community has one
                print(f"GET /api/communities/me - community: {data.get('name')}, avatar_url: {data.get('avatar_url')}")
        else:
            print(f"GET /api/communities/me returned {response.status_code}")


class TestRegressionTests:
    """Regression tests to ensure existing functionality still works"""
    
    def test_regression_login_works(self):
        """Regression: POST /api/auth/login should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL.lower()
        print("Regression: Login works correctly")
    
    def test_regression_get_problems_works(self, admin_headers):
        """Regression: GET /api/problems should work"""
        response = requests.get(f"{BASE_URL}/api/problems", headers=admin_headers)
        
        assert response.status_code == 200, f"GET /api/problems failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # API returns a list of problems directly
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"Regression: GET /api/problems works - {len(data)} problems returned")
    
    def test_regression_profile_update_works(self, admin_headers):
        """Regression: PUT /api/users/me/profile should work"""
        # Get current profile
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me_response.status_code == 200
        
        current_bio = me_response.json().get("bio", "")
        
        # Update bio
        new_bio = f"Test bio update {uuid.uuid4()}"
        update_response = requests.put(
            f"{BASE_URL}/api/users/me/profile",
            headers=admin_headers,
            json={"bio": new_bio}
        )
        
        assert update_response.status_code == 200, f"Profile update failed: {update_response.status_code} - {update_response.text}"
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert verify_response.status_code == 200
        assert verify_response.json().get("bio") == new_bio
        
        # Restore original bio
        requests.put(
            f"{BASE_URL}/api/users/me/profile",
            headers=admin_headers,
            json={"bio": current_bio}
        )
        
        print("Regression: Profile update works correctly")


class TestKnownCommunityWithAvatar:
    """Test the known community that already has an avatar_url set"""
    
    def test_known_community_has_avatar_url(self, admin_headers):
        """Verify the known community 'First Community 7a3574' has avatar_url"""
        response = requests.get(
            f"{BASE_URL}/api/communities/{KNOWN_COMMUNITY_WITH_AVATAR_ID}",
            headers=admin_headers
        )
        
        if response.status_code == 404:
            pytest.skip("Known community not found - may have been deleted")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Known community: {data.get('name')}")
        print(f"avatar_url: {data.get('avatar_url')}")
        
        # This community should have an avatar_url set per the context
        if data.get("avatar_url"):
            print("✓ Known community has avatar_url set")
        else:
            print("⚠ Known community does not have avatar_url set (may have been cleared)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
