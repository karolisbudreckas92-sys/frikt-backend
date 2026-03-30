# FRIKT App - Complete Technical Documentation

*Generated: March 2026*

---

## 1. SCREEN INVENTORY

### 1.1 Authentication Screens

#### Login Screen (`/app/(auth)/login.tsx`)
- **How to get there:** App opens → user not logged in → redirected here
- **Elements:**
  - Email input field (EmailStr, required)
  - Password input field (string, required)
  - "Login" button
  - "Forgot Password?" link
  - "Create Account" link
- **Actions:**
  - Login → `POST /api/auth/login` → returns `{access_token, user}`
  - Forgot Password → navigates to `/forgot-password`
  - Create Account → navigates to `/register`

#### Register Screen (`/app/(auth)/register.tsx`)
- **How to get there:** Login → "Create Account"
- **Elements:**
  - Name input (string, required)
  - Email input (EmailStr, required)
  - Password input (string, min 6 chars)
  - "Create Account" button
  - Terms & Privacy links
- **Actions:**
  - Register → `POST /api/auth/register` → returns `{access_token, user}`
  - Creates user with `role="admin"` if email is in ADMIN_EMAILS env var

#### Forgot Password Screen (`/app/(auth)/forgot-password.tsx`)
- **How to get there:** Login → "Forgot Password?"
- **Elements:**
  - Email input
  - "Send Reset Code" button
  - Code input (6 digits)
  - New password field
  - "Reset Password" button
- **Actions:**
  - Send Reset Code → `POST /api/auth/forgot-password` → sends email via Resend
  - Verify Code → `POST /api/auth/verify-reset-code`
  - Reset Password → `POST /api/auth/reset-password`

---

### 1.2 Tab Screens (Main Navigation)

#### Home Screen (`/app/(tabs)/home.tsx`)
- **How to get there:** Bottom tab "Home" (default screen after login)
- **Header:** Logo "frikt", feedback icon, notification bell (unread count badge)
- **Global/Local toggle:** Pill-shaped segmented control

**Global mode (default):**
  - Feed filter pills: "For You", "Trending", "New"
  - Helper text per feed ("Based on your categories", "Hot this week", "Latest frikts")
  - Mission of the Day banner (dismissible)
  - FlatList of ProblemCards
  - Pull-to-refresh + infinite scroll pagination

**Local mode (user HAS a community):**
  - Community header row: location icon, community name, member count
  - Sort pills: "Trending", "New", "Top"
  - FlatList of local ProblemCards (community-scoped)

**Local mode (user has NO community):**
  - Location icon (56px)
  - "Join a local community" title
  - "See what's bugging your neighbours" subtitle
  - Code input field + "Join" button (case-insensitive)
  - Switch community alert on 409 response
  - "or" divider
  - "Browse Communities" button → Search screen Communities tab
  - "Want a local community? Request one here" link → `/request-community`

- **API Calls:**
  - Global feed → `GET /api/problems?feed={foryou|trending|new}&limit=50&skip=0`
  - Local feed → `GET /api/problems?feed=local&community_id={id}&sort_by={trending|new|top}`
  - Community info → `GET /api/communities/me`
  - Join → `POST /api/communities/join`
  - Switch → `POST /api/communities/switch`

#### ProblemCard Elements (Home, Search, Community Detail, Category Detail):
- Category tag (colored pill)
- **Local tag** (coral location pin icon + "Local" text, shown when `is_local=true`)
- Frikt title
- Timestamp (relative: "2h ago")
- Relate button + count
- Comment button + count

#### Search Screen (`/app/(tabs)/search.tsx`)
- **How to get there:** Bottom tab "Search"
- **Elements:** Search input + tab buttons: "Frikts", "People", "Communities"

**Frikts tab:**
  - Results from `GET /api/problems?search={query}`
  - Includes both global and local frikts when searching
  - Displays ProblemCards

**People tab:**
  - Results from `GET /api/users/search?q={query}`
  - User cards: avatar, displayName, bio, posts count
  - Tap → `/user/{id}`

**Communities tab:**
  - Results from `GET /api/communities?search={query}`
  - Shows all communities when no query
  - Cards: community name, member count, frikt count
  - Tap → `/community/{id}`
  - Empty state: "Want a local community? Request one here" → `/request-community`

#### Post Screen (`/app/(tabs)/post.tsx`)
- **How to get there:** Bottom tab "+" (Post)
- **Elements:**
  - Title input (required, min 10 chars)
  - **"Post to {community_name}" toggle** (only if user has a community)
  - Category picker (disabled/auto-set to "Local" when local toggle is ON)
  - Similar problems indicator (real-time as user types)
  - Optional fields: frequency, pain level (1-5), willing to pay, when it happens, who's affected, what I've tried
  - "Post" button
- **API Calls:**
  - Similar check → `GET /api/problems/similar?title={title}` (or with `is_local=true&community_id={id}`)
  - Submit → `POST /api/problems`

#### Categories Screen (`/app/(tabs)/categories.tsx`)
- **How to get there:** Bottom tab "Categories"
- **Elements:**
  - Grid of 10 category cards (icon, name, color, frikt count)
  - Follow/Unfollow button per card
  - "Local" card navigates to Home (Local tab) instead of category detail
- **Actions:**
  - Follow → `POST /api/categories/{id}/follow`
  - Unfollow → `DELETE /api/categories/{id}/follow`
  - Tap card → `/category/{id}` (or Home for "Local")

#### Profile Screen (`/app/(tabs)/profile.tsx`)
- **How to get there:** Bottom tab "Profile"
- **Elements:**
  - Avatar (tappable to edit)
  - Display name, bio, city
  - **Community card** (if member): community name, member count, "Leave" button
  - Stats: posts, comments, relates
  - Badge progress bar + unlocked badge count
  - Menu links: Edit Profile, My Posts, Saved, Notifications, Badges, Settings
- **Settings sub-menu:** Change Password, Blocked Users, Send Feedback, Terms, Privacy, Delete Account, Logout

---

### 1.3 Detail Screens

#### Problem Detail Screen (`/app/problem/[id].tsx`)
- **How to get there:** Tap any ProblemCard
- **Elements:**
  - Category tag + Local tag (if applicable)
  - Frikt title
  - Author name (tappable → user profile) + avatar + timestamp
  - Detail fields: frequency, pain level, when, who, what tried
  - Relate button + count
  - Save button, Follow button, Share button
  - Report button (3-dot menu)
  - **For local frikts:** community name banner + membership status
  - **Comments section:**
    - Top-level comments sorted by `helpful_count DESC`
    - Each comment: user name, content, timestamp, helpful button+count, reply button
    - Replies nested under parent, sorted by `created_at ASC`
    - Soft-deleted comments show "[deleted]" for content and username
    - `is_community_member` badge on comments for local frikts
  - Comment input: text field + quick reply pills
  - Related frikts section at bottom

**Quick Reply Pills:** "I relate because...", "One thing I tried...", "Have you tried...?"

#### Community Detail Screen (`/app/community/[id].tsx`)
- **How to get there:** Search → Communities tab → Tap community
- **Elements:**
  - Community name, location icon, member count, frikt count
  - **If member:** "Your Community" badge, community feed (FlatList of ProblemCards)
  - **If not member, no pending request:** "Request to Join" banner with optional message input
  - **If pending request:** "Request Pending" badge
- **API Calls:**
  - Load → `GET /api/communities/{id}`
  - Request join → `POST /api/communities/{id}/request-join`
  - Feed → `GET /api/problems?feed=local&community_id={id}`

#### User Profile Screen (`/app/user/[id].tsx`)
- **How to get there:** Tap any username
- **Elements:** Avatar, display name, bio, city, community tag, stats row, follow/unfollow, user's posts (sortable: newest/top), badge gallery

#### Category Detail Screen (`/app/category/[id].tsx`)
- **How to get there:** Categories grid → Tap card
- **Elements:** Category header (icon, name, color), follow/unfollow, FlatList of frikts

#### Request Community Screen (`/app/request-community.tsx`)
- **How to get there:** Home Local tab → "Request one here", or Search Communities empty state
- **Elements:** Email input (pre-filled), community name, description (optional), "Submit Request" button
- **API Call:** `POST /api/community-requests`
- **Outcome:** Request created with `expires_at = created_at + 3 days`

#### Onboarding Screen (`/app/onboarding.tsx`)
- **How to get there:** Automatically after new user registration (router.replace from register.tsx)
- **Persistence:** Uses `AsyncStorage` key `onboarding_complete`. If not set on app launch, authenticated users are redirected here from `index.tsx`.
- **Elements:** 4 horizontal swipeable screens via `FlatList` with `pagingEnabled`:
  1. "What's bothering you today?" — megaphone icon, explains posting frikts
  2. "What rises can't be ignored" — trending icon, explains the relate/ranking system
  3. "Go local" — location icon, explains community invite codes
  4. "You're ready" — frikt logo, CTA "Get Started" button
- **Navigation:** "Skip" button (top-right, screens 1-3), "Next" button per slide, "Get Started" on last slide
- **Completion:** Stores `onboarding_complete = 'true'` in AsyncStorage, navigates to `/(tabs)/home`
- **Login behavior:** `login.tsx` sets `onboarding_complete = 'true'` so existing users never see onboarding

---

### 1.4 Settings & User Screens

| Screen | Path | API |
|--------|------|-----|
| Edit Profile | `/app/edit-profile.tsx` | `PUT /api/users/me/profile`, `POST /api/users/me/avatar` or `POST /api/users/me/avatar-base64` |
| My Posts | `/app/my-posts.tsx` | `GET /api/users/me/posts` |
| Saved | `/app/saved.tsx` | `GET /api/users/me/saved` |
| Notifications | `/app/notifications.tsx` | `GET /api/notifications`, `POST /api/notifications/read` |
| Notification Settings | `/app/notification-settings.tsx` | `GET /api/push/settings`, `PUT /api/push/settings` |
| Change Password | `/app/change-password.tsx` | `POST /api/users/me/change-password` |
| Blocked Users | `/app/blocked-users.tsx` | `GET /api/users/me/blocked`, `DELETE /api/users/{id}/block` |
| Feedback | `/app/feedback.tsx` | `POST /api/feedback` |
| Terms | `/app/terms.tsx` | Static content |
| Privacy Policy | `/app/privacy-policy.tsx` | Static content |

---

### 1.5 Admin Panel (`/app/admin.tsx`)

- **Access:** Only visible if `user.role === "admin"`. Profile → Admin Panel.
- **Requires:** `role: "admin"` (auto-assigned if email in ADMIN_EMAILS env var)

#### Tabs:

**Dashboard:** Total users, problems, comments, reports. Pending community/join requests counts. Quick analytics overview.

**Content:** List of all problems with search/filter. Actions: Hide, Unhide, Delete, Pin, Unpin, Needs Context, Clear Context, Merge. Comment management: Hide, Unhide, Delete.

**Users:** List of all users with search. Actions: Ban, Shadowban, Unban. View user details: email, role, status, post count, join date, stats sync.

**Reports:** Reported problems, comments, and users. Filter by type and status. Actions: Dismiss, Mark Reviewed.

**Analytics:** User growth, post creation trends, category distribution, top frikts by engagement. **LOCAL section:** community stats, local frikt count, member distribution.

**Broadcast:** Send push notification to all users or admins only. Title + message + optional link. Broadcast history with delivery stats. Debug push tokens list. Test push to specific user.

**Communities:**
- **Community Requests section:** Pending new community creation requests (non-expired only). Approve/reject actions.
- **Create Community:** Name + code + moderator email form.
- **Active Communities list:** Name, code, member count, frikt count, pending join requests. Change code action.
- **Join Requests per community:** Pending, non-expired requests. "Send Code" action (opens mailto with invite code).
- **Export:** Download community data as anonymous `.txt` file (period filter: all/7d/30d/90d).

**Feedback:** List of user feedback submissions. Mark read/unread, delete.

**Audit Log:** Chronological log of all admin actions. Filterable by action type.

**Stats Sync:** Sync all user stats (recalculates from DB). Sync individual user stats.

---

## 2. USER TYPES AND PERMISSIONS

### Logged-out User
- Cannot access the app (redirected to login)
- Can register, login, request password reset

### Logged-in User (role: "user")
- View global feeds (New, Trending, For You)
- View and interact with local feed (if community member)
- Create frikts (max 10/day)
- Relate to frikts (not own, community-gated for local)
- Comment and reply (min 10 chars)
- Mark comments as helpful
- Edit/delete own comments and frikts
- Save and follow frikts
- Follow/unfollow categories and users
- Search frikts (includes local), users, communities
- View user profiles and badges
- Join/leave/switch communities via invite code
- Request to join a community
- Request creation of a new community
- Block/unblock users, Report frikts/comments/users
- Edit profile, change password, manage notification settings
- Delete own account

### Community Member (additional context)
- All "Logged-in User" permissions, plus:
- Post local frikts to their community
- View local community feed
- Relate to local frikts in their community
- Only 1 community membership at a time

### Admin User (role: "admin")
- All "Logged-in User" permissions, plus:
- Access Admin Panel
- Hide/unhide/delete any frikt, Pin/unpin frikts
- Mark frikts as "needs context", Merge duplicate frikts
- Hide/unhide/delete any comment
- Ban/shadowban/unban users
- Review and dismiss reports
- Send broadcast notifications
- View analytics dashboard
- Create communities, change invite codes
- Approve/reject community requests
- View and manage join requests
- Export community data
- View audit log, Sync user stats, Manage feedback, Debug push tokens

### Banned User (status: "banned")
- Cannot login (403 on login attempt)
- All API calls with auth return 403

### Shadowbanned User (status: "shadowbanned")
- Can still use the app normally
- Their content (posts, comments) is hidden from other users
- **No notifications are generated** from their actions (relates, comments, follows) — recipients never see evidence of the shadowbanned user's activity
- They are not added to notification batches
- Notifications to them from other users are also suppressed

---

## 3. DATA MODEL

### Collection: `users`
```
id: string (UUID)
email: string (lowercase, unique)
name: string
password_hash: string (bcrypt)
displayName: string | null
avatarUrl: string | null
bio: string | null
city: string | null
showCity: boolean (default false)
role: "user" | "admin"
status: "active" | "banned" | "shadowbanned"
created_at: datetime
rocket10_completed: boolean
rocket10_day: int
rocket10_start_date: datetime | null
posts_today: int
last_post_date: string | null (YYYY-MM-DD)
streak_days: int
followed_categories: string[] (category IDs)
followed_problems: string[] (problem IDs)
saved_problems: string[] (problem IDs)
```

### Collection: `problems`
```
id: string (UUID)
user_id: string → users.id
user_name: string (denormalized)
user_avatar_url: string | null (denormalized)
title: string (min 10 chars)
category_id: string
frequency: "daily" | "weekly" | "monthly" | "rare" | null
pain_level: int (1-5) | null
willing_to_pay: string (default "$0")
when_happens: string | null
who_affected: string | null
what_tried: string | null
created_at: datetime
relates_count: int (default 0)
comments_count: int (default 0)
unique_commenters: int (default 0)
signal_score: float (default 0.0)
reports_count: int (default 0)
is_hidden: boolean (default false)
status: "active" | "hidden" | "removed"
is_pinned: boolean (default false)
needs_context: boolean (default false)
merged_into: string | null (problem ID if duplicate)
is_local: boolean (default false)
community_id: string | null → communities.id
```

### Collection: `comments`
```
id: string (UUID)
problem_id: string → problems.id
user_id: string → users.id
user_name: string (denormalized)
content: string (min 10 chars)
created_at: datetime
edited_at: datetime | null
helpful_count: int (default 0)
is_pinned: boolean (default false)
status: "active" | "hidden" | "removed"
reports_count: int (default 0)
parent_comment_id: string | null (null = top-level, string = reply to this comment)
reply_to_user_id: string | null (user whose Reply button was tapped)
reply_to_user_name: string | null (denormalized)
```

### Collection: `communities`
```
id: string (UUID)
name: string
active_code: string (case-insensitive invite code)
moderator_email: string
created_at: datetime
```

### Collection: `community_members`
```
id: string (UUID)
user_id: string → users.id
community_id: string → communities.id
joined_at: datetime
```
**Constraint:** A user can only belong to 1 community at a time (enforced in application logic).

### Collection: `community_join_requests`
```
id: string (UUID)
user_id: string → users.id
user_email: string
community_id: string → communities.id
message: string | null
status: "pending" | "sent"
created_at: datetime
expires_at: datetime (default: created_at + 7 days)
```

### Collection: `community_requests`
```
id: string (UUID)
email: string
community_name: string
description: string | null
created_at: datetime
expires_at: datetime (default: created_at + 3 days)
```

### Collection: `relates`
```
id: string (UUID)
problem_id: string → problems.id
user_id: string → users.id
created_at: datetime
```
**Unique constraint:** (problem_id, user_id)

### Collection: `helpfuls`
```
id: string (UUID)
comment_id: string → comments.id
user_id: string → users.id
created_at: datetime
```
**Unique constraint:** (comment_id, user_id)

### Collection: `notifications`
```
id: string (UUID)
user_id: string → users.id
type: "new_comment" | "new_relate" | "comment_reply" | "new_follower" | "badge_earned" | "admin_broadcast" | "batched_relate_batch" | "batched_comment_batch"
problem_id: string
message: string
is_read: boolean (default false)
created_at: datetime
```

### Collection: `notification_settings`
```
user_id: string → users.id
push_notifications: boolean (default true) — master toggle
new_comments: boolean (default true)
new_relates: boolean (default true)
trending: boolean (default true)
```

### Collection: `push_tokens`
```
id: string (UUID)
user_id: string → users.id
token: string (Expo push token)
created_at: datetime
is_active: boolean (default true)
```

### Collection: `reports`
```
id: string (UUID)
reporter_id: string → users.id
reporter_name: string
target_type: "problem" | "comment" | "user"
target_id: string
reason: "spam" | "harassment" | "hate" | "sexual" | "other" | "abuse" | "off-topic" | "duplicate"
details: string | null
created_at: datetime
status: "pending" | "reviewed" | "dismissed"
```

### Collection: `blocked_users`
```
id: string (UUID)
blocker_user_id: string → users.id
blocked_user_id: string → users.id
created_at: datetime
```

### Collection: `user_stats`
```
user_id: string → users.id
total_posts: int
total_relates_given: int
total_relates_received: int
total_comments: int
total_frikts_opened: int
users_followed: int
current_visit_streak: int
last_visit_date: string | null (YYYY-MM-DD)
streak_miss_count: int
posts_per_category: dict ({category_id: count})
max_relates_on_single_post: int
```

### Collection: `user_achievements`
```
id: string (UUID)
user_id: string → users.id
badge_id: string
unlocked_at: datetime
```

### Collection: `pending_badge_notifications`
```
user_id: string → users.id
badge: dict ({badge_id, name, icon, description, unlocked_at})
created_at: datetime
```

### Collection: `pending_notification_batches`
```
id: string (UUID)
recipient_user_id: string → users.id
batch_type: "relate_batch" | "comment_batch"
target_id: string (problem_id)
target_title: string
user_ids: string[] (actors)
user_names: string[] (actor names)
first_action_at: datetime
last_action_at: datetime
notification_sent: boolean
```

### Collection: `password_reset_tokens`
```
id: string (UUID)
user_id: string → users.id
token: string (6-digit code)
email: string
expires_at: datetime (1 hour from creation)
used: boolean (default false)
created_at: datetime
```

### Collection: `feedback`
```
id: string (UUID)
user_id: string → users.id
user_email: string
user_name: string
type: "bug" | "feature" | "other"
message: string
created_at: datetime
is_read: boolean (default false)
```

### Collection: `admin_audit_logs`
```
id: string (UUID)
admin_id: string
admin_email: string
action: string
target_type: string
target_id: string
details: dict | null
created_at: datetime
```

### Collection: `user_follows`
```
id: string (UUID)
follower_id: string → users.id
following_id: string → users.id
created_at: datetime
```

---

## 4. FRIKT LIFECYCLE

### Creating a Global Frikt

1. User taps "+" tab → Post Screen
2. Fills in title (required, min 10 chars), local toggle OFF, category (default "other"), optional fields
3. As user types, `GET /api/problems/similar?title={title}` shows potential duplicates
4. User taps "Post" → `POST /api/problems`
5. Backend creates `problems` document with `is_local=false, community_id=null`
6. Rate limit: max 10 frikts per day per user
7. Gamification: increment `total_posts`, check category specialist badges

### Creating a Local Frikt

1. User taps "+" tab → Post Screen
2. Toggles "Post to {community_name}" ON
3. `category_id` auto-set to "local"
4. Similar problems checked within community: `GET /api/problems/similar?title={title}&is_local=true&community_id={id}`
5. `POST /api/problems` with `is_local=true`
6. Backend validates community membership (403 if not), sets `community_id`, forces `category_id = "local"`
7. Frikt only appears in local feed, never in global feeds

### Where Frikts Appear

| Feed | Query Filter | Sort | Includes Local? |
|------|-------------|------|-----------------|
| New | `is_hidden=false, status=active, is_local!=true` | `created_at DESC` | No |
| Trending | Same + `created_at >= 7 days ago` | `hot_score DESC` | No |
| For You | Same + `category_id IN followed_categories` | `engagement_score DESC` | No |
| Local (Trending) | `is_local=true, community_id={id}, created_at >= 7 days` | `hot_score DESC` | Only local |
| Local (New) | `is_local=true, community_id={id}` | `created_at DESC` | Only local |
| Local (Top) | `is_local=true, community_id={id}` | `relates_count DESC` | Only local |
| **Search** | `title/when/who REGEX match` | `created_at DESC` | **Yes — both** |

**Hot score:** `(relates_count * 3) + (comments_count * 2) + unique_commenters`
**Engagement score:** `(relates_count * 2) + (comments_count * 1.5)`

### Relate Flow

1. User taps "Relate" → `POST /api/problems/{id}/relate`
2. Validates: not own post, not duplicate, community member (for local)
3. Creates `relates` document, increments `relates_count`, recalculates `signal_score`
4. Updates relater's `total_relates_given`, author's `total_relates_received`, `max_relates_on_single_post`
5. Checks/awards badges for both users
6. **Notification:** If actor is NOT shadowbanned → sends notification (batched if multiple in 5 min)

### Comment Flow (Top-Level)

1. User types comment or taps quick-reply → `POST /api/comments` with `{problem_id, content}`
2. Creates `comments` document with `parent_comment_id=null`
3. Increments `comments_count`, `unique_commenters` (if first), recalculates `signal_score`
4. Updates `total_comments`, checks badges
5. **Notification:** If actor is NOT shadowbanned → notifies problem owner (batched), notifies followers

### Reply Flow (Threaded)

1. User taps "Reply" on a comment → `POST /api/comments` with `{problem_id, content, parent_comment_id, reply_to_user_id}`
2. **Flatten rule:** If replying to a reply, backend resolves to the root top-level comment
3. **Status validation:** Only `status='hidden'` (admin action) blocks replies. `status='removed'` (user soft-delete) allows the thread to continue.
4. Resolves `reply_to_user_name` from `reply_to_user_id`
5. Same stats/gamification as top-level
6. **Notification:** If actor is NOT shadowbanned → sends reply notification to the user whose Reply was tapped

### Comment Deletion

- **Hard delete:** Comment with no replies → permanently removed, decrements `comments_count`, deletes associated `helpfuls`
- **Soft delete:** Comment with replies → `status="removed"`, `content="[deleted]"`, `user_name="[deleted]"`. Replies preserved. Count not decremented. **New replies can still be posted** in the thread.
- **Admin-hidden comments** (`status='hidden'`) block all new replies

### Save / Follow / Report Flows
- Save: `POST/DELETE /api/problems/{id}/save` → toggles in `users.saved_problems[]`
- Follow: `POST/DELETE /api/problems/{id}/follow` → toggles in `users.followed_problems[]`. User gets comment notifications for followed frikts.
- Report: `POST /api/report/problem/{id}` or `/report/comment/{id}` or `/report/user/{id}` → creates `reports` document

---

## 5. FEED LOGIC

### Feed Loading (`GET /api/problems`)

**Parameters:**
- `feed`: "new" | "trending" | "foryou" | "local"
- `category_id`: optional filter
- `community_id`: required when feed="local"
- `sort_by`: for local feed — "trending" | "new" | "top"
- `search`: optional text search (when present, local frikts are included)
- `limit`: default 50
- `skip`: for pagination

**Base Query:**
```python
query = {"is_hidden": False, "status": "active"}
# Global feeds exclude local frikts, but search does NOT
if feed in ("new", "trending", "foryou") and not search:
    query["is_local"] = {"$ne": True}
if user:
    blocked_ids = get_blocked_user_ids(user_id)
    query["user_id"] = {"$nin": blocked_ids}
```

### NEW Feed
```python
sort = [("created_at", -1)]
```

### TRENDING Feed
```python
week_ago = datetime.utcnow() - timedelta(days=7)
query["created_at"] = {"$gte": week_ago}
# Aggregation with hot_score = (relates*3) + (comments*2) + unique_commenters
```

### FOR YOU Feed
```python
followed_cats = user.get("followed_categories", [])
if followed_cats:
    query["category_id"] = {"$in": followed_cats}
    # Sort by engagement_score = (relates*2) + (comments*1.5)
else:
    # Fallback to NEW feed
```

### LOCAL Feed
```python
query["is_local"] = True
query["community_id"] = community_id
# sort_by: "new" → created_at DESC, "top" → relates_count DESC, "trending" → hot_score
```

### Similar Problems (`GET /api/problems/similar`)
- Context-aware: `is_local=true&community_id={id}` searches within community only
- Default: searches global frikts only (`is_local != true`)
- Keyword-based on title words > 3 characters

### Pagination
- Infinite scroll: client increments `skip` by `limit`
- FlatList `onEndReached` triggers load more

---

## 6. COMMENT SYSTEM

### Structure
- **Threaded comments** with one level of nesting
- Top-level: `parent_comment_id = null`
- Replies: `parent_comment_id` → top-level comment ID
- Replies-to-replies are **flattened** to the root top-level parent
- Top-level sorted by `helpful_count DESC`, replies by `created_at ASC`

### Comment Response Structure
```json
{
  "id": "uuid",
  "problem_id": "uuid",
  "user_id": "uuid",
  "user_name": "string",
  "content": "string",
  "created_at": "datetime",
  "helpful_count": 0,
  "status": "active",
  "parent_comment_id": null,
  "reply_to_user_id": null,
  "reply_to_user_name": null,
  "user_marked_helpful": false,
  "is_community_member": true,
  "reply_count": 2,
  "replies": [...]
}
```

### Threading Rules
- `parent_comment_id`: null for top-level, top-level comment ID for replies
- `reply_to_user_id/reply_to_user_name`: identifies which user's reply button was tapped
- **Flatten rule:** If a reply targets another reply, the backend sets `parent_comment_id` to the root top-level comment
- **Status validation:** Only `status='hidden'` (admin action) blocks new replies. `status='removed'` (user soft-delete) allows the thread to continue. This prevents entire threads from freezing when someone deletes their top-level comment.

### Soft Delete Behavior
- Comment with replies → soft-delete: `status="removed"`, `content="[deleted]"`, `user_name="[deleted]"`. Replies preserved. **New replies can still be posted** in the thread.
- Comment without replies → hard delete: permanently removed
- **Admin-hidden comments** (`status='hidden'`) block all new replies to that thread

### `is_community_member` Field
- Added to each comment when parent problem is a local frikt
- `true` if commenter is a member of the problem's community
- `true` for all comments on global frikts (not applicable)

### Helpful System
- `POST /api/comments/{id}/helpful` → creates `helpfuls`, increments `helpful_count`
- `DELETE /api/comments/{id}/helpful` → removes and decrements
- One helpful per user per comment

### Restrictions
- Must be logged in
- Content min 10 chars
- Can edit/delete own comments
- Cannot reply to admin-hidden comments (status='hidden' returns 400)

---

## 7. NOTIFICATIONS

### Trigger Events

| Event | Type | Recipient | Message |
|-------|------|-----------|---------|
| Someone relates to your Frikt | new_relate | Frikt owner | "{name} related to your Frikt" |
| Someone comments on your Frikt | new_comment | Frikt owner | "{name} commented on your Frikt" |
| Someone replies to your comment | comment_reply | Comment author | "{name} replied to your comment" |
| Someone comments on followed Frikt | new_comment | Followers | "New comment on a Frikt you follow" |
| Someone follows you | new_follower | Followed user | "{name} started following you" |
| Badge earned | badge_earned | Badge earner | "You earned: {badge_name}" |
| Admin broadcast | admin_broadcast | All/Admins | Custom message |

**Shadowban suppression:** If the actor (the person relating, commenting, or following) has `status='shadowbanned'`, no notification is created, no push is sent, and they are not added to notification batches. This ensures shadowbanned users are completely invisible to other users.

### Batching
- Multiple relates within 5 minutes → batched into single notification
- Multiple comments within 3 minutes → batched into single notification
- Batched example: "3 people related to your Frikt"
- Background processor runs every 60 seconds to flush pending batches

### Delivery
1. **In-app:** Stored in `notifications` collection, badge count on bell icon
2. **Push:** Sent via Expo Push Notifications if enabled

### Settings (per user)
- `push_notifications`: master toggle
- `new_comments`: receive comment notifications
- `new_relates`: receive relate notifications
- `trending`: receive trending alerts

---

## 8. COMMUNITIES SYSTEM

### Community Model
A community is a location-based or code-gated group. Users can belong to one community at a time and post local-only frikts visible within their community.

### Joining Flow
1. User enters invite code on Home Local tab
2. `POST /api/communities/join` with `{code}` (case-insensitive regex matching)
3. Outcomes:
   - **Success (200):** User joined, community data returned
   - **Already in same community (400):** "You are already a member"
   - **Already in different community (409):** Returns current + new community names. Frontend shows Switch alert.
   - **Invalid code (404):** "Invalid community code"
4. Switch: `POST /api/communities/switch` with new code → leaves old, joins new

### Leaving Flow
- `DELETE /api/communities/leave`
- Removes membership. Local frikts user posted remain in the community feed.

### Request to Join Flow
1. User browses communities in Search → Communities tab
2. Taps community → Community Detail Screen
3. If not member, sees "Request to Join" banner
4. Fills optional message + taps "Request to Join"
5. `POST /api/communities/{id}/request-join`
6. Creates join request with `expires_at = created_at + 7 days`
7. Admin sees request in Communities tab, clicks "Send Code" (opens mailto with invite code)
8. **Expired requests** (older than 7 days) are automatically filtered out from admin views

### Request New Community Flow
1. User taps "Request one here" on Home Local tab or Search Communities empty state
2. `/request-community` screen: fills email, community name, optional description
3. `POST /api/community-requests`
4. Creates community request with `expires_at = created_at + 3 days`
5. Admin sees in Communities tab → Community Requests section
6. **Expired requests** (older than 3 days) are automatically filtered out from admin views

### Request Expiration Rules

| Request Type | Expires After | Filter Applied |
|-------------|--------------|----------------|
| Community creation request | 3 days | `expires_at > now()` on `GET /api/admin/community-requests` |
| Community join request | 7 days | `expires_at > now()` on `GET /api/admin/communities/{id}/join-requests` |

Expired requests remain in the database but are excluded from all admin API responses.

### Admin Community Management
- **Create:** Name + code + moderator email
- **Change Code:** Update active invite code (old codes stop working)
- **View Join Requests:** See pending, non-expired requests; send code via mailto
- **Export:** Download community frikt data as anonymous structured text (filterable by period)
- All admin actions logged in `admin_audit_logs`

### Export Format (`GET /api/admin/communities/{id}/export`)

The export is fully **anonymous** — no author names, no signal scores, no pain levels, no frequency data. Output format:

```
COMMUNITY EXPORT: {community_name}
Period: {period_label}
Members: {member_count}
Total frikts: {frikt_count}

============================================================

FRIKT: {frikt_text}
RELATES: {count} | DATE: {YYYY-MM-DD} | COMMENTS: {count}
COM1: {comment_text}
COM1.1: {reply_text}
COM2: {comment_text}

FRIKT: {frikt_text}
RELATES: {count} | DATE: {YYYY-MM-DD} | COMMENTS: {count}

============================================================
END OF EXPORT
```

**Period options:** `all` (default), `7d`, `30d`, `90d`

---

## 9. AUTHENTICATION

### Sign-up Flow
1. `POST /api/auth/register` with `{name, email, password}`
2. Email validated, checked for duplicates (case-insensitive)
3. Password hashed with bcrypt
4. User created with `role="user"` (or `"admin"` if email in ADMIN_EMAILS)
5. JWT token generated (30 day expiry)
6. Returns `{access_token, user}`

### Sign-in Flow
1. `POST /api/auth/login` with `{email, password}`
2. Find user by lowercase email
3. Verify password hash
4. Check `status != "banned"`
5. Generate JWT → Returns `{access_token, user}`

### Token Management
- JWT stored in SecureStore (iOS/Android) via `expo-secure-store`
- Token payload: `{sub: user_id, exp: timestamp}`
- All authenticated requests: `Authorization: Bearer {token}`
- `get_current_user()`: optional auth (returns None if no token)
- `require_auth()`: required auth (raises 401)

### Password Reset
1. `POST /api/auth/forgot-password` → generates 6-digit code, stores in `password_reset_tokens` (1 hour expiry), sends email via Resend
2. `POST /api/auth/verify-reset-code` → validates code
3. `POST /api/auth/reset-password` → sets new password

---

## 10. CATEGORIES

10 categories total:

| ID | Name | Icon | Color |
|----|------|------|-------|
| money | Money | cash-outline | #10B981 |
| work | Work | briefcase-outline | #3B82F6 |
| health | Health | heart-outline | #EF4444 |
| home | Home | home-outline | #F59E0B |
| tech | Tech | hardware-chip-outline | #8B5CF6 |
| school | School | school-outline | #EC4899 |
| relationships | Relationships | people-outline | #F97316 |
| travel | Travel/Transport | car-outline | #06B6D4 |
| services | Services | construct-outline | #84CC16 |
| **local** | **Local** | **location-outline** | **#E85D3A** |

The "local" category is auto-assigned to local frikts when the local toggle is activated. It cannot be manually selected.

---

## 11. SIGNAL SCORE

### Formula
```
base_score = (relates * 3) + (comments * 2) + (unique_commenters * 1) + pain_bonus
recency_boost = linear decay from 2.0 to 0 over 72 hours
final_score = base_score + recency_boost
```

### Weights
| Component | Weight |
|-----------|--------|
| relate | 3.0 |
| comment | 2.0 |
| unique_commenter | 1.0 |
| pain_base | 0.5 (multiplied by pain level 1-5) |
| frequency_daily | 1.0 |
| frequency_weekly | 0.5 |
| frequency_monthly | 0.25 |
| recency_max_boost | 2.0 |
| recency_decay_hours | 72 |

Posts with interaction ALWAYS beat posts without (except very new posts with recency boost).

---

## 12. SEARCH

### Frikt Search
- **Endpoint:** `GET /api/problems?search={query}`
- **Type:** Case-insensitive regex
- **Fields:** `title`, `when_happens`, `who_affected`
- **Includes local frikts:** Yes — when a search parameter is present, the `is_local` filter is NOT applied. Local and global frikts appear together.
```python
# Local frikts excluded from feeds, but NOT from search
if feed in ("new", "trending", "foryou") and not search:
    query["is_local"] = {"$ne": True}
```

### User Search
- **Endpoint:** `GET /api/users/search?q={query}` (min 2 chars)
- **Fields:** `name`, `normalizedDisplayName`
- Excludes blocked users, only `status="active"`

### Community Search
- **Endpoint:** `GET /api/communities?search={query}`
- **Fields:** `name`
- Returns communities with `member_count` and `frikt_count`

---

## 13. API REFERENCE

### Public Endpoints (no auth required)
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/verify-reset-code
POST /api/auth/reset-password
GET  /api/categories
GET  /api/health
GET  /api/
```

### Auth Required — Full Endpoint List

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/verify-reset-code | Verify reset code |
| POST | /api/auth/reset-password | Set new password |

#### Problems (Frikts)
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/problems | Get feed (global, local, or search) |
| POST | /api/problems | Create Frikt |
| GET | /api/problems/similar | Find duplicates (context-aware) |
| GET | /api/problems/{id} | Get single Frikt |
| PATCH | /api/problems/{id} | Edit Frikt |
| DELETE | /api/problems/{id} | Delete Frikt |
| GET | /api/problems/{id}/related | Get related Frikts |
| POST | /api/problems/{id}/relate | Relate (community-gated for local) |
| DELETE | /api/problems/{id}/relate | Unrelate |
| POST | /api/problems/{id}/save | Save |
| DELETE | /api/problems/{id}/save | Unsave |
| POST | /api/problems/{id}/follow | Follow |
| DELETE | /api/problems/{id}/follow | Unfollow |
| GET | /api/problems/{id}/comments | Get threaded comments |
| POST | /api/problems/{id}/report | Report (legacy) |

#### Comments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/comments | Create comment or reply |
| PUT | /api/comments/{id} | Edit comment |
| DELETE | /api/comments/{id} | Delete (hard or soft) |
| POST | /api/comments/{id}/helpful | Mark helpful |
| DELETE | /api/comments/{id}/helpful | Unmark helpful |

#### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all 10 categories |
| POST | /api/categories/{id}/follow | Follow |
| DELETE | /api/categories/{id}/follow | Unfollow |

#### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/users/search | Search users |
| GET | /api/users/me/saved | Get saved Frikts |
| GET | /api/users/me/posts | Get own posts |
| GET | /api/users/me/badges | Get badges |
| GET | /api/users/me/gamification-stats | Get stats |
| POST | /api/users/me/visit | Record daily visit |
| PUT | /api/users/me/profile | Update profile |
| POST | /api/users/me/avatar | Upload avatar (multipart) |
| POST | /api/users/me/avatar-base64 | Upload avatar (base64) |
| DELETE | /api/users/me | Delete account |
| POST | /api/users/me/change-password | Change password |
| GET | /api/users/me/blocked | Get blocked users |
| GET | /api/users/{id}/profile | Get user profile |
| GET | /api/users/{id}/posts | Get user's posts |
| GET | /api/users/{id}/badges | Get user's badges |
| GET | /api/users/{id}/stats | Get user's stats |
| POST | /api/users/{id}/follow | Follow user |
| DELETE | /api/users/{id}/follow | Unfollow user |
| GET | /api/users/{id}/is-following | Check if following |
| POST | /api/users/{id}/block | Block user |
| DELETE | /api/users/{id}/block | Unblock user |

#### Communities
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/communities/join | Join via invite code |
| POST | /api/communities/switch | Switch to new community |
| DELETE | /api/communities/leave | Leave current community |
| GET | /api/communities | List all (searchable) |
| GET | /api/communities/me | Get user's current community |
| GET | /api/communities/{id} | Community detail (is_member, has_pending_request) |
| POST | /api/community-requests | Request new community creation |
| POST | /api/communities/{id}/request-join | Request to join |

#### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/notifications | Get notifications |
| POST | /api/notifications/read | Mark all read |
| POST | /api/notifications/{id}/read | Mark one read |

#### Push
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/push/register | Register push token |
| DELETE | /api/push/unregister | Unregister token |
| GET | /api/push/settings | Get notification settings |
| PUT | /api/push/settings | Update settings |
| POST | /api/push/test | Test push (admin) |

#### Reports
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/report/problem/{id} | Report Frikt |
| POST | /api/report/comment/{id} | Report comment |
| POST | /api/report/user/{id} | Report user |

#### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/badges/definitions | Get all badge definitions |
| GET | /api/mission | Get mission of the day |
| POST | /api/feedback | Submit feedback |
| GET | /api/health | Health check |

#### Admin — Content & Users
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/reports | Get all reports |
| GET | /api/admin/reported-problems | Get reported Frikts |
| GET | /api/admin/reported-comments | Get reported comments |
| POST | /api/admin/reports/{id}/dismiss | Dismiss report |
| POST | /api/admin/reports/{id}/reviewed | Mark reviewed |
| POST | /api/admin/problems/{id}/hide | Hide Frikt |
| POST | /api/admin/problems/{id}/unhide | Unhide Frikt |
| DELETE | /api/admin/problems/{id} | Delete Frikt |
| POST | /api/admin/problems/{id}/pin | Pin Frikt |
| POST | /api/admin/problems/{id}/unpin | Unpin Frikt |
| POST | /api/admin/problems/{id}/needs-context | Mark needs context |
| POST | /api/admin/problems/{id}/clear-needs-context | Clear flag |
| POST | /api/admin/problems/{id}/merge | Merge duplicates |
| POST | /api/admin/comments/{id}/hide | Hide comment |
| POST | /api/admin/comments/{id}/unhide | Unhide comment |
| DELETE | /api/admin/comments/{id} | Delete comment |
| GET | /api/admin/users | List users |
| GET | /api/admin/users/{id} | Get user details |
| POST | /api/admin/users/{id}/ban | Ban user |
| POST | /api/admin/users/{id}/shadowban | Shadowban user |
| POST | /api/admin/users/{id}/unban | Unban user |

#### Admin — Broadcast & Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/broadcast-notification | Send broadcast |
| GET | /api/admin/broadcast-history | Get broadcasts |
| GET | /api/admin/broadcast-stats | Get broadcast stats |
| GET | /api/admin/debug-push-tokens | Debug push tokens |
| POST | /api/admin/test-push | Test push notification |
| GET | /api/admin/analytics | Get analytics |
| GET | /api/admin/audit-log | Get audit log |
| POST | /api/admin/sync-all-user-stats | Sync all user stats |
| POST | /api/admin/sync-user-stats/{id} | Sync single user |

#### Admin — Communities
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/communities | Create community |
| PUT | /api/admin/communities/{id}/code | Change invite code |
| GET | /api/admin/communities | List communities with stats |
| GET | /api/admin/community-requests | Get creation requests (non-expired) |
| GET | /api/admin/communities/{id}/join-requests | Get join requests (non-expired) |
| PUT | /api/admin/communities/{id}/join-requests/{rid} | Update join request status |
| GET | /api/admin/communities/{id}/export | Export data (anonymous) |
| GET | /api/admin/communities/{id}/members | List community members (with ?search= query) |
| PUT | /api/admin/community-requests/{id} | Dismiss/archive community creation request |

#### Admin — Feedback
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/feedback | Get all feedback |
| POST | /api/admin/feedback/{id}/read | Mark read |
| POST | /api/admin/feedback/{id}/unread | Mark unread |
| DELETE | /api/admin/feedback/{id} | Delete feedback |

---

## 14. PROFILE & BADGES

### Profile Fields (User-editable)
- `displayName`, `bio`, `city`, `showCity`, `avatarUrl`

### Profile Fields (System-managed)
- `email`, `name`, `created_at`, `role`, `status`, `followed_categories`, `followed_problems`, `saved_problems`, `streak_days`, `posts_today`

### Badge System — 45 total badges

**A. Visit Streaks (5)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| Just Browsing | 2 day streak | You're starting to like the drama |
| Hooked | 7 day streak | One week of pure friction |
| Regular Visitor | 14 day streak | You check Frikt more than your bank account |
| Mayor of Frikt | 30 day streak | You basically live here now |
| I Love Problems | 100 day streak | 100 days of complaining |

**B. Explorer (3)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| Curious Human | 3 frikts opened | Just a quick peek |
| Nosey | 25 frikts opened | You love a good gossip session |
| Rabbit Hole | 100 frikts opened | Scrolled to the bottom of frustration |

**C. The Relater (5)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| Not Alone | 1 relate given | First time feeling someone's pain |
| Empathy Expert | 10 relates | The friend everyone needs |
| Honorary Therapist | 50 relates | Listened to more than a professional |
| Community Pillar | 200 relates | The glue holding this together |
| Frikt Saint | 500 relates | The patience of a god |

**D. Friction Creator (5)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| First Vent | 1 post | Feels good to let it out |
| Professional Hater | 5 posts | A lot to complain about |
| Certified Complainer | 10 posts | Official Karen status |
| Drama Influencer | 20+ relates on single post (hidden) | Your misfortune is entertainment |
| Universal Problem | 50+ relates on single post (hidden) | United the world through annoyance |

**E. The Commenter (3)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| Helpful Stranger | 1 comment | Giving advice to a stranger |
| Conversation Starter | 10 comments | Always have something to say |
| Internet Philosopher | 25 comments | Deep thoughts about shallow problems |

**F. Social Impact (3)**
| Badge | Threshold | Description |
|-------|-----------|-------------|
| You're Not Crazy | 5 relates received | 5 people agree |
| Relatable Pain | 25 relates received | Touched a nerve |
| Everyone Feels This | 100 relates received | Found a glitch in the Matrix |

**G. Special Milestones (3)**
| Badge | Threshold |
|-------|-----------|
| Nosey Neighbor | 5 users followed |
| OG Member | Account created before 2026-03-15 |
| Early Frikter | Account created before 2026-06-01 |

**H. Category Specialist (18 = 9 categories x 2)**
- {Category} Apprentice: 1 post in category
- {Category} Master: 5 posts in category

### Badge Check Triggers
`"create"`, `"relate"`, `"comment"`, `"impact"`, `"viral"`, `"follow"`, `"visit"`, `"explore"`, `"special"`, `"all"` (admin sync)

### Visit Streak Logic
- Consecutive days: streak increments
- 1 day missed: grace window (up to 2 misses), streak continues
- 2+ days missed: streak resets to 1
- Same day visit: no change

---

## 15. MISSION OF THE DAY

Rotates based on day of week:

| Day | Theme | Prompt | Category |
|-----|-------|--------|----------|
| Mon | Money | "What's one friction you hate about managing money?" | money |
| Tue | Work | "What's annoying about your daily work routine?" | work |
| Wed | Health | "What health-related friction do you face regularly?" | health |
| Thu | Tech | "What tech problem keeps bugging you?" | tech |
| Fri | Home | "What's frustrating about your home or living situation?" | home |
| Sat | Travel | "What travel or transport friction do you encounter?" | travel |
| Sun | Relationships | "What communication friction do you face with others?" | relationships |

---

## 16. RATE LIMITS & VALIDATION

| Action | Limit |
|--------|-------|
| Create Frikt | Max 10 per day per user |
| Title length | Min 10 chars |
| Comment length | Min 10 chars |
| Password | Min 6 chars |
| Search query | Min 2 chars |
| Self-relate | Blocked |
| Self-follow | Blocked |
| Duplicate relate | Blocked |
| Duplicate helpful | Blocked |

---

## 17. BLOCKED USERS

### Blocking Flow
1. `POST /api/users/{id}/block` → creates `blocked_users` document
2. Blocked user's content (frikts, comments) filtered from all queries for the blocker
3. Blocked user excluded from search results

### Unblocking
- `DELETE /api/users/{id}/block`

### Content Filtering
- `get_blocked_user_ids(user_id)` returns all blocked IDs
- Applied as `{"user_id": {"$nin": blocked_ids}}` to all content queries

---

## 18. ACCOUNT DELETION

1. `DELETE /api/users/me`
2. Hard-deletes user from `users` collection
3. Deletes all associated data: problems, comments, relates, helpfuls, notifications, push tokens, notification settings, user stats, achievements, follows, feedback, pending badges
4. Blocked users entries (both directions) cleaned up

---

## 19. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Expo (React Native), TypeScript, expo-router |
| Backend | FastAPI, Python 3.11 |
| Database | MongoDB (Atlas for production, local for dev) |
| Auth | JWT (30-day expiry), bcrypt for passwords |
| Token Storage | expo-secure-store (iOS/Android) |
| Push Notifications | Expo Push Notifications + Firebase (FCM) for Android |
| Email | Resend (password reset emails) |
| Hosting | Railway (backend), EAS Build (mobile builds) |
| Background Tasks | asyncio (notification batch processing every 60s) |

---

## 20. NOTIFICATION BATCHING INTERNALS

### Batch Windows
- **Relate batch:** 5 minute window
- **Comment batch:** 3 minute window

### Flow
1. Action occurs (relate/comment)
2. Check for existing pending batch for same recipient + target
3. If exists → add actor to batch, return `False` (don't send immediate)
4. If no existing batch, check for recently sent notification within window
5. If recently sent → create new pending batch, return `False`
6. If no recent notification → create batch marked as sent, return `True` (send immediate)

### Background Processor
- Runs every 60 seconds via asyncio
- Finds pending batches where `notification_sent=False` and `first_action_at` is older than the batch window
- Creates batched notification: "X, Y, and Z others related to your Frikt"
- Marks batch as sent

---

## END OF DOCUMENTATION
