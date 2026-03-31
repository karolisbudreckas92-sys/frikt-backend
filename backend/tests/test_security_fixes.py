"""
Test Suite for 5 Security Fixes in FRIKT App
==============================================
FIX 1: Banned user check on every auth request (require_auth returns 403 for banned)
FIX 2: Password reset brute force protection (max 5 attempts per token, max 3 requests per email per hour)
FIX 3: Account deletion preserves content (anonymizes problems/comments instead of hard-deleting)
FIX 4: All admin endpoints verified with require_admin + denied access logging
FIX 5: Shadowban content filtering (shadowbanned users' content invisible to others, visible to themselves)
"""

import pytest
import requests
import os
import uuid
import time
from datetime import datetime
from pymongo import MongoClient

# Configuration
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frikt-bug-fixes.preview.emergentagent.com').rstrip('/')
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'pathgro_db')

# Admin credentials
ADMIN_EMAIL = "karolisbudreckas92@gmail.com"
ADMIN_PASSWORD = "Admin123!"

# MongoDB connection for direct DB manipulation
client = MongoClient(MONGO_URL)
db = client[DB_NAME]


class TestHelpers:
    """Helper methods for tests"""
    
    @staticmethod
    def generate_unique_email():
        return f"test_security_{uuid.uuid4().hex[:8]}@test.com"
    
    @staticmethod
    def register_user(email, password="TestPass123!", name="Test User"):
        """Register a new user and return token + user data"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name
        })
        return response
    
    @staticmethod
    def login_user(email, password):
        """Login and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        return response
    
    @staticmethod
    def get_admin_token():
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    @staticmethod
    def create_frikt(token, title="Test Frikt Title for Security Testing"):
        """Create a frikt (problem)"""
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/api/problems", json={
            "title": title,
            "category_id": "other"
        }, headers=headers)
        return response
    
    @staticmethod
    def create_comment(token, problem_id, content="Test comment content for security testing"):
        """Create a comment on a frikt"""
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.post(f"{BASE_URL}/api/comments", json={
            "problem_id": problem_id,
            "content": content
        }, headers=headers)
        return response


# ===================== FIX 1: BANNED USER CHECK =====================

class TestFix1BannedUserCheck:
    """FIX 1: Banned user check on every auth request (require_auth returns 403 for banned)"""
    
    def test_banned_user_gets_403_on_auth_me(self):
        """Register user, get token, ban user via DB, verify GET /api/auth/me returns 403"""
        # Register a new user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        token = reg_response.json().get("access_token")
        user_id = reg_response.json().get("user", {}).get("id")
        assert token, "No token returned"
        assert user_id, "No user_id returned"
        
        # Verify user can access /api/auth/me before ban
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200, f"Auth/me failed before ban: {me_response.text}"
        
        # Ban user directly in DB
        result = db.users.update_one({"id": user_id}, {"$set": {"status": "banned"}})
        assert result.modified_count == 1, "Failed to ban user in DB"
        
        # Verify GET /api/auth/me returns 403
        me_response_after_ban = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response_after_ban.status_code == 403, f"Expected 403 for banned user, got {me_response_after_ban.status_code}"
        assert "suspended" in me_response_after_ban.json().get("detail", "").lower(), "Expected 'suspended' in error message"
        
        # Cleanup
        db.users.delete_one({"id": user_id})
        print("✓ FIX 1: Banned user gets 403 on /api/auth/me")
    
    def test_shadowbanned_user_can_still_use_api(self):
        """Shadowbanned user can still use the API normally (silent shadowban)"""
        # Register a new user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        token = reg_response.json().get("access_token")
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Shadowban user directly in DB
        result = db.users.update_one({"id": user_id}, {"$set": {"status": "shadowbanned"}})
        assert result.modified_count == 1, "Failed to shadowban user in DB"
        
        # Verify shadowbanned user can still access /api/auth/me (200, not 403)
        headers = {"Authorization": f"Bearer {token}"}
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200, f"Shadowbanned user should get 200, got {me_response.status_code}"
        
        # Verify shadowbanned user can create content
        frikt_response = TestHelpers.create_frikt(token, "Shadowbanned user test frikt title")
        assert frikt_response.status_code == 200, f"Shadowbanned user should be able to create frikt, got {frikt_response.status_code}"
        
        # Cleanup
        problem_id = frikt_response.json().get("id")
        if problem_id:
            db.problems.delete_one({"id": problem_id})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 1: Shadowbanned user can still use API normally")


# ===================== FIX 2: PASSWORD RESET BRUTE FORCE PROTECTION =====================

class TestFix2PasswordResetBruteForce:
    """FIX 2: Password reset brute force protection"""
    
    def test_forgot_password_creates_token_with_attempts_zero(self):
        """POST /api/auth/forgot-password creates reset token with attempts=0"""
        # Register a user first
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Request password reset
        forgot_response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert forgot_response.status_code == 200, f"Forgot password failed: {forgot_response.text}"
        
        # Check DB for token with attempts=0
        token_doc = db.password_reset_tokens.find_one({"email": email.lower(), "used": False})
        assert token_doc is not None, "No reset token found in DB"
        assert token_doc.get("attempts") == 0, f"Expected attempts=0, got {token_doc.get('attempts')}"
        
        # Cleanup
        db.password_reset_tokens.delete_many({"email": email.lower()})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 2: Forgot password creates token with attempts=0")
    
    def test_verify_reset_code_wrong_code_increments_attempts(self):
        """POST /api/auth/verify-reset-code with wrong code + email increments attempts on the active token"""
        # Register a user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Request password reset
        requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        
        # Get the actual token from DB
        token_doc = db.password_reset_tokens.find_one({"email": email.lower(), "used": False})
        assert token_doc is not None, "No reset token found"
        initial_attempts = token_doc.get("attempts", 0)
        
        # Submit wrong code WITH email parameter
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-reset-code",
            params={"token": "000000", "email": email}
        )
        assert verify_response.status_code == 200, f"Verify endpoint failed: {verify_response.text}"
        assert verify_response.json().get("valid") == False, "Wrong code should return valid=False"
        
        # Check attempts incremented
        token_doc_after = db.password_reset_tokens.find_one({"email": email.lower(), "used": False})
        assert token_doc_after is not None, "Token should still exist"
        assert token_doc_after.get("attempts") == initial_attempts + 1, f"Attempts should be {initial_attempts + 1}, got {token_doc_after.get('attempts')}"
        
        # Cleanup
        db.password_reset_tokens.delete_many({"email": email.lower()})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 2: Wrong code with email increments attempts")
    
    def test_after_5_wrong_attempts_correct_code_returns_invalid(self):
        """After 5 wrong attempts with email, the correct code also returns invalid (token invalidated)"""
        # Register a user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Request password reset
        requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        
        # Get the actual token from DB
        token_doc = db.password_reset_tokens.find_one({"email": email.lower(), "used": False})
        assert token_doc is not None, "No reset token found"
        correct_code = token_doc.get("token")
        
        # Submit 5 wrong codes with email parameter
        for i in range(5):
            verify_response = requests.post(
                f"{BASE_URL}/api/auth/verify-reset-code",
                params={"token": f"00000{i}", "email": email}
            )
            assert verify_response.json().get("valid") == False
        
        # Now try with correct code - should be invalid because token is invalidated
        verify_correct = requests.post(
            f"{BASE_URL}/api/auth/verify-reset-code",
            params={"token": correct_code, "email": email}
        )
        assert verify_correct.json().get("valid") == False, "After 5 wrong attempts, correct code should also be invalid"
        
        # Verify token is marked as used in DB
        token_doc_after = db.password_reset_tokens.find_one({"id": token_doc["id"]})
        assert token_doc_after.get("used") == True, "Token should be marked as used after 5 wrong attempts"
        
        # Cleanup
        db.password_reset_tokens.delete_many({"email": email.lower()})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 2: After 5 wrong attempts, correct code returns invalid")
    
    def test_rate_limit_3_requests_per_email_per_hour(self):
        """Rate limit - max 3 reset requests per email per hour (4th request still returns success but no new token)"""
        # Register a user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Clean up any existing tokens
        db.password_reset_tokens.delete_many({"email": email.lower()})
        
        # Make 3 reset requests
        for i in range(3):
            response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
            assert response.status_code == 200, f"Request {i+1} failed"
        
        # Count tokens created
        token_count_after_3 = db.password_reset_tokens.count_documents({"email": email.lower()})
        # Note: Each request invalidates previous tokens, so we should have 3 total (2 used + 1 active)
        # But the rate limit counts all tokens created in the last hour
        
        # Make 4th request - should return success but NOT create new token
        response_4 = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert response_4.status_code == 200, "4th request should still return 200 (security best practice)"
        
        # Check that no new token was created (count should be same)
        token_count_after_4 = db.password_reset_tokens.count_documents({"email": email.lower()})
        assert token_count_after_4 == token_count_after_3, f"4th request should not create new token. Before: {token_count_after_3}, After: {token_count_after_4}"
        
        # Cleanup
        db.password_reset_tokens.delete_many({"email": email.lower()})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 2: Rate limit 3 requests per email per hour works")


# ===================== FIX 3: ACCOUNT DELETION PRESERVES CONTENT =====================

class TestFix3AccountDeletionPreservesContent:
    """FIX 3: Account deletion preserves content (anonymizes problems/comments instead of hard-deleting)"""
    
    def test_delete_account_anonymizes_frikt(self):
        """Register user, create frikt, DELETE /api/users/me - verify frikt still exists with user_name='[deleted user]'"""
        # Register a user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email, name="DeleteTestUser")
        assert reg_response.status_code == 200
        token = reg_response.json().get("access_token")
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Create a frikt
        frikt_response = TestHelpers.create_frikt(token, "Test frikt for deletion testing")
        assert frikt_response.status_code == 200, f"Failed to create frikt: {frikt_response.text}"
        frikt_id = frikt_response.json().get("id")
        
        # Delete account
        headers = {"Authorization": f"Bearer {token}"}
        delete_response = requests.delete(f"{BASE_URL}/api/users/me", headers=headers)
        assert delete_response.status_code == 200, f"Delete account failed: {delete_response.text}"
        
        # Verify frikt still exists with anonymized user info
        frikt_doc = db.problems.find_one({"id": frikt_id})
        assert frikt_doc is not None, "Frikt should still exist after account deletion"
        assert frikt_doc.get("user_name") == "[deleted user]", f"Expected user_name='[deleted user]', got '{frikt_doc.get('user_name')}'"
        assert frikt_doc.get("user_id") == "deleted_user", f"Expected user_id='deleted_user', got '{frikt_doc.get('user_id')}'"
        
        # Cleanup
        db.problems.delete_one({"id": frikt_id})
        print("✓ FIX 3: Frikt anonymized after account deletion")
    
    def test_delete_account_anonymizes_comment(self):
        """Verify comment is anonymized after account deletion"""
        # Register two users - one to create frikt, one to comment and delete
        email1 = TestHelpers.generate_unique_email()
        reg1 = TestHelpers.register_user(email1, name="FriktOwner")
        token1 = reg1.json().get("access_token")
        user_id1 = reg1.json().get("user", {}).get("id")
        
        email2 = TestHelpers.generate_unique_email()
        reg2 = TestHelpers.register_user(email2, name="CommenterToDelete")
        token2 = reg2.json().get("access_token")
        user_id2 = reg2.json().get("user", {}).get("id")
        
        # User1 creates frikt
        frikt_response = TestHelpers.create_frikt(token1, "Frikt for comment deletion test")
        frikt_id = frikt_response.json().get("id")
        
        # User2 creates comment
        comment_response = TestHelpers.create_comment(token2, frikt_id, "Comment from user who will delete account")
        assert comment_response.status_code == 200, f"Failed to create comment: {comment_response.text}"
        comment_id = comment_response.json().get("id")
        
        # User2 deletes account
        headers2 = {"Authorization": f"Bearer {token2}"}
        delete_response = requests.delete(f"{BASE_URL}/api/users/me", headers=headers2)
        assert delete_response.status_code == 200
        
        # Verify comment is anonymized
        comment_doc = db.comments.find_one({"id": comment_id})
        assert comment_doc is not None, "Comment should still exist"
        assert comment_doc.get("user_name") == "[deleted user]", f"Expected user_name='[deleted user]', got '{comment_doc.get('user_name')}'"
        assert comment_doc.get("user_id") == "deleted_user", f"Expected user_id='deleted_user', got '{comment_doc.get('user_id')}'"
        
        # Cleanup
        db.comments.delete_one({"id": comment_id})
        db.problems.delete_one({"id": frikt_id})
        db.users.delete_one({"id": user_id1})
        print("✓ FIX 3: Comment anonymized after account deletion")
    
    def test_delete_account_removes_user_document(self):
        """Verify user document is actually deleted after account deletion"""
        # Register a user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        token = reg_response.json().get("access_token")
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Verify user exists
        user_before = db.users.find_one({"id": user_id})
        assert user_before is not None, "User should exist before deletion"
        
        # Delete account
        headers = {"Authorization": f"Bearer {token}"}
        delete_response = requests.delete(f"{BASE_URL}/api/users/me", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify user document is deleted
        user_after = db.users.find_one({"id": user_id})
        assert user_after is None, "User document should be deleted"
        
        print("✓ FIX 3: User document deleted after account deletion")


# ===================== FIX 4: ADMIN ENDPOINTS REQUIRE ADMIN =====================

class TestFix4AdminEndpointsRequireAdmin:
    """FIX 4: All admin endpoints verified with require_admin + denied access logging"""
    
    def test_non_admin_user_gets_403_on_admin_reports(self):
        """Non-admin user trying GET /api/admin/reports returns 403"""
        # Register a regular user
        email = TestHelpers.generate_unique_email()
        reg_response = TestHelpers.register_user(email)
        assert reg_response.status_code == 200
        token = reg_response.json().get("access_token")
        user_id = reg_response.json().get("user", {}).get("id")
        
        # Try to access admin endpoint
        headers = {"Authorization": f"Bearer {token}"}
        admin_response = requests.get(f"{BASE_URL}/api/admin/reports", headers=headers)
        assert admin_response.status_code == 403, f"Expected 403 for non-admin, got {admin_response.status_code}"
        
        # Verify denied access was logged
        time.sleep(0.5)  # Give time for log to be written
        audit_log = db.admin_audit_logs.find_one({
            "admin_id": user_id,
            "action": "admin_access_denied"
        })
        assert audit_log is not None, "Denied access should be logged in admin_audit_logs"
        
        # Cleanup
        db.admin_audit_logs.delete_many({"admin_id": user_id})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 4: Non-admin gets 403 on admin endpoints with logging")
    
    def test_admin_user_can_access_admin_reports(self):
        """Admin user can access GET /api/admin/reports"""
        admin_token = TestHelpers.get_admin_token()
        assert admin_token is not None, "Failed to get admin token"
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        admin_response = requests.get(f"{BASE_URL}/api/admin/reports", headers=headers)
        assert admin_response.status_code == 200, f"Admin should get 200, got {admin_response.status_code}"
        
        print("✓ FIX 4: Admin can access admin endpoints")


# ===================== FIX 5: SHADOWBAN CONTENT FILTERING =====================

class TestFix5ShadowbanContentFiltering:
    """FIX 5: Shadowban content filtering (shadowbanned users' content invisible to others, visible to themselves)"""
    
    def test_shadowbanned_user_frikt_not_in_feed_for_others(self):
        """Register user, create frikt, admin shadowbans user, verify frikt NOT in feed for other users"""
        # Register user to be shadowbanned
        email1 = TestHelpers.generate_unique_email()
        reg1 = TestHelpers.register_user(email1, name="ShadowbanTestUser")
        token1 = reg1.json().get("access_token")
        user_id1 = reg1.json().get("user", {}).get("id")
        
        # Create a frikt
        frikt_response = TestHelpers.create_frikt(token1, "Shadowban test frikt title here")
        assert frikt_response.status_code == 200
        frikt_id = frikt_response.json().get("id")
        
        # Register another user to check feed
        email2 = TestHelpers.generate_unique_email()
        reg2 = TestHelpers.register_user(email2, name="OtherUser")
        token2 = reg2.json().get("access_token")
        user_id2 = reg2.json().get("user", {}).get("id")
        
        # Verify frikt is visible to other user BEFORE shadowban
        headers2 = {"Authorization": f"Bearer {token2}"}
        feed_before = requests.get(f"{BASE_URL}/api/problems?feed=new", headers=headers2)
        assert feed_before.status_code == 200
        frikt_ids_before = [p["id"] for p in feed_before.json()]
        assert frikt_id in frikt_ids_before, "Frikt should be visible before shadowban"
        
        # Admin shadowbans user1
        admin_token = TestHelpers.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        shadowban_response = requests.post(f"{BASE_URL}/api/admin/users/{user_id1}/shadowban", headers=admin_headers)
        assert shadowban_response.status_code == 200, f"Shadowban failed: {shadowban_response.text}"
        
        # Verify frikt is NOT visible to other user AFTER shadowban
        feed_after = requests.get(f"{BASE_URL}/api/problems?feed=new", headers=headers2)
        assert feed_after.status_code == 200
        frikt_ids_after = [p["id"] for p in feed_after.json()]
        assert frikt_id not in frikt_ids_after, "Shadowbanned user's frikt should NOT be visible to others"
        
        # Cleanup
        db.users.update_one({"id": user_id1}, {"$set": {"status": "active"}})  # Unban for cleanup
        db.problems.delete_one({"id": frikt_id})
        db.users.delete_one({"id": user_id1})
        db.users.delete_one({"id": user_id2})
        print("✓ FIX 5: Shadowbanned user's frikt not visible to others")
    
    def test_shadowbanned_user_can_see_own_frikt(self):
        """Shadowbanned user can see their own frikt in their feed"""
        # Register user
        email = TestHelpers.generate_unique_email()
        reg = TestHelpers.register_user(email, name="ShadowbanSelfTest")
        token = reg.json().get("access_token")
        user_id = reg.json().get("user", {}).get("id")
        
        # Create a frikt
        frikt_response = TestHelpers.create_frikt(token, "My own frikt that I should see")
        assert frikt_response.status_code == 200
        frikt_id = frikt_response.json().get("id")
        
        # Admin shadowbans user
        admin_token = TestHelpers.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        requests.post(f"{BASE_URL}/api/admin/users/{user_id}/shadowban", headers=admin_headers)
        
        # Verify shadowbanned user can still see their own frikt
        headers = {"Authorization": f"Bearer {token}"}
        feed = requests.get(f"{BASE_URL}/api/problems?feed=new", headers=headers)
        assert feed.status_code == 200
        frikt_ids = [p["id"] for p in feed.json()]
        assert frikt_id in frikt_ids, "Shadowbanned user should see their own frikt"
        
        # Cleanup
        db.users.update_one({"id": user_id}, {"$set": {"status": "active"}})
        db.problems.delete_one({"id": frikt_id})
        db.users.delete_one({"id": user_id})
        print("✓ FIX 5: Shadowbanned user can see their own frikt")
    
    def test_shadowbanned_user_comments_hidden_from_others(self):
        """Verify shadowbanned user's comments are hidden from others in GET /api/problems/{id}/comments"""
        # Register user to be shadowbanned
        email1 = TestHelpers.generate_unique_email()
        reg1 = TestHelpers.register_user(email1, name="ShadowbanCommenter")
        token1 = reg1.json().get("access_token")
        user_id1 = reg1.json().get("user", {}).get("id")
        
        # Register another user (frikt owner)
        email2 = TestHelpers.generate_unique_email()
        reg2 = TestHelpers.register_user(email2, name="FriktOwner")
        token2 = reg2.json().get("access_token")
        user_id2 = reg2.json().get("user", {}).get("id")
        
        # User2 creates frikt
        frikt_response = TestHelpers.create_frikt(token2, "Frikt for shadowban comment test")
        frikt_id = frikt_response.json().get("id")
        
        # User1 creates comment
        comment_response = TestHelpers.create_comment(token1, frikt_id, "Comment from user who will be shadowbanned")
        assert comment_response.status_code == 200
        comment_id = comment_response.json().get("id")
        
        # Verify comment is visible to user2 BEFORE shadowban
        headers2 = {"Authorization": f"Bearer {token2}"}
        comments_before = requests.get(f"{BASE_URL}/api/problems/{frikt_id}/comments", headers=headers2)
        comment_ids_before = [c["id"] for c in comments_before.json()]
        assert comment_id in comment_ids_before, "Comment should be visible before shadowban"
        
        # Admin shadowbans user1
        admin_token = TestHelpers.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        requests.post(f"{BASE_URL}/api/admin/users/{user_id1}/shadowban", headers=admin_headers)
        
        # Verify comment is NOT visible to user2 AFTER shadowban
        comments_after = requests.get(f"{BASE_URL}/api/problems/{frikt_id}/comments", headers=headers2)
        comment_ids_after = [c["id"] for c in comments_after.json()]
        assert comment_id not in comment_ids_after, "Shadowbanned user's comment should NOT be visible to others"
        
        # Cleanup
        db.users.update_one({"id": user_id1}, {"$set": {"status": "active"}})
        db.comments.delete_one({"id": comment_id})
        db.problems.delete_one({"id": frikt_id})
        db.users.delete_one({"id": user_id1})
        db.users.delete_one({"id": user_id2})
        print("✓ FIX 5: Shadowbanned user's comments hidden from others")


# ===================== BASIC HEALTH CHECKS =====================

class TestBasicHealthChecks:
    """Basic health checks to ensure API is working"""
    
    def test_health_endpoint(self):
        """GET /api/health returns healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        assert response.json().get("status") == "healthy", "Expected status='healthy'"
        print("✓ Health check passed")
    
    def test_login_works(self):
        """POST /api/auth/login works normally"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        assert "access_token" in response.json(), "No access_token in response"
        print("✓ Login works")
    
    def test_register_works(self):
        """POST /api/auth/register works normally"""
        email = TestHelpers.generate_unique_email()
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Test User"
        })
        assert response.status_code == 200, f"Register failed: {response.text}"
        assert "access_token" in response.json(), "No access_token in response"
        
        # Cleanup
        user_id = response.json().get("user", {}).get("id")
        if user_id:
            db.users.delete_one({"id": user_id})
        print("✓ Register works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
