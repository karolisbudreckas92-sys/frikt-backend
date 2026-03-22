# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Core Features Implemented
- **Auth**: JWT-based authentication with expo-secure-store for token security
- **Posts (Frikts)**: Create, relate, comment, save, follow, report
- **Gamification**: Badges, streaks, leaderboard, Rocket 10 challenge
- **Admin Panel**: User management, content moderation, broadcast, audit, communities
- **Push Notifications**: Expo + Firebase (FCM) for Android
- **Comment Threading**: Nested replies with soft-delete support
- **Local Communities**: Location-based community feeds (March 2026)

## Architecture
- **Frontend**: Expo (React Native), TypeScript, expo-router
- **Backend**: FastAPI (monolithic server.py ~4800+ lines)
- **Database**: MongoDB (Atlas for production, local for dev)
- **Hosting**: Railway (backend), EAS Build (mobile builds)
- **Integrations**: Resend (email), Firebase (push notifications)

## Local Communities Feature (Complete - March 2026)

### Backend (All endpoints tested - 75/79 PASS, 4 rate-limit false negatives)
- **New Collections**: communities, community_members, community_join_requests, community_requests
- **New Models**: Community, CommunityMember, CommunityJoinRequest, CommunityRequest
- **Problem Model**: Added `is_local` and `community_id` fields
- **Categories**: Added "local" category (#E85D3A coral)
- **User Endpoints**:
  - `POST /api/communities/join` - Join via invite code (case-insensitive, 409 for switch)
  - `POST /api/communities/switch` - Switch community
  - `DELETE /api/communities/leave` - Leave community
  - `GET /api/communities` - List all with stats
  - `GET /api/communities/me` - User's current community
  - `GET /api/communities/{id}` - Detail with is_member, has_pending_request
  - `POST /api/community-requests` - Request new community
  - `POST /api/communities/{id}/request-join` - Request to join existing
- **Admin Endpoints**:
  - `POST /api/admin/communities` - Create community
  - `PUT /api/admin/communities/{id}/code` - Change invite code
  - `GET /api/admin/communities` - List with pending_join_requests count
  - `GET /api/admin/community-requests` - Pending creation requests
  - `GET /api/admin/communities/{id}/join-requests` - Join requests
  - `PUT /api/admin/communities/{id}/join-requests/{id}` - Update join request
  - `GET /api/admin/communities/{id}/export` - Export data (all/7d/30d/90d)
- **Modified Endpoints**:
  - `GET /api/problems` - Excludes local from global, supports feed=local
  - `POST /api/problems` - Handles is_local, auto-sets community_id
  - `POST /api/problems/{id}/relate` - Members-only for local frikts
  - `GET /api/problems/similar` - Context-aware (global vs local)
  - `GET /api/problems/{id}/comments` - is_community_member per comment
  - `GET /api/problems/{id}` - community_name, viewer_is_community_member

### Frontend (All screens implemented)
- **Home Screen**: Global/Local toggle, community header, join code input, browse/request links
- **Post Wizard**: Local toggle to post to community (auto-sets category)
- **ProblemCard**: Local tag (coral location pin + "Local" text) for is_local frikts
- **Profile Screen**: CommunityCard (name, stats, leave button)
- **Search Screen**: Communities tab with browse + search
- **Community Detail Screen**: `/community/[id].tsx` - info, Request to Join banner, local feed with trending/new/top pills
- **Request Community Screen**: `/request-community.tsx` - form to request new community
- **Admin Panel**: Communities tab with:
  - Community Requests section
  - Create Community form (name, code, moderator email)
  - Active Communities (collapsible rows, search, code change, join requests with Send Code mailto, export with period dropdown)

### Testing
- iteration_6.json: 33/33 backend PASS
- iteration_7.json: 42/46 backend PASS (4 rate-limit, 0 real failures)

## Previous Fixes (This Session)
- Comment soft-delete: user_name now shows "[deleted]" correctly
- google-services.json added to .gitignore (user regenerated API key)

## Pending Issues
- P2: Unfollow Category UI Bug (deferred by user)
- P3: ESLint/TypeScript errors (backlog)

## Backlog
- Refactor server.py into FastAPI routers
- Refactor problem/[id].tsx (1600+ lines)
- Deep Linking
- Device regression testing
- Gamification scalability (async jobs)
- Low-priority notification edge cases

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
- Test communities: Melbourne CBD (MELB-CBD-2), Sydney North (SYD-N), plus ~19 from automated testing
