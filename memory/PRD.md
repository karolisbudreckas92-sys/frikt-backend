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

### Bug Fixes
- [x] Fixed /users/me/posts "User not found" error (route ordering)
- [x] Removed "Test Notifications (Expo Go only)" button
- [x] Updated login logo to exact brand specs

## API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### User Management
- `GET /api/users/me/posts` - Get current user's posts
- `GET /api/users/me/blocked` - Get blocked users list
- `POST /api/users/me/change-password` - Change password
- `POST /api/users/{user_id}/block` - Block user
- `DELETE /api/users/{user_id}/block` - Unblock user

### Reporting
- `POST /api/report/user/{user_id}` - Report user
- `POST /api/report/problem/{problem_id}` - Report frikt
- `POST /api/report/comment/{comment_id}` - Report comment

## Test Results
- Backend: 23/23 tests PASS (100%)
- See: /app/test_reports/iteration_2.json

## Test Accounts
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test: testuser.frikt@example.com / TestUser123!

## Backlog
- [ ] Add report option on comment long-press
- [ ] Refactor server.py into separate routers
- [ ] Environment variable system for api.ts
