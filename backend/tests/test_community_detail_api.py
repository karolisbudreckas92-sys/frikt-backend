"""
Test suite for Community Detail and is_local field verification.
Tests specific requirements for iteration 7:
- GET /api/admin/communities returns pending_join_requests count
- GET /api/communities/{id} returns is_member and has_pending_request flags
- GET /api/problems returns is_local field for local frikts
- POST /api/problems with is_local=true creates frikt with is_local and community_id
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://frikt-bugfix-release.preview.emergentagent.com"

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


class TestAdminCommunitiesDetailedResponse:
    """Test admin communities endpoint returns all required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_admin_communities_returns_pending_join_requests_count(self):
        """GET /api/admin/communities - Verify pending_join_requests field is present"""
        response = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "communities" in data, "Response should have 'communities' array"
        assert "total" in data, "Response should have 'total' count"
        
        # Check that each community has the required fields
        if len(data["communities"]) > 0:
            community = data["communities"][0]
            assert "id" in community, "Community should have 'id'"
            assert "name" in community, "Community should have 'name'"
            assert "active_code" in community, "Community should have 'active_code'"
            assert "member_count" in community, "Community should have 'member_count'"
            assert "frikt_count" in community, "Community should have 'frikt_count'"
            assert "pending_join_requests" in community, "Community should have 'pending_join_requests'"
            
            # Verify types
            assert isinstance(community["member_count"], int), "member_count should be int"
            assert isinstance(community["frikt_count"], int), "frikt_count should be int"
            assert isinstance(community["pending_join_requests"], int), "pending_join_requests should be int"
            
            print(f"✓ Admin communities response has all required fields")
            print(f"  Sample community: {community['name']}")
            print(f"  - member_count: {community['member_count']}")
            print(f"  - frikt_count: {community['frikt_count']}")
            print(f"  - pending_join_requests: {community['pending_join_requests']}")


class TestCommunityDetailResponse:
    """Test community detail endpoint returns is_member and has_pending_request flags"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_community_detail_returns_is_member_flag(self):
        """GET /api/communities/{id} - Verify is_member flag is present"""
        # First get list of communities
        list_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert list_response.status_code == 200, f"Failed to list communities: {list_response.text}"
        communities = list_response.json()
        
        if len(communities) > 0:
            community_id = communities[0]["id"]
            
            # Get community detail
            response = requests.get(f"{BASE_URL}/api/communities/{community_id}", headers=self.headers)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            assert "is_member" in data, "Community detail should have 'is_member' flag"
            assert isinstance(data["is_member"], bool), "is_member should be boolean"
            
            print(f"✓ Community detail has is_member flag: {data['is_member']}")
    
    def test_community_detail_returns_has_pending_request_flag(self):
        """GET /api/communities/{id} - Verify has_pending_request flag is present"""
        # First get list of communities
        list_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert list_response.status_code == 200, f"Failed to list communities: {list_response.text}"
        communities = list_response.json()
        
        if len(communities) > 0:
            community_id = communities[0]["id"]
            
            # Get community detail
            response = requests.get(f"{BASE_URL}/api/communities/{community_id}", headers=self.headers)
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            
            assert "has_pending_request" in data, "Community detail should have 'has_pending_request' flag"
            assert isinstance(data["has_pending_request"], bool), "has_pending_request should be boolean"
            
            print(f"✓ Community detail has has_pending_request flag: {data['has_pending_request']}")
    
    def test_community_detail_returns_all_stats(self):
        """GET /api/communities/{id} - Verify all stats are present"""
        # First get list of communities
        list_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        assert list_response.status_code == 200
        communities = list_response.json()
        
        if len(communities) > 0:
            community_id = communities[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/communities/{community_id}", headers=self.headers)
            assert response.status_code == 200
            data = response.json()
            
            # Verify all required fields
            required_fields = ["id", "name", "active_code", "member_count", "frikt_count", "is_member", "has_pending_request"]
            for field in required_fields:
                assert field in data, f"Community detail should have '{field}'"
            
            print(f"✓ Community detail has all required fields:")
            print(f"  - id: {data['id']}")
            print(f"  - name: {data['name']}")
            print(f"  - member_count: {data['member_count']}")
            print(f"  - frikt_count: {data['frikt_count']}")
            print(f"  - is_member: {data['is_member']}")
            print(f"  - has_pending_request: {data['has_pending_request']}")


class TestIsLocalFieldInProblems:
    """Test that is_local field is present in problem responses"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_global_feed_problems_have_is_local_field(self):
        """GET /api/problems?feed=new - Verify is_local field exists (should be false/absent for global)"""
        response = requests.get(f"{BASE_URL}/api/problems", 
            headers=self.headers,
            params={"feed": "new", "limit": 10}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        problems = response.json()
        
        # Global feed should exclude local frikts, so is_local should be false or not present
        for problem in problems:
            # is_local should either be False or not present (defaults to False)
            is_local = problem.get("is_local", False)
            assert is_local != True, f"Global feed should not contain local frikts, but found: {problem.get('title')}"
        
        print(f"✓ Global feed correctly excludes local frikts ({len(problems)} problems checked)")
    
    def test_local_feed_problems_have_is_local_true(self):
        """GET /api/problems?feed=local - Verify is_local=true for local frikts"""
        # First get user's community
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        assert my_community_response.status_code == 200
        my_community = my_community_response.json()
        
        if my_community:
            community_id = my_community["id"]
            
            response = requests.get(f"{BASE_URL}/api/problems",
                headers=self.headers,
                params={"feed": "local", "community_id": community_id, "limit": 10}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            problems = response.json()
            
            # All problems in local feed should have is_local=true
            for problem in problems:
                assert problem.get("is_local") == True, f"Local feed problem should have is_local=true: {problem.get('title')}"
                assert problem.get("community_id") == community_id, f"Local feed problem should have correct community_id"
            
            print(f"✓ Local feed problems have is_local=true ({len(problems)} problems checked)")
        else:
            # Admin is not in a community, join one first
            # Get list of communities
            communities_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
            communities = communities_response.json()
            
            if len(communities) > 0:
                # Join the first community
                join_response = requests.post(f"{BASE_URL}/api/communities/join",
                    headers=self.headers,
                    json={"code": communities[0]["active_code"]}
                )
                if join_response.status_code == 200:
                    community_id = communities[0]["id"]
                    
                    response = requests.get(f"{BASE_URL}/api/problems",
                        headers=self.headers,
                        params={"feed": "local", "community_id": community_id, "limit": 10}
                    )
                    assert response.status_code == 200
                    problems = response.json()
                    
                    for problem in problems:
                        if problem.get("is_local"):
                            assert problem.get("community_id") == community_id
                    
                    print(f"✓ Local feed test completed ({len(problems)} problems)")
    
    def test_create_local_frikt_returns_is_local_true(self):
        """POST /api/problems with is_local=true - Verify response has is_local=true and community_id"""
        # First ensure admin is in a community
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        my_community = my_community_response.json()
        
        if not my_community:
            # Join a community first
            communities_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
            communities = communities_response.json()
            if len(communities) > 0:
                join_response = requests.post(f"{BASE_URL}/api/communities/join",
                    headers=self.headers,
                    json={"code": communities[0]["active_code"]}
                )
                if join_response.status_code == 200:
                    my_community = communities[0]
        
        if my_community:
            # Create a local frikt
            unique_title = f"TEST Local Frikt {uuid.uuid4().hex[:8]} - Testing is_local field"
            response = requests.post(f"{BASE_URL}/api/problems",
                headers=self.headers,
                json={
                    "title": unique_title,
                    "category_id": "local",
                    "is_local": True
                }
            )
            assert response.status_code == 200, f"Failed to create local frikt: {response.text}"
            data = response.json()
            
            # Verify is_local and community_id in response
            assert data.get("is_local") == True, "Created local frikt should have is_local=true"
            assert data.get("community_id") is not None, "Created local frikt should have community_id"
            assert data.get("community_id") == my_community["id"], "community_id should match user's community"
            
            print(f"✓ Created local frikt has is_local=true and community_id={data.get('community_id')}")
            
            # Cleanup - delete the test frikt
            problem_id = data.get("id")
            if problem_id:
                requests.delete(f"{BASE_URL}/api/problems/{problem_id}", headers=self.headers)
        else:
            pytest.skip("No community available to test local frikt creation")


class TestLocalFeedSorting:
    """Test local feed sorting options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_local_feed_sort_by_trending(self):
        """GET /api/problems?feed=local&sort_by=trending - Verify trending sort works"""
        # Get user's community
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        my_community = my_community_response.json()
        
        if my_community:
            response = requests.get(f"{BASE_URL}/api/problems",
                headers=self.headers,
                params={"feed": "local", "community_id": my_community["id"], "sort_by": "trending"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            print(f"✓ Local feed with sort_by=trending works ({len(response.json())} problems)")
        else:
            pytest.skip("Admin not in a community")
    
    def test_local_feed_sort_by_new(self):
        """GET /api/problems?feed=local&sort_by=new - Verify new sort works"""
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        my_community = my_community_response.json()
        
        if my_community:
            response = requests.get(f"{BASE_URL}/api/problems",
                headers=self.headers,
                params={"feed": "local", "community_id": my_community["id"], "sort_by": "new"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            print(f"✓ Local feed with sort_by=new works ({len(response.json())} problems)")
        else:
            pytest.skip("Admin not in a community")
    
    def test_local_feed_sort_by_top(self):
        """GET /api/problems?feed=local&sort_by=top - Verify top sort works"""
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        my_community = my_community_response.json()
        
        if my_community:
            response = requests.get(f"{BASE_URL}/api/problems",
                headers=self.headers,
                params={"feed": "local", "community_id": my_community["id"], "sort_by": "top"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            print(f"✓ Local feed with sort_by=top works ({len(response.json())} problems)")
        else:
            pytest.skip("Admin not in a community")


class TestAdminExportEndpoint:
    """Test admin export endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_export_community_data_all_period(self):
        """GET /api/admin/communities/{id}/export?period=all - Verify export works"""
        # Get list of communities
        list_response = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        assert list_response.status_code == 200
        data = list_response.json()
        
        if len(data["communities"]) > 0:
            community_id = data["communities"][0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/export",
                headers=self.headers,
                params={"period": "all"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            export_data = response.json()
            
            assert "content" in export_data, "Export should have 'content' field"
            assert "filename" in export_data, "Export should have 'filename' field"
            assert isinstance(export_data["content"], str), "content should be string"
            assert export_data["filename"].endswith(".txt"), "filename should end with .txt"
            
            print(f"✓ Export endpoint works")
            print(f"  - filename: {export_data['filename']}")
            print(f"  - content length: {len(export_data['content'])} chars")
    
    def test_export_community_data_7d_period(self):
        """GET /api/admin/communities/{id}/export?period=7d - Verify 7d period works"""
        list_response = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        data = list_response.json()
        
        if len(data["communities"]) > 0:
            community_id = data["communities"][0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/export",
                headers=self.headers,
                params={"period": "7d"}
            )
            assert response.status_code == 200, f"Failed: {response.text}"
            export_data = response.json()
            
            assert "content" in export_data
            assert "filename" in export_data
            assert "_7d.txt" in export_data["filename"]
            
            print(f"✓ Export with period=7d works")


class TestRequestJoinCommunity:
    """Test request-join endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin token for tests"""
        self.admin_token = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_request_join_returns_success(self):
        """POST /api/communities/{id}/request-join - Verify endpoint works"""
        # Get list of communities
        list_response = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        communities = list_response.json()
        
        # Find a community the admin is NOT a member of
        my_community_response = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        my_community = my_community_response.json()
        
        target_community = None
        for c in communities:
            if not my_community or c["id"] != my_community["id"]:
                target_community = c
                break
        
        if target_community:
            response = requests.post(f"{BASE_URL}/api/communities/{target_community['id']}/request-join",
                headers=self.headers,
                json={"message": "Test join request from iteration 7 testing"}
            )
            
            # Could be 200 (success) or 400 (already has pending request)
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code} - {response.text}"
            
            if response.status_code == 200:
                data = response.json()
                assert data.get("success") == True
                print(f"✓ Request join endpoint works - submitted request to {target_community['name']}")
            else:
                print(f"✓ Request join endpoint works - already has pending request")
        else:
            pytest.skip("No community available to test request-join")
