"""
Test file for 3 Bug Fixes:
BUG 1: Timestamp display showing wrong 'about X ago' format
BUG 2: Username not updating everywhere when user changes nickname
BUG 3: Users cannot edit/delete their own comments
"""
import pytest
import requests
import uuid
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://account-deletion-26.preview.emergentagent.com')
print(f"[TEST] Using BASE_URL: {BASE_URL}")

# ===================== FIXTURES =====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def test_user(api_client):
    """Create a test user and return credentials + token"""
    unique_id = uuid.uuid4().hex[:8]
    email = f"test_bug_{unique_id}@example.com"
    password = "TestBug123!"
    name = f"BugTestUser_{unique_id}"
    
    # Register user
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if response.status_code == 400 and "already registered" in response.text:
        # Login instead
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
    
    assert response.status_code in [200, 201], f"Failed to create/login test user: {response.text}"
    data = response.json()
    
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["access_token"],
        "user_id": data["user"]["id"]
    }

@pytest.fixture
def another_user(api_client):
    """Create another test user for permission tests"""
    unique_id = uuid.uuid4().hex[:8]
    email = f"test_other_{unique_id}@example.com"
    password = "TestOther123!"
    name = f"OtherUser_{unique_id}"
    
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    assert response.status_code in [200, 201], f"Failed to create other user: {response.text}"
    data = response.json()
    
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data["access_token"],
        "user_id": data["user"]["id"]
    }

@pytest.fixture
def auth_headers(test_user):
    """Return auth headers for test user"""
    return {"Authorization": f"Bearer {test_user['token']}"}

@pytest.fixture
def other_auth_headers(another_user):
    """Return auth headers for another user"""
    return {"Authorization": f"Bearer {another_user['token']}"}

# ===================== BUG 1 TESTS: Timestamps =====================

class TestTimestampFormat:
    """Test that timestamps are returned in proper UTC format for frontend formatTimeAgo"""
    
    def test_problem_created_at_is_utc(self, api_client, test_user, auth_headers):
        """Verify problem created_at is returned in UTC ISO format"""
        # Create a problem
        response = api_client.post(f"{BASE_URL}/api/problems", 
            json={"title": "Test timestamp problem for bug fix", "category_id": "tech"},
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed to create problem: {response.text}"
        problem = response.json()
        
        # Verify created_at exists and is parseable
        assert "created_at" in problem, "created_at field missing from response"
        created_at = problem["created_at"]
        
        # Should be a valid ISO datetime string
        try:
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            print(f"✓ created_at '{created_at}' is valid ISO datetime")
        except ValueError as e:
            pytest.fail(f"created_at '{created_at}' is not a valid ISO datetime: {e}")
        
        # Verify it's recent (within last minute)
        now = datetime.utcnow()
        diff = abs((now - dt.replace(tzinfo=None)).total_seconds())
        assert diff < 60, f"created_at is {diff}s old, expected recent timestamp"
        print(f"✓ Timestamp is recent ({diff:.1f}s old)")
    
    def test_comment_created_at_is_utc(self, api_client, test_user, auth_headers):
        """Verify comment created_at is returned in UTC ISO format"""
        # Create a problem first
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for comment timestamp", "category_id": "work"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        
        # Create a comment
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "Test comment for timestamp check"},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201], f"Failed to create comment: {comment_response.text}"
        comment = comment_response.json()
        
        # Verify created_at exists
        assert "created_at" in comment, "created_at field missing from comment"
        created_at = comment["created_at"]
        
        try:
            dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            print(f"✓ Comment created_at '{created_at}' is valid ISO datetime")
        except ValueError as e:
            pytest.fail(f"Comment created_at '{created_at}' is not valid: {e}")

# ===================== BUG 2 TESTS: Username Updates =====================

class TestUsernameUpdates:
    """Test that username updates are reflected in GET responses (not using denormalized data)"""
    
    def test_problems_returns_fresh_username(self, api_client, test_user, auth_headers):
        """GET /api/problems should return fresh username from user record"""
        # Create a problem with initial name
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for username refresh test", "category_id": "money"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        initial_name = prob_response.json().get("user_name")
        print(f"Initial user_name in problem: {initial_name}")
        
        # Update user's displayName
        new_display_name = f"Nick_{uuid.uuid4().hex[:6]}"
        update_response = api_client.put(f"{BASE_URL}/api/users/me/profile",
            json={"displayName": new_display_name},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Failed to update profile: {update_response.text}"
        print(f"Updated displayName to: {new_display_name}")
        
        # GET problems list and verify the problem has the new username
        list_response = api_client.get(f"{BASE_URL}/api/problems", headers=auth_headers)
        assert list_response.status_code == 200
        
        problems = list_response.json()
        found = False
        for p in problems:
            if p["id"] == problem_id:
                found = True
                assert p["user_name"] == new_display_name, \
                    f"Expected user_name '{new_display_name}', got '{p['user_name']}'"
                print(f"✓ GET /api/problems returns fresh username: {p['user_name']}")
                break
        
        assert found, f"Created problem {problem_id} not found in problems list"
    
    def test_comments_returns_fresh_username(self, api_client, test_user, auth_headers):
        """GET /api/problems/{id}/comments should return fresh username from user record"""
        # Create a problem
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for comment username test", "category_id": "health"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        
        # Create a comment
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "Test comment for username refresh"},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201]
        comment_id = comment_response.json()["id"]
        initial_name = comment_response.json().get("user_name")
        print(f"Initial comment user_name: {initial_name}")
        
        # Update user's displayName
        new_display_name = f"Cmt_{uuid.uuid4().hex[:6]}"
        update_response = api_client.put(f"{BASE_URL}/api/users/me/profile",
            json={"displayName": new_display_name},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        print(f"Updated displayName to: {new_display_name}")
        
        # GET comments and verify fresh username
        comments_response = api_client.get(f"{BASE_URL}/api/problems/{problem_id}/comments", headers=auth_headers)
        assert comments_response.status_code == 200
        
        comments = comments_response.json()
        found = False
        for c in comments:
            if c["id"] == comment_id:
                found = True
                assert c["user_name"] == new_display_name, \
                    f"Expected comment user_name '{new_display_name}', got '{c['user_name']}'"
                print(f"✓ GET /api/problems/{problem_id}/comments returns fresh username: {c['user_name']}")
                break
        
        assert found, f"Created comment {comment_id} not found in comments list"

# ===================== BUG 3 TESTS: Comment Edit/Delete =====================

class TestCommentEditDelete:
    """Test that users can edit/delete their own comments"""
    
    def test_edit_own_comment_success(self, api_client, test_user, auth_headers):
        """PUT /api/comments/{id} allows editing own comment and sets edited_at"""
        # Create a problem first
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for comment edit", "category_id": "tech"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        
        # Create a comment
        original_content = "Original comment content for testing"
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": original_content},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201], f"Failed to create comment: {comment_response.text}"
        comment = comment_response.json()
        comment_id = comment["id"]
        
        # Verify no edited_at initially
        assert comment.get("edited_at") is None, "New comment should not have edited_at"
        print(f"✓ New comment has no edited_at")
        
        # Edit the comment
        new_content = "Updated comment content - now edited"
        edit_response = api_client.put(f"{BASE_URL}/api/comments/{comment_id}",
            json={"content": new_content},
            headers=auth_headers
        )
        assert edit_response.status_code == 200, f"Failed to edit comment: {edit_response.text}"
        
        edited_comment = edit_response.json()
        assert edited_comment["content"] == new_content, \
            f"Content not updated. Expected '{new_content}', got '{edited_comment['content']}'"
        assert edited_comment.get("edited_at") is not None, "edited_at should be set after edit"
        print(f"✓ Comment edited successfully, edited_at: {edited_comment['edited_at']}")
    
    def test_delete_own_comment_success(self, api_client, test_user, auth_headers):
        """DELETE /api/comments/{id} removes comment and decrements count"""
        # Create a problem
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for comment delete", "category_id": "work"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem = prob_response.json()
        problem_id = problem["id"]
        initial_count = problem.get("comments_count", 0)
        
        # Create a comment
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "Comment to be deleted for testing"},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201]
        comment_id = comment_response.json()["id"]
        
        # Get problem to verify incremented count
        get_response = api_client.get(f"{BASE_URL}/api/problems/{problem_id}", headers=auth_headers)
        assert get_response.status_code == 200
        count_after_add = get_response.json()["comments_count"]
        assert count_after_add == initial_count + 1, "Comment count should have incremented"
        print(f"✓ Comment count after add: {count_after_add}")
        
        # Delete the comment
        delete_response = api_client.delete(f"{BASE_URL}/api/comments/{comment_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Failed to delete comment: {delete_response.text}"
        print(f"✓ Comment deleted successfully")
        
        # Verify comment is gone
        comments_response = api_client.get(f"{BASE_URL}/api/problems/{problem_id}/comments", headers=auth_headers)
        assert comments_response.status_code == 200
        comments = comments_response.json()
        comment_ids = [c["id"] for c in comments]
        assert comment_id not in comment_ids, "Deleted comment should not be in list"
        print(f"✓ Deleted comment not in comments list")
        
        # Verify count decremented
        get_response2 = api_client.get(f"{BASE_URL}/api/problems/{problem_id}", headers=auth_headers)
        assert get_response2.status_code == 200
        count_after_delete = get_response2.json()["comments_count"]
        assert count_after_delete == count_after_add - 1, \
            f"Comment count should have decremented. Expected {count_after_add - 1}, got {count_after_delete}"
        print(f"✓ Comment count decremented: {count_after_delete}")
    
    def test_cannot_edit_others_comment(self, api_client, test_user, another_user, auth_headers, other_auth_headers):
        """Only comment author can edit - 403 for others"""
        # Create a problem as test_user
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for permission test", "category_id": "money"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        
        # Create a comment as test_user
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "This is test_user's comment"},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201]
        comment_id = comment_response.json()["id"]
        
        # Try to edit as another_user - should fail with 403
        edit_response = api_client.put(f"{BASE_URL}/api/comments/{comment_id}",
            json={"content": "Trying to edit someone else's comment"},
            headers=other_auth_headers
        )
        assert edit_response.status_code == 403, \
            f"Expected 403 Forbidden, got {edit_response.status_code}: {edit_response.text}"
        print(f"✓ Correctly rejected edit by non-author with 403")
    
    def test_cannot_delete_others_comment(self, api_client, test_user, another_user, auth_headers, other_auth_headers):
        """Only comment author can delete - 403 for others"""
        # Create a problem as test_user
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "Test problem for delete permission", "category_id": "health"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        
        # Create a comment as test_user
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": "This is protected content"},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201]
        comment_id = comment_response.json()["id"]
        
        # Try to delete as another_user - should fail with 403
        delete_response = api_client.delete(f"{BASE_URL}/api/comments/{comment_id}",
            headers=other_auth_headers
        )
        assert delete_response.status_code == 403, \
            f"Expected 403 Forbidden, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ Correctly rejected delete by non-author with 403")
    
    def test_edit_nonexistent_comment(self, api_client, auth_headers):
        """Edit nonexistent comment returns 404"""
        fake_id = str(uuid.uuid4())
        edit_response = api_client.put(f"{BASE_URL}/api/comments/{fake_id}",
            json={"content": "Some content"},
            headers=auth_headers
        )
        assert edit_response.status_code == 404, \
            f"Expected 404 for nonexistent comment, got {edit_response.status_code}"
        print(f"✓ Correctly returned 404 for nonexistent comment edit")
    
    def test_delete_nonexistent_comment(self, api_client, auth_headers):
        """Delete nonexistent comment returns 404"""
        fake_id = str(uuid.uuid4())
        delete_response = api_client.delete(f"{BASE_URL}/api/comments/{fake_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 404, \
            f"Expected 404 for nonexistent comment, got {delete_response.status_code}"
        print(f"✓ Correctly returned 404 for nonexistent comment delete")

# ===================== INTEGRATION TEST =====================

class TestEndToEndCommentFlow:
    """End-to-end test for comment create -> edit -> delete flow"""
    
    def test_complete_comment_lifecycle(self, api_client, test_user, auth_headers):
        """Test full lifecycle: create -> view -> edit -> view -> delete -> verify gone"""
        # 1. Create problem
        prob_response = api_client.post(f"{BASE_URL}/api/problems",
            json={"title": "End-to-end comment lifecycle test", "category_id": "tech"},
            headers=auth_headers
        )
        assert prob_response.status_code in [200, 201]
        problem_id = prob_response.json()["id"]
        print(f"1. Created problem: {problem_id}")
        
        # 2. Create comment
        original = "Original comment for lifecycle test"
        comment_response = api_client.post(f"{BASE_URL}/api/comments",
            json={"problem_id": problem_id, "content": original},
            headers=auth_headers
        )
        assert comment_response.status_code in [200, 201]
        comment = comment_response.json()
        comment_id = comment["id"]
        assert comment["content"] == original
        assert comment.get("edited_at") is None
        print(f"2. Created comment: {comment_id}")
        
        # 3. View comments - should show our comment
        list_response = api_client.get(f"{BASE_URL}/api/problems/{problem_id}/comments", headers=auth_headers)
        assert list_response.status_code == 200
        comments = list_response.json()
        assert any(c["id"] == comment_id for c in comments)
        print(f"3. Comment visible in list ✓")
        
        # 4. Edit comment
        edited = "Edited comment content - changed"
        edit_response = api_client.put(f"{BASE_URL}/api/comments/{comment_id}",
            json={"content": edited},
            headers=auth_headers
        )
        assert edit_response.status_code == 200
        edited_comment = edit_response.json()
        assert edited_comment["content"] == edited
        assert edited_comment.get("edited_at") is not None
        print(f"4. Comment edited, edited_at: {edited_comment['edited_at']}")
        
        # 5. View again - should show edited content
        list_response2 = api_client.get(f"{BASE_URL}/api/problems/{problem_id}/comments", headers=auth_headers)
        comments2 = list_response2.json()
        our_comment = next((c for c in comments2 if c["id"] == comment_id), None)
        assert our_comment is not None
        assert our_comment["content"] == edited
        assert our_comment.get("edited_at") is not None
        print(f"5. Edited comment visible with edited_at ✓")
        
        # 6. Delete comment
        delete_response = api_client.delete(f"{BASE_URL}/api/comments/{comment_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        print(f"6. Comment deleted ✓")
        
        # 7. Verify comment is gone
        list_response3 = api_client.get(f"{BASE_URL}/api/problems/{problem_id}/comments", headers=auth_headers)
        comments3 = list_response3.json()
        assert not any(c["id"] == comment_id for c in comments3)
        print(f"7. Deleted comment no longer in list ✓")
        
        print("\n=== Full comment lifecycle test PASSED ===")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
