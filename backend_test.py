#!/usr/bin/env python3
"""
PathGro Backend API Testing Suite
Tests admin functionality and role-based access control
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://frikt-app-store.preview.emergentagent.com/api"

class PathGroTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.admin_user_id = None
        self.regular_user_id = None
        self.feedback_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_admin_registration(self):
        """Test 1: Admin Registration with karolisbudreckas92@gmail.com"""
        try:
            # First try to register the specific admin email
            admin_data = {
                "name": "Admin User",
                "email": "karolisbudreckas92@gmail.com",
                "password": "adminpass123"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=admin_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user", {}).get("role") == "admin":
                    self.admin_token = data.get("access_token")
                    self.admin_user_id = data.get("user", {}).get("id")
                    self.log_test("Admin Registration", True, "Admin user registered successfully with admin role")
                    return True
                else:
                    self.log_test("Admin Registration", False, f"User registered but role is '{data.get('user', {}).get('role')}', expected 'admin'", data)
                    return False
            else:
                # Check if user already exists, try with test admin instead
                if response.status_code == 400 and "already registered" in response.text:
                    # Use test admin user
                    test_admin_data = {
                        "name": "Test Admin",
                        "email": "testadmin@pathgro.com",
                        "password": "testadmin123"
                    }
                    
                    test_response = requests.post(f"{BACKEND_URL}/auth/register", json=test_admin_data)
                    if test_response.status_code == 200:
                        data = test_response.json()
                        if data.get("user", {}).get("role") == "admin":
                            self.admin_token = data.get("access_token")
                            self.admin_user_id = data.get("user", {}).get("id")
                            self.log_test("Admin Registration", True, "Test admin user registered successfully with admin role")
                            return True
                        else:
                            self.log_test("Admin Registration", False, f"Test admin role is '{data.get('user', {}).get('role')}', expected 'admin'", data)
                            return False
                    elif test_response.status_code == 400 and "already registered" in test_response.text:
                        # Try to login with test admin
                        login_data = {
                            "email": "testadmin@pathgro.com",
                            "password": "testadmin123"
                        }
                        login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                        if login_response.status_code == 200:
                            data = login_response.json()
                            if data.get("user", {}).get("role") == "admin":
                                self.admin_token = data.get("access_token")
                                self.admin_user_id = data.get("user", {}).get("id")
                                self.log_test("Admin Registration", True, "Test admin user logged in successfully with admin role")
                                return True
                            else:
                                self.log_test("Admin Registration", False, f"Test admin role is '{data.get('user', {}).get('role')}', expected 'admin'", data)
                                return False
                        else:
                            self.log_test("Admin Registration", False, f"Failed to login test admin: {login_response.status_code}", login_response.text)
                            return False
                    else:
                        self.log_test("Admin Registration", False, f"Test admin registration failed: {test_response.status_code}", test_response.text)
                        return False
                else:
                    self.log_test("Admin Registration", False, f"Registration failed: {response.status_code}", response.text)
                    return False
                    
        except Exception as e:
            self.log_test("Admin Registration", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_regular_user_registration(self):
        """Test 2: Regular User Registration"""
        try:
            # Register regular user
            user_data = {
                "name": "Regular User",
                "email": "testuser@example.com",
                "password": "userpass123"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user", {}).get("role") == "user":
                    self.user_token = data.get("access_token")
                    self.regular_user_id = data.get("user", {}).get("id")
                    self.log_test("Regular User Registration", True, "Regular user registered successfully with user role")
                    return True
                else:
                    self.log_test("Regular User Registration", False, f"User registered but role is '{data.get('user', {}).get('role')}', expected 'user'", data)
                    return False
            else:
                # Check if user already exists
                if response.status_code == 400 and "already registered" in response.text:
                    # Try to login instead
                    login_data = {
                        "email": "testuser@example.com",
                        "password": "userpass123"
                    }
                    login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                    if login_response.status_code == 200:
                        data = login_response.json()
                        if data.get("user", {}).get("role") == "user":
                            self.user_token = data.get("access_token")
                            self.regular_user_id = data.get("user", {}).get("id")
                            self.log_test("Regular User Registration", True, "Regular user already exists and logged in successfully with user role")
                            return True
                        else:
                            self.log_test("Regular User Registration", False, f"Existing user role is '{data.get('user', {}).get('role')}', expected 'user'", data)
                            return False
                    else:
                        self.log_test("Regular User Registration", False, f"Failed to login existing regular user: {login_response.status_code}", login_response.text)
                        return False
                else:
                    self.log_test("Regular User Registration", False, f"Registration failed: {response.status_code}", response.text)
                    return False
                    
        except Exception as e:
            self.log_test("Regular User Registration", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_analytics(self):
        """Test 3: Admin Analytics Endpoint"""
        if not self.admin_token:
            self.log_test("Admin Analytics", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/analytics", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["users", "problems", "comments"]
                
                # Check if all required fields are present
                missing_fields = [field for field in required_fields if field not in data]
                if not missing_fields:
                    # Check users sub-fields
                    users_fields = ["total", "active", "dau", "wau"]
                    missing_user_fields = [field for field in users_fields if field not in data.get("users", {})]
                    
                    if not missing_user_fields:
                        self.log_test("Admin Analytics", True, "Analytics endpoint returned all required data")
                        return True
                    else:
                        self.log_test("Admin Analytics", False, f"Missing user fields: {missing_user_fields}", data)
                        return False
                else:
                    self.log_test("Admin Analytics", False, f"Missing required fields: {missing_fields}", data)
                    return False
            else:
                self.log_test("Admin Analytics", False, f"Request failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Analytics", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_reports(self):
        """Test 4: Admin Reports Management"""
        if not self.admin_token:
            self.log_test("Admin Reports", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /admin/reports
            response = requests.get(f"{BACKEND_URL}/admin/reports", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "reports" in data and "total" in data:
                    self.log_test("Admin Reports - List", True, f"Reports endpoint returned {data['total']} reports")
                    
                    # If there are reports, test dismiss functionality
                    if data["reports"]:
                        report_id = data["reports"][0]["id"]
                        dismiss_response = requests.post(f"{BACKEND_URL}/admin/reports/{report_id}/dismiss", headers=headers)
                        
                        if dismiss_response.status_code == 200:
                            self.log_test("Admin Reports - Dismiss", True, "Report dismissed successfully")
                            return True
                        else:
                            self.log_test("Admin Reports - Dismiss", False, f"Dismiss failed: {dismiss_response.status_code}", dismiss_response.text)
                            return False
                    else:
                        self.log_test("Admin Reports - Dismiss", True, "No reports to dismiss (empty list)")
                        return True
                else:
                    self.log_test("Admin Reports", False, "Response missing required fields", data)
                    return False
            else:
                self.log_test("Admin Reports", False, f"Request failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Reports", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_user_management(self):
        """Test 5: Admin User Management"""
        if not self.admin_token or not self.regular_user_id:
            self.log_test("Admin User Management", False, "Missing admin token or regular user ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /admin/users
            response = requests.get(f"{BACKEND_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "users" in data and "total" in data:
                    self.log_test("Admin Users - List", True, f"Users endpoint returned {data['total']} users")
                    
                    # Test ban user
                    ban_response = requests.post(f"{BACKEND_URL}/admin/users/{self.regular_user_id}/ban", headers=headers)
                    
                    if ban_response.status_code == 200:
                        self.log_test("Admin Users - Ban", True, "User banned successfully")
                        
                        # Test unban user
                        unban_response = requests.post(f"{BACKEND_URL}/admin/users/{self.regular_user_id}/unban", headers=headers)
                        
                        if unban_response.status_code == 200:
                            self.log_test("Admin Users - Unban", True, "User unbanned successfully")
                            return True
                        else:
                            self.log_test("Admin Users - Unban", False, f"Unban failed: {unban_response.status_code}", unban_response.text)
                            return False
                    else:
                        self.log_test("Admin Users - Ban", False, f"Ban failed: {ban_response.status_code}", ban_response.text)
                        return False
                else:
                    self.log_test("Admin User Management", False, "Response missing required fields", data)
                    return False
            else:
                self.log_test("Admin User Management", False, f"Request failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin User Management", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_audit_log(self):
        """Test 6: Admin Audit Log"""
        if not self.admin_token:
            self.log_test("Admin Audit Log", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/audit-log", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "logs" in data and "total" in data:
                    self.log_test("Admin Audit Log", True, f"Audit log endpoint returned {data['total']} log entries")
                    return True
                else:
                    self.log_test("Admin Audit Log", False, "Response missing required fields", data)
                    return False
            else:
                self.log_test("Admin Audit Log", False, f"Request failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Audit Log", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_security_non_admin_access(self):
        """Test 7: Security - Non-admin users should get 403 for admin endpoints"""
        if not self.user_token:
            self.log_test("Security Check", False, "No regular user token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # Test various admin endpoints with regular user token
            admin_endpoints = [
                "/admin/analytics",
                "/admin/reports", 
                "/admin/users",
                "/admin/audit-log"
            ]
            
            all_blocked = True
            for endpoint in admin_endpoints:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)
                if response.status_code != 403:
                    self.log_test("Security Check", False, f"Endpoint {endpoint} returned {response.status_code}, expected 403", response.text)
                    all_blocked = False
                    break
            
            if all_blocked:
                self.log_test("Security Check", True, "All admin endpoints properly blocked for non-admin users")
                return True
            else:
                return False
                
        except Exception as e:
            self.log_test("Security Check", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_feedback_system(self):
        """Test 8: Complete Feedback System Flow"""
        if not self.user_token or not self.admin_token:
            self.log_test("Feedback System", False, "Missing required tokens")
            return False
        
        feedback_id = None
        
        try:
            # Step 1: Submit feedback as regular user
            headers = {"Authorization": f"Bearer {self.user_token}"}
            feedback_data = {
                "message": "This is test feedback for the app",
                "appVersion": "1.0.0"
            }
            
            submit_response = requests.post(f"{BACKEND_URL}/feedback", json=feedback_data, headers=headers)
            
            if submit_response.status_code == 200:
                submit_data = submit_response.json()
                if submit_data.get("success") and submit_data.get("id"):
                    feedback_id = submit_data["id"]
                    self.log_test("Feedback - Submit", True, "Feedback submitted successfully")
                else:
                    self.log_test("Feedback - Submit", False, "Response missing success or id fields", submit_data)
                    return False
            else:
                self.log_test("Feedback - Submit", False, f"Submit failed: {submit_response.status_code}", submit_response.text)
                return False
            
            # Step 2: Get feedback list as admin
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            list_response = requests.get(f"{BACKEND_URL}/admin/feedback", headers=admin_headers)
            
            if list_response.status_code == 200:
                list_data = list_response.json()
                if "feedbacks" in list_data and "total" in list_data:
                    # Check if our feedback appears and is unread
                    our_feedback = None
                    for fb in list_data["feedbacks"]:
                        if fb["id"] == feedback_id:
                            our_feedback = fb
                            break
                    
                    if our_feedback:
                        if our_feedback["is_read"] == False:
                            self.log_test("Feedback - Admin List", True, "Feedback appears in admin list with is_read: false")
                        else:
                            self.log_test("Feedback - Admin List", False, f"Feedback is_read should be false, got: {our_feedback['is_read']}")
                            return False
                    else:
                        self.log_test("Feedback - Admin List", False, "Submitted feedback not found in admin list")
                        return False
                else:
                    self.log_test("Feedback - Admin List", False, "Response missing required fields", list_data)
                    return False
            else:
                self.log_test("Feedback - Admin List", False, f"List failed: {list_response.status_code}", list_response.text)
                return False
            
            # Step 3: Mark feedback as read
            read_response = requests.post(f"{BACKEND_URL}/admin/feedback/{feedback_id}/read", headers=admin_headers)
            
            if read_response.status_code == 200:
                read_data = read_response.json()
                if read_data.get("success"):
                    self.log_test("Feedback - Mark Read", True, "Feedback marked as read successfully")
                else:
                    self.log_test("Feedback - Mark Read", False, "Response missing success field", read_data)
                    return False
            else:
                self.log_test("Feedback - Mark Read", False, f"Mark read failed: {read_response.status_code}", read_response.text)
                return False
            
            # Step 4: Mark feedback as unread
            unread_response = requests.post(f"{BACKEND_URL}/admin/feedback/{feedback_id}/unread", headers=admin_headers)
            
            if unread_response.status_code == 200:
                unread_data = unread_response.json()
                if unread_data.get("success"):
                    self.log_test("Feedback - Mark Unread", True, "Feedback marked as unread successfully")
                else:
                    self.log_test("Feedback - Mark Unread", False, "Response missing success field", unread_data)
                    return False
            else:
                self.log_test("Feedback - Mark Unread", False, f"Mark unread failed: {unread_response.status_code}", unread_response.text)
                return False
            
            # Step 5: Delete feedback
            delete_response = requests.delete(f"{BACKEND_URL}/admin/feedback/{feedback_id}", headers=admin_headers)
            
            if delete_response.status_code == 200:
                delete_data = delete_response.json()
                if delete_data.get("success"):
                    self.log_test("Feedback - Delete", True, "Feedback deleted successfully")
                    return True
                else:
                    self.log_test("Feedback - Delete", False, "Response missing success field", delete_data)
                    return False
            else:
                self.log_test("Feedback - Delete", False, f"Delete failed: {delete_response.status_code}", delete_response.text)
                return False
                
        except Exception as e:
            self.log_test("Feedback System", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_feedback_user_credentials(self):
        """Test 9: Login with specific feedback user credentials"""
        try:
            # First try to register the feedback user
            user_data = {
                "name": "Test Feedback User",
                "email": "testfeedback@test.com",
                "password": "Test123!"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                feedback_token = data.get("access_token")
                feedback_user_id = data.get("user", {}).get("id")
                self.log_test("Feedback User Registration", True, "Feedback user registered successfully")
            elif response.status_code == 400 and "already registered" in response.text:
                # Try to login instead
                login_data = {
                    "email": "testfeedback@test.com",
                    "password": "Test123!"
                }
                login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if login_response.status_code == 200:
                    data = login_response.json()
                    feedback_token = data.get("access_token")
                    feedback_user_id = data.get("user", {}).get("id")
                    self.log_test("Feedback User Registration", True, "Feedback user logged in successfully")
                else:
                    self.log_test("Feedback User Registration", False, f"Login failed: {login_response.status_code}", login_response.text)
                    return False
            else:
                self.log_test("Feedback User Registration", False, f"Registration failed: {response.status_code}", response.text)
                return False
            
            # Now test admin credentials
            admin_login_data = {
                "email": "karolisbudreckas92@gmail.com",
                "password": "Admin123!"
            }
            admin_login_response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login_data)
            
            if admin_login_response.status_code == 200:
                admin_data = admin_login_response.json()
                admin_feedback_token = admin_data.get("access_token")
                if admin_data.get("user", {}).get("role") == "admin":
                    self.log_test("Admin Credentials Test", True, "Admin credentials work correctly")
                    
                    # Update tokens for feedback test and store feedback user ID
                    self.user_token = feedback_token
                    self.admin_token = admin_feedback_token
                    self.feedback_user_id = feedback_user_id  # Store for profile tests
                    return True
                else:
                    self.log_test("Admin Credentials Test", False, f"Admin role incorrect: {admin_data.get('user', {}).get('role')}")
                    return False
            else:
                self.log_test("Admin Credentials Test", False, f"Admin login failed: {admin_login_response.status_code}", admin_login_response.text)
                return False
                
        except Exception as e:
            self.log_test("Feedback User Credentials", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_user_profile_endpoints(self):
        """Test 10: User Profile Endpoints - GET /api/users/{user_id}/profile and GET /api/users/{user_id}/posts"""
        if not self.user_token or not self.feedback_user_id:
            self.log_test("User Profile Endpoints", False, "Missing user token or feedback user ID")
            return False
        
        try:
            # Test 1: Get User Profile
            profile_response = requests.get(f"{BACKEND_URL}/users/{self.feedback_user_id}/profile")
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                
                # Verify required fields
                required_fields = ["id", "displayName", "avatarUrl", "bio", "posts_count", "comments_count", "relates_count"]
                missing_fields = [field for field in required_fields if field not in profile_data]
                
                if not missing_fields:
                    self.log_test("User Profile - Get Profile", True, 
                                f"Profile endpoint returned all required fields: {profile_data['displayName'] or 'Test Feedback User'} with {profile_data['posts_count']} posts, {profile_data['comments_count']} comments, {profile_data['relates_count']} relates")
                else:
                    self.log_test("User Profile - Get Profile", False, f"Missing required fields: {missing_fields}", profile_data)
                    return False
            else:
                self.log_test("User Profile - Get Profile", False, f"Profile request failed: {profile_response.status_code}", profile_response.text)
                return False
            
            # Test 2: Get User Posts (newest sort)
            posts_newest_response = requests.get(f"{BACKEND_URL}/users/{self.feedback_user_id}/posts?sort=newest")
            
            if posts_newest_response.status_code == 200:
                posts_newest_data = posts_newest_response.json()
                
                if isinstance(posts_newest_data, list):
                    # Check that posts have required fields
                    if posts_newest_data:  # Only check if there are posts
                        first_post = posts_newest_data[0]
                        required_post_fields = ["id", "title", "category_name", "relates_count", "comments_count", "created_at"]
                        missing_post_fields = [field for field in required_post_fields if field not in first_post]
                        
                        if not missing_post_fields:
                            self.log_test("User Profile - Get Posts (newest)", True, 
                                        f"Posts endpoint returned {len(posts_newest_data)} posts with all required fields")
                        else:
                            self.log_test("User Profile - Get Posts (newest)", False, 
                                        f"Post missing required fields: {missing_post_fields}", first_post)
                            return False
                    else:
                        self.log_test("User Profile - Get Posts (newest)", True, "Posts endpoint returned empty array (user has no posts)")
                else:
                    self.log_test("User Profile - Get Posts (newest)", False, "Response is not an array", posts_newest_data)
                    return False
            else:
                self.log_test("User Profile - Get Posts (newest)", False, f"Posts request failed: {posts_newest_response.status_code}", posts_newest_response.text)
                return False
            
            # Test 3: Get User Posts (top sort)
            posts_top_response = requests.get(f"{BACKEND_URL}/users/{self.feedback_user_id}/posts?sort=top")
            
            if posts_top_response.status_code == 200:
                posts_top_data = posts_top_response.json()
                
                if isinstance(posts_top_data, list):
                    self.log_test("User Profile - Get Posts (top)", True, 
                                f"Posts endpoint with 'top' sort returned {len(posts_top_data)} posts")
                    return True
                else:
                    self.log_test("User Profile - Get Posts (top)", False, "Response is not an array", posts_top_data)
                    return False
            else:
                self.log_test("User Profile - Get Posts (top)", False, f"Posts 'top' sort request failed: {posts_top_response.status_code}", posts_top_response.text)
                return False
                
        except Exception as e:
            self.log_test("User Profile Endpoints", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("PathGro Backend API Testing - Including User Profile Endpoints")
        print("=" * 60)
        
        tests = [
            self.test_admin_registration,
            self.test_regular_user_registration,
            self.test_admin_analytics,
            self.test_admin_reports,
            self.test_admin_user_management,
            self.test_admin_audit_log,
            self.test_security_non_admin_access,
            self.test_feedback_user_credentials,
            self.test_feedback_system,
            self.test_user_profile_endpoints
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"Test Results: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print summary of failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\nFailed Tests Summary:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['message']}")
        
        return passed == total

if __name__ == "__main__":
    tester = PathGroTester()
    success = tester.run_all_tests()
    
    # Save detailed results to file
    with open("/app/test_results_detailed.json", "w") as f:
        json.dump(tester.test_results, f, indent=2)
    
    sys.exit(0 if success else 1)