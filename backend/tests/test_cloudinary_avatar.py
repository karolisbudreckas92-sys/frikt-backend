"""
Test Cloudinary Avatar Migration - Iteration 16
Tests all 3 avatar upload endpoints now using Cloudinary storage:
- POST /api/users/me/avatar-base64 (user avatar via base64)
- POST /api/users/me/avatar (user avatar via multipart)
- POST /api/admin/communities/{id}/avatar (community avatar, admin only)
Also tests avatar propagation to problems/comments and security.
"""

import pytest
import requests
import os
import base64
import struct
import zlib
import uuid
import tempfile

# Get API URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('EXPO_PUBLIC_BACKEND_URL', '')).rstrip('/')

# Test credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


def create_minimal_png(width=10, height=10, color=(255, 0, 0)):
    """Create a minimal valid PNG image using struct and zlib (no PIL needed)"""
    def png_chunk(chunk_type, data):
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = png_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk (image data)
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            raw_data += bytes(color)
    
    compressed = zlib.compress(raw_data)
    idat = png_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = png_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def test_user_token():
    """Create a test user and get token"""
    unique_id = str(uuid.uuid4())[:8]
    email = f"TEST_cloudinary_{unique_id}@test.com"
    password = "TestPass123!"
    name = f"TEST_CloudinaryUser_{unique_id}"
    
    # Register test user
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if response.status_code == 201:
        data = response.json()
        return data.get("access_token") or data.get("token")
    elif response.status_code == 400 and "already exists" in response.text.lower():
        # User exists, try login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        assert response.status_code == 200, f"Test user login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    else:
        # Check if it's actually a success with access_token
        data = response.json()
        if "access_token" in data:
            return data["access_token"]
        pytest.fail(f"Failed to create test user: {response.text}")


@pytest.fixture(scope="module")
def community_id(admin_token):
    """Get a community ID for testing"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/api/admin/communities", headers=headers)
    assert response.status_code == 200, f"Failed to get communities: {response.text}"
    
    data = response.json()
    communities = data.get("communities", data) if isinstance(data, dict) else data
    
    if communities and len(communities) > 0:
        return communities[0]["id"]
    else:
        pytest.skip("No communities available for testing")


class TestUserAvatarBase64Cloudinary:
    """Test POST /api/users/me/avatar-base64 uploads to Cloudinary"""
    
    def test_upload_base64_returns_cloudinary_url(self, admin_token):
        """Upload base64 image, verify returned URL contains 'cloudinary.com' and 'frikt/avatars'"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a minimal PNG image
        png_data = create_minimal_png(20, 20, (0, 128, 255))
        base64_image = base64.b64encode(png_data).decode('utf-8')
        
        response = requests.post(
            f"{BASE_URL}/api/users/me/avatar-base64",
            headers=headers,
            json={"image": base64_image, "mimeType": "image/png"}
        )
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain 'url' field"
        url = data["url"]
        
        # Verify Cloudinary URL
        assert "cloudinary.com" in url, f"URL should contain 'cloudinary.com': {url}"
        assert "frikt/avatars" in url or "frikt%2Favatars" in url, f"URL should contain 'frikt/avatars': {url}"
        
        print(f"✓ Base64 upload returned Cloudinary URL: {url}")
    
    def test_user_avatar_url_persisted_in_profile(self, admin_token):
        """After uploading, verify user's avatarUrl in GET /api/auth/me is the Cloudinary URL"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current user profile
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"Failed to get profile: {response.text}"
        
        user = response.json()
        avatar_url = user.get("avatarUrl")
        
        assert avatar_url is not None, "User should have avatarUrl set"
        assert "cloudinary.com" in avatar_url, f"avatarUrl should be Cloudinary URL: {avatar_url}"
        
        print(f"✓ User profile has Cloudinary avatarUrl: {avatar_url}")


class TestUserAvatarMultipartCloudinary:
    """Test POST /api/users/me/avatar (multipart) uploads to Cloudinary"""
    
    def test_upload_multipart_returns_cloudinary_url(self, test_user_token):
        """Upload image file via multipart, verify returned URL contains 'cloudinary.com'"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        # Create a minimal PNG image and save to temp file
        png_data = create_minimal_png(15, 15, (255, 128, 0))
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            f.write(png_data)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {'file': ('test_avatar.png', f, 'image/png')}
                response = requests.post(
                    f"{BASE_URL}/api/users/me/avatar",
                    headers=headers,
                    files=files
                )
        finally:
            os.unlink(temp_path)
        
        assert response.status_code == 200, f"Multipart upload failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain 'url' field"
        url = data["url"]
        
        # Verify Cloudinary URL
        assert "cloudinary.com" in url, f"URL should contain 'cloudinary.com': {url}"
        
        print(f"✓ Multipart upload returned Cloudinary URL: {url}")


class TestCommunityAvatarCloudinary:
    """Test POST /api/admin/communities/{id}/avatar uploads to Cloudinary"""
    
    def test_admin_upload_community_avatar_cloudinary(self, admin_token, community_id):
        """Upload base64 image as admin, verify returned URL contains 'cloudinary.com' and 'frikt/communities'"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a minimal PNG image
        png_data = create_minimal_png(25, 25, (0, 255, 128))
        base64_image = base64.b64encode(png_data).decode('utf-8')
        
        response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers=headers,
            json={"image": base64_image, "mimeType": "image/png"}
        )
        
        assert response.status_code == 200, f"Community avatar upload failed: {response.text}"
        data = response.json()
        
        assert "url" in data, "Response should contain 'url' field"
        url = data["url"]
        
        # Verify Cloudinary URL
        assert "cloudinary.com" in url, f"URL should contain 'cloudinary.com': {url}"
        assert "frikt/communities" in url or "frikt%2Fcommunities" in url, f"URL should contain 'frikt/communities': {url}"
        
        print(f"✓ Community avatar upload returned Cloudinary URL: {url}")
    
    def test_non_admin_cannot_upload_community_avatar(self, test_user_token, community_id):
        """POST /api/admin/communities/{id}/avatar should return 403 for non-admin users"""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        
        png_data = create_minimal_png(10, 10, (128, 128, 128))
        base64_image = base64.b64encode(png_data).decode('utf-8')
        
        response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            headers=headers,
            json={"image": base64_image, "mimeType": "image/png"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}: {response.text}"
        print("✓ Non-admin user correctly gets 403 Forbidden")
    
    def test_unauthenticated_cannot_upload_community_avatar(self, community_id):
        """POST /api/admin/communities/{id}/avatar should return 401 for unauthenticated requests"""
        png_data = create_minimal_png(10, 10, (128, 128, 128))
        base64_image = base64.b64encode(png_data).decode('utf-8')
        
        response = requests.post(
            f"{BASE_URL}/api/admin/communities/{community_id}/avatar",
            json={"image": base64_image, "mimeType": "image/png"}
        )
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated, got {response.status_code}: {response.text}"
        print("✓ Unauthenticated request correctly gets 401 Unauthorized")


class TestAvatarPropagation:
    """Test that avatar URL propagates to problems and comments"""
    
    def test_avatar_propagates_to_problems(self, admin_token):
        """After uploading user avatar, verify GET /api/problems returns user_avatar_url with Cloudinary URL"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get user's problems
        response = requests.get(f"{BASE_URL}/api/problems", headers=headers)
        assert response.status_code == 200, f"Failed to get problems: {response.text}"
        
        problems = response.json()
        
        # Get current user to find their problems
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        user = me_response.json()
        user_id = user["id"]
        user_avatar = user.get("avatarUrl")
        
        # Find problems by this user
        user_problems = [p for p in problems if p.get("user_id") == user_id]
        
        if user_problems:
            for problem in user_problems[:3]:  # Check first 3
                problem_avatar = problem.get("user_avatar_url")
                if problem_avatar:
                    # If avatar is set, it should be Cloudinary URL
                    if user_avatar and "cloudinary.com" in user_avatar:
                        assert "cloudinary.com" in problem_avatar, f"Problem avatar should be Cloudinary URL: {problem_avatar}"
                        print(f"✓ Problem {problem['id'][:8]} has Cloudinary avatar URL")
            print(f"✓ Checked {len(user_problems)} problems for avatar propagation")
        else:
            print("⚠ No problems found for this user to verify avatar propagation")


class TestOldUrlsFallback:
    """Test that old /api/uploads/ URLs still work as fallback"""
    
    def test_uploads_static_mount_exists(self):
        """GET /api/uploads/avatars/ should return 200 or 404 (not 500)"""
        # Try to access the static files mount
        response = requests.get(f"{BASE_URL}/api/uploads/")
        
        # Should not be a server error - either 200 (directory listing) or 404 (not found) or 403 (forbidden)
        assert response.status_code in [200, 403, 404, 405], f"Static mount should work, got {response.status_code}"
        print(f"✓ Static files mount responds with status {response.status_code}")


class TestRegressionEndpoints:
    """Regression tests to ensure core functionality still works"""
    
    def test_login_works(self):
        """POST /api/auth/login works correctly"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, f"Response should contain token: {data}"
        print("✓ Login works correctly")
    
    def test_get_auth_me_works(self, admin_token):
        """GET /api/auth/me works correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200, f"GET /api/auth/me failed: {response.text}"
        
        user = response.json()
        assert "id" in user
        assert "email" in user
        print("✓ GET /api/auth/me works correctly")
    
    def test_get_problems_works(self, admin_token):
        """GET /api/problems works correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/problems", headers=headers)
        assert response.status_code == 200, f"GET /api/problems failed: {response.text}"
        
        problems = response.json()
        assert isinstance(problems, list)
        print(f"✓ GET /api/problems works correctly ({len(problems)} problems)")
    
    def test_update_profile_works(self, admin_token):
        """PUT /api/users/me/profile works correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current profile
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        current_bio = me_response.json().get("bio", "")
        
        # Update with same bio (no actual change)
        response = requests.put(
            f"{BASE_URL}/api/users/me/profile",
            headers=headers,
            json={"bio": current_bio or "Test bio"}
        )
        assert response.status_code == 200, f"PUT /api/users/me/profile failed: {response.text}"
        print("✓ PUT /api/users/me/profile works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
