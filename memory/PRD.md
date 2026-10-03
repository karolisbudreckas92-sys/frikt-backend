# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Tech Stack
- **Frontend**: Expo SDK 57 (57.0.26), React Native 0.86.3, React 19.2.3, TypeScript 6.0.3
- **Backend**: FastAPI (Python), MongoDB via Motor
- **Notifications**: expo-notifications + Firebase (FCM) for Android
- **Auth**: JWT-based with expo-secure-store
- **Hosting**: Railway (production backend), Expo/EAS (mobile builds)

## Core Features Implemented
- **Auth**: JWT-based authentication with expo-secure-store
- **Posts (Frikts)**: Create, relate, comment, save, follow, report
- **Gamification**: Badges, streaks, leaderboard, Rocket 10 challenge
- **Admin Panel**: User management, content moderation, broadcast, audit, communities
- **Push Notifications**: Expo + Firebase (FCM) for Android
- **Comment Threading**: Nested replies with soft-delete support
- **Local Communities**: Location-based community feeds (March 2026)

## Local Communities Feature (Complete)

### Backend
- 16 community endpoints (user + admin)
- Modified 6 existing endpoints for local/global awareness
- Community requests expire after 3 days, join requests after 7 days
- Analytics includes LOCAL stats section
- User profile includes community_name
- Search includes local frikts
- Export format: anonymous (Frikt text, relates count, date, comments count, threaded COM labels only)

### Frontend
- Home: Global/Local toggle with join code input
- Post Wizard: Local toggle
- ProblemCard: Local tag (coral pin + "Local")
- Profile: CommunityCard with leave
- Search: Communities tab
- Categories: Local card -> Home (no follow button)
- Community Detail: `/community/[id].tsx` with Request to Join
- Request Community: `/request-community.tsx`
- Admin: Communities tab (requests, create, active list, join requests, export)
- User Profile: Community tag below name

### Testing
- iteration_6.json: 33/33 PASS
- iteration_7.json: 42/46 PASS (4 rate-limit)
- Manual curl: All 8 spec fixes applied

## Expo SDK 57 Upgrade (Oct 2026)
- Upgraded from SDK 54 to SDK 57
- Expo: 54.0.33 → 57.0.26
- React Native: 0.81.5 → 0.86.3
- React: 19.1.0 → 19.2.3
- TypeScript: 5.9.3 → 6.0.3
- Breaking changes handled:
  - Removed `newArchEnabled` (no-op in SDK 55+)
  - Removed `edgeToEdgeEnabled` (mandatory in SDK 55+)
  - Removed deprecated `notification` top-level config (moved to expo-notifications plugin)
  - Removed `useNextNotificationsApi`
- expo-doctor: 21/21 checks pass
- iteration_8.json: Backend 13/13 PASS, Frontend 100% PASS

## Pending Issues
- P2: Unfollow Category UI Bug (deferred)
- P3: ESLint/TypeScript cleanup
- FIX 2 & FIX 10 verification (community request expiration + anonymous export)

## Backlog
- Refactor server.py into FastAPI routers
- Refactor problem/[id].tsx (1600+ lines)
- Deep Linking
- Device regression testing
- Migrate avatar uploads to object storage
- Google API key Git history cleanup (pending user action)

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
