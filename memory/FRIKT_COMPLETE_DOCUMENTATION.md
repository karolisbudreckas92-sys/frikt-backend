# FRIKT App - Complete Technical Documentation

*Last updated: March 2026*

---

## 1. SCREEN INVENTORY

### 1.1 Authentication Screens

#### Login Screen (`/app/(auth)/login.tsx`)
- **How to get there:** App opens -> user not logged in -> redirected here
- **Elements:**
  - Email input field (EmailStr, required)
  - Password input field (string, required)
  - "Login" button
  - "Forgot Password?" link
  - "Create Account" link
- **Actions:**
  - Login button -> `POST /api/auth/login` -> returns `{access_token, user}`
  - Forgot Password -> navigates to `/forgot-password`
  - Create Account -> navigates to `/register`

#### Register Screen (`/app/(auth)/register.tsx`)
- **How to get there:** Login screen -> "Create Account"
- **Elements:**
  - Name input field (string, required)
  - Email input field (EmailStr, required)
  - Password input field (string, min 6 chars)
  - "Create Account" button
  - Terms & Privacy links
- **Actions:**
  - Register button -> `POST /api/auth/register` -> returns `{access_token, user}`
  - Creates new user in `users` collection
  - Auto-assigns "admin" role if email in ADMIN_EMAILS env var

#### Forgot Password Screen (`/app/(auth)/forgot-password.tsx`)
- **How to get there:** Login screen -> "Forgot Password?"
- **Elements:**
  - Email input field
  - "Send Reset Code" button
  - Code input field (6 digits)
  - New password field
  - "Reset Password" button
- **Actions:**
  - Send Reset Code -> `POST /api/auth/forgot-password` -> sends email via Resend
  - Verify Code -> `POST /api/auth/verify-reset-code`
  - Reset Password -> `POST /api/auth/reset-password`

---

### 1.2 Tab Screens (Main Navigation)

#### Home Screen (`/app/(tabs)/home.tsx`)
- **How to get there:** Bottom tab "Home" (default screen after login)
- **Elements:**
  - Header with logo "frikt", feedback icon, notification bell (shows unread count badge)
  - **Global/Local toggle** (pill-shaped segmented control)
  - Pull-to-refresh
  - Infinite scroll pagination

**Global mode (default):**
  - Feed filter pills: "For You", "Trending", "New"
  - Helper text per feed ("Based on your categories", "Hot this week", "Latest frikts")
  - Mission of the Day banner (dismissible)
  - FlatList of ProblemCards

**Local mode (when user has a community):**
  - Community header row: location icon, community name, member count
  - Sort pills: "Trending", "New", "Top"
  - FlatList of local ProblemCards (community-only frikts)

**Local mode (when user has NO community):**
  - Location icon (56px)
  - "Join a local community" title
  - "See what's bugging your neighbours" subtitle
  - Code input field + "Join" button (accepts invite code, case-insensitive)
  - Switch community alert if already in a different community (409 handling)
  - "or" divider
  - "Browse Communities" button -> navigates to Search screen Communities tab
  - "Want a local community? Request one here" link -> navigates to `/request-community`

- **API Calls:**
  - Load global feed -> `GET /api/problems?feed={foryou|trending|new}&limit=50&skip=0`
  - Load local feed -> `GET /api/problems?feed=local&community_id={id}&sort_by={trending|new|top}`
  - Load community -> `GET /api/communities/me`
  - Join community -> `POST /api/communities/join`
  - Switch community -> `POST /api/communities/switch`
  - Notification count -> comes from NotificationContext

#### ProblemCard Elements (used in Home, Search, Community Detail, Category Detail):
- Category tag (colored pill)
- **Local tag** (coral location pin icon + "Local" text, only shown when `is_local=true`)
- Frikt title
- Timestamp (relative: "2h ago")
- Relate button + count
- Comment button + count

#### Search Screen (`/app/(tabs)/search.tsx`)
- **How to get there:** Bottom tab "Search"
- **Elements:**
  - Search input field
  - Tab buttons: "Frikts", "People", "Communities"

**Frikts tab:**
  - Shows search results from `GET /api/problems?search={query}`
  - Displays ProblemCards

**People tab:**
  - Shows results from `GET /api/users/search?q={query}`
  - Displays user cards with avatar, displayName, bio, posts count
  - Tap -> navigates to `/user/{id}`

**Communities tab:**
  - Shows results from `GET /api/communities?search={query}`
  - If no search query, shows all communities
  - Displays community name, member count, frikt count
  - Tap -> navigates to `/community/{id}`
  - Empty state: "Want a local community? Request one here" -> `/request-community`

#### Post Screen (`/app/(tabs)/post.tsx`)
- **How to get there:** Bottom tab "+" (Post)
- **Elements:**
  - Title input (required, min 10 chars)
  - **"Post to {community_name}" toggle** (only if user has a community)
  - Category picker (disabled/auto-set to "Local" when local toggle is ON)
  - Similar problems indicator (real-time as user types)
  - Optional fields:
    - Frequency (daily/weekly/monthly/rare)
    - Pain level (1-5)
    - Willing to pay ($0/$1-10/$10-50/$50+)
    - When it happens (text)
    - Who's affected (text)
    - What I've tried (text)
  - "Post" button
- **API Calls:**
  - Similar check -> `GET /api/problems/similar?title={title}` (or with `is_local=true&community_id={id}`)
  - Submit -> `POST /api/problems`

#### Categories Screen (`/app/(tabs)/categories.tsx`)
- **How to get there:** Bottom tab "Categories"
- **Elements:**
  - Grid of 10 category cards (icon, name, color, frikt count)
  - Follow/Unfollow button per card
  - "Local" card navigates to Home (Local tab) instead of category detail
- **Actions:**
  - Follow -> `POST /api/categories/{id}/follow`
  - Unfollow -> `DELETE /api/categories/{id}/follow`
  - Tap card -> `/category/{id}` (or Home for "Local")

#### Profile Screen (`/app/(tabs)/profile.tsx`)
- **How to get there:** Bottom tab "Profile"
- **Elements:**
  - Avatar (tappable to edit)
  - Display name, bio, city
  - **Community card** (if member): community name, member count, "Leave" button
  - Stats: posts count, comments count, relates count
  - Badge progress bar + unlocked badge count
  - Menu links: Edit Profile, My Posts, Saved, Notifications, Badges, Settings
- **Settings sub-menu:**
  - Change Password
  - Blocked Users
  - Send Feedback
  - Terms of Service
  - Privacy Policy
  - Delete Account
  - Logout

---

### 1.3 Detail Screens

#### Problem Detail Screen (`/app/problem/[id].tsx`)
- **How to get there:** Tap any ProblemCard
- **Elements:**
  - Category tag + Local tag (if applicable)
  - Frikt title
  - Author name (tappable -> user profile) + avatar + timestamp
  - Detail fields: frequency, pain level, when, who, what tried
  - Relate button + count
  - Save button
  - Follow button
  - Share button
  - Report button (3-dot menu)
  - **For local frikts:** community name banner + membership status
  - **Comments section:**
    - Top-level comments sorted by `helpful_count DESC`
    - Each comment: user name, content, timestamp, helpful button+count, reply button
    - Replies nested under parent, sorted by `created_at ASC`
    - Soft-deleted comments show "[deleted]" for content and username
    - `is_community_member` badge on comments for local frikts
  - **Comment input:** text field + quick reply pills
  - Related frikts section at bottom

#### Quick Reply Pills:
- "I relate because..."
- "One thing I tried..."
- "Have you tried...?"

#### Community Detail Screen (`/app/community/[id].tsx`)
- **How to get there:** Search -> Communities tab -> Tap community
- **Elements:**
  - Community name, location icon
  - Member count, frikt count
  - **If member:** "Your Community" badge, community feed (FlatList of ProblemCards)
  - **If not member, no pending request:** "Request to Join" banner with optional message input
  - **If pending request:** "Request Pending" badge
- **API Calls:**
  - Load -> `GET /api/communities/{id}`
  - Request join -> `POST /api/communities/{id}/request-join`
  - Feed -> `GET /api/problems?feed=local&community_id={id}`

#### User Profile Screen (`/app/user/[id].tsx`)
- **How to get there:** Tap any username
- **Elements:**
  - Avatar, display name, bio, city
  - **Community tag** (if user has one)
  - Stats row: posts, comments, relates
  - Follow/Unfollow button
  - User's posts list (sortable: newest/top)
  - Badge gallery

#### Category Detail Screen (`/app/category/[id].tsx`)
- **How to get there:** Categories grid -> Tap card
- **Elements:**
  - Category header: icon, name, color
  - Follow/Unfollow button
  - FlatList of frikts in this category

#### Request Community Screen (`/app/request-community.tsx`)
- **How to get there:** Home Local tab -> "Request one here" link, or Search Communities empty state
- **Elements:**
  - Email input (pre-filled with user's email)
  - Community name input
  - Description input (optional)
  - "Submit Request" button
- **API Call:** `POST /api/community-requests`
- **Outcome:** Request created with `expires_at = created_at + 3 days`. Admin reviews in Communities tab.

---

### 1.4 Settings & User Screens

#### Edit Profile (`/app/edit-profile.tsx`)
- Fields: displayName, bio, city, showCity toggle, avatar upload
- API: `PUT /api/users/me/profile`, `POST /api/users/me/avatar` or `POST /api/users/me/avatar-base64`

#### My Posts (`/app/my-posts.tsx`)
- Shows all user's posts (including hidden/removed)
- API: `GET /api/users/me/posts`

#### Saved (`/app/saved.tsx`)
- Shows saved frikts
- API: `GET /api/users/me/saved`

#### Notifications (`/app/notifications.tsx`)
- List of notifications with unread badge
- API: `GET /api/notifications`, `POST /api/notifications/read`

#### Notification Settings (`/app/notification-settings.tsx`)
- Toggles: push_notifications (master), new_comments, new_relates, trending
- API: `GET /api/push/settings`, `PUT /api/push/settings`

#### Change Password (`/app/change-password.tsx`)
- API: `POST /api/users/me/change-password`

#### Blocked Users (`/app/blocked-users.tsx`)
- API: `GET /api/users/me/blocked`, `DELETE /api/users/{id}/block`

#### Feedback (`/app/feedback.tsx`)
- API: `POST /api/feedback`

#### Terms (`/app/terms.tsx`) & Privacy Policy (`/app/privacy-policy.tsx`)
- Static content screens

---

### 1.5 Admin Panel (`/app/admin.tsx`)

- **How to get there:** Only visible if `user.role === "admin"`. Profile -> Admin Panel.
- **Requires:** `role: "admin"` (auto-assigned if email in ADMIN_EMAILS env var)

#### Tabs:

**Dashboard Tab:**
- Total users, problems, comments, reports
- Pending community requests count, pending join requests count
- Quick analytics overview

**Content Tab:**
- List of all problems with search/filter
- Actions per problem: Hide, Unhide, Delete, Pin, Unpin, Needs Context, Clear Context, Merge
- Comment management: Hide, Unhide, Delete

**Users Tab:**
- List of all users with search
- Actions: Ban, Shadowban, Unban
- View user details: email, role, status, post count, join date, stats sync

**Reports Tab:**
- List of reported problems, comments, and users
- Filter by type (problem/comment/user) and status (pending/reviewed/dismissed)
- Actions: Dismiss, Mark Reviewed

**Analytics Tab:**
- User growth over time
- Post creation trends
- Category distribution
- Top frikts by engagement
- **LOCAL section:** community stats, local frikt count, member distribution

**Broadcast Tab:**
- Send push notification to all users or admins only
- Title + message + optional link
- Broadcast history with delivery stats
- Debug push tokens list
- Test push to specific user

**Communities Tab:**
- **Community Requests section:** Pending new community creation requests (filtered: non-expired only)
  - Approve/reject actions
- **Create Community:** Name + code + moderator email form
- **Active Communities list:** Name, code, member count, frikt count, pending join requests
  - Change code action
- **Join Requests per community:** Pending, non-expired requests
  - "Send Code" action (opens mailto with invite code)
- **Export:** Download community data as anonymous `.txt` file (period filter: all/7d/30d/90d)

**Feedback Tab:**
- List of user feedback submissions
- Mark read/unread, delete

**Audit Log Tab:**
- Chronological log of all admin actions
- Filterable by action type

**Stats Sync:**
- Sync all user stats (recalculates from DB)
- Sync individual user stats

---

## 2. USER TYPES AND PERMISSIONS

### Logged-out User
- Cannot access the app (redirected to login)
- Can register and login
- Can request password reset

### Logged-in User (role: "user")
- View global feeds (New, Trending, For You)
- View and interact with local feed (if community member)
- Create frikts (max 10/day)
- Relate to frikts (not own, community-gated for local)
- Comment and reply (min 10 chars)
- Mark comments as helpful
- Edit/delete own comments and frikts
- Save and follow frikts
- Follow/unfollow categories
- Follow/unfollow users
- Search frikts, users, communities
- View user profiles and badges
- Join/leave/switch communities via invite code
- Request to join a community
- Request creation of a new community
- Block/unblock users
- Report frikts, comments, users
- Edit profile, change password
- Manage notification settings
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
- Hide/unhide/delete any frikt
- Pin/unpin frikts
- Mark frikts as "needs context"
- Merge duplicate frikts
- Hide/unhide/delete any comment
- Ban/shadowban/unban users
- Review and dismiss reports
- Send broadcast notifications
- View analytics dashboard
- Create communities, change invite codes
- Approve/reject community requests
- View and manage join requests
- Export community data
- View audit log
- Sync user stats
- Manage feedback
- Debug push tokens

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
user_id: string - FK to users.id
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
community_id: string | null - FK to communities.id
```

### Collection: `comments`
```
id: string (UUID)
problem_id: string - FK to problems.id
user_id: string - FK to users.id
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
user_id: string - FK to users.id
community_id: string - FK to communities.id
joined_at: datetime
```
**Constraint:** A user can only belong to 1 community at a time (enforced in application logic).

### Collection: `community_join_requests`
```
id: string (UUID)
user_id: string - FK to users.id
user_email: string
community_id: string - FK to communities.id
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
problem_id: string - FK to problems.id
user_id: string - FK to users.id
created_at: datetime
```
**Unique constraint:** (problem_id, user_id)

### Collection: `helpfuls`
```
id: string (UUID)
comment_id: string - FK to comments.id
user_id: string - FK to users.id
created_at: datetime
```
**Unique constraint:** (comment_id, user_id)

### Collection: `notifications`
```
id: string (UUID)
user_id: string - FK to users.id
type: string ("new_comment" | "new_relate" | "comment_reply" | "new_follower" | "badge_earned" | "admin_broadcast" | "batched_relate_batch" | "batched_comment_batch")
problem_id: string
message: string
is_read: boolean (default false)
created_at: datetime
```

### Collection: `notification_settings`
```
user_id: string - FK to users.id
push_notifications: boolean (default true) — master toggle
new_comments: boolean (default true)
new_relates: boolean (default true)
trending: boolean (default true)
```

### Collection: `push_tokens`
```
id: string (UUID)
user_id: string - FK to users.id
token: string (Expo push token)
created_at: datetime
is_active: boolean (default true)
```

### Collection: `reports`
```
id: string (UUID)
reporter_id: string - FK to users.id
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
blocker_user_id: string - FK to users.id
blocked_user_id: string - FK to users.id
created_at: datetime
```

### Collection: `user_stats`
```
user_id: string - FK to users.id
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
user_id: string - FK to users.id
badge_id: string
unlocked_at: datetime
```

### Collection: `pending_badge_notifications`
```
user_id: string - FK to users.id
badge: dict ({badge_id, name, icon, description, unlocked_at})
created_at: datetime
```

### Collection: `pending_notification_batches`
```
id: string (UUID)
recipient_user_id: string - FK to users.id
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
user_id: string - FK to users.id
token: string (6-digit code)
email: string
expires_at: datetime (1 hour from creation)
used: boolean (default false)
created_at: datetime
```

### Collection: `feedback`
```
id: string (UUID)
user_id: string - FK to users.id
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
follower_id: string - FK to users.id
following_id: string - FK to users.id
created_at: datetime
```

---

## 4. FRIKT LIFECYCLE

### Creating a Global Frikt

1. User taps "+" tab -> Post Screen opens
2. User fills in:
   - `title` (required, min 10 chars)
   - Local toggle: OFF (default)
   - `category_id` (required, default "other")
   - `frequency` (optional)
   - `pain_level` (optional, 1-5)
   - `willing_to_pay` (default "$0")
   - `when_happens` (optional)
   - `who_affected` (optional)
   - `what_tried` (optional)
3. As user types title, `GET /api/problems/similar?title={title}` shows potential duplicates
4. User taps "Post" -> `POST /api/problems`

**Backend creates:**
- New document in `problems` collection with `is_local=false, community_id=null`
- Rate limit: max 10 Frikts per day per user

**Gamification triggered:**
- `increment_user_stat(user_id, "total_posts")`
- `increment_category_posts(user_id, category_id)`
- `check_and_award_badges(user_id, user, stats, "create")`

### Creating a Local Frikt

1. User taps "+" tab -> Post Screen opens
2. User toggles "Post to {community_name}" ON
3. `category_id` auto-set to "local"
4. User fills title and optional fields
5. Similar problems checked against community context: `GET /api/problems/similar?title={title}&is_local=true&community_id={id}`
6. `POST /api/problems` with `is_local=true`

**Backend:**
- Validates user is a community member (403 if not)
- Sets `community_id` from user's membership
- Forces `category_id = "local"`
- Frikt only appears in local feed, never in global feeds

### Where Frikts Appear

| Feed | Query Filter | Sort | Excludes Local? |
|------|-------------|------|-----------------|
| New | `is_hidden=false, status=active, is_local != true` | `created_at DESC` | Yes |
| Trending | Same + `created_at >= 7 days ago` | `hot_score DESC` | Yes |
| For You | Same + `category_id IN user.followed_categories` | `engagement_score DESC` | Yes |
| Local (Trending) | `is_local=true, community_id={id}, created_at >= 7 days` | `hot_score DESC` | N/A |
| Local (New) | `is_local=true, community_id={id}` | `created_at DESC` | N/A |
| Local (Top) | `is_local=true, community_id={id}` | `relates_count DESC` | N/A |

**Hot score formula:** `(relates_count * 3) + (comments_count * 2) + unique_commenters`
**Engagement score formula:** `(relates_count * 2) + (comments_count * 1.5)`

### Relate Flow

1. User taps "Relate" on Frikt
2. `POST /api/problems/{problem_id}/relate`
3. Backend:
   - Validates user isn't relating to own post
   - **For local frikts:** validates user is a community member (403 if not)
   - Creates `relates` document
   - Increments `problems.relates_count`
   - Recalculates `signal_score`
   - Updates relater's `user_stats.total_relates_given`
   - Updates author's `user_stats.total_relates_received`
   - Updates `max_relates_on_single_post` if applicable
   - Checks/awards badges for both users
   - Sends notification (batched if multiple in 5 min)
4. Returns `{relates_count, signal_score, newly_awarded_badges}`

### Comment Flow (Top-Level)

1. User types comment or taps quick-reply
2. `POST /api/comments` with `{problem_id, content}`
3. Backend:
   - Creates `comments` document with `parent_comment_id=null`
   - Increments `problems.comments_count`
   - Increments `problems.unique_commenters` if first comment from this user
   - Recalculates `signal_score`
   - Updates `user_stats.total_comments`
   - Checks/awards badges
   - Notifies problem owner (batched)
   - Notifies followers of the problem

### Reply Flow (Threaded)

1. User taps "Reply" on a comment
2. Reply UI appears (referencing parent comment)
3. `POST /api/comments` with `{problem_id, content, parent_comment_id, reply_to_user_id}`
4. Backend:
   - If replying to a reply (nested), **flattens** to the top-level parent: sets `parent_comment_id` to the root comment
   - Resolves `reply_to_user_name` from `reply_to_user_id`
   - Creates comment document with threading fields
   - Same stats/gamification as top-level comment
   - Sends reply notification to the user whose Reply was tapped (if different from problem owner and current user)

### Comment Deletion

- **Hard delete:** Comment with no replies -> permanently removed from DB, decrements `comments_count`
- **Soft delete:** Comment with replies -> `status="removed"`, `content="[deleted]"`, `user_name="[deleted]"`. Replies are preserved under it. Count not decremented.
- Deleting also removes associated `helpfuls` records (hard delete only)

### Save Flow
- `POST /api/problems/{id}/save` -> adds to `users.saved_problems[]`
- `DELETE /api/problems/{id}/save` -> removes from array

### Follow Flow
- `POST /api/problems/{id}/follow` -> adds to `users.followed_problems[]`
- User gets notifications when someone comments on followed Frikt

### Report Flow
1. User taps 3-dot menu -> Report
2. Selects reason + optional details
3. `POST /api/report/problem/{id}` or `/report/comment/{id}` or `/report/user/{id}`
4. Creates `reports` document with status="pending"
5. Admin sees in Reports tab

---

## 5. FEED LOGIC

### Feed Loading (`GET /api/problems`)

**Parameters:**
- `feed`: "new" | "trending" | "foryou" | "local"
- `category_id`: optional filter
- `community_id`: required when feed="local"
- `sort_by`: for local feed - "trending" | "new" | "top"
- `search`: optional text search
- `limit`: default 50
- `skip`: for pagination

**Base Query:**
```python
query = {"is_hidden": False, "status": "active"}
# Global feeds exclude local frikts
if feed in ("new", "trending", "foryou"):
    query["is_local"] = {"$ne": True}
if user:
    blocked_ids = get_blocked_user_ids(user_id)
    query["user_id"] = {"$nin": blocked_ids}
```

### NEW Feed
```python
sort = [("created_at", -1)]
problems = db.problems.find(query).sort(sort).skip(skip).limit(limit)
```

### TRENDING Feed
```python
week_ago = datetime.utcnow() - timedelta(days=7)
query["created_at"] = {"$gte": week_ago}
pipeline = [
    {"$match": query},
    {"$addFields": {
        "hot_score": {
            "$add": [
                {"$multiply": ["$relates_count", 3]},
                {"$multiply": ["$comments_count", 2]},
                "$unique_commenters"
            ]
        }
    }},
    {"$sort": {"hot_score": -1, "created_at": -1}},
    {"$skip": skip},
    {"$limit": limit}
]
```

### FOR YOU Feed
```python
followed_cats = user.get("followed_categories", [])
if followed_cats:
    query["category_id"] = {"$in": followed_cats}
    pipeline = [
        {"$match": query},
        {"$addFields": {
            "engagement_score": {
                "$add": [
                    {"$multiply": ["$relates_count", 2]},
                    {"$multiply": ["$comments_count", 1.5]}
                ]
            }
        }},
        {"$sort": {"engagement_score": -1, "created_at": -1}}
    ]
else:
    # Fallback to NEW feed
```

### LOCAL Feed
```python
query["is_local"] = True
query["community_id"] = community_id
if sort_by == "new":
    sort = [("created_at", -1)]
elif sort_by == "top":
    sort = [("relates_count", -1)]
else:  # trending (default)
    # Uses hot_score aggregation, same as global trending, filtered to last 7 days
```

### Similar Problems (`GET /api/problems/similar`)
- Context-aware: `is_local=true&community_id={id}` searches only within community
- Default (no is_local): searches only global frikts (`is_local != true`)
- Keyword-based search on title words > 3 characters

### Pagination
- Infinite scroll: client increments `skip` by `limit`
- FlatList `onEndReached` triggers load more

---

## 6. COMMENT SYSTEM

### Structure
- **Threaded comments** with one level of nesting
- Top-level comments have `parent_comment_id = null`
- Replies have `parent_comment_id` pointing to a top-level comment
- Replies-to-replies are **flattened** to the top-level parent
- Sorted by `helpful_count DESC` for top-level, `created_at ASC` for replies

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
  "replies": [
    {
      "id": "uuid",
      "user_name": "string",
      "content": "string",
      "parent_comment_id": "parent-uuid",
      "reply_to_user_name": "string",
      "is_community_member": true
    }
  ]
}
```

### Threading Rules
- `parent_comment_id`: null for top-level, top-level comment's ID for replies
- `reply_to_user_id/reply_to_user_name`: identifies which user's reply button was tapped (can differ from parent comment author when replying within a thread)
- **Flatten rule:** If a reply targets another reply (not a top-level comment), the backend resolves the chain and sets `parent_comment_id` to the root top-level comment
- **Status validation:** Only `status='hidden'` (admin action) blocks new replies. `status='removed'` (user soft-delete) allows the thread to continue. This prevents entire threads from freezing when someone deletes their top-level comment.

### Soft Delete Behavior
- When deleting a comment that has replies:
  - `status` set to "removed"
  - `content` set to "[deleted]"
  - `user_name` set to "[deleted]"
  - Replies are preserved
  - **New replies can still be posted** in the thread — `status='removed'` does not block threading
  - In GET responses, soft-deleted comments show "[deleted]" for both content and user_name
- When deleting a comment with no replies: permanently removed
- **Admin-hidden comments** (`status='hidden'`) block all new replies to that thread

### `is_community_member` Field
- Added to each comment when the parent problem is a local frikt
- `true` if the commenter is a member of the problem's community
- `true` for all comments on global frikts (not applicable)

### Quick Reply Options
Tapping a quick reply pill prefills the comment input:
- "I relate because..."
- "One thing I tried..."
- "Have you tried...?"

### Helpful System
- Any user can mark any comment as "helpful"
- `POST /api/comments/{id}/helpful` -> creates `helpfuls` document, increments `comments.helpful_count`
- `DELETE /api/comments/{id}/helpful` -> removes and decrements

### Restrictions
- Must be logged in
- Content min 10 chars
- Can edit own comments
- Can delete own comments
- Cannot reply to a soft-deleted comment (`status != "active"` returns 400)

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
- Multiple relates within 5 minutes are batched into a single notification
- Multiple comments within 3 minutes are batched into a single notification
- Batched notification example: "3 people related to your Frikt"
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
1. User enters invite code on Home Local tab or knows the code
2. `POST /api/communities/join` with `{code}` (case-insensitive matching via regex)
3. Outcomes:
   - **Success (200):** User joined, community data returned
   - **Already in same community (400):** "You are already a member"
   - **Already in different community (409):** Returns current + new community names. Frontend shows Switch alert.
   - **Invalid code (404):** "Invalid community code"
4. Switch: `POST /api/communities/switch` with new code -> leaves old, joins new

### Leaving Flow
- `DELETE /api/communities/leave`
- Removes membership. Local frikts user posted remain in the community feed.

### Request to Join Flow
1. User browses communities in Search -> Communities tab
2. Taps a community -> Community Detail Screen
3. If not a member, sees "Request to Join" banner
4. Fills optional message + taps "Request to Join"
5. `POST /api/communities/{id}/request-join`
6. Creates a join request with `expires_at = created_at + 7 days`
7. Admin sees request in Communities tab, clicks "Send Code" which opens mailto with invite code
8. **Expired requests** (older than 7 days) are automatically filtered out from admin views

### Request New Community Flow
1. User taps "Request one here" on Home Local tab or empty state in Search Communities
2. `/request-community` screen: fills email, community name, optional description
3. `POST /api/community-requests`
4. Creates a community request with `expires_at = created_at + 3 days`
5. Admin sees in Communities tab -> Community Requests section
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

## 9. ADMIN PANEL

See Section 1.5 for full screen details and Section 8 for Communities tab specifics.

---

## 10. AUTHENTICATION

### Sign-up Flow
1. `POST /api/auth/register` with `{name, email, password}`
2. Email validated with regex
3. Check for existing email (case-insensitive)
4. Password hashed with bcrypt
5. User created with role="user" (or "admin" if email in ADMIN_EMAILS)
6. JWT token generated (30 day expiry)
7. Returns `{access_token, user}`

### Sign-in Flow
1. `POST /api/auth/login` with `{email, password}`
2. Find user by lowercase email
3. Verify password hash
4. Check status != "banned"
5. Generate JWT token
6. Returns `{access_token, user}`

### Token Management
- JWT stored in SecureStore (iOS/Android) via `expo-secure-store`
- Token includes `{sub: user_id, exp: timestamp}`
- All authenticated requests include `Authorization: Bearer {token}`
- `get_current_user()` extracts and validates token (optional auth)
- `require_auth()` same but raises 401 if missing (required auth)

### Password Reset
1. User enters email -> `POST /api/auth/forgot-password`
2. Backend generates 6-digit code, stores in `password_reset_tokens` (expires in 1 hour)
3. Email sent via Resend
4. User enters code -> `POST /api/auth/verify-reset-code`
5. User enters new password -> `POST /api/auth/reset-password`

---

## 11. CATEGORIES

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

The "local" category is automatically assigned to local frikts. It cannot be manually selected by users; it is set when the local toggle is activated.

---

## 12. SIGNAL SCORE

### Formula
```
base_score = (relates * 3) + (comments * 2) + (unique_commenters * 1) + pain_bonus
recency_boost = linear decay from 2.0 to 0 over 72 hours
final_score = base_score + recency_boost
```

### Weights
| Component | Weight | Description |
|-----------|--------|-------------|
| relate | 3.0 | Most valuable — shows resonance |
| comment | 2.0 | Engagement |
| unique_commenter | 1.0 | Bonus per unique person |
| pain_base | 0.5 | Multiplied by pain level (1-5) |
| frequency_daily | 1.0 | Daily friction bonus |
| frequency_weekly | 0.5 | Weekly friction bonus |
| frequency_monthly | 0.25 | Monthly friction bonus |
| recency_max_boost | 2.0 | Max boost for brand new posts |
| recency_decay_hours | 72 | Hours until boost = 0 |

### Key Principle
Posts with interaction ALWAYS beat posts without (except very new posts with recency boost).

---

## 13. API STRUCTURE

### Public Endpoints (no auth required)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-reset-code`
- `POST /api/auth/reset-password`
- `GET /api/categories`
- `GET /api/health`
- `GET /api/`

### Auth Required Endpoints
All other endpoints require valid JWT token.

### Complete Endpoint List

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
| GET | /api/problems | Get feed (global or local) |
| POST | /api/problems | Create Frikt (global or local) |
| GET | /api/problems/similar | Find duplicates (context-aware) |
| GET | /api/problems/{id} | Get single Frikt (includes community info for local) |
| PATCH | /api/problems/{id} | Edit Frikt |
| DELETE | /api/problems/{id} | Delete Frikt |
| GET | /api/problems/{id}/related | Get related Frikts |
| POST | /api/problems/{id}/relate | Relate to Frikt (community-gated for local) |
| DELETE | /api/problems/{id}/relate | Unrelate |
| POST | /api/problems/{id}/save | Save Frikt |
| DELETE | /api/problems/{id}/save | Unsave |
| POST | /api/problems/{id}/follow | Follow Frikt |
| DELETE | /api/problems/{id}/follow | Unfollow |
| GET | /api/problems/{id}/comments | Get threaded comments |
| POST | /api/problems/{id}/report | Report Frikt (legacy) |

#### Comments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/comments | Create comment or reply |
| PUT | /api/comments/{id} | Edit comment |
| DELETE | /api/comments/{id} | Delete comment (hard or soft) |
| POST | /api/comments/{id}/helpful | Mark helpful |
| DELETE | /api/comments/{id}/helpful | Unmark helpful |

#### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all 10 categories |
| POST | /api/categories/{id}/follow | Follow category |
| DELETE | /api/categories/{id}/follow | Unfollow category |

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
| POST | /api/communities/join | Join community via invite code |
| POST | /api/communities/switch | Switch to new community |
| DELETE | /api/communities/leave | Leave current community |
| GET | /api/communities | List all communities (searchable) |
| GET | /api/communities/me | Get user's current community |
| GET | /api/communities/{id} | Get community detail (is_member, has_pending_request) |
| POST | /api/community-requests | Request new community creation |
| POST | /api/communities/{id}/request-join | Request to join a community |

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

#### Badges
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/badges/definitions | Get all badge definitions |

#### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/mission | Get mission of the day |
| POST | /api/feedback | Submit feedback |
| GET | /api/health | Health check |

#### Admin (requires admin role)
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
| POST | /api/admin/broadcast-notification | Send broadcast |
| GET | /api/admin/broadcast-history | Get broadcasts |
| GET | /api/admin/broadcast-stats | Get broadcast stats |
| GET | /api/admin/debug-push-tokens | Debug push tokens |
| POST | /api/admin/test-push | Test push notification |
| GET | /api/admin/users | List users |
| GET | /api/admin/users/{id} | Get user details |
| POST | /api/admin/users/{id}/ban | Ban user |
| POST | /api/admin/users/{id}/shadowban | Shadowban user |
| POST | /api/admin/users/{id}/unban | Unban user |
| GET | /api/admin/analytics | Get analytics |
| GET | /api/admin/audit-log | Get audit log |
| POST | /api/admin/sync-all-user-stats | Sync all user stats |
| POST | /api/admin/sync-user-stats/{id} | Sync single user |

#### Admin Communities
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/communities | Create community |
| PUT | /api/admin/communities/{id}/code | Change invite code |
| GET | /api/admin/communities | List communities with stats |
| GET | /api/admin/community-requests | Get community creation requests (non-expired) |
| GET | /api/admin/communities/{id}/join-requests | Get join requests (non-expired, pending) |
| PUT | /api/admin/communities/{id}/join-requests/{id} | Update join request (mark sent) |
| GET | /api/admin/communities/{id}/export | Export community data (anonymous) |

#### Admin Feedback
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/feedback | Get all feedback |
| POST | /api/admin/feedback/{id}/read | Mark read |
| POST | /api/admin/feedback/{id}/unread | Mark unread |
| DELETE | /api/admin/feedback/{id} | Delete feedback |

---

## 14. SEARCH

### Frikt Search
- **Endpoint:** `GET /api/problems?search={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `title`, `when_happens`, `who_affected`
- **Includes local frikts:** Yes — when a search parameter is present, the `is_local` filter is NOT applied. Local and global frikts appear together in search results.
```python
# Local frikts excluded from feeds, but NOT from search
if feed in ("new", "trending", "foryou") and not search:
    query["is_local"] = {"$ne": True}
# When search is present, is_local filter is skipped
query["$or"] = [
    {"title": {"$regex": search, "$options": "i"}},
    {"when_happens": {"$regex": search, "$options": "i"}},
    {"who_affected": {"$regex": search, "$options": "i"}},
]
```

### User Search
- **Endpoint:** `GET /api/users/search?q={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `name`, `normalizedDisplayName`
```python
query = {
    "status": "active",
    "$or": [
        {"normalizedDisplayName": {"$regex": q, "$options": "i"}},
        {"name": {"$regex": q, "$options": "i"}}
    ]
}
```

### Community Search
- **Endpoint:** `GET /api/communities?search={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `name`
- **Returns:** Communities with `member_count` and `frikt_count`

---

## 15. PROFILE & BADGES

### Profile Fields (User-editable)
- `displayName` - shown publicly
- `bio` - shown publicly
- `city` - shown if `showCity=true`
- `showCity` - toggle
- `avatarUrl` - uploaded image

### Profile Fields (System-managed)
- `email` - not editable after signup
- `name` - original signup name
- `created_at` - account creation date
- `role` - user/admin
- `status` - active/banned/shadowbanned
- `followed_categories`, `followed_problems`, `saved_problems`
- `streak_days`, `posts_today`

### Badge System

45 total badges across categories:

**A. Visit Streaks (5)**
- Just Browsing: 2 day streak
- Hooked: 7 day streak
- Regular Visitor: 14 day streak
- Mayor of Frikt: 30 day streak
- I Love Problems: 100 day streak

**B. Explorer (3)**
- Curious Human: 3 Frikts opened
- Nosey: 25 Frikts opened
- Rabbit Hole: 100 Frikts opened

**C. The Relater (5)**
- Not Alone: 1 relate given
- Empathy Expert: 10 relates given
- Honorary Therapist: 50 relates given
- Community Pillar: 200 relates given
- Frikt Saint: 500 relates given

**D. Friction Creator (5)**
- First Vent: 1 post created
- Professional Hater: 5 posts created
- Certified Complainer: 10 posts created
- Drama Influencer: 20+ relates on single post (hidden)
- Universal Problem: 50+ relates on single post (hidden)

**E. The Commenter (3)**
- Helpful Stranger: 1 comment
- Conversation Starter: 10 comments
- Internet Philosopher: 25 comments

**F. Social Impact (3)**
- You're Not Crazy: 5 relates received (total)
- Relatable Pain: 25 relates received
- Everyone Feels This: 100 relates received

**G. Special Milestones (3)**
- Nosey Neighbor: 5 users followed
- OG Member: Account created before 2026-03-15
- Early Frikter: Account created before 2026-06-01

**H. Category Specialist (18 = 9 categories x 2)**
- {Category} Apprentice: 1 post in category
- {Category} Master: 5 posts in category

### Badge Check Triggers
- `"create"`: After creating a Frikt
- `"relate"`: After relating to a Frikt
- `"comment"`: After commenting
- `"impact"`: When receiving relates
- `"viral"`: When a single post gets many relates
- `"follow"`: After following users
- `"visit"`: On daily app visit
- `"explore"`: After opening a Frikt
- `"special"`: Date-based badges (on visit)
- `"all"`: Full recalculation (admin sync)

### Visit Streak Logic
- Consecutive days: streak increments
- 1 day missed: grace window (up to 2 misses allowed), streak continues
- 2+ days missed: streak resets to 1
- Same day visit: no change

---

## 16. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | Expo (React Native), TypeScript, expo-router |
| Backend | FastAPI, Python |
| Database | MongoDB (Atlas for production, local for dev) |
| Auth | JWT (30-day expiry), bcrypt for passwords |
| Token Storage | expo-secure-store (iOS/Android) |
| Push Notifications | Expo Push Notifications + Firebase (FCM) for Android |
| Email | Resend (password reset emails) |
| Hosting | Railway (backend), EAS Build (mobile builds) |
| Background Tasks | asyncio (notification batch processing every 60s) |

---

## 17. MISSION OF THE DAY

Rotates based on day of week (7 missions):

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

## 18. RATE LIMITS & VALIDATION

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

## 19. BLOCKED USERS

### Blocking Flow
1. `POST /api/users/{id}/block`
2. Creates `blocked_users` document
3. Blocked user's content (frikts, comments) is filtered out from all queries for the blocker
4. Blocked user's search results are filtered out

### Unblocking
- `DELETE /api/users/{id}/block`

### Content Filtering
- `get_blocked_user_ids(user_id)` returns list of all user IDs blocked by the current user
- This list is applied as `{"user_id": {"$nin": blocked_ids}}` to all content queries

---

## 20. ACCOUNT DELETION

1. `DELETE /api/users/me`
2. Hard-deletes user document from `users` collection
3. Deletes all associated data: problems, comments, relates, helpfuls, notifications, push tokens, notification settings, user stats, achievements, follows, feedback, pending badges
4. Blocked users entries (both directions) are cleaned up

---

## END OF DOCUMENTATION
