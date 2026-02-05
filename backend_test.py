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
BACKEND_URL = "https://pathgro-admin.preview.emergentagent.com/api"

class PathGroTester:
    def __init__(self):
        self.admin_token = None
        self.user_token = None
        self.admin_user_id = None
        self.regular_user_id = None
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
            # Register admin user
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
                # Check if user already exists
                if response.status_code == 400 and "already registered" in response.text:
                    # Try to login instead
                    login_data = {
                        "email": "karolisbudreckas92@gmail.com",
                        "password": "adminpass123"
                    }
                    login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                    if login_response.status_code == 200:
                        data = login_response.json()
                        if data.get("user", {}).get("role") == "admin":
                            self.admin_token = data.get("access_token")
                            self.admin_user_id = data.get("user", {}).get("id")
                            self.log_test("Admin Registration", True, "Admin user already exists and logged in successfully with admin role")
                            return True
                        else:
                            self.log_test("Admin Registration", False, f"Existing user role is '{data.get('user', {}).get('role')}', expected 'admin'", data)
                            return False
                    else:
                        self.log_test("Admin Registration", False, f"Failed to login existing admin user: {login_response.status_code}", login_response.text)
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
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("PathGro Backend Admin API Testing")
        print("=" * 60)
        
        tests = [
            self.test_admin_registration,
            self.test_regular_user_registration,
            self.test_admin_analytics,
            self.test_admin_reports,
            self.test_admin_user_management,
            self.test_admin_audit_log,
            self.test_security_non_admin_access
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