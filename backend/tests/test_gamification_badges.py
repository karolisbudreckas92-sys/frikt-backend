"""
Gamification System Tests for FRIKT App

Tests for 45-badge system including:
- Badge definitions endpoint
- User badge status with unlocked/locked badges
- Visit streak tracking
- Creator badges (posting)
- Relater badges (relating to posts)
- Commenter badges (commenting)
- Explorer badges (opening frikts)
- Category specialist badges
- Social impact badges
- Viral badges (Drama Influencer, Universal Problem)
- Special milestones (OG Member, Early Frikter, Nosey Neighbor)
- Self-relate prevention
"""

import pytest
import requests
import os
import time
import uuid

# Get base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://frikt-quality.preview.emergentagent.com')

# Test accounts that should be excluded from OG badges
TEST_ACCOUNTS = ["velvetcrumb", "noxloop", "graydrizzle", "toastedblip", "cuatropatas", "eleclerk", "driftmoss"]


class TestBadgeDefinitions:
    """Tests for GET /api/badges/definitions endpoint"""
    
    def test_get_badge_definitions_returns_45_badges(self):
        """Verify all 45 badge definitions are returned"""
        response = requests.get(f"{BASE_URL}/api/badges/definitions")
        assert response.status_code == 200
        data = response.json()
        
        assert "badges" in data
        badges = data["badges"]
        assert len(badges) == 45, f"Expected 45 badges, got {len(badges)}"
        print(f"✓ GET /api/badges/definitions returns 45 badges")
    
    def test_badge_definitions_structure(self):
        """Verify badge definition structure"""
        response = requests.get(f"{BASE_URL}/api/badges/definitions")
        assert response.status_code == 200
        data = response.json()
        
        # Check structure of first badge
        badge = data["badges"][0]
        assert "badge_id" in badge
        assert "name" in badge
        assert "icon" in badge
        assert "category" in badge
        assert "threshold" in badge
        assert "requirement" in badge
        assert "hidden" in badge
        print(f"✓ Badge definition structure is correct")
    
    def test_badge_categories_count(self):
        """Verify badge counts per category"""
        response = requests.get(f"{BASE_URL}/api/badges/definitions")
        data = response.json()
        badges = data["badges"]
        
        categories = {}
        for badge in badges:
            cat = badge["category"]
            categories[cat] = categories.get(cat, 0) + 1
        
        # Expected counts: 5 streak, 3 explorer, 5 relater, 5 creator (including 2 viral),
        # 3 commenter, 3 impact, 3 special, 18 category_specialist
        assert categories.get("streak", 0) == 5, f"Expected 5 streak badges, got {categories.get('streak', 0)}"
        assert categories.get("explorer", 0) == 3, f"Expected 3 explorer badges"
        assert categories.get("relater", 0) == 5, f"Expected 5 relater badges"
        assert categories.get("creator", 0) == 3, f"Expected 3 creator badges (excl. viral)"
        assert categories.get("commenter", 0) == 3, f"Expected 3 commenter badges"
        assert categories.get("impact", 0) == 3, f"Expected 3 impact badges"
        assert categories.get("viral", 0) == 2, f"Expected 2 viral badges"
        assert categories.get("special", 0) == 3, f"Expected 3 special badges"
        assert categories.get("category_specialist", 0) == 18, f"Expected 18 category badges (9 categories × 2)"
        print(f"✓ Badge category counts are correct: {categories}")
    
    def test_hidden_badges_marked_correctly(self):
        """Verify viral badges are marked as hidden"""
        response = requests.get(f"{BASE_URL}/api/badges/definitions")
        data = response.json()
        
        hidden_badges = [b for b in data["badges"] if b["hidden"]]
        hidden_ids = {b["badge_id"] for b in hidden_badges}
        
        assert "drama_influencer" in hidden_ids, "drama_influencer should be hidden"
        assert "universal_problem" in hidden_ids, "universal_problem should be hidden"
        assert len(hidden_badges) == 2, f"Expected only 2 hidden badges, got {len(hidden_badges)}"
        print(f"✓ Hidden badges: drama_influencer, universal_problem")


class TestUserBadgeStatus:
    """Tests for GET /api/users/me/badges endpoint"""
    
    @pytest.fixture
    def new_user(self):
        """Create a fresh test user and return token"""
        timestamp = int(time.time() * 1000)
        email = f"test_badge_{timestamp}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": f"TestBadge{timestamp}",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"],
            "email": email
        }
    
    def test_get_my_badges_requires_auth(self):
        """Verify authentication is required"""
        response = requests.get(f"{BASE_URL}/api/users/me/badges")
        assert response.status_code in [401, 403]
        print(f"✓ GET /api/users/me/badges requires authentication")
    
    def test_new_user_has_special_date_badges(self, new_user):
        """New user should have OG Member and Early Frikter badges (before cutoff dates)"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        # Track visit to trigger special badge check
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        
        response = requests.get(f"{BASE_URL}/api/users/me/badges", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        unlocked_ids = {b["badge_id"] for b in data["unlocked"]}
        
        # Both date-based badges should be awarded (test is running before June 2026)
        assert "og_member" in unlocked_ids or "early_frikter" in unlocked_ids, \
            f"Expected at least one date badge, got: {unlocked_ids}"
        print(f"✓ New user has date-based badges: {unlocked_ids}")
    
    def test_badge_progress_shown_for_controllable_badges(self, new_user):
        """Progress should be shown for badges user can control"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        # Track visit first
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        
        response = requests.get(f"{BASE_URL}/api/users/me/badges", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Find streak badges - should have progress
        streak_badges = [b for b in data["locked"] if b["category"] == "streak"]
        for badge in streak_badges:
            assert "progress" in badge and badge["progress"] is not None, \
                f"Streak badge {badge['badge_id']} should have progress"
            assert "current" in badge["progress"] and "target" in badge["progress"]
        
        # Impact badges should NOT have progress (depends on others)
        impact_badges = [b for b in data["locked"] if b["category"] == "impact"]
        for badge in impact_badges:
            assert badge.get("progress") is None, \
                f"Impact badge {badge['badge_id']} should NOT show progress"
        
        print(f"✓ Badge progress shown correctly for controllable badges")
    
    def test_hidden_badges_not_in_locked_list(self, new_user):
        """Hidden badges should not appear in locked list"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/users/me/badges", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        locked_ids = {b["badge_id"] for b in data["locked"]}
        
        assert "drama_influencer" not in locked_ids, "drama_influencer should be hidden"
        assert "universal_problem" not in locked_ids, "universal_problem should be hidden"
        print(f"✓ Hidden badges not shown in locked list")


class TestVisitStreak:
    """Tests for POST /api/users/me/visit endpoint"""
    
    @pytest.fixture
    def new_user(self):
        timestamp = int(time.time() * 1000)
        email = f"test_visit_{timestamp}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": f"TestVisit{timestamp}",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        return {
            "token": data["access_token"],
            "user_id": data["user"]["id"]
        }
    
    def test_track_visit_increments_streak(self, new_user):
        """First visit should set streak to 1"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert data["stats"]["current_visit_streak"] == 1
        assert data["is_qualifying_visit"] == True
        print(f"✓ First visit sets streak to 1")
    
    def test_second_visit_same_day_no_change(self, new_user):
        """Second visit same day should not change streak"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        # First visit
        response1 = requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        streak1 = response1.json()["stats"]["current_visit_streak"]
        
        # Second visit same day
        response2 = requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        streak2 = response2.json()["stats"]["current_visit_streak"]
        qualifying2 = response2.json()["is_qualifying_visit"]
        
        assert streak1 == streak2, "Streak should not change on same day"
        assert qualifying2 == False, "Second visit same day is not qualifying"
        print(f"✓ Same-day visit does not change streak")
    
    def test_visit_returns_newly_awarded_badges(self, new_user):
        """Visit should return newly_awarded_badges"""
        headers = {"Authorization": f"Bearer {new_user['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "newly_awarded_badges" in data
        assert isinstance(data["newly_awarded_badges"], list)
        print(f"✓ Visit returns newly_awarded_badges field")


class TestCreatorBadges:
    """Tests for POST /api/problems - creator badge awards"""
    
    @pytest.fixture
    def auth_headers(self):
        timestamp = int(time.time() * 1000)
        email = f"test_creator_{timestamp}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "name": f"TestCreator{timestamp}",
            "password": "TestPassword123!"
        })
        assert response.status_code == 200
        data = response.json()
        return {"Authorization": f"Bearer {data['access_token']}"}
    
    def test_first_post_awards_creator_badge(self, auth_headers):
        """First post should award 'First Vent' badge (creator_1)"""
        # Track visit first
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=auth_headers)
        
        response = requests.post(f"{BASE_URL}/api/problems", headers=auth_headers, json={
            "title": "This is my first test problem to earn creator badge",
            "category_id": "tech"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "newly_awarded_badges" in data
        badge_ids = [b["badge_id"] for b in data["newly_awarded_badges"]]
        
        assert "creator_1" in badge_ids, f"Expected creator_1 badge, got: {badge_ids}"
        print(f"✓ First post awards creator_1 (First Vent) badge")
    
    def test_post_awards_category_badge(self, auth_headers):
        """Post in category should award category apprentice badge"""
        # Track visit first
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=auth_headers)
        
        response = requests.post(f"{BASE_URL}/api/problems", headers=auth_headers, json={
            "title": "This is a test problem in the money category for badges",
            "category_id": "money"
        })
        assert response.status_code == 200
        data = response.json()
        
        badge_ids = [b["badge_id"] for b in data["newly_awarded_badges"]]
        
        assert "category_money_apprentice" in badge_ids, \
            f"Expected category_money_apprentice, got: {badge_ids}"
        print(f"✓ Post in money category awards category_money_apprentice badge")


class TestRelaterBadges:
    """Tests for POST /api/problems/{id}/relate - relater badge awards"""
    
    @pytest.fixture
    def two_users(self):
        """Create two users - one to post, one to relate"""
        timestamp = int(time.time() * 1000)
        
        # User 1 (poster)
        resp1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"poster_{timestamp}@test.com",
            "name": f"Poster{timestamp}",
            "password": "TestPassword123!"
        })
        user1 = {"token": resp1.json()["access_token"], "id": resp1.json()["user"]["id"]}
        
        # User 2 (relater)
        resp2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"relater_{timestamp}@test.com",
            "name": f"Relater{timestamp}",
            "password": "TestPassword123!"
        })
        user2 = {"token": resp2.json()["access_token"], "id": resp2.json()["user"]["id"]}
        
        return {"poster": user1, "relater": user2}
    
    def test_first_relate_awards_relater_badge(self, two_users):
        """First relate should award 'Not Alone' badge (relater_1)"""
        poster_headers = {"Authorization": f"Bearer {two_users['poster']['token']}"}
        relater_headers = {"Authorization": f"Bearer {two_users['relater']['token']}"}
        
        # Create a problem
        post_resp = requests.post(f"{BASE_URL}/api/problems", headers=poster_headers, json={
            "title": "This is a test problem for relate badge testing",
            "category_id": "work"
        })
        problem_id = post_resp.json()["id"]
        
        # Track visit for relater
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=relater_headers)
        
        # Relate to the problem
        relate_resp = requests.post(
            f"{BASE_URL}/api/problems/{problem_id}/relate",
            headers=relater_headers
        )
        assert relate_resp.status_code == 200
        data = relate_resp.json()
        
        badge_ids = [b["badge_id"] for b in data.get("newly_awarded_badges", [])]
        assert "relater_1" in badge_ids, f"Expected relater_1 badge, got: {badge_ids}"
        print(f"✓ First relate awards relater_1 (Not Alone) badge")
    
    def test_self_relate_prevented(self, two_users):
        """User should not be able to relate to their own post"""
        poster_headers = {"Authorization": f"Bearer {two_users['poster']['token']}"}
        
        # Create a problem
        post_resp = requests.post(f"{BASE_URL}/api/problems", headers=poster_headers, json={
            "title": "This is my own test problem for self-relate test",
            "category_id": "health"
        })
        problem_id = post_resp.json()["id"]
        
        # Try to relate to own problem
        relate_resp = requests.post(
            f"{BASE_URL}/api/problems/{problem_id}/relate",
            headers=poster_headers
        )
        assert relate_resp.status_code == 400
        assert "Cannot relate to your own post" in relate_resp.json().get("detail", "")
        print(f"✓ Self-relates are prevented")


class TestCommenterBadges:
    """Tests for POST /api/comments - commenter badge awards"""
    
    @pytest.fixture
    def user_with_problem(self):
        timestamp = int(time.time() * 1000)
        
        # Create a user
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"commenter_{timestamp}@test.com",
            "name": f"Commenter{timestamp}",
            "password": "TestPassword123!"
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Track visit
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        
        # Create a problem to comment on
        post_resp = requests.post(f"{BASE_URL}/api/problems", headers=headers, json={
            "title": "This is a test problem for comment testing badges",
            "category_id": "school"
        })
        
        return {"token": token, "problem_id": post_resp.json()["id"]}
    
    def test_first_comment_awards_commenter_badge(self, user_with_problem):
        """First comment should award 'Helpful Stranger' badge (commenter_1)"""
        headers = {"Authorization": f"Bearer {user_with_problem['token']}"}
        
        response = requests.post(f"{BASE_URL}/api/comments", headers=headers, json={
            "problem_id": user_with_problem["problem_id"],
            "content": "This is my first comment to test the commenter badge system!"
        })
        assert response.status_code == 200
        data = response.json()
        
        badge_ids = [b["badge_id"] for b in data.get("newly_awarded_badges", [])]
        assert "commenter_1" in badge_ids, f"Expected commenter_1 badge, got: {badge_ids}"
        print(f"✓ First comment awards commenter_1 (Helpful Stranger) badge")


class TestExplorerBadges:
    """Tests for GET /api/problems/{id} - explorer badge awards"""
    
    @pytest.fixture
    def explorer_setup(self):
        timestamp = int(time.time() * 1000)
        
        # Create poster
        resp1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"poster_exp_{timestamp}@test.com",
            "name": f"Poster{timestamp}",
            "password": "TestPassword123!"
        })
        poster_token = resp1.json()["access_token"]
        poster_headers = {"Authorization": f"Bearer {poster_token}"}
        
        # Create explorer
        resp2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"explorer_{timestamp}@test.com",
            "name": f"Explorer{timestamp}",
            "password": "TestPassword123!"
        })
        explorer_token = resp2.json()["access_token"]
        explorer_headers = {"Authorization": f"Bearer {explorer_token}"}
        
        # Track visit for explorer
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=explorer_headers)
        
        # Create multiple problems
        problem_ids = []
        for i in range(4):
            resp = requests.post(f"{BASE_URL}/api/problems", headers=poster_headers, json={
                "title": f"Test problem number {i+1} for explorer badge testing",
                "category_id": "travel"
            })
            problem_ids.append(resp.json()["id"])
        
        return {
            "explorer_token": explorer_token,
            "problem_ids": problem_ids
        }
    
    def test_viewing_problems_awards_explorer_badge(self, explorer_setup):
        """Viewing 3 problems should award 'Curious Human' badge (explorer_3)"""
        headers = {"Authorization": f"Bearer {explorer_setup['explorer_token']}"}
        
        # View 3 problems
        all_badges = []
        for problem_id in explorer_setup["problem_ids"][:3]:
            resp = requests.get(f"{BASE_URL}/api/problems/{problem_id}", headers=headers)
            assert resp.status_code == 200
            badges = resp.json().get("newly_awarded_badges", [])
            all_badges.extend([b["badge_id"] for b in badges])
        
        assert "explorer_3" in all_badges, f"Expected explorer_3 badge after viewing 3 problems, got: {all_badges}"
        print(f"✓ Viewing 3 Frikts awards explorer_3 (Curious Human) badge")


class TestFollowUserBadge:
    """Tests for POST /api/users/{user_id}/follow - Nosey Neighbor badge"""
    
    @pytest.fixture
    def follower_setup(self):
        timestamp = int(time.time() * 1000)
        
        # Create follower
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"follower_{timestamp}@test.com",
            "name": f"Follower{timestamp}",
            "password": "TestPassword123!"
        })
        follower_token = resp.json()["access_token"]
        
        # Track visit
        requests.post(f"{BASE_URL}/api/users/me/visit", 
                     headers={"Authorization": f"Bearer {follower_token}"})
        
        # Create 5 users to follow
        user_ids = []
        for i in range(5):
            resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": f"target_{timestamp}_{i}@test.com",
                "name": f"Target{timestamp}{i}",
                "password": "TestPassword123!"
            })
            user_ids.append(resp.json()["user"]["id"])
        
        return {"follower_token": follower_token, "user_ids": user_ids}
    
    def test_following_5_users_awards_nosey_neighbor(self, follower_setup):
        """Following 5 users should award 'Nosey Neighbor' badge (follow_5)"""
        headers = {"Authorization": f"Bearer {follower_setup['follower_token']}"}
        
        all_badges = []
        for user_id in follower_setup["user_ids"]:
            resp = requests.post(f"{BASE_URL}/api/users/{user_id}/follow", headers=headers)
            assert resp.status_code == 200
            badges = resp.json().get("newly_awarded_badges", [])
            all_badges.extend([b["badge_id"] for b in badges])
        
        assert "follow_5" in all_badges, f"Expected follow_5 badge after following 5 users, got: {all_badges}"
        print(f"✓ Following 5 users awards follow_5 (Nosey Neighbor) badge")


class TestCategoryBadges:
    """Tests for category specialist badges"""
    
    @pytest.fixture
    def category_user(self):
        timestamp = int(time.time() * 1000)
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"category_test_{timestamp}@test.com",
            "name": f"CategoryTest{timestamp}",
            "password": "TestPassword123!"
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Track visit
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        
        return headers
    
    def test_posting_in_different_categories(self, category_user):
        """Posting in different categories should award respective apprentice badges"""
        categories_to_test = ["money", "work", "health"]
        
        for category in categories_to_test:
            resp = requests.post(f"{BASE_URL}/api/problems", headers=category_user, json={
                "title": f"This is a test problem in {category} category for badge test",
                "category_id": category
            })
            assert resp.status_code == 200
            badges = resp.json().get("newly_awarded_badges", [])
            badge_ids = [b["badge_id"] for b in badges]
            
            expected_badge = f"category_{category}_apprentice"
            assert expected_badge in badge_ids, \
                f"Expected {expected_badge} when posting in {category}, got: {badge_ids}"
        
        print(f"✓ Category apprentice badges awarded for: {categories_to_test}")
    
    def test_category_badges_only_shown_when_posted(self, category_user):
        """Category badges should only appear in locked list after posting in that category"""
        # First, check badges before any posts in 'services' category
        resp = requests.get(f"{BASE_URL}/api/users/me/badges", headers=category_user)
        locked_ids = {b["badge_id"] for b in resp.json()["locked"]}
        
        # services badges should NOT be in locked list (user hasn't posted there)
        assert "category_services_apprentice" not in locked_ids, \
            "category_services_apprentice should not appear until user posts in services"
        
        # Now post in services
        requests.post(f"{BASE_URL}/api/problems", headers=category_user, json={
            "title": "This is a test problem in services category to test visibility",
            "category_id": "services"
        })
        
        # Check badges again - now services_master should appear in locked
        resp = requests.get(f"{BASE_URL}/api/users/me/badges", headers=category_user)
        data = resp.json()
        
        # Apprentice should be unlocked
        unlocked_ids = {b["badge_id"] for b in data["unlocked"]}
        assert "category_services_apprentice" in unlocked_ids
        
        # Master should now be in locked list
        locked_ids = {b["badge_id"] for b in data["locked"]}
        assert "category_services_master" in locked_ids, \
            "category_services_master should appear in locked after first post"
        
        print(f"✓ Category badges visibility rules work correctly")


class TestGamificationStats:
    """Tests for GET /api/users/me/gamification-stats endpoint"""
    
    def test_gamification_stats_returns_all_fields(self):
        """Gamification stats should return all tracking fields"""
        timestamp = int(time.time() * 1000)
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"stats_test_{timestamp}@test.com",
            "name": f"StatsTest{timestamp}",
            "password": "TestPassword123!"
        })
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Track visit first
        requests.post(f"{BASE_URL}/api/users/me/visit", headers=headers)
        
        response = requests.get(f"{BASE_URL}/api/users/me/gamification-stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields exist
        expected_fields = [
            "user_id", "total_posts", "total_relates_given", "total_relates_received",
            "total_comments", "total_frikts_opened", "users_followed",
            "current_visit_streak", "last_visit_date", "posts_per_category",
            "max_relates_on_single_post"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Gamification stats returns all expected fields")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
