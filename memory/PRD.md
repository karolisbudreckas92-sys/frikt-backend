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
- [x] Home header feedback button

### Bug Fixes (Feb 14, 2026)
- [x] Removed "Test Notifications (Expo Go only)" button from settings

### Pending Items
- [ ] Deploy latest changes to TestFlight

## Key Files
- `/app/frontend/app/(auth)/login.tsx` - Login screen
- `/app/frontend/app/(tabs)/home.tsx` - Home feed
- `/app/frontend/app/problem/[id].tsx` - Frikt detail page
- `/app/frontend/app/notification-settings.tsx` - Notification settings
- `/app/backend/server.py` - Backend API

## Test Accounts
- **Admin:** karolisbudreckas92@gmail.com / Admin123!
- **Test User:** testuser.frikt@example.com / TestUser123!

## Future/Backlog
- Refactor `server.py` into separate routers (auth.py, problems.py, users.py)
- Replace hardcoded URL in `api.ts` with environment variables for EAS builds
