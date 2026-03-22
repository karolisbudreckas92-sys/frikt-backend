# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

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
- Community creation requests expire after 3 days (`expires_at` filter)
- Join requests expire after 7 days (`expires_at` filter)
- Analytics includes LOCAL stats section
- User profile includes community_name
- Search includes local frikts
- Export format: anonymous, no author/signal/pain/frequency. Single-line `RELATES | DATE | COMMENTS`

## Documentation
- `FRIKT_COMPLETE_DOCUMENTATION.md` regenerated from scratch (1568 lines, 20 sections, March 2026)

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
- Manual curl: All 8 spec fixes verified

## Pending Issues
- P2: Unfollow Category UI Bug (deferred)
- P3: ESLint/TypeScript errors (backlog)

## Backlog
- Refactor server.py into FastAPI routers
- Refactor problem/[id].tsx (1600+ lines)
- Deep Linking
- Device regression testing

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
