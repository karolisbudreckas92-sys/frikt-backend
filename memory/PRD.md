# FRIKT App - Product Requirements Document

## Overview
**App Name:** FRIKT  
**Core Promise:** "Share frictions. Find patterns."  
**Platform:** iOS (React Native/Expo) + FastAPI Backend  
**Database:** MongoDB Atlas  
**Hosting:** Railway (Backend)

## UX Principles (Non-Negotiable)
1. Zero-friction input: Post or comment in <10 seconds
2. No forced choices: All post metadata is optional
3. Clear states: Every action has loading/success/error states
4. No dead ends: Always a clear next step
5. Fast loops: Reduce taps, screens, and typing

## Brand Colors
- Background: #F6F3EE
- Dark bars: #2B2F36
- Red dot/Primary: #E4572E

## Deployment Architecture
- **Backend:** Railway (auto-deploys from `main` branch on GitHub)
- **Database:** MongoDB Atlas
- **Mobile Build/Deploy:** EAS CLI → TestFlight
- **Production Backend URL:** https://frikt-backend-production.up.railway.app

## Implementation Status

### Completed Features
- [x] Core posting flow (create Frikts)
- [x] User authentication (login/register)
- [x] Home feed with tabs (For You, Trending, New)
- [x] Frikt detail page with author info
- [x] Comments system with suggestion chips
- [x] User profiles
- [x] User search functionality
- [x] Admin panel with Feedback tab
- [x] Notification settings

### UGC Compliance Features (Feb 17, 2026)
- [x] Settings section in Profile tab (4 rows)
- [x] Blocked Users screen
- [x] Change Password screen
- [x] Privacy Policy (in-app WebView)
- [x] Terms & Conditions (in-app WebView)
- [x] Block user functionality (from user profile)
- [x] Report user functionality (from user profile)
- [x] Legal footer in Profile tab

### Bug Fixes
- [x] Removed "Test Notifications (Expo Go only)" button
- [x] Fixed /users/me/posts route conflict (was returning "User not found")
- [x] Updated login screen logo to exact brand specs

## Key Files
- `/app/frontend/app/(tabs)/profile.tsx` - Profile with settings
- `/app/frontend/app/blocked-users.tsx` - Blocked users list
- `/app/frontend/app/change-password.tsx` - Change password
- `/app/frontend/app/privacy-policy.tsx` - Privacy policy WebView
- `/app/frontend/app/terms.tsx` - Terms WebView
- `/app/frontend/app/user/[id].tsx` - User profile with block/report
- `/app/backend/server.py` - Backend API

## API Endpoints (New)
- `POST /api/users/me/change-password` - Change password
- `GET /api/users/me/blocked` - Get blocked users
- `POST /api/users/{user_id}/block` - Block a user
- `DELETE /api/users/{user_id}/block` - Unblock a user
- `POST /api/report/user/{user_id}` - Report a user

## Test Accounts
- **Admin:** karolisbudreckas92@gmail.com / Admin123!
- **Test User:** testuser.frikt@example.com / TestUser123!

## Pending/Backlog
- [ ] Filter blocked users from all feeds (home, search, comments)
- [ ] Add report option to Frikt detail page
- [ ] Add report option to comments
- [ ] Refactor `server.py` into separate routers
- [ ] Replace hardcoded URL in `api.ts` with environment variables
