# FRIKT - Product Requirements Document

## Original Problem Statement
Build "FRIKT" - A mobile app for sharing and discovering everyday frictions/problems. The core promise is "Share frictions. Find patterns."

## Core UX Principles
1. **Zero-friction input:** Post or comment in <10 seconds
2. **No forced choices:** All post metadata is optional
3. **Clear states:** Every action has loading/success/error states
4. **No dead ends:** Always a clear next step
5. **Fast loops:** Reduce taps, screens, and typing

## Tech Stack
- **Frontend:** React Native / Expo
- **Backend:** FastAPI (Python)
- **Database:** MongoDB Atlas (Production)
- **Hosting:** Railway (Backend), EAS/TestFlight (iOS App)
- **Auth:** JWT-based authentication

## Completed Features (Dec 2025)

### Core Features
- [x] User authentication (login/register)
- [x] Home feed with For You/Trending/New tabs
- [x] Create/Edit/Delete Frikts (problems)
- [x] Categories with filtering
- [x] Relate (like) functionality
- [x] Save/Bookmark problems
- [x] Follow problems for notifications
- [x] Comments with "helpful" marking
- [x] User profiles with stats
- [x] Push notifications (Expo)
- [x] Admin panel with moderation tools

### Recent Implementations (This Session)
- [x] **User Search** - Search for users by name with segmented control (Frikts/Users tabs)
- [x] **User Profile Page** - Public profile with avatar, bio, posts list, and sorting (Newest/Top)
- [x] **Feedback System** - Send feedback + Admin inbox with read/unread status
- [x] **Author Profile Link** - Tappable author row on Frikt detail pages
- [x] **Login Screen Logo** - Added Frikt logo above "Welcome back"
- [x] **App Icon** - Updated to new Frikt icon

### Already Working (Verified)
- [x] **Comment Chips Optional** - Users can type comments without selecting suggestion chips
- [x] **Timestamp Position** - Already at bottom-right of Frikt cards
- [x] **Empty States** - Implemented across all screens (Home, Search, My Posts, Saved, etc.)
- [x] **Toast Confirmations** - Active for relate, save, follow, comment actions
- [x] **"Add Details" Skip** - Skip button exists on step 2 of posting
- [x] **Details Entry After Post** - "Add details" card appears for owners without context

## API Endpoints

### User Search (NEW)
- `GET /api/users/search?q={query}&limit={limit}` - Search users by display name

### User Profile
- `GET /api/users/{user_id}/profile` - Get public user profile
- `GET /api/users/{user_id}/posts?sort={newest|top}` - Get user's posts

### Feedback
- `POST /api/feedback` - Submit user feedback
- `GET /api/admin/feedback` - Get all feedback (admin)
- `POST /api/admin/feedback/{id}/read` - Mark feedback as read

## Deployment Notes

**IMPORTANT:** The backend is deployed on Railway. All changes to `server.py` require pushing to GitHub for deployment.

### Production URLs
- Backend: `https://frikt-backend-production.up.railway.app`
- API Base: `https://frikt-backend-production.up.railway.app/api`

### Deployment Steps
1. Push code to GitHub
2. Railway auto-deploys from main branch
3. Use EAS CLI on local Mac for iOS builds

## Test Credentials
- **Admin:** karolisbudreckas92@gmail.com / Admin123!

## Backlog / Future Tasks

### P1 - High Priority
- [ ] Deploy latest backend to Railway (user search endpoint)

### P2 - Medium Priority  
- [ ] Refactor server.py into multiple routers (auth.py, problems.py, feedback.py)
- [ ] Environment variable system for EAS builds

### P3 - Nice to Have
- [ ] More granular notification settings
- [ ] User blocking/muting
- [ ] Dark mode toggle

## File Structure
```
/app
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend test files
├── frontend/
│   ├── app/                # Expo Router pages
│   │   ├── (auth)/         # Login/Register
│   │   ├── (tabs)/         # Main tabs (home, search, post, profile)
│   │   ├── problem/[id].tsx
│   │   ├── user/[id].tsx   # NEW: User profile page
│   │   ├── feedback.tsx    # NEW: Feedback form
│   │   └── admin.tsx       # Admin panel
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── services/api.ts # API client
│   │   ├── context/        # Auth context
│   │   └── theme/          # Colors and styles
│   └── app.json            # Expo config
└── memory/
    └── PRD.md              # This file
```
