#!/usr/bin/env python3
"""
FRIKT Backend API Comprehensive Testing Suite
AppStore Readiness Test - Tests ALL backend endpoints
"""

import requests
import json
import sys
import base64
from datetime import datetime
import uuid

# Backend URL from frontend/.env
BACKEND_URL = "https://frikt-social.preview.emergentagent.com/api"

class FRIKTTester:
    def __init__(self):
        self.admin_token = None
        self.user1_token = None
        self.user2_token = None
        self.admin_user_id = None
        self.user1_id = None
        self.user2_id = None
        self.test_problem_id = None
        self.test_comment_id = None
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
    
    # ===================== AUTHENTICATION TESTS =====================
    
    def test_auth_register(self):
        """Test 1: User Registration"""
        try:
            # Test admin registration
            admin_data = {
                "name": "Karolis Admin",
                "email": "karolisbudreckas92@gmail.com",
                "password": "Admin123!"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=admin_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user", {}).get("role") == "admin":
                    self.admin_token = data.get("access_token")
                    self.admin_user_id = data.get("user", {}).get("id")
                    self.log_test("Auth Register - Admin", True, "Admin user registered successfully")
                else:
                    self.log_test("Auth Register - Admin", False, f"Expected admin role, got {data.get('user', {}).get('role')}")
                    return False
            elif response.status_code == 400 and "already registered" in response.text:
                # Try login instead
                login_data = {"email": "karolisbudreckas92@gmail.com", "password": "Admin123!"}
                login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.admin_token = data.get("access_token")
                    self.admin_user_id = data.get("user", {}).get("id")
                    self.log_test("Auth Register - Admin", True, "Admin user already exists, logged in successfully")
                else:
                    self.log_test("Auth Register - Admin", False, f"Login failed: {login_response.status_code}")
                    return False
            else:
                self.log_test("Auth Register - Admin", False, f"Registration failed: {response.status_code} - {response.text}")
                return False
            
            # Test regular user registration
            user1_data = {
                "name": "Sarah Johnson",
                "email": f"sarah.johnson.{uuid.uuid4().hex[:8]}@example.com",
                "password": "SecurePass123!"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=user1_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("user", {}).get("role") == "user":
                    self.user1_token = data.get("access_token")
                    self.user1_id = data.get("user", {}).get("id")
                    self.log_test("Auth Register - User1", True, "Regular user registered successfully")
                else:
                    self.log_test("Auth Register - User1", False, f"Expected user role, got {data.get('user', {}).get('role')}")
                    return False
            else:
                self.log_test("Auth Register - User1", False, f"Registration failed: {response.status_code} - {response.text}")
                return False
            
            # Test second user registration
            user2_data = {
                "name": "Mike Chen",
                "email": f"mike.chen.{uuid.uuid4().hex[:8]}@example.com",
                "password": "AnotherPass456!"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/register", json=user2_data)
            
            if response.status_code == 200:
                data = response.json()
                self.user2_token = data.get("access_token")
                self.user2_id = data.get("user", {}).get("id")
                self.log_test("Auth Register - User2", True, "Second user registered successfully")
                return True
            else:
                self.log_test("Auth Register - User2", False, f"Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth Register", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_login(self):
        """Test 2: User Login"""
        try:
            login_data = {
                "email": "karolisbudreckas92@gmail.com",
                "password": "Admin123!"
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.log_test("Auth Login", True, "Login successful with valid JWT token")
                    return True
                else:
                    self.log_test("Auth Login", False, "Response missing token or user data", data)
                    return False
            else:
                self.log_test("Auth Login", False, f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth Login", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test 3: Get Current User"""
        if not self.admin_token:
            self.log_test("Auth Me", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "email", "name", "role"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Auth Me", True, f"User data retrieved successfully for {data.get('email')}")
                    return True
                else:
                    self.log_test("Auth Me", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_test("Auth Me", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Auth Me", False, f"Exception: {str(e)}")
            return False
    
    # ===================== PROFILE MANAGEMENT TESTS =====================
    
    def test_profile_update_unique_nickname(self):
        """Test 4: Profile Update with Unique Nickname Enforcement"""
        if not self.user1_token or not self.user2_token:
            self.log_test("Profile Unique Nickname", False, "Missing user tokens")
            return False
            
        try:
            # Set displayName for user1
            headers1 = {"Authorization": f"Bearer {self.user1_token}"}
            profile_data = {
                "displayName": "SarahJ2024",
                "bio": "Love solving everyday problems!",
                "city": "San Francisco",
                "showCity": True
            }
            
            response = requests.put(f"{BACKEND_URL}/users/me/profile", json=profile_data, headers=headers1)
            
            if response.status_code == 200:
                self.log_test("Profile Update - User1", True, "Profile updated successfully")
                
                # Now try to set the same name (different case) for user2 - should fail with 409
                headers2 = {"Authorization": f"Bearer {self.user2_token}"}
                duplicate_profile = {
                    "displayName": "sarahj2024",  # Same name, different case
                    "bio": "Trying to steal a name",
                    "city": "New York"
                }
                
                response2 = requests.put(f"{BACKEND_URL}/users/me/profile", json=duplicate_profile, headers=headers2)
                
                if response2.status_code == 409:
                    self.log_test("Profile Unique Nickname - Conflict", True, "Duplicate nickname correctly rejected with 409")
                    
                    # Try with uppercase version too
                    duplicate_profile["displayName"] = "SARAHJ2024"
                    response3 = requests.put(f"{BACKEND_URL}/users/me/profile", json=duplicate_profile, headers=headers2)
                    
                    if response3.status_code == 409:
                        self.log_test("Profile Unique Nickname - Case Insensitive", True, "Case-insensitive duplicate correctly rejected")
                        return True
                    else:
                        self.log_test("Profile Unique Nickname - Case Insensitive", False, f"Expected 409, got {response3.status_code}")
                        return False
                else:
                    self.log_test("Profile Unique Nickname - Conflict", False, f"Expected 409, got {response2.status_code}")
                    return False
            else:
                self.log_test("Profile Update - User1", False, f"Profile update failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Profile Unique Nickname", False, f"Exception: {str(e)}")
            return False
    
    def test_avatar_upload_base64(self):
        """Test 5: Avatar Upload (Base64)"""
        if not self.user1_token:
            self.log_test("Avatar Upload", False, "No user token available")
            return False
            
        try:
            # Create a small test image (1x1 pixel PNG in base64)
            small_png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            
            headers = {"Authorization": f"Bearer {self.user1_token}"}
            avatar_data = {
                "image": small_png_base64,
                "mimeType": "image/png"
            }
            
            response = requests.post(f"{BACKEND_URL}/users/me/avatar-base64", json=avatar_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "url" in data and "message" in data:
                    self.log_test("Avatar Upload", True, f"Avatar uploaded successfully: {data.get('url')}")
                    return True
                else:
                    self.log_test("Avatar Upload", False, "Response missing url or message", data)
                    return False
            else:
                self.log_test("Avatar Upload", False, f"Upload failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Avatar Upload", False, f"Exception: {str(e)}")
            return False
    
    # ===================== PROBLEMS (FRIKTS) CRUD TESTS =====================
    
    def test_create_problem(self):
        """Test 6: Create Problem (Frikt)"""
        if not self.user1_token:
            self.log_test("Create Problem", False, "No user token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user1_token}"}
            problem_data = {
                "title": "My coffee shop always runs out of oat milk by 10am and I need my morning latte",
                "category_id": "services",
                "frequency": "daily",
                "pain_level": 4,
                "willing_to_pay": "$1-10",
                "when_happens": "Every morning around 9:30am",
                "who_affected": "Coffee lovers like me",
                "what_tried": "Asked them to stock more, but they say it expires too quickly"
            }
            
            response = requests.post(f"{BACKEND_URL}/problems", json=problem_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "title" in data:
                    self.test_problem_id = data.get("id")
                    self.log_test("Create Problem", True, f"Problem created successfully: {data.get('title')[:50]}...")
                    return True
                else:
                    self.log_test("Create Problem", False, "Response missing id or title", data)
                    return False
            else:
                self.log_test("Create Problem", False, f"Creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Problem", False, f"Exception: {str(e)}")
            return False
    
    def test_get_problems_feeds(self):
        """Test 7: Get Problems Feed (New/Trending/ForYou)"""
        try:
            # Test NEW feed
            response = requests.get(f"{BACKEND_URL}/problems?feed=new")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Problems Feed - New", True, f"NEW feed returned {len(data)} problems")
                    
                    # Verify sorting by created_at desc (newest first)
                    if len(data) > 1:
                        dates = [item.get("created_at") for item in data if item.get("created_at")]
                        if dates == sorted(dates, reverse=True):
                            self.log_test("Problems Feed - New Sorting", True, "NEW feed correctly sorted by created_at desc")
                        else:
                            self.log_test("Problems Feed - New Sorting", False, "NEW feed not sorted correctly")
                else:
                    self.log_test("Problems Feed - New", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Problems Feed - New", False, f"NEW feed failed: {response.status_code} - {response.text}")
                return False
            
            # Test TRENDING feed
            response = requests.get(f"{BACKEND_URL}/problems?feed=trending")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Problems Feed - Trending", True, f"TRENDING feed returned {len(data)} problems")
                else:
                    self.log_test("Problems Feed - Trending", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Problems Feed - Trending", False, f"TRENDING feed failed: {response.status_code} - {response.text}")
                return False
            
            # Test FORYOU feed
            headers = {"Authorization": f"Bearer {self.user1_token}"} if self.user1_token else {}
            response = requests.get(f"{BACKEND_URL}/problems?feed=foryou", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Problems Feed - ForYou", True, f"FORYOU feed returned {len(data)} problems")
                    return True
                else:
                    self.log_test("Problems Feed - ForYou", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Problems Feed - ForYou", False, f"FORYOU feed failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Problems Feed", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_problem(self):
        """Test 8: Get Single Problem"""
        if not self.test_problem_id:
            self.log_test("Get Single Problem", False, "No test problem ID available")
            return False
            
        try:
            response = requests.get(f"{BACKEND_URL}/problems/{self.test_problem_id}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "title", "user_name", "category_name", "relates_count", "comments_count"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Get Single Problem", True, f"Problem retrieved: {data.get('title')[:50]}...")
                    return True
                else:
                    self.log_test("Get Single Problem", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_test("Get Single Problem", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Single Problem", False, f"Exception: {str(e)}")
            return False
    
    def test_edit_problem(self):
        """Test 9: Edit Problem"""
        if not self.test_problem_id or not self.user1_token:
            self.log_test("Edit Problem", False, "Missing problem ID or user token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user1_token}"}
            update_data = {
                "title": "My coffee shop ALWAYS runs out of oat milk by 10am and I desperately need my morning latte",
                "when_happens": "Every single morning around 9:30am without fail"
            }
            
            response = requests.patch(f"{BACKEND_URL}/problems/{self.test_problem_id}", json=update_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("title") == update_data["title"]:
                    self.log_test("Edit Problem - Owner", True, "Problem updated successfully by owner")
                    
                    # Test non-owner cannot edit (should get 403)
                    headers2 = {"Authorization": f"Bearer {self.user2_token}"}
                    response2 = requests.patch(f"{BACKEND_URL}/problems/{self.test_problem_id}", json={"title": "Hacked!"}, headers=headers2)
                    
                    if response2.status_code == 403:
                        self.log_test("Edit Problem - Non-Owner", True, "Non-owner correctly blocked with 403")
                        return True
                    else:
                        self.log_test("Edit Problem - Non-Owner", False, f"Expected 403, got {response2.status_code}")
                        return False
                else:
                    self.log_test("Edit Problem - Owner", False, "Title not updated correctly", data)
                    return False
            else:
                self.log_test("Edit Problem - Owner", False, f"Update failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Edit Problem", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_problem_permissions(self):
        """Test 10: Delete Problem Permissions (will create a new problem for this test)"""
        if not self.user1_token or not self.user2_token:
            self.log_test("Delete Problem", False, "Missing user tokens")
            return False
            
        try:
            # Create a new problem for deletion test
            headers1 = {"Authorization": f"Bearer {self.user1_token}"}
            problem_data = {
                "title": "Test problem for deletion - parking meters that don't accept cards",
                "category_id": "services"
            }
            
            response = requests.post(f"{BACKEND_URL}/problems", json=problem_data, headers=headers1)
            
            if response.status_code == 200:
                delete_problem_id = response.json().get("id")
                
                # Test non-owner cannot delete (should get 403)
                headers2 = {"Authorization": f"Bearer {self.user2_token}"}
                response2 = requests.delete(f"{BACKEND_URL}/problems/{delete_problem_id}", headers=headers2)
                
                if response2.status_code == 403:
                    self.log_test("Delete Problem - Non-Owner", True, "Non-owner correctly blocked with 403")
                    
                    # Test owner can delete
                    response3 = requests.delete(f"{BACKEND_URL}/problems/{delete_problem_id}", headers=headers1)
                    
                    if response3.status_code == 200:
                        self.log_test("Delete Problem - Owner", True, "Owner successfully deleted problem")
                        return True
                    else:
                        self.log_test("Delete Problem - Owner", False, f"Owner delete failed: {response3.status_code}")
                        return False
                else:
                    self.log_test("Delete Problem - Non-Owner", False, f"Expected 403, got {response2.status_code}")
                    return False
            else:
                self.log_test("Delete Problem", False, f"Failed to create test problem: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Delete Problem", False, f"Exception: {str(e)}")
            return False
    
    # ===================== ENGAGEMENT TESTS =====================
    
    def test_relate_to_problem(self):
        """Test 11: Relate to Problem"""
        if not self.test_problem_id or not self.user2_token:
            self.log_test("Relate to Problem", False, "Missing problem ID or user token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user2_token}"}
            response = requests.post(f"{BACKEND_URL}/problems/{self.test_problem_id}/relate", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "relates_count" in data and "signal_score" in data:
                    self.log_test("Relate to Problem", True, f"Related successfully, count: {data.get('relates_count')}")
                    
                    # Test duplicate relate (should fail)
                    response2 = requests.post(f"{BACKEND_URL}/problems/{self.test_problem_id}/relate", headers=headers)
                    
                    if response2.status_code == 400:
                        self.log_test("Relate Duplicate", True, "Duplicate relate correctly rejected")
                        return True
                    else:
                        self.log_test("Relate Duplicate", False, f"Expected 400, got {response2.status_code}")
                        return False
                else:
                    self.log_test("Relate to Problem", False, "Response missing relates_count or signal_score", data)
                    return False
            else:
                self.log_test("Relate to Problem", False, f"Relate failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Relate to Problem", False, f"Exception: {str(e)}")
            return False
    
    def test_comment_on_problem(self):
        """Test 12: Comment on Problem"""
        if not self.test_problem_id or not self.user2_token:
            self.log_test("Comment on Problem", False, "Missing problem ID or user token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user2_token}"}
            comment_data = {
                "problem_id": self.test_problem_id,
                "content": "I have the exact same problem! My local Starbucks is always out of oat milk too. Maybe we should suggest they partner with a local oat milk supplier?"
            }
            
            response = requests.post(f"{BACKEND_URL}/comments", json=comment_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "content" in data:
                    self.test_comment_id = data.get("id")
                    self.log_test("Comment on Problem", True, f"Comment added successfully: {data.get('content')[:50]}...")
                    return True
                else:
                    self.log_test("Comment on Problem", False, "Response missing id or content", data)
                    return False
            else:
                self.log_test("Comment on Problem", False, f"Comment failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Comment on Problem", False, f"Exception: {str(e)}")
            return False
    
    def test_get_comments(self):
        """Test 13: Get Comments"""
        if not self.test_problem_id:
            self.log_test("Get Comments", False, "No test problem ID available")
            return False
            
        try:
            response = requests.get(f"{BACKEND_URL}/problems/{self.test_problem_id}/comments")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    comment = data[0]
                    required_fields = ["id", "content", "user_name", "created_at"]
                    missing_fields = [field for field in required_fields if field not in comment]
                    
                    if not missing_fields:
                        self.log_test("Get Comments", True, f"Retrieved {len(data)} comments successfully")
                        return True
                    else:
                        self.log_test("Get Comments", False, f"Comment missing fields: {missing_fields}", comment)
                        return False
                else:
                    self.log_test("Get Comments", True, "No comments found (empty list)")
                    return True
            else:
                self.log_test("Get Comments", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Comments", False, f"Exception: {str(e)}")
            return False
    
    def test_save_unsave_problem(self):
        """Test 14: Save/Unsave Problem"""
        if not self.test_problem_id or not self.user2_token:
            self.log_test("Save Problem", False, "Missing problem ID or user token")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.user2_token}"}
            
            # Test save
            response = requests.post(f"{BACKEND_URL}/problems/{self.test_problem_id}/save", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("saved") == True:
                    self.log_test("Save Problem", True, "Problem saved successfully")
                    
                    # Test unsave
                    response2 = requests.delete(f"{BACKEND_URL}/problems/{self.test_problem_id}/save", headers=headers)
                    
                    if response2.status_code == 200:
                        data2 = response2.json()
                        if data2.get("saved") == False:
                            self.log_test("Unsave Problem", True, "Problem unsaved successfully")
                            return True
                        else:
                            self.log_test("Unsave Problem", False, "Unsave response incorrect", data2)
                            return False
                    else:
                        self.log_test("Unsave Problem", False, f"Unsave failed: {response2.status_code}")
                        return False
                else:
                    self.log_test("Save Problem", False, "Save response incorrect", data)
                    return False
            else:
                self.log_test("Save Problem", False, f"Save failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Save Problem", False, f"Exception: {str(e)}")
            return False
    
    # ===================== CATEGORIES TEST =====================
    
    def test_get_categories(self):
        """Test 15: Get Categories"""
        try:
            response = requests.get(f"{BACKEND_URL}/categories")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    expected_categories = ["money", "work", "health", "home", "tech", "school", "relationships", "travel", "services"]
                    category_ids = [cat.get("id") for cat in data if cat.get("id")]
                    
                    missing_categories = [cat for cat in expected_categories if cat not in category_ids]
                    
                    if not missing_categories:
                        self.log_test("Get Categories", True, f"All {len(data)} expected categories found")
                        return True
                    else:
                        self.log_test("Get Categories", False, f"Missing categories: {missing_categories}")
                        return False
                else:
                    self.log_test("Get Categories", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Get Categories", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Get Categories", False, f"Exception: {str(e)}")
            return False
    
    # ===================== ADMIN TESTS =====================
    
    def test_admin_analytics_with_signal_breakdown(self):
        """Test 16: Admin Analytics with Signal Breakdown"""
        if not self.admin_token:
            self.log_test("Admin Analytics", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/analytics", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["users", "problems", "comments"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    # Check for signal formula and breakdown
                    if "signal_formula" in data:
                        self.log_test("Admin Analytics - Signal Formula", True, f"Signal formula included: {data.get('signal_formula')}")
                        
                        # Check for signal breakdown in top problems
                        if "top_problems" in data and len(data["top_problems"]) > 0:
                            first_problem = data["top_problems"][0]
                            if "signal_breakdown" in first_problem:
                                self.log_test("Admin Analytics - Signal Breakdown", True, "Signal breakdown included for top problems")
                                
                                # Check DAU/WAU definitions
                                users_data = data.get("users", {})
                                if "dau" in users_data and "wau" in users_data:
                                    self.log_test("Admin Analytics - DAU/WAU", True, f"DAU: {users_data.get('dau')}, WAU: {users_data.get('wau')}")
                                    return True
                                else:
                                    self.log_test("Admin Analytics - DAU/WAU", False, "Missing DAU/WAU data")
                                    return False
                            else:
                                self.log_test("Admin Analytics - Signal Breakdown", False, "Missing signal_breakdown in top_problems")
                                return False
                        else:
                            self.log_test("Admin Analytics - Signal Breakdown", True, "No top problems to show breakdown (empty list)")
                            
                            # Check DAU/WAU definitions anyway
                            users_data = data.get("users", {})
                            if "dau" in users_data and "wau" in users_data:
                                self.log_test("Admin Analytics - DAU/WAU", True, f"DAU: {users_data.get('dau')}, WAU: {users_data.get('wau')}")
                                return True
                            else:
                                self.log_test("Admin Analytics - DAU/WAU", False, "Missing DAU/WAU data")
                                return False
                    else:
                        self.log_test("Admin Analytics - Signal Formula", False, "Missing signal_formula")
                        return False
                else:
                    self.log_test("Admin Analytics", False, f"Missing required fields: {missing_fields}", data)
                    return False
            else:
                self.log_test("Admin Analytics", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Analytics", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_users_management(self):
        """Test 17: Admin Users Management"""
        if not self.admin_token or not self.user1_id:
            self.log_test("Admin Users", False, "Missing admin token or user ID")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test GET /admin/users
            response = requests.get(f"{BACKEND_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "users" in data and "total" in data:
                    self.log_test("Admin Users - List", True, f"Retrieved {data.get('total')} users")
                    
                    # Test ban user
                    ban_response = requests.post(f"{BACKEND_URL}/admin/users/{self.user1_id}/ban", headers=headers)
                    
                    if ban_response.status_code == 200:
                        self.log_test("Admin Users - Ban", True, "User banned successfully")
                        
                        # Test unban user
                        unban_response = requests.post(f"{BACKEND_URL}/admin/users/{self.user1_id}/unban", headers=headers)
                        
                        if unban_response.status_code == 200:
                            self.log_test("Admin Users - Unban", True, "User unbanned successfully")
                            return True
                        else:
                            self.log_test("Admin Users - Unban", False, f"Unban failed: {unban_response.status_code}")
                            return False
                    else:
                        self.log_test("Admin Users - Ban", False, f"Ban failed: {ban_response.status_code}")
                        return False
                else:
                    self.log_test("Admin Users - List", False, "Response missing users or total", data)
                    return False
            else:
                self.log_test("Admin Users", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Users", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_reports(self):
        """Test 18: Admin Reports"""
        if not self.admin_token:
            self.log_test("Admin Reports", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/reports", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "reports" in data and "total" in data:
                    self.log_test("Admin Reports", True, f"Retrieved {data.get('total')} reports")
                    return True
                else:
                    self.log_test("Admin Reports", False, "Response missing reports or total", data)
                    return False
            else:
                self.log_test("Admin Reports", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Reports", False, f"Exception: {str(e)}")
            return False
    
    def test_admin_audit_log(self):
        """Test 19: Admin Audit Log"""
        if not self.admin_token:
            self.log_test("Admin Audit Log", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{BACKEND_URL}/admin/audit-log", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if "logs" in data and "total" in data:
                    self.log_test("Admin Audit Log", True, f"Retrieved {data.get('total')} audit log entries")
                    return True
                else:
                    self.log_test("Admin Audit Log", False, "Response missing logs or total", data)
                    return False
            else:
                self.log_test("Admin Audit Log", False, f"Request failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Audit Log", False, f"Exception: {str(e)}")
            return False
    
    # ===================== ERROR HANDLING TESTS =====================
    
    def test_error_handling(self):
        """Test 20: Error Handling (401, 403, 404, 409)"""
        try:
            # Test 401 - Unauthenticated request to protected endpoint
            response = requests.get(f"{BACKEND_URL}/auth/me")
            
            if response.status_code == 401:
                self.log_test("Error Handling - 401", True, "Unauthenticated request correctly returns 401")
            else:
                self.log_test("Error Handling - 401", False, f"Expected 401, got {response.status_code}")
                return False
            
            # Test 403 - Non-admin accessing admin endpoint
            if self.user1_token:
                headers = {"Authorization": f"Bearer {self.user1_token}"}
                response = requests.get(f"{BACKEND_URL}/admin/analytics", headers=headers)
                
                if response.status_code == 403:
                    self.log_test("Error Handling - 403", True, "Non-admin correctly blocked with 403")
                else:
                    self.log_test("Error Handling - 403", False, f"Expected 403, got {response.status_code}")
                    return False
            
            # Test 404 - Non-existent problem ID
            fake_id = "nonexistent-problem-id-12345"
            response = requests.get(f"{BACKEND_URL}/problems/{fake_id}")
            
            if response.status_code == 404:
                self.log_test("Error Handling - 404", True, "Non-existent problem correctly returns 404")
                return True
            else:
                self.log_test("Error Handling - 404", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")
            return False
    
    # ===================== MAIN TEST RUNNER =====================
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("FRIKT BACKEND API COMPREHENSIVE TESTING - APPSTORE READINESS")
        print("=" * 80)
        
        tests = [
            self.test_auth_register,
            self.test_auth_login,
            self.test_auth_me,
            self.test_profile_update_unique_nickname,
            self.test_avatar_upload_base64,
            self.test_create_problem,
            self.test_get_problems_feeds,
            self.test_get_single_problem,
            self.test_edit_problem,
            self.test_delete_problem_permissions,
            self.test_relate_to_problem,
            self.test_comment_on_problem,
            self.test_get_comments,
            self.test_save_unsave_problem,
            self.test_get_categories,
            self.test_admin_analytics_with_signal_breakdown,
            self.test_admin_users_management,
            self.test_admin_reports,
            self.test_admin_audit_log,
            self.test_error_handling
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        print("=" * 80)
        print(f"FINAL RESULTS: {passed}/{total} tests passed")
        print("=" * 80)
        
        # Print summary of failed tests
        failed_tests = [result for result in self.test_results if not result["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS SUMMARY:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        else:
            print("\n✅ ALL TESTS PASSED - READY FOR APPSTORE!")
        
        return passed == total

if __name__ == "__main__":
    tester = FRIKTTester()
    success = tester.run_all_tests()
    
    # Save detailed results to file
    with open("/app/comprehensive_test_results.json", "w") as f:
        json.dump(tester.test_results, f, indent=2)
    
    sys.exit(0 if success else 1)