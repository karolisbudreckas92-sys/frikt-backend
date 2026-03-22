# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Core Features Implemented
- **Auth**: JWT-based authentication with expo-secure-store for token security
- **Posts (Frikts)**: Create, relate, comment, save, follow, report
- **Gamification**: Badges, streaks, leaderboard, Rocket 10 challenge
- **Admin Panel**: User management, content moderation, bulk actions
- **Push Notifications**: Expo + Firebase (FCM) for Android
- **Comment Threading**: Nested replies with soft-delete support
- **Local Communities**: Location-based community feeds (NEW - March 2026)

## Architecture
- **Frontend**: Expo (React Native), TypeScript, expo-router
- **Backend**: FastAPI (monolithic server.py ~4700+ lines)
- **Database**: MongoDB (Atlas for production, local for dev)
- **Hosting**: Railway (backend), EAS Build (mobile builds)
- **Integrations**: Resend (email), Firebase (push notifications)

## Local Communities Feature (Implemented March 2026)
### Backend
- **New Collections**: communities, community_members, community_join_requests, community_requests
- **New Models**: Community, CommunityMember, CommunityJoinRequest, CommunityRequest
- **Problem Model**: Added `is_local` and `community_id` fields
- **Categories**: Added "local" category with coral color (#E85D3A)
- **Endpoints**:
  - `POST /api/communities/join` - Join via invite code (case-insensitive)
  - `POST /api/communities/switch` - Switch community
  - `DELETE /api/communities/leave` - Leave community
  - `GET /api/communities` - List all communities
  - `GET /api/communities/me` - User's current community
  - `GET /api/communities/{id}` - Community details with is_member
  - `POST /api/community-requests` - Request new community
  - `POST /api/communities/{id}/request-join` - Request to join
  - Admin: create, update code, list, requests, join-requests, export
- **Modified Endpoints**:
  - `GET /api/problems` - Excludes local frikts from global feeds, supports feed=local
  - `POST /api/problems` - Handles is_local flag, auto-sets community_id
  - `POST /api/problems/{id}/relate` - Restricts non-members from relating to local frikts
  - `GET /api/problems/similar` - Context-aware (global vs local)
  - `GET /api/problems/{id}/comments` - Adds is_community_member flag

### Frontend
- **Home Screen**: Global/Local toggle, community header, join code input
- **Post Wizard**: Local toggle to post to community
- **Profile Screen**: CommunityCard component (name, stats, leave)
- **Search Screen**: Communities tab with browsing
- **New Screen**: request-community.tsx

### Testing
- 33/33 backend tests PASS (test_community_api.py)

## Previous Bug Fixes (This Session)
- Comment soft-delete: user_name now shows "[deleted]" correctly in GET

## Security
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
- Test communities: Melbourne CBD (MELB-CBD-2), Sydney North (SYD-N)
