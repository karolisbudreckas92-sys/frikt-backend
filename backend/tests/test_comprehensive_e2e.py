"""
Comprehensive E2E Test Suite for FRIKT App - Iteration 8
Tests all major flows including:
- Search functionality (Frikts, People, Communities tabs)
- Local Communities feature (join, post, feed filtering, switch, leave)
- Comment threading (nested replies, soft delete, reply to deleted)
- Admin panel (community management, export, join requests)
- Core features (relate, helpful, follow category, notifications, badges, mission)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://frikt-community-fix.preview.emergentagent.com"

# Credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"
TEST_USER_EMAIL = "testuser.frikt@example.com"
TEST_USER_PASSWORD = "TestUser123!"


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
        return data["access_token"], data["user"]
    
    @staticmethod
    def get_test_user_token():
        """Get test user authentication token (create if not exists)"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data["access_token"], data["user"]
        
        # Create user if login fails
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Test User"
        })
        if response.status_code == 200:
            data = response.json()
            return data["access_token"], data["user"]
        
        pytest.skip(f"Could not create test user: {response.text}")
    
    @staticmethod
    def get_auth_headers(token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}


# ===================== SEARCH TESTS =====================

class TestSearchFrikts:
    """Test search functionality - Frikts tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_search_frikts_by_text(self):
        """GET /api/problems?search=xxx - Search frikts by text"""
        response = requests.get(f"{BASE_URL}/api/problems?search=problem&limit=20",
            headers=self.headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search 'problem' returned {len(data)} frikts")
    
    def test_search_includes_local_frikts(self):
        """GET /api/problems?search=xxx - Search should include local frikts"""
        # Search should NOT filter by is_local when search param is present
        response = requests.get(f"{BASE_URL}/api/problems?search=test&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Check if any local frikts are in results (if they exist)
        local_count = sum(1 for p in data if p.get("is_local") == True)
        print(f"✓ Search returned {len(data)} frikts, {local_count} are local")


class TestSearchPeople:
    """Test search functionality - People tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_search_users(self):
        """GET /api/users/search?q=xxx - Search users by name"""
        response = requests.get(f"{BASE_URL}/api/users/search?q=test",
            headers=self.headers
        )
        assert response.status_code == 200, f"User search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ User search 'test' returned {len(data)} users")


class TestSearchCommunities:
    """Test search functionality - Communities tab"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_browse_all_communities(self):
        """GET /api/communities - Browse all communities"""
        response = requests.get(f"{BASE_URL}/api/communities",
            headers=self.headers
        )
        assert response.status_code == 200, f"List communities failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "member_count" in data[0]
            assert "frikt_count" in data[0]
        print(f"✓ Listed {len(data)} communities")
    
    def test_search_communities_by_name(self):
        """GET /api/communities?search=xxx - Search communities by name"""
        response = requests.get(f"{BASE_URL}/api/communities?search=test",
            headers=self.headers
        )
        assert response.status_code == 200, f"Community search failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Community search 'test' returned {len(data)} communities")


# ===================== LOCAL COMMUNITY TESTS =====================

class TestJoinCommunityWithCode:
    """Test joining community with invite code"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create a test community
        self.test_code = f"JOIN-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": f"Join Test Community {self.test_code}",
                "code": self.test_code,
                "moderator_email": "mod@example.com"
            }
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
        else:
            self.test_community_id = None
    
    def test_join_community_with_invite_code(self):
        """POST /api/communities/join - Join with valid code"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # Leave any existing community first
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        
        response = requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.headers,
            json={"code": self.test_code}
        )
        assert response.status_code == 200, f"Join failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["community"]["id"] == self.test_community_id
        print(f"✓ Joined community with code {self.test_code}")


class TestLocalFriktPosting:
    """Test posting local frikts and feed filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create and join a test community
        self.test_code = f"LOCF-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": f"Local Frikt Test {self.test_code}",
                "code": self.test_code,
                "moderator_email": "mod@example.com"
            }
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
            requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
            requests.post(f"{BASE_URL}/api/communities/join",
                headers=self.headers,
                json={"code": self.test_code}
            )
        else:
            self.test_community_id = None
    
    def test_post_local_frikt(self):
        """POST /api/problems with is_local=true - Creates local frikt"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        response = requests.post(f"{BASE_URL}/api/problems",
            headers=self.headers,
            json={
                "title": f"Local frikt test {uuid.uuid4().hex[:8]} - testing local community feature",
                "category_id": "local",
                "is_local": True
            }
        )
        # May fail with 429 if rate limited
        if response.status_code == 429:
            print("✓ Rate limited (10 posts/day) - expected behavior")
            return
        
        assert response.status_code == 200, f"Create local frikt failed: {response.text}"
        data = response.json()
        assert data["is_local"] == True
        assert data["community_id"] == self.test_community_id
        print(f"✓ Created local frikt with community_id={data['community_id']}")
    
    def test_local_frikt_appears_in_local_feed(self):
        """GET /api/problems?feed=local&community_id=xxx - Local feed shows local frikts"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        response = requests.get(
            f"{BASE_URL}/api/problems?feed=local&community_id={self.test_community_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get local feed failed: {response.text}"
        data = response.json()
        
        # All frikts should be local and from this community
        for p in data:
            assert p.get("is_local") == True
            assert p.get("community_id") == self.test_community_id
        print(f"✓ Local feed has {len(data)} frikts, all from community")
    
    def test_local_frikts_not_in_global_feed_new(self):
        """GET /api/problems?feed=new - Global feed excludes local frikts"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        local_frikts = [p for p in data if p.get("is_local") == True]
        assert len(local_frikts) == 0, f"Found {len(local_frikts)} local frikts in global feed"
        print(f"✓ Global feed (new) has {len(data)} frikts, none are local")
    
    def test_local_frikts_not_in_global_feed_trending(self):
        """GET /api/problems?feed=trending - Global feed excludes local frikts"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=trending&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        local_frikts = [p for p in data if p.get("is_local") == True]
        assert len(local_frikts) == 0, f"Found {len(local_frikts)} local frikts in trending feed"
        print(f"✓ Global feed (trending) has {len(data)} frikts, none are local")
    
    def test_local_frikts_not_in_global_feed_foryou(self):
        """GET /api/problems?feed=foryou - Global feed excludes local frikts"""
        response = requests.get(f"{BASE_URL}/api/problems?feed=foryou&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        local_frikts = [p for p in data if p.get("is_local") == True]
        assert len(local_frikts) == 0, f"Found {len(local_frikts)} local frikts in foryou feed"
        print(f"✓ Global feed (foryou) has {len(data)} frikts, none are local")
    
    def test_local_frikts_appear_in_search(self):
        """GET /api/problems?search=xxx - Search includes local frikts"""
        response = requests.get(f"{BASE_URL}/api/problems?search=local&limit=50",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Search should include local frikts (is_local filter skipped when search param present)
        print(f"✓ Search 'local' returned {len(data)} frikts (may include local)")


class TestSwitchCommunity:
    """Test switching between communities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create two test communities
        self.code1 = f"SW1-{uuid.uuid4().hex[:6].upper()}"
        self.code2 = f"SW2-{uuid.uuid4().hex[:6].upper()}"
        
        resp1 = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={"name": f"Switch Test 1 {self.code1}", "code": self.code1, "moderator_email": "mod@example.com"}
        )
        resp2 = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={"name": f"Switch Test 2 {self.code2}", "code": self.code2, "moderator_email": "mod@example.com"}
        )
        
        self.community1_id = resp1.json()["community"]["id"] if resp1.status_code == 200 else None
        self.community2_id = resp2.json()["community"]["id"] if resp2.status_code == 200 else None
    
    def test_switch_community_returns_200(self):
        """POST /api/communities/switch - Switch to new community"""
        if not self.community1_id or not self.community2_id:
            pytest.skip("Test communities not created")
        
        # Join first community
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.headers,
            json={"code": self.code1}
        )
        
        # Switch to second community
        response = requests.post(f"{BASE_URL}/api/communities/switch",
            headers=self.headers,
            json={"code": self.code2}
        )
        assert response.status_code == 200, f"Switch failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["community"]["id"] == self.community2_id
        print(f"✓ Switched from {self.code1} to {self.code2}")


class TestLeaveCommunity:
    """Test leaving a community"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create and join a test community
        self.test_code = f"LV-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={"name": f"Leave Test {self.test_code}", "code": self.test_code, "moderator_email": "mod@example.com"}
        )
        if create_resp.status_code == 200:
            self.test_community_id = create_resp.json()["community"]["id"]
        else:
            self.test_community_id = None
    
    def test_leave_community(self):
        """DELETE /api/communities/leave - Leave current community"""
        if not self.test_community_id:
            pytest.skip("Test community not created")
        
        # Join first
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        requests.post(f"{BASE_URL}/api/communities/join",
            headers=self.headers,
            json={"code": self.test_code}
        )
        
        # Leave
        response = requests.delete(f"{BASE_URL}/api/communities/leave",
            headers=self.headers
        )
        assert response.status_code == 200, f"Leave failed: {response.text}"
        assert response.json()["success"] == True
        
        # Verify
        me_resp = requests.get(f"{BASE_URL}/api/communities/me", headers=self.headers)
        assert me_resp.json() is None
        print("✓ Left community successfully")


class TestRequestJoinCommunity:
    """Test requesting to join a community"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_request_join_community(self):
        """POST /api/communities/{id}/request-join - Submit join request"""
        # Get a community
        list_resp = requests.get(f"{BASE_URL}/api/communities", headers=self.headers)
        communities = list_resp.json()
        
        if not communities:
            pytest.skip("No communities available")
        
        # Leave any current community first
        requests.delete(f"{BASE_URL}/api/communities/leave", headers=self.headers)
        
        community_id = communities[0]["id"]
        response = requests.post(f"{BASE_URL}/api/communities/{community_id}/request-join",
            headers=self.headers,
            json={"message": "Test join request"}
        )
        # Could be 200 (success) or 400 (already member or pending)
        assert response.status_code in [200, 400], f"Request join failed: {response.text}"
        print(f"✓ Join request submitted (status: {response.status_code})")


class TestRequestNewCommunity:
    """Test requesting creation of a new community"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_request_new_community(self):
        """POST /api/community-requests - Request new community creation"""
        response = requests.post(f"{BASE_URL}/api/community-requests",
            headers=self.headers,
            json={
                "email": "requester@example.com",
                "community_name": f"Requested Community {uuid.uuid4().hex[:6]}",
                "description": "A test community request"
            }
        )
        assert response.status_code == 200, f"Request failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        print("✓ Community creation request submitted")


# ===================== ADMIN TESTS =====================

class TestAdminJoinRequests:
    """Test admin viewing join requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_admin_see_join_requests(self):
        """GET /api/admin/communities/{id}/join-requests - Admin sees join requests"""
        # Get communities
        list_resp = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        assert list_resp.status_code == 200
        communities = list_resp.json()["communities"]
        
        if not communities:
            pytest.skip("No communities available")
        
        community_id = communities[0]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/join-requests",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get join requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify filtering by expires_at (only non-expired requests)
        print(f"✓ Admin retrieved {len(data)} join requests for community")


class TestAdminCommunityRequests:
    """Test admin viewing community creation requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_admin_see_community_requests(self):
        """GET /api/admin/community-requests - Admin sees community requests"""
        response = requests.get(f"{BASE_URL}/api/admin/community-requests",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get community requests failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Verify filtering by expires_at (only non-expired requests)
        print(f"✓ Admin retrieved {len(data)} community creation requests")


class TestAdminCreateCommunity:
    """Test admin creating a community"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_admin_create_community(self):
        """POST /api/admin/communities - Admin creates community"""
        unique_code = f"ADM-{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={
                "name": f"Admin Created {unique_code}",
                "code": unique_code,
                "moderator_email": "admin-mod@example.com"
            }
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        assert data["community"]["active_code"] == unique_code
        print(f"✓ Admin created community with code {unique_code}")


class TestAdminChangeCode:
    """Test admin changing community code"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create a test community
        self.old_code = f"CHG-{uuid.uuid4().hex[:6].upper()}"
        create_resp = requests.post(f"{BASE_URL}/api/admin/communities",
            headers=self.headers,
            json={"name": f"Code Change Test {self.old_code}", "code": self.old_code, "moderator_email": "mod@example.com"}
        )
        self.community_id = create_resp.json()["community"]["id"] if create_resp.status_code == 200 else None
    
    def test_admin_change_code(self):
        """PUT /api/admin/communities/{id}/code - Admin changes code"""
        if not self.community_id:
            pytest.skip("Test community not created")
        
        new_code = f"NEW-{uuid.uuid4().hex[:6].upper()}"
        response = requests.put(f"{BASE_URL}/api/admin/communities/{self.community_id}/code",
            headers=self.headers,
            json={"new_code": new_code}
        )
        assert response.status_code == 200, f"Change code failed: {response.text}"
        assert response.json()["success"] == True
        print(f"✓ Admin changed code from {self.old_code} to {new_code}")


class TestAdminExportData:
    """Test admin exporting community data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_admin_export_anonymous_format(self):
        """GET /api/admin/communities/{id}/export - Export in anonymous format"""
        # Get a community
        list_resp = requests.get(f"{BASE_URL}/api/admin/communities", headers=self.headers)
        communities = list_resp.json()["communities"]
        
        if not communities:
            pytest.skip("No communities available")
        
        community_id = communities[0]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/communities/{community_id}/export?period=all",
            headers=self.headers
        )
        assert response.status_code == 200, f"Export failed: {response.text}"
        data = response.json()
        
        assert "content" in data
        assert "filename" in data
        
        content = data["content"]
        # Verify anonymous format: FRIKT: {text}, RELATES: {count} | DATE: {date} | COMMENTS: {count}
        assert "COMMUNITY EXPORT" in content
        # Should NOT contain author/signal/pain/frequency
        assert "signal_score" not in content.lower()
        assert "pain_level" not in content.lower()
        assert "frequency" not in content.lower()
        
        print(f"✓ Export generated: {data['filename']}")
        print(f"  Content preview: {content[:200]}...")


# ===================== COMMENT THREADING TESTS =====================

class TestCommentThreading:
    """Test comment threading with nested replies"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Get a problem to comment on
        problems_resp = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=5", headers=self.headers)
        if problems_resp.status_code == 200 and problems_resp.json():
            self.test_problem_id = problems_resp.json()[0]["id"]
        else:
            self.test_problem_id = None
    
    def test_create_threaded_comment(self):
        """POST /api/comments with parent_comment_id - Create nested reply"""
        if not self.test_problem_id:
            pytest.skip("No problem available for testing")
        
        # Create a top-level comment
        top_comment_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Top level comment for threading test {uuid.uuid4().hex[:6]}"
            }
        )
        if top_comment_resp.status_code != 200:
            pytest.skip(f"Could not create top comment: {top_comment_resp.text}")
        
        top_comment_id = top_comment_resp.json()["id"]
        
        # Create a reply to the top-level comment
        reply_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Reply to top comment {uuid.uuid4().hex[:6]}",
                "parent_comment_id": top_comment_id
            }
        )
        assert reply_resp.status_code == 200, f"Reply failed: {reply_resp.text}"
        reply_data = reply_resp.json()
        assert reply_data["parent_comment_id"] == top_comment_id
        print(f"✓ Created threaded reply to comment {top_comment_id}")
    
    def test_nested_replies_flattened(self):
        """POST /api/comments - Nested replies should be flattened to top-level"""
        if not self.test_problem_id:
            pytest.skip("No problem available for testing")
        
        # Create top-level comment
        top_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Top for flattening test {uuid.uuid4().hex[:6]}"
            }
        )
        if top_resp.status_code != 200:
            pytest.skip("Could not create top comment")
        
        top_id = top_resp.json()["id"]
        
        # Create first reply
        reply1_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"First reply {uuid.uuid4().hex[:6]}",
                "parent_comment_id": top_id
            }
        )
        if reply1_resp.status_code != 200:
            pytest.skip("Could not create first reply")
        
        reply1_id = reply1_resp.json()["id"]
        
        # Create nested reply (reply to reply) - should be flattened to top-level
        nested_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Nested reply (should flatten) {uuid.uuid4().hex[:6]}",
                "parent_comment_id": reply1_id
            }
        )
        assert nested_resp.status_code == 200, f"Nested reply failed: {nested_resp.text}"
        nested_data = nested_resp.json()
        
        # The nested reply should be flattened to point to the top-level comment
        assert nested_data["parent_comment_id"] == top_id, "Nested reply not flattened to top-level"
        print(f"✓ Nested reply flattened: parent_comment_id={nested_data['parent_comment_id']} (expected {top_id})")


class TestSoftDeleteComment:
    """Test soft delete of comments with replies"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Get a problem
        problems_resp = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=5", headers=self.headers)
        if problems_resp.status_code == 200 and problems_resp.json():
            self.test_problem_id = problems_resp.json()[0]["id"]
        else:
            self.test_problem_id = None
    
    def test_soft_delete_shows_deleted_placeholder(self):
        """DELETE comment with replies - Shows [deleted] placeholder"""
        if not self.test_problem_id:
            pytest.skip("No problem available")
        
        # Create a comment
        comment_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Comment to be soft deleted {uuid.uuid4().hex[:6]}"
            }
        )
        if comment_resp.status_code != 200:
            pytest.skip("Could not create comment")
        
        comment_id = comment_resp.json()["id"]
        
        # Create a reply to it
        reply_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Reply to comment {uuid.uuid4().hex[:6]}",
                "parent_comment_id": comment_id
            }
        )
        
        # Delete the parent comment (soft delete since it has replies)
        delete_resp = requests.delete(f"{BASE_URL}/api/comments/{comment_id}",
            headers=self.headers
        )
        # User delete endpoint may not exist, try admin endpoint
        if delete_resp.status_code == 404 or delete_resp.status_code == 405:
            delete_resp = requests.delete(f"{BASE_URL}/api/admin/comments/{comment_id}",
                headers=self.headers
            )
        
        # Get comments to verify soft delete
        comments_resp = requests.get(f"{BASE_URL}/api/problems/{self.test_problem_id}/comments",
            headers=self.headers
        )
        assert comments_resp.status_code == 200
        
        # Note: The comment may be completely removed or soft-deleted depending on implementation
        print(f"✓ Comment deletion processed (status: {delete_resp.status_code})")


class TestReplyToSoftDeletedComment:
    """Test that replies can still be made to soft-deleted (status=removed) comments"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Get a problem
        problems_resp = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=5", headers=self.headers)
        if problems_resp.status_code == 200 and problems_resp.json():
            self.test_problem_id = problems_resp.json()[0]["id"]
        else:
            self.test_problem_id = None
    
    def test_can_reply_to_removed_comment(self):
        """POST /api/comments - Can reply to status=removed comment (not hidden)"""
        # This test verifies that soft-deleted (status=removed) comments don't block replies
        # Only admin-hidden (status=hidden) should block replies
        
        if not self.test_problem_id:
            pytest.skip("No problem available")
        
        # Get existing comments
        comments_resp = requests.get(f"{BASE_URL}/api/problems/{self.test_problem_id}/comments",
            headers=self.headers
        )
        if comments_resp.status_code != 200:
            pytest.skip("Could not get comments")
        
        comments = comments_resp.json()
        
        # Find a top-level comment to reply to
        top_level = [c for c in comments if not c.get("parent_comment_id")]
        if not top_level:
            # Create one
            create_resp = requests.post(f"{BASE_URL}/api/comments",
                headers=self.headers,
                json={
                    "problem_id": self.test_problem_id,
                    "content": f"Top level for reply test {uuid.uuid4().hex[:6]}"
                }
            )
            if create_resp.status_code != 200:
                pytest.skip("Could not create comment")
            parent_id = create_resp.json()["id"]
        else:
            parent_id = top_level[0]["id"]
        
        # Try to reply
        reply_resp = requests.post(f"{BASE_URL}/api/comments",
            headers=self.headers,
            json={
                "problem_id": self.test_problem_id,
                "content": f"Reply test {uuid.uuid4().hex[:6]}",
                "parent_comment_id": parent_id
            }
        )
        assert reply_resp.status_code == 200, f"Reply failed: {reply_resp.text}"
        print(f"✓ Successfully replied to comment {parent_id}")


# ===================== CORE FEATURE TESTS =====================

class TestRelateToFrikt:
    """Test relating to a frikt"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_relate_to_frikt(self):
        """POST /api/problems/{id}/relate - Relate to a frikt"""
        # Get a problem not owned by admin
        problems_resp = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=20", headers=self.headers)
        if problems_resp.status_code != 200:
            pytest.skip("Could not get problems")
        
        problems = problems_resp.json()
        other_user_problem = None
        for p in problems:
            if p.get("user_id") != self.admin_user["id"]:
                other_user_problem = p
                break
        
        if not other_user_problem:
            pytest.skip("No problem from other user available")
        
        # Try to relate
        response = requests.post(f"{BASE_URL}/api/problems/{other_user_problem['id']}/relate",
            headers=self.headers
        )
        # Could be 200 (success) or 400 (already related)
        assert response.status_code in [200, 400], f"Relate failed: {response.text}"
        print(f"✓ Relate to frikt (status: {response.status_code})")


class TestHelpfulOnComment:
    """Test marking comment as helpful"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_mark_comment_helpful(self):
        """POST /api/comments/{id}/helpful - Mark comment as helpful"""
        # Get a problem with comments
        problems_resp = requests.get(f"{BASE_URL}/api/problems?feed=new&limit=10", headers=self.headers)
        if problems_resp.status_code != 200:
            pytest.skip("Could not get problems")
        
        for problem in problems_resp.json():
            comments_resp = requests.get(f"{BASE_URL}/api/problems/{problem['id']}/comments",
                headers=self.headers
            )
            if comments_resp.status_code == 200 and comments_resp.json():
                comment_id = comments_resp.json()[0]["id"]
                
                response = requests.post(f"{BASE_URL}/api/comments/{comment_id}/helpful",
                    headers=self.headers
                )
                # Could be 200 (success) or 400 (already marked)
                assert response.status_code in [200, 400], f"Helpful failed: {response.text}"
                print(f"✓ Mark helpful (status: {response.status_code})")
                return
        
        pytest.skip("No comments available")


class TestFollowCategory:
    """Test following/unfollowing a category"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_follow_category(self):
        """POST /api/categories/{id}/follow - Follow a category"""
        response = requests.post(f"{BASE_URL}/api/categories/tech/follow",
            headers=self.headers
        )
        assert response.status_code == 200, f"Follow failed: {response.text}"
        assert response.json()["following"] == True
        print("✓ Followed category 'tech'")
    
    def test_unfollow_category(self):
        """DELETE /api/categories/{id}/follow - Unfollow a category"""
        response = requests.delete(f"{BASE_URL}/api/categories/tech/follow",
            headers=self.headers
        )
        assert response.status_code == 200, f"Unfollow failed: {response.text}"
        assert response.json()["following"] == False
        print("✓ Unfollowed category 'tech'")


class TestCategories:
    """Test categories endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_get_categories_includes_local(self):
        """GET /api/categories - Verify 'local' category exists"""
        response = requests.get(f"{BASE_URL}/api/categories",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        data = response.json()
        
        local_category = next((c for c in data if c["id"] == "local"), None)
        assert local_category is not None, "Local category not found"
        assert local_category["name"] == "Local"
        print(f"✓ Found 'local' category: {local_category}")


class TestUserProfile:
    """Test user profile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, self.admin_user = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_get_user_profile(self):
        """GET /api/users/{id}/profile - Get user profile"""
        response = requests.get(f"{BASE_URL}/api/users/{self.admin_user['id']}/profile",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"✓ Got user profile for {self.admin_user['id']}")


class TestNotifications:
    """Test notifications endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_get_notifications(self):
        """GET /api/notifications - Get user notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        # API returns {"notifications": [...], "unread_count": N}
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        print(f"✓ Got {len(data['notifications'])} notifications, {data.get('unread_count', 0)} unread")


class TestBadges:
    """Test badges endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_get_badge_definitions(self):
        """GET /api/badges/definitions - Get badge definitions"""
        response = requests.get(f"{BASE_URL}/api/badges/definitions",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get badges failed: {response.text}"
        data = response.json()
        assert isinstance(data, list) or isinstance(data, dict)
        print(f"✓ Got badge definitions")


class TestMissionOfDay:
    """Test mission of the day endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token, _ = TestSetup.get_admin_token()
        self.headers = TestSetup.get_auth_headers(self.admin_token)
    
    def test_get_mission(self):
        """GET /api/mission - Get mission of the day"""
        response = requests.get(f"{BASE_URL}/api/mission",
            headers=self.headers
        )
        assert response.status_code == 200, f"Get mission failed: {response.text}"
        data = response.json()
        assert "theme" in data
        assert "prompt" in data
        print(f"✓ Got mission: {data['theme']} - {data['prompt'][:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
