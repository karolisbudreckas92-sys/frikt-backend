#!/usr/bin/env python3
"""
Simple Feedback API Test - Individual endpoint testing
"""
import requests
import json
import time

# Backend URL from frontend/.env
BACKEND_URL = "https://account-deletion-26.preview.emergentagent.com/api"

def test_auth_and_feedback():
    """Test feedback endpoints step by step"""
    
    print("1. Testing Admin Login...")
    # Login as admin
    admin_login = {
        "email": "karolisbudreckas92@gmail.com",
        "password": "Admin123!"
    }
    
    admin_response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login)
    print(f"Admin login status: {admin_response.status_code}")
    
    if admin_response.status_code != 200:
        print(f"Admin login failed: {admin_response.text}")
        return
    
    admin_data = admin_response.json()
    admin_token = admin_data.get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("✅ Admin logged in successfully")
    
    print("\n2. Testing Regular User Registration/Login...")
    # Register/login regular user
    user_data = {
        "name": "Test Feedback User",
        "email": "testfeedback@test.com",
        "password": "Test123!"
    }
    
    # Try registration first
    user_response = requests.post(f"{BACKEND_URL}/auth/register", json=user_data)
    
    if user_response.status_code == 200:
        print("✅ User registered successfully")
        user_token_data = user_response.json()
        user_token = user_token_data.get("access_token")
    elif user_response.status_code == 400 and "already registered" in user_response.text:
        # Try login
        login_data = {
            "email": "testfeedback@test.com", 
            "password": "Test123!"
        }
        login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        
        if login_response.status_code == 200:
            print("✅ User logged in successfully")
            user_token_data = login_response.json()
            user_token = user_token_data.get("access_token")
        else:
            print(f"❌ User login failed: {login_response.status_code} - {login_response.text}")
            return
    else:
        print(f"❌ User registration failed: {user_response.status_code} - {user_response.text}")
        return
    
    user_headers = {"Authorization": f"Bearer {user_token}"}
    
    print("\n3. Testing Feedback Submission...")
    # Submit feedback
    feedback_data = {
        "message": "This is test feedback for the app",
        "appVersion": "1.0.0"
    }
    
    feedback_response = requests.post(f"{BACKEND_URL}/feedback", json=feedback_data, headers=user_headers)
    print(f"Feedback submission status: {feedback_response.status_code}")
    
    if feedback_response.status_code == 200:
        feedback_result = feedback_response.json()
        print(f"✅ Feedback submitted successfully: {feedback_result}")
        feedback_id = feedback_result.get("id")
    else:
        print(f"❌ Feedback submission failed: {feedback_response.text}")
        return
    
    print("\n4. Testing Admin Feedback List...")
    # Get feedback list as admin
    list_response = requests.get(f"{BACKEND_URL}/admin/feedback", headers=admin_headers)
    print(f"Feedback list status: {list_response.status_code}")
    
    if list_response.status_code == 200:
        print("✅ Feedback list retrieved successfully")
        list_data = list_response.json()
        print(f"Feedback data structure: {json.dumps(list_data, indent=2, default=str)}")
        
        # Find our feedback
        found_feedback = None
        for fb in list_data.get("feedbacks", []):
            if fb.get("id") == feedback_id:
                found_feedback = fb
                break
        
        if found_feedback:
            print(f"✅ Found our feedback: is_read = {found_feedback.get('is_read')}")
        else:
            print("❌ Could not find our submitted feedback")
            return
        
    else:
        print(f"❌ Feedback list failed: {list_response.text}")
        return
    
    print("\n5. Testing Mark as Read...")
    # Mark as read
    read_response = requests.post(f"{BACKEND_URL}/admin/feedback/{feedback_id}/read", headers=admin_headers)
    print(f"Mark read status: {read_response.status_code}")
    
    if read_response.status_code == 200:
        read_data = read_response.json()
        print(f"✅ Mark as read successful: {read_data}")
    else:
        print(f"❌ Mark as read failed: {read_response.text}")
        return
    
    print("\n6. Testing Mark as Unread...")
    # Mark as unread
    unread_response = requests.post(f"{BACKEND_URL}/admin/feedback/{feedback_id}/unread", headers=admin_headers)
    print(f"Mark unread status: {unread_response.status_code}")
    
    if unread_response.status_code == 200:
        unread_data = unread_response.json()
        print(f"✅ Mark as unread successful: {unread_data}")
    else:
        print(f"❌ Mark as unread failed: {unread_response.text}")
        return
    
    print("\n7. Testing Delete Feedback...")
    # Delete feedback
    delete_response = requests.delete(f"{BACKEND_URL}/admin/feedback/{feedback_id}", headers=admin_headers)
    print(f"Delete status: {delete_response.status_code}")
    
    if delete_response.status_code == 200:
        delete_data = delete_response.json()
        print(f"✅ Delete successful: {delete_data}")
        print("\n🎉 ALL FEEDBACK TESTS PASSED!")
    else:
        print(f"❌ Delete failed: {delete_response.text}")

if __name__ == "__main__":
    test_auth_and_feedback()