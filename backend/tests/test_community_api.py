"""
Test suite for Local Communities feature in FRIKT app.
Tests all community-related endpoints including:
- Admin community management (create, list, update code, export)
- User community operations (join, switch, leave)
- Community listing and details
- Community requests and join requests
- Local frikt posting and feed filtering
- Community membership restrictions on relate
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://frikt-bug-fixes.preview.emergentagent.com"

# Admin credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestSetup:
    """Setup and authentication helpers"""
    
    @staticmethod
    def get_admin_token():
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data["access_token"]
    
    @staticmethod
    def get_auth_headers(token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}


class TestAdminCommunityManagement:
    """Test admin community management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        self.test_community_ids = []
    
    def teardown_method(self):
        """Cleanup test communities after each test"""
        # Note: We'll clean up in a separate cleanup test
        pass
    
    def test_admin_create_community(self):
        """POST /api/admin/communities - Admin creates a community"""
        unique_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/admin/communities", 
            headers=self.headers,
            json={
                "name": f"Test Community {unique_code}",
                "code": unique_code,
                "moderator_email": "test-moderator@example.com"
            }
        )
        assert response.status_code == 200, f"Create community failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "community" in data
        assert data["community"]["name"] == f"Test Community {unique_code}"
        assert data["community"]["active_code"] == unique_code
        self.test_community_ids.append(data["community"]["id"])
        print(f"✓ Created community: {data['community']['id']}")
    
    def test_admin_create_community_duplicate_code(self):
        """POST /api/admin/communities - Fails with duplicate code"""
        # First create a community
        unique_code = f"DUP-{uuid.uuid4().hex[:6].upper()}"
        response1 = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": "First Community",
                "code": unique_code,
                "moderator_email": "mod@example.com"
            }
        )
        assert response1.status_code == 200
        
        # Try to create another with same code
        response2 = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": "Second Community",
                "code": unique_code,
                "moderator_email": "mod2@example.com"
            }
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()
        print("✓ Duplicate code correctly rejected")
    
    def test_admin_list_communities(self):
        """GET /api/admin/communities - Admin lists all communities with stats"""
        response = requests.get(f"{BASE_URL}/api/admin/communities",
            headers=self.headers
        )
        assert response.status_code == 200, f"List communities failed: {response.text}"
        data = response.json()
        assert "communities" in data
        assert "total" in data
        assert isinstance(data["communities"], list)
        
        # Check that each community has required stats
        if data["communities"]:
            community = data["communities"][0]
            assert "id" in community
            assert "name" in community
            assert "active_code" in community
            assert "member_count" in community
            assert "frikt_count" in community
            assert "pending_join_requests" in community
        print(f"✓ Listed {len(data['communities'])} communities")
    
    def test_admin_update_community_code(self):
        """PUT /api/admin/communities/{id}/code - Admin changes community code"""
        # First create a community
        old_code = f"OLD-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": "Code Update Test",
                "code": old_code,
                "moderator_email": "mod@example.com"
            }
        )
        assert create_resp.status_code == 200
        community_id = create_resp.json()["community"]["id"]
        
        # Update the code
        new_code = f"NEW-{uuid.uuid4().hex[:6].upper()}"
        update_resp = requests.put(f"{BASE_URL}/api/admin/communities/{community_id}/code",
            headers=self.headers,
            json={"new_code": new_code}
        )
        assert update_resp.status_code == 200, f"Update code failed: {update_resp.text}"
        assert update_resp.json()["success"] == True
        print(f"✓ Updated community code from {old_code} to {new_code}")
    
    def test_admin_get_community_requests(self):
        """GET /api/admin/community-requests - Admin gets community creation requests"""
        response = requests.get(f"{BASE_URL}/api/admin/community-requests",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get community requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} community creation requests")
    
    def test_admin_get_join_requests(self):
        """GET /api/admin/communities/{id}/join-requests - Admin gets join requests"""
        # Get an existing community
        list_resp = requests.get(f"{BASE_URL}/api/admin/communities",
            headers=self.headers
        )
        assert list_resp.status_code == 200
        communities = list_resp.json()["communities"]
        
        if communities:
            community_id = communities[0]["id"]
            response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/join-requests",
                headers=self.headers
            )
            assert response.status_code == 200, f"Get join requests failed: {response.text}"
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Retrieved {len(data)} join requests for community {community_id}")
        else:
            pytest.skip("No communities available for testing")
    
    def test_admin_export_community_data(self):
        """GET /api/admin/communities/{id}/export - Export community data"""
        # Get an existing community
        list_resp = requests.get(f"{BASE_URL}/api/admin/communities",
            headers=self.headers
        )
        assert list_resp.status_code == 200
        communities = list_resp.json()["communities"]
        
        if communities:
            community_id = communities[0]["id"]
            response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/export?period=all",
                headers=self.headers
            )
            assert response.status_code == 200, f"Export failed: {response.text}"
            data = response.json()
            assert "content" in data
            assert "filename" in data
            assert "COMMUNITY EXPORT" in data["content"]
            print(f"✓ Exported community data: {data['filename']}")
        else:
            pytest.skip("No communities available for testing")


class TestUserCommunityOperations:
    """Test user community join/switch/leave operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token and test community"""
        self.admin_token = TestSetup.get_admin_token()
        self.admin_headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create a test community for user operations
        self.test_code = f"USER-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.admin_headers,
            json={
                "name": f"User Test Community {self.test_code}",
                "code": self.test_code,
                "moderator_email": "mod@example.com"
            }
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
        else:
            self.test_community_id = None
    
    def test_join_community_with_code(self):
        """POST /api/communities/join - Join community with code (case-insensitive)"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # First leave any existing community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        
        # Join with lowercase code (test case-insensitivity)
        response = requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code.lower()}
        )
        assert response.status_code == 200, f"Join failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["community"]["id"] == self.test_community_id
        print(f"✓ Joined community with code {self.test_code.lower()} (case-insensitive)")
    
    def test_join_community_already_member_same(self):
        """POST /api/communities/join - Returns 400 when already in same community"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # First leave and join
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code}
        )
        
        # Try to join same community again
        response = requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "already a member" in response.json()["detail"].lower()
        print("✓ Correctly rejected joining same community twice")
    
    def test_join_community_already_member_different(self):
        """POST /api/communities/join - Returns 409 when already in different community (switch prompt)"""
        # Create a second community
        second_code = f"SEC-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.admin_headers,
            json={
                "name": f"Second Community {second_code}",
                "code": second_code,
                "moderator_email": "mod@example.com"
            }
        )
        assert create_resp.status_code == 200
        
        # Make sure user is in first community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code}
        )
        
        # Try to join second community
        response = requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": second_code}
        )
        assert response.status_code == 409, f"Expected 409, got {response.status_code}: {response.text}"
        detail = response.json()["detail"]
        assert "message" in detail
        assert "current_community" in detail
        assert "new_community" in detail
        print("✓ Correctly returned 409 with switch prompt")
    
    def test_switch_community(self):
        """POST /api/communities/switch - Switch to new community"""
        # Create a second community
        second_code = f"SWT-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.admin_headers,
            json={
                "name": f"Switch Target {second_code}",
                "code": second_code,
                "moderator_email": "mod@example.com"
            }
        )
        assert create_resp.status_code == 200
        second_id = create_resp.json()["community"]["id"]
        
        # Make sure user is in first community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code}
        )
        
        # Switch to second community
        response = requests.post(f"{BASE_URL}/api/communities/switch",
            headers=self.admin_headers,
            json={"code": second_code}
        )
        assert response.status_code == 200, f"Switch failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["community"]["id"] == second_id
        print(f"✓ Switched from {self.test_code} to {second_code}")
    
    def test_leave_community(self):
        """DELETE /api/communities/leave - Leave current community"""
        # First join a community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.admin_headers,
            json={"code": self.test_code}
        )
        
        # Leave the community
        response = requests.delete(f"{BASE_URL}/api/communities/leave",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Leave failed: {response.text}"
        assert response.json()["success"] == True
        
        # Verify user is no longer in a community
        me_resp = requests.get(f"{BASE_URL}/api/communities/me", headers=self.admin_headers)
        assert me_resp.status_code == 200
        assert me_resp.json() is None
        print("✓ Left community successfully")
    
    def test_leave_community_not_member(self):
        """DELETE /api/communities/leave - Returns 404 when not in any community"""
        # First make sure user is not in any community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.admin_headers)
        
        # Try to leave again
        response = requests.delete(f"{BASE_URL}/api/communities/leave",
            headers=self.admin_headers
        )
        assert response.status_code == 404
        print("✓ Correctly returned 404 when not in any community")


class TestCommunityListing:
    """Test community listing and details endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_list_communities(self):
        """GET /api/communities - List all communities with member/frikt counts"""
        response = requests.get(f"{BASE_URL}/api/communities",
            headers=self.headers
        )
        assert response.status_code == 200, f"List failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            community = data[0]
            assert "id" in community
            assert "name" in community
            assert "member_count" in community
            assert "frikt_count" in community
        print(f"✓ Listed {len(data)} communities with stats")
    
    def test_list_communities_with_search(self):
        """GET /api/communities?search=xxx - Search communities by name"""
        response = requests.get(f"{BASE_URL}/api/communities?search=Melbourne",
            headers=self.headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All results should contain "Melbourne" in name
        for c in data:
            assert "melbourne" in c["name"].lower()
        print(f"✓ Search returned {len(data)} communities matching 'Melbourne'")
    
    def test_get_my_community(self):
        """GET /api/communities/me - Get user's current community (null if none)"""
        response = requests.get(f"{BASE_URL}/api/communities/me",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get my community failed: {response.text}"
        data = response.json()
        # Can be null or a community object
        if data is not None:
            assert "id" in data
            assert "name" in data
            assert "member_count" in data
            assert "frikt_count" in data
            assert "joined_at" in data
            print(f"✓ User is in community: {data['name']}")
        else:
            print("✓ User is not in any community (null returned)")
    
    def test_get_specific_community(self):
        """GET /api/communities/{id} - Get specific community with is_member flag"""
        # First get list of communities
        list_resp = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert list_resp.status_code == 200
        communities = list_resp.json()
        
        if communities:
            community_id = communities[0]["id"]
            response = requests.get(f"{BASE_URL}/api/communities/{community_id}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Get community failed: {response.text}"
            data = response.json()
            assert "id" in data
            assert "name" in data
            assert "member_count" in data
            assert "frikt_count" in data
            assert "is_member" in data
            assert "has_pending_request" in data
            print(f"✓ Got community {data['name']}, is_member={data['is_member']}")
        else:
            pytest.skip("No communities available")
    
    def test_get_nonexistent_community(self):
        """GET /api/communities/{id} - Returns 404 for nonexistent community"""
        response = requests.get(f"{BASE_URL}/api/communities/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ Correctly returned 404 for nonexistent community")


class TestCommunityRequests:
    """Test community creation and join request endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_submit_community_request(self):
        """POST /api/community-requests - Submit community creation request"""
        response = requests.post(f"{BASE_URL}/api/community-requests",
            headers=self.headers,
            json={
                "email": "requester@example.com",
                "community_name": f"Requested Community {uuid.uuid4().hex[:6]}",
                "description": "A test community request"
            }
        )
        assert response.status_code == 200, f"Submit request failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert "message" in data
        print("✓ Community creation request submitted")
    
    def test_request_join_community(self):
        """POST /api/communities/{id}/request-join - Submit join request for a community"""
        # First leave any community and get a community to request joining
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        
        list_resp = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert list_resp.status_code == 200
        communities = list_resp.json()
        
        if communities:
            community_id = communities[0]["id"]
            response = requests.post(f"{BASE_URL}/api/communities/{community_id}/request-join",
                headers=self.headers,
                json={"message": "I would like to join this community"}
            )
            # Could be 200 (success) or 400 (already member or pending request)
            assert response.status_code in [200, 400], f"Request join failed: {response.text}"
            if response.status_code == 200:
                assert response.json()["success"] == True
                print(f"✓ Join request submitted for community {community_id}")
            else:
                print(f"✓ Join request rejected (already member or pending): {response.json()['detail']}")
        else:
            pytest.skip("No communities available")


class TestLocalFriktPosting:
    """Test local frikt posting and feed filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token and ensure user is in a community"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create a test community and join it
        self.test_code = f"LOC-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": f"Local Test Community {self.test_code}",
                "code": self.test_code,
                "moderator_email": "mod@example.com"
            }
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
            # Leave any existing community and join this one
            requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
            requests.post(f"{BASE_URL}/api/communities/join",
                headers=self.headers,
                json={"code": self.test_code}
            )
        else:
            self.test_community_id = None
    
    def test_create_local_frikt_with_community(self):
        """POST /api/problems with is_local=true - Creates local frikt with community_id auto-set"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        response = requests.post(f"{BASE_URL}/api/problems",
            headers=self.headers,
            json={
                "title": f"This is a local test frikt for community testing {uuid.uuid4().hex[:6]}",
                "category_id": "local",
                "is_local": True
            }
        )
        assert response.status_code == 200, f"Create local frikt failed: {response.text}"
        data = response.json()
        assert data["is_local"] == True
        assert data["community_id"] == self.test_community_id
        assert data["category_id"] == "local"
        print(f"✓ Created local frikt with community_id={data['community_id']}")
        return data["id"]
    
    def test_create_local_frikt_without_community(self):
        """POST /api/problems with is_local=true without community membership - Returns 403"""
        # First leave the community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        
        response = requests.post(f"{BASE_URL}/api/problems",
            headers=self.headers,
            json={
                "title": "This local frikt should fail because user is not in a community",
                "category_id": "local",
                "is_local": True
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "must join a community" in response.json()["detail"].lower()
        print("✓ Correctly rejected local frikt when not in a community")
        
        # Rejoin community for other tests
        if self.test_community_id:
            requests.post(f"{BASE_URL}/api/communities/join",
                headers=self.headers,
                json={"code": self.test_code}
            )
    
    def test_global_feed_excludes_local_frikts(self):
        """GET /api/problems?feed=new - Global feed excludes local frikts"""
        # First create a local frikt
        if self.test_community_id:
            requests.post(f"{BASE_URL}/api/problems",
                headers=self.headers,
                json={
                    "title": f"Local frikt that should not appear in global feed {uuid.uuid4().hex[:6]}",
                    "is_local": True
                }
            )
        
        # Get global feed
        response = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get feed failed: {response.text}"
        data = response.json()
        
        # Check that no local frikts are in the global feed
        local_frikts = [p for p in data if p.get("is_local") == True]
        assert len(local_frikts) == 0, f"Found {len(local_frikts)} local frikts in global feed"
        print(f"✓ Global feed has {len(data)} frikts, none are local")
    
    def test_local_feed_returns_community_frikts(self):
        """GET /api/problems?feed=local&community_id=xxx - Local feed returns only community frikts"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # Create a local frikt first
        requests.post(f"{BASE_URL}/api/problems",
            headers=self.headers,
            json={
                "title": f"Local frikt for feed test {uuid.uuid4().hex[:6]}",
                "is_local": True
            }
        )
        
        response = requests.get(f"{BASE_URL}/api/problems?feed=local&community_id={self.test_community_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get local feed failed: {response.text}"
        data = response.json()
        
        # All frikts should be local and from this community
        for p in data:
            assert p.get("is_local") == True, f"Non-local frikt in local feed: {p['id']}"
            assert p.get("community_id") == self.test_community_id, f"Wrong community: {p['community_id']}"
        print(f"✓ Local feed has {len(data)} frikts, all from community {self.test_community_id}")
    
    def test_local_feed_sort_by_new(self):
        """GET /api/problems?feed=local&community_id=xxx&sort_by=new - Local feed sort by new"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        response = requests.get(
            f"{BASE_URL}/api/problems?feed=local&community_id={self.test_community_id}&sort_by=new",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get local feed failed: {response.text}"
        data = response.json()
        
        # Check that results are sorted by created_at descending
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["created_at"] >= data[i+1]["created_at"], "Not sorted by new"
        print(f"✓ Local feed sorted by new: {len(data)} frikts")
    
    def test_local_feed_sort_by_top(self):
        """GET /api/problems?feed=local&community_id=xxx&sort_by=top - Local feed sort by top"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        response = requests.get(
            f"{BASE_URL}/api/problems?feed=local&community_id={self.test_community_id}&sort_by=top",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get local feed failed: {response.text}"
        data = response.json()
        
        # Check that results are sorted by relates_count descending
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i]["relates_count"] >= data[i+1]["relates_count"], "Not sorted by top"
        print(f"✓ Local feed sorted by top: {len(data)} frikts")
    
    def test_local_feed_requires_community_id(self):
        """GET /api/problems?feed=local - Returns 400 without community_id"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=local",
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "community_id" in response.json()["detail"].lower()
        print("✓ Local feed correctly requires community_id")


class TestLocalFriktRelate:
    """Test relate restrictions on local frikts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token and test community"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create a test community
        self.test_code = f"REL-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": f"Relate Test Community {self.test_code}",
                "code": self.test_code,
                "moderator_email": "mod@example.com"
            }
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
        else:
            self.test_community_id = None
    
    def test_relate_to_local_frikt_as_member(self):
        """POST /api/problems/{id}/relate on local frikt - Community members can relate"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # Join community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.headers,
            json={"code": self.test_code}
        )
        
        # Create a local frikt (we need another user's frikt to relate to)
        # Since we only have admin, we'll test the endpoint exists and returns appropriate error
        # for self-relate (which is a different error than non-member)
        create_resp = requests.post(f"{BASE_URL}/api/problems",
            headers=self.headers,
            json={
                "title": f"Local frikt for relate test {uuid.uuid4().hex[:6]}",
                "is_local": True
            }
        )
        assert create_resp.status_code == 200
        frikt_id = create_resp.json()["id"]
        
        # Try to relate (will fail because it's own post, but that's a different error)
        response = requests.post(f"{BASE_URL}/api/problems/{frikt_id}/relate",
            headers=self.headers
        )
        # Should get 400 "Cannot relate to your own post" not 403 "Only community members"
        assert response.status_code == 400
        assert "own post" in response.json()["detail"].lower()
        print("✓ Relate endpoint works for community members (blocked by self-relate rule)")


class TestSimilarProblems:
    """Test context-aware similar problems search"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_similar_problems_global(self):
        """GET /api/problems/similar - Global context search"""
        response = requests.get(f"{BASE_URL}/api/problems/similar?title=parking problem downtown",
            headers=self.headers
        )
        assert response.status_code == 200, f"Similar search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Global similar search returned {len(data)} results")
    
    def test_similar_problems_local_context(self):
        """GET /api/problems/similar with is_local=true&community_id=xxx - Context-aware search"""
        # Get a community ID
        list_resp = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        communities = list_resp.json()
        
        if communities:
            community_id = communities[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/problems/similar?title=local issue test&is_local=true&community_id={community_id}",
                headers=self.headers
            )
            assert response.status_code == 200, f"Similar search failed: {response.text}"
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Local context similar search returned {len(data)} results")
        else:
            pytest.skip("No communities available")


class TestAdminJoinRequestUpdate:
    """Test admin join request update endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_update_join_request_status(self):
        """PUT /api/admin/communities/{id}/join-requests/{id} - Admin updates join request"""
        # Get communities and their join requests
        list_resp = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        assert list_resp.status_code == 200
        communities = list_resp.json()["communities"]
        
        for community in communities:
            requests_resp = requests.get(
                f"{BASE_URL}/api/admin/communities/{community['id']}/join-requests",
                headers=self.headers
            )
            if requests_resp.status_code == 200:
                join_requests = requests_resp.json()
                if join_requests:
                    request_id = join_requests[0]["id"]
                    # Update the request status
                    update_resp = requests.put(
                        f"{BASE_URL}/api/admin/communities/{community['id']}/join-requests/{request_id}",
                        headers=self.headers,
                        json={"status": "sent"}
                    )
                    assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
                    assert update_resp.json()["success"] == True
                    print(f"✓ Updated join request {request_id} status to 'sent'")
                    return
        
        print("✓ No pending join requests to update (test skipped)")


class TestInvalidCodeHandling:
    """Test invalid community code handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_join_with_invalid_code(self):
        """POST /api/communities/join - Returns 404 for invalid code"""
        response = requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.headers,
            json={"code": "INVALID-CODE-12345"}
        )
        assert response.status_code == 404
        assert "invalid" in response.json()["detail"].lower()
        print("✓ Correctly returned 404 for invalid community code")
    
    def test_switch_with_invalid_code(self):
        """POST /api/communities/switch - Returns 404 for invalid code"""
        response = requests.post(f"{BASE_URL}/api/communities/switch",
            headers=self.headers,
            json={"code": "INVALID-CODE-12345"}
        )
        assert response.status_code == 404
        assert "invalid" in response.json()["detail"].lower()
        print("✓ Correctly returned 404 for invalid switch code")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
