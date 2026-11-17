# FRIKT App - Product Requirements Document

## Original Problem Statement
FRIKT is a mobile app (Expo/React Native + FastAPI + MongoDB) for sharing daily frictions and frustrations. Users post "Frikts", relate to others' problems, comment, earn badges through gamification, and explore content by categories and feeds.

## Tech Stack
- **Frontend**: Expo SDK 57 (57.0.26), React Native 0.86.3, React 19.2.3, TypeScript 6.0.3
- **Backend**: FastAPI (Python), MongoDB via Motor
- **Storage**: Emergent Object Storage (avatars)
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
- **Local Communities**: Location-based community feeds

## Expo SDK 57 Upgrade (Oct 2026)
- Expo: 54.0.33 → 57.0.26
- React Native: 0.81.5 → 0.86.3
- React: 19.1.0 → 19.2.3
- TypeScript: 5.9.3 → 6.0.3

## Google Play API Level 36 Compliance (Oct 2026)
- expo-build-properties: targetSdkVersion 36, compileSdkVersion 36
- eas.json created with development/preview/production profiles
- versionCode: 5
- Testing: Backend 28/28 PASS, Frontend 100% PASS

## Avatar Storage Migration (Oct 2026)
- Migrated from local file storage to Emergent Object Storage
- Backend storage.py module for put_object/get_object
- /api/files/{path} proxy route for serving files
- Removed StaticFiles mount for local uploads

## Security Audit (Oct 2026)
- SEC-001 HIGH: Local community posts readable by non-members
- SEC-002 HIGH: Weak password reset (6-digit, no rate limiting)
- SEC-003 MEDIUM: Avatar upload content validation
- Hardening: CORS, regex injection, JWT, rate limiting

## Pending Issues
- P0: SEC-001 - Add membership check for local community feed
- P0: SEC-002 - Strengthen password reset mechanism
- P2: SEC-003 - Validate avatar file content
- P2: Unfollow Category UI Bug
- P3: Shadow style deprecation warnings

## Backlog
- Refactor server.py into FastAPI routers
- Refactor problem/[id].tsx (1600+ lines)
- Deep Linking
- Device regression testing
- Security hardening (CORS, regex, JWT, rate limiting)
- Google API key Git history cleanup (pending user action)

## Credentials
- Admin: karolisbudreckas92@gmail.com / Admin123!
