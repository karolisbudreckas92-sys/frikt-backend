# FRIKT App - Product Requirements Document

## Overview
**App Name:** FRIKT  
**Core Promise:** "Share frictions. Find patterns."  
**Platform:** iOS (React Native/Expo) + FastAPI Backend  
**Database:** MongoDB Atlas  
**Hosting:** Railway (Backend)

## Brand Colors
- Background: #F6F3EE
- Dark bars: #2B2F36
- Red dot/Primary: #E4572E

## Deployment
- **Backend:** Railway (auto-deploys from `main` branch)
- **Database:** MongoDB Atlas
- **Mobile:** EAS CLI → TestFlight
- **Production URL:** https://frikt-backend-production.up.railway.app

## Implementation Status

### Core Features ✅
- [x] User authentication (login/register)
- [x] Home feed (For You, Trending, New)
- [x] Create/edit Frikts
- [x] Comments with suggestion chips
- [x] User profiles
- [x] User search
- [x] Admin panel with Feedback tab
- [x] Notifications settings

### UGC Compliance Features ✅ (Feb 17, 2026)
- [x] **Profile Settings Section**
  - Blocked Users row
  - Change Password row
  - Privacy Policy row
  - Terms & Conditions row
  - Legal footer
- [x] **Block Users**
  - Block from user profile menu
  - Confirmation modal
  - Mutual invisibility (both users hidden from each other)
- [x] **Blocked Users Screen**
  - List of blocked users
  - Unblock with confirmation
- [x] **Change Password**
  - Current password validation
  - New password (min 6 chars)
- [x] **Privacy Policy & Terms**
  - In-app WebView
  - URLs: pathgro.com/privacy-policy, pathgro.com/terms
- [x] **Report Users**
  - From user profile menu
  - Reason selection (Spam, Harassment, Hate, Sexual, Other)
- [x] **Report Frikts**
  - Flag icon in header
  - Reason selection modal
- [x] **Feed Filtering**
  - Blocked users hidden from feeds
  - Blocked users hidden from comments
  - Blocked users hidden from search

### App Store Compliance Features ✅ (Feb 20, 2026)
- [x] **Delete Account** (Apple Guideline 5.1.1(v))
  - DELETE /api/users/me endpoint
  - Permanently deletes all user data:
    - User record
    - Problems/posts
    - Comments
    - Relates
    - Notifications
    - Blocked user records
    - Reports
    - Push tokens
    - Notification settings
    - Feedback
  - Double confirmation dialog (native Alert.alert + web window.confirm)
  - Token invalidation after deletion
  - Located in Profile Settings section

### Gamification System ✅ (Mar 7, 2026)
- [x] **45 Total Badges (27 core + 18 category)**
  - Visit Streaks (5): Just Browsing, Hooked, Regular Visitor, Mayor of Frikt, I Love Problems
  - Explorer (3): Curious Human, Nosey, Rabbit Hole
  - Relater (5): Not Alone, Empathy Expert, Honorary Therapist, Community Pillar, Frikt Saint
  - Creator (5): First Vent, Professional Hater, Certified Complainer, Drama Influencer*, Universal Problem*
  - Commenter (3): Helpful Stranger, Conversation Starter, Internet Philosopher
  - Social Impact (3): You're Not Crazy, Relatable Pain, Everyone Feels This
  - Special (3): Nosey Neighbor, OG Member, Early Frikter
  - Category Specialists (18): Apprentice & Master for each of 9 categories
  - *Hidden badges revealed only when earned
- [x] **Profile Badges Section**
  - Horizontal scrollable badge grid
  - Unlocked badges with golden border
  - Locked badges with progress indicators
  - Tap for badge details modal
- [x] **Celebration Modal**
  - Confetti animation (native only)
  - Badge name and description
  - Queue system for multiple badges
- [x] **Gamification Tracking**
  - Visit streak with grace window (5 of 7 days)
  - Posts, relates, comments counters
  - Category-specific post tracking
  - User follows tracking
- [x] **Self-relate Prevention**
  - Users cannot relate to their own posts

### Bug Fixes
- [x] Fixed /users/me/posts "User not found" error (route ordering)
- [x] Removed "Test Notifications (Expo Go only)" button
- [x] Updated login logo to exact brand specs
- [x] **Timestamp Display** (Mar 7, 2026) - Created formatTimeAgo utility for consistent "about X ago" format using UTC timestamps
- [x] **Username Updates** (Mar 7, 2026) - Backend now fetches fresh usernames from user records instead of denormalized fields
- [x] **Comment Edit/Delete** (Mar 7, 2026) - Added PUT/DELETE /api/comments/{id} endpoints with owner-only restrictions
- [x] **Case-Sensitive Email** (Mar 8, 2026) - Fixed duplicate account creation with different email casing by normalizing to lowercase
- [x] **Whitespace Post Validation** (Mar 8, 2026) - Fixed whitespace-only posts bypassing min_length validation
- [x] **Notifications ObjectId** (Mar 8, 2026) - Fixed 500 error on /api/notifications by excluding MongoDB _id from response
- [x] **Password Reset Flow** (Mar 8, 2026) - Implemented complete password reset with 6-digit email codes via Resend

### Full Application Audit ✅ (Mar 8, 2026)
- Completed comprehensive 14-section audit of all features
- Tested 50+ endpoints and user flows
- See: /app/test_reports/full_audit_report.md

## API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### User Management
- `GET /api/users/me/posts` - Get current user's posts
- `GET /api/users/me/blocked` - Get blocked users list
- `POST /api/users/me/change-password` - Change password
- `DELETE /api/users/me` - **Delete account permanently** ✅ NEW
- `POST /api/users/{user_id}/block` - Block user
- `DELETE /api/users/{user_id}/block` - Unblock user

### Reporting
- `POST /api/report/user/{user_id}` - Report user
- `POST /api/report/problem/{problem_id}` - Report frikt
- `POST /api/report/comment/{comment_id}` - Report comment

### Gamification
- `GET /api/badges/definitions` - Get all 45 badge definitions
- `GET /api/users/me/badges` - Get user's badge status (unlocked/locked)
- `GET /api/users/{user_id}/badges` - Get another user's badges (public)
- `GET /api/users/me/gamification-stats` - Get detailed gamification stats
- `POST /api/users/me/visit` - Track app visit for streak
- `POST /api/users/{user_id}/follow` - Follow a user
- `DELETE /api/users/{user_id}/follow` - Unfollow a user
- `GET /api/users/{user_id}/is-following` - Check if following user

### Admin Features
- `POST /api/admin/broadcast-notification` - Send push notification to all users
- `GET /api/admin/broadcast-history` - Get last 10 broadcasts
- `GET /api/admin/broadcast-stats` - Get rate limit info and token counts

## Test Results
- Backend: 21/21 gamification tests PASS (100%)
- Backend: 11/11 bug fix tests PASS (100%)
- Backend: 10/10 delete account tests PASS (100%)
- See: /app/test_reports/iteration_5.json

## Test Accounts
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test: testuser.frikt@example.com / TestUser123!

## App Store Status
- **Rejection Reason 5.1.1(v):** FIXED ✅ - Delete Account feature implemented
- **Rejection Reason 2.3.3:** iPad Screenshots - User guidance provided (requires user action)

## TestFlight Deployment Steps (from Mac)

```bash
# Step 1: Navigate to project
cd ~/frikt-app/frontend

# Step 2: Pull latest code from GitHub
git pull origin main

# Step 3: Build for iOS (wait 10-15 minutes)
eas build --platform ios

# Step 4: Submit to TestFlight
eas submit --platform ios --latest
```
*When asked questions, press Enter to accept defaults.*

## Backlog
- [ ] Add report option on comment long-press
- [ ] Refactor server.py into separate routers
- [ ] Environment variable system for api.ts (replace hardcoded production URL)
- [ ] Add database indexes on user_stats and user_achievements collections

## Email Configuration (Required for Password Reset)
To enable password reset emails, add these environment variables to your Railway backend:
- `RESEND_API_KEY` - Get from https://resend.com (free tier: 3000 emails/month)
- `SENDER_EMAIL` - Your verified sending domain email (default: onboarding@resend.dev for testing)
