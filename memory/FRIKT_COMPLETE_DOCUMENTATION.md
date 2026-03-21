# FRIKT App - Complete Technical Documentation

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
  - Login button → `POST /api/auth/login` → returns `{access_token, user}`
  - Forgot Password → navigates to `/forgot-password`
  - Create Account → navigates to `/register`

#### Register Screen (`/app/(auth)/register.tsx`)
- **How to get there:** Login screen → "Create Account"
- **Elements:**
  - Name input field (string, required)
  - Email input field (EmailStr, required)
  - Password input field (string, min 6 chars)
  - "Create Account" button
  - Terms & Privacy links
- **Actions:**
  - Register button → `POST /api/auth/register` → returns `{access_token, user}`
  - Creates new user in `users` collection
  - Auto-assigns "admin" role if email in ADMIN_EMAILS env var

#### Forgot Password Screen (`/app/(auth)/forgot-password.tsx`)
- **How to get there:** Login screen → "Forgot Password?"
- **Elements:**
  - Email input field
  - "Send Reset Code" button
  - Code input field (6 digits)
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
- **Elements:**
  - Header with notification bell (shows unread count badge)
  - Feed filter pills: "For You", "Trending", "New"
  - Mission of the Day card (optional)
  - FlatList of Frikt cards
  - Pull-to-refresh
  - Infinite scroll pagination
- **API Calls:**
  - Load feed → `GET /api/problems?feed={foryou|trending|new}&limit=50&skip=0`
  - Notification count → comes from NotificationContext
- **Data Source:** `problems` collection, filtered by `is_hidden=false, status=active`

#### Frikt Card Elements (within Home):
- User avatar + display name
- Timestamp (relative: "2h ago")
- Frikt title
- Category tag (colored pill)
- Relate button + count
- Comment button + count
- Save bookmark icon
- 3-dot menu (Report, Block User if not own post)

#### Search Screen (`/app/(tabs)/search.tsx`)
- **How to get there:** Bottom tab "Search"
- **Elements:**
  - Search input field
  - Tab pills: "Frikts", "Users"
  - Results list (Frikts or Users depending on tab)
- **API Calls:**
  - Search Frikts → `GET /api/problems?search={query}`
  - Search Users → `GET /api/users/search?q={query}`
- **Search Logic:**
  - Frikts: regex search on `title`, `when_happens`, `who_affected`
  - Users: regex search on `name`, `displayName`

#### Post Screen (`/app/(tabs)/post.tsx`)
- **How to get there:** Bottom tab "+" (center)
- **Elements:**
  - Title textarea (min 10 chars, required)
  - Category selector (9 options)
  - Frequency selector: Daily, Weekly, Monthly, Rare
  - Pain Level slider: 1-5
  - Willing to Pay: $0, $1-10, $10-50, $50+
  - "When does this happen?" textarea (optional)
  - "Who is affected?" textarea (optional)
  - "What have you tried?" textarea (optional)
  - Similar problems list (duplicate detection)
  - "Post" button
- **API Calls:**
  - Check similar → `GET /api/problems/similar?title={title}`
  - Create post → `POST /api/problems`
- **Data Created:**
  - New document in `problems` collection
  - Updates `user_stats.total_posts`
  - Triggers badge checks

#### Categories Screen (`/app/(tabs)/categories.tsx`)
- **How to get there:** Bottom tab "Categories"
- **Elements:**
  - List of 9 category cards
  - Each card shows: icon, name, follow button (+ or checkmark)
- **API Calls:**
  - Get categories → `GET /api/categories` (returns static CATEGORIES list)
  - Follow → `POST /api/categories/{category_id}/follow`
  - Unfollow → `DELETE /api/categories/{category_id}/follow`
- **Data Modified:** `users.followed_categories` array

#### Profile Screen (`/app/(tabs)/profile.tsx`)
- **How to get there:** Bottom tab "Profile"
- **Elements:**
  - Avatar image
  - Display name
  - City (if showCity=true)
  - Bio
  - Stats row: X Frikts, Y Comments, Z Relates
  - "Edit Profile" button
  - Menu items: My Posts, Saved, Badges, Settings section
  - Logout button
- **API Calls:**
  - Get profile → `GET /api/auth/me`
  - Get stats → calculated from user object
- **Data Source:** `users` collection

---

### 1.3 Detail Screens

#### Problem Detail Screen (`/app/problem/[id].tsx`)
- **How to get there:** Tap any Frikt card
- **Elements:**
  - Full Frikt details (title, category, frequency, pain, etc.)
  - User info (avatar, name)
  - Relate button
  - Save button
  - Follow button
  - Share button
  - Comments list
  - Comment input with quick-reply pills
  - 3-dot menu (Report, Block, Edit/Delete if owner)
- **API Calls:**
  - Get problem → `GET /api/problems/{problem_id}`
  - Get comments → `GET /api/problems/{problem_id}/comments`
  - Relate → `POST /api/problems/{problem_id}/relate`
  - Unrelate → `DELETE /api/problems/{problem_id}/relate`
  - Save → `POST /api/problems/{problem_id}/save`
  - Unsave → `DELETE /api/problems/{problem_id}/save`
  - Follow → `POST /api/problems/{problem_id}/follow`
  - Unfollow → `DELETE /api/problems/{problem_id}/follow`
  - Post comment → `POST /api/comments`

#### Quick Reply Pills:
- "I relate because..." - prefills comment
- "One thing I tried..." - prefills comment
- "Have you tried...?" - prefills comment

#### User Profile Screen (`/app/user/[id].tsx`)
- **How to get there:** Tap any user avatar/name
- **Elements:**
  - Avatar, name, city, bio
  - Follow/Unfollow button
  - Stats
  - User's Frikts list
- **API Calls:**
  - Get profile → `GET /api/users/{user_id}/profile`
  - Get posts → `GET /api/users/{user_id}/posts`
  - Follow → `POST /api/users/{user_id}/follow`
  - Unfollow → `DELETE /api/users/{user_id}/follow`

#### Category Detail Screen (`/app/category/[id].tsx`)
- **How to get there:** Tap category card or category pill on Frikt
- **Elements:**
  - Category header (icon, name, color)
  - Follow button
  - Frikts list filtered by category
- **API Calls:**
  - Get Frikts → `GET /api/problems?category_id={category_id}`

---

### 1.4 Settings & User Screens

#### Edit Profile (`/app/edit-profile.tsx`)
- **Elements:** Display name, Bio, City, Show City toggle, Avatar picker
- **API:** `PUT /api/users/me/profile`, `POST /api/users/me/avatar-base64`

#### My Posts (`/app/my-posts.tsx`)
- **Elements:** List of user's own Frikts
- **API:** `GET /api/users/me/posts`

#### Saved (`/app/saved.tsx`)
- **Elements:** List of saved Frikts
- **API:** `GET /api/users/me/saved`

#### Notifications (`/app/notifications.tsx`)
- **Elements:** List of notifications (relates, comments, badges)
- **API:** `GET /api/notifications`, `POST /api/notifications/read` (marks all read)

#### Notification Settings (`/app/notification-settings.tsx`)
- **Elements:** Toggles for push_notifications, new_comments, new_relates, trending
- **API:** `GET /api/push/settings`, `PUT /api/push/settings`

#### Change Password (`/app/change-password.tsx`)
- **API:** `POST /api/users/me/change-password`

#### Blocked Users (`/app/blocked-users.tsx`)
- **API:** `GET /api/users/me/blocked`, `DELETE /api/users/{user_id}/block`

#### Feedback (`/app/feedback.tsx`)
- **API:** `POST /api/feedback`

#### Terms (`/app/terms.tsx`) & Privacy Policy (`/app/privacy-policy.tsx`)
- Static content screens

---

### 1.5 Admin Panel (`/app/admin.tsx`)

**Access:** Only visible if user.role === "admin"

#### Tabs:

**Overview Tab:**
- Total users count
- Total Frikts count
- Total comments count
- Frikts today count
- New users today count
- **API:** `GET /api/admin/analytics`

**Feedback Tab:**
- List of user feedback submissions
- Mark as read/unread
- Delete
- **API:** `GET /api/admin/feedback`, `POST /api/admin/feedback/{id}/read`, `DELETE /api/admin/feedback/{id}`

**Reports Tab:**
- List of reported content (problems, comments, users)
- Filter by status: pending, reviewed, dismissed
- Actions: Dismiss, Mark Reviewed, Hide Content, Delete Content
- **API:** `GET /api/admin/reports`, `POST /api/admin/reports/{id}/dismiss`, `POST /api/admin/reports/{id}/reviewed`

**Broadcast Tab:**
- Title input
- Message textarea
- Send to: All Users / Admins Only toggle
- Send button
- **API:** `POST /api/admin/broadcast-notification`

**Users Tab:**
- Search users
- User list with status badges
- Actions: Ban, Shadowban, Unban
- **API:** `GET /api/admin/users`, `POST /api/admin/users/{id}/ban`, `POST /api/admin/users/{id}/shadowban`, `POST /api/admin/users/{id}/unban`

**Audit Tab:**
- Log of admin actions
- **API:** `GET /api/admin/audit-log`

---

## 2. USER TYPES AND PERMISSIONS

### Logged-out User
- **Can see:** Nothing - redirected to login screen
- **Can do:** Register, Login, Forgot Password

### Logged-in User (role: "user")
- **Can see:** All feeds, own profile, other profiles, categories
- **Can do:**
  - Create Frikts
  - Relate to others' Frikts (not own)
  - Comment on any Frikt
  - Save/Follow Frikts
  - Follow categories
  - Follow users
  - Edit own profile
  - Delete own posts/comments
  - Report content
  - Block users
  - Change password
  - Submit feedback

### Admin User (role: "admin")
- **All user permissions PLUS:**
- **Can see:** Admin panel with all tabs
- **Can do:**
  - View analytics
  - Review reports
  - Hide/Unhide posts
  - Delete any post/comment
  - Ban/Shadowban/Unban users
  - Send broadcast notifications
  - View audit log
  - Pin/Unpin posts
  - Mark posts as "needs context"
  - Merge duplicate posts

### Banned User (status: "banned")
- Cannot login (returns 403)

### Shadowbanned User (status: "shadowbanned")
- Can login and use app normally
- Their content is hidden from others
- They don't receive notifications

---

## 3. DATA MODEL

### Collection: `users`
```
id: string (UUID) - primary key
email: string (unique, lowercase)
name: string
password_hash: string
created_at: datetime
role: "user" | "admin"
status: "active" | "banned" | "shadowbanned"
displayName: string | null
avatarUrl: string | null
bio: string | null
city: string | null
showCity: boolean (default: false)
rocket10_completed: boolean
rocket10_day: int
rocket10_start_date: datetime | null
posts_today: int
last_post_date: string | null
streak_days: int
followed_categories: string[] - array of category IDs
followed_problems: string[] - array of problem IDs
saved_problems: string[] - array of problem IDs
```

### Collection: `problems`
```
id: string (UUID) - primary key
user_id: string - FK to users.id
user_name: string (denormalized)
user_avatar_url: string | null
title: string (min 10 chars)
category_id: string - one of CATEGORIES
frequency: "daily" | "weekly" | "monthly" | "rare" | null
pain_level: int 1-5 | null
willing_to_pay: "$0" | "$1-10" | "$10-50" | "$50+"
when_happens: string | null
who_affected: string | null
what_tried: string | null
created_at: datetime
relates_count: int (default 0)
comments_count: int (default 0)
unique_commenters: int (default 0)
signal_score: float (calculated)
reports_count: int (default 0)
is_hidden: boolean (default false)
status: "active" | "hidden" | "removed"
is_pinned: boolean (default false)
needs_context: boolean (default false)
merged_into: string | null - FK to problems.id
```

### Collection: `comments`
```
id: string (UUID) - primary key
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

### Collection: `notifications`
```
id: string (UUID)
user_id: string - FK to users.id
type: "new_comment" | "new_relate" | "problem_trending" | "new_follower" | "badge_earned" | "admin_broadcast"
problem_id: string | null
message: string
is_read: boolean (default false)
created_at: datetime
```

### Collection: `notification_settings`
```
user_id: string - FK to users.id
push_notifications: boolean (default true)
new_comments: boolean (default true)
new_relates: boolean (default true)
trending: boolean (default true)
```

### Collection: `push_tokens`
```
id: string (UUID)
user_id: string - FK to users.id
token: string - Expo push token
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
last_visit_date: string | null
streak_miss_count: int
posts_per_category: dict {category_id: count}
max_relates_on_single_post: int
```

### Collection: `user_achievements`
```
id: string (UUID)
user_id: string - FK to users.id
badge_id: string - key from BADGES dict
unlocked_at: datetime
```

### Collection: `pending_badge_notifications`
```
user_id: string
badge: dict {badge_id, name, icon, description}
created_at: datetime
```

### Collection: `pending_notification_batch`
```
batch_type: "relate_batch" | "comment_batch"
recipient_user_id: string
target_id: string (problem_id)
target_title: string
actor_user_ids: string[]
actor_user_names: string[]
created_at: datetime
last_updated: datetime
```

### Collection: `password_reset_tokens`
```
id: string (UUID)
user_id: string
token: string (6-digit code)
created_at: datetime
expires_at: datetime
used: boolean
```

### Collection: `feedback`
```
id: string (UUID)
user_id: string
user_email: string
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
details: string
created_at: datetime
```

### Collection: `follows` (user-to-user)
```
id: string (UUID)
follower_id: string - FK to users.id
following_id: string - FK to users.id
created_at: datetime
```

---

## 4. FRIKT LIFECYCLE

### Creating a Frikt

1. User taps "+" tab → Post Screen opens
2. User fills in:
   - `title` (required, min 10 chars)
   - `category_id` (required, default "other")
   - `frequency` (optional)
   - `pain_level` (optional, 1-5)
   - `willing_to_pay` (default "$0")
   - `when_happens` (optional)
   - `who_affected` (optional)
   - `what_tried` (optional)
3. As user types title, `GET /api/problems/similar?title={title}` shows potential duplicates
4. User taps "Post" → `POST /api/problems`

**Backend creates:**
```python
problem = Problem(
    user_id=user["id"],
    user_name=user["name"],
    user_avatar_url=user.get("avatarUrl"),
    title=data.title,
    category_id=data.category_id,
    frequency=data.frequency,
    pain_level=data.pain_level,
    willing_to_pay=data.willing_to_pay,
    when_happens=data.when_happens,
    who_affected=data.who_affected,
    what_tried=data.what_tried,
    relates_count=0,
    comments_count=0,
    unique_commenters=0,
    signal_score=0.0
)
```

**Gamification triggered:**
- `increment_user_stat(user_id, "total_posts")`
- `increment_category_posts(user_id, category_id)`
- `check_and_award_badges(user_id, user, stats, "post")`

### Where Frikts Appear

| Feed | Query | Sort |
|------|-------|------|
| New | `is_hidden=false, status=active` | `created_at DESC` |
| Trending | Same + `created_at >= 7 days ago` | `hot_score DESC` where `hot_score = (relates*3) + (comments*2) + unique_commenters` |
| For You | Same + `category_id IN user.followed_categories` | `engagement_score DESC` where `engagement = (relates*2) + (comments*1.5)` |

### Relate Flow

1. User taps "Relate" on Frikt
2. `POST /api/problems/{problem_id}/relate`
3. Backend:
   - Validates user isn't relating to own post
   - Creates `relates` document
   - Increments `problems.relates_count`
   - Recalculates `signal_score`
   - Updates relater's `user_stats.total_relates_given`
   - Updates author's `user_stats.total_relates_received`
   - Updates `max_relates_on_single_post` if applicable
   - Checks/awards badges for both users
   - Sends notification (batched if multiple in 3 min)
4. Returns `{relates_count, signal_score, newly_awarded_badges}`

### Comment Flow

1. User types comment or taps quick-reply
2. `POST /api/comments` with `{problem_id, content}`
3. Backend:
   - Creates `comments` document
   - Increments `problems.comments_count`
   - Increments `problems.unique_commenters` if first comment from this user
   - Recalculates `signal_score`
   - Updates `user_stats.total_comments`
   - Checks/awards badges
   - Notifies problem owner (batched)
   - Notifies followers of the problem

### Save Flow
- `POST /api/problems/{id}/save` → adds to `users.saved_problems[]`
- `DELETE /api/problems/{id}/save` → removes from array

### Follow Flow
- `POST /api/problems/{id}/follow` → adds to `users.followed_problems[]`
- User gets notifications when someone comments on followed Frikt

### Report Flow
1. User taps 3-dot menu → Report
2. Selects reason + optional details
3. `POST /api/report/problem/{id}` or `/report/comment/{id}` or `/report/user/{id}`
4. Creates `reports` document with status="pending"
5. Admin sees in Reports tab

---

## 5. FEED LOGIC

### Feed Loading (`GET /api/problems`)

**Parameters:**
- `feed`: "new" | "trending" | "foryou"
- `category_id`: optional filter
- `search`: optional text search
- `limit`: default 50
- `skip`: for pagination

**Base Query:**
```python
query = {"is_hidden": False, "status": "active"}
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

### Pagination
- Infinite scroll: client increments `skip` by `limit`
- FlatList `onEndReached` triggers load more

---

## 6. COMMENT SYSTEM

### Structure
- **Flat comments** (no threading/replies)
- Sorted by `helpful_count DESC`
- Min 10 characters

### Fields
```
id, problem_id, user_id, user_name, content, created_at, edited_at, helpful_count, is_pinned, status, reports_count
```

### Quick Reply Options
Tapping a quick reply pill prefills the comment input:
- "I relate because..."
- "One thing I tried..."
- "Have you tried...?"

### Helpful System
- Any user can mark any comment as "helpful"
- `POST /api/comments/{id}/helpful` → creates `helpfuls` document, increments `comments.helpful_count`
- `DELETE /api/comments/{id}/helpful` → removes and decrements

### Restrictions
- Must be logged in
- Content min 10 chars
- Can edit own comments
- Can delete own comments

---

## 7. NOTIFICATIONS

### Trigger Events

| Event | Type | Recipient | Message |
|-------|------|-----------|---------|
| Someone relates to your Frikt | new_relate | Frikt owner | "{name} related to your Frikt" |
| Someone comments on your Frikt | new_comment | Frikt owner | "{name} commented on your Frikt" |
| Someone comments on followed Frikt | new_comment | Followers | "New comment on a Frikt you follow" |
| Someone follows you | new_follower | Followed user | "{name} started following you" |
| Badge earned | badge_earned | Badge earner | "You earned: {badge_name}" |
| Admin broadcast | admin_broadcast | All/Admins | Custom message |

### Batching
- Multiple relates within 3 minutes are batched
- Multiple comments within 3 minutes are batched
- Batched notification: "3 people related to your Frikt"

### Delivery
1. **In-app:** Stored in `notifications` collection, badge count on bell icon
2. **Push:** Sent via Expo Push Notifications if enabled

### Settings (per user)
- `push_notifications`: master toggle
- `new_comments`: receive comment notifications
- `new_relates`: receive relate notifications
- `trending`: receive trending alerts

---

## 8. ADMIN PANEL

See Section 1.5 for full details.

---

## 9. AUTHENTICATION

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
- JWT stored in SecureStore (iOS/Android) or AsyncStorage (web)
- Token includes `{sub: user_id, exp: timestamp}`
- All authenticated requests include `Authorization: Bearer {token}`
- `get_current_user()` extracts and validates token
- `require_auth()` same but raises 401 if missing

### Password Reset
1. User enters email → `POST /api/auth/forgot-password`
2. Backend generates 6-digit code, stores in `password_reset_tokens`
3. Email sent via Resend
4. User enters code → `POST /api/auth/verify-reset-code`
5. User enters new password → `POST /api/auth/reset-password`

---

## 10. API STRUCTURE

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
| GET | /api/problems | Get feed |
| POST | /api/problems | Create Frikt |
| GET | /api/problems/similar | Find duplicates |
| GET | /api/problems/{id} | Get single Frikt |
| PATCH | /api/problems/{id} | Edit Frikt |
| DELETE | /api/problems/{id} | Delete Frikt |
| GET | /api/problems/{id}/related | Get related Frikts |
| POST | /api/problems/{id}/relate | Relate to Frikt |
| DELETE | /api/problems/{id}/relate | Unrelate |
| POST | /api/problems/{id}/save | Save Frikt |
| DELETE | /api/problems/{id}/save | Unsave |
| POST | /api/problems/{id}/follow | Follow Frikt |
| DELETE | /api/problems/{id}/follow | Unfollow |
| GET | /api/problems/{id}/comments | Get comments |

#### Comments
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/comments | Create comment |
| PUT | /api/comments/{id} | Edit comment |
| DELETE | /api/comments/{id} | Delete comment |
| POST | /api/comments/{id}/helpful | Mark helpful |
| DELETE | /api/comments/{id}/helpful | Unmark helpful |

#### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all categories |
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
| POST | /api/users/me/avatar | Upload avatar |
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
| POST | /api/problems/{id}/report | Report Frikt |
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
| POST | /api/admin/sync-all-user-stats | Sync all stats |
| POST | /api/admin/sync-user-stats/{id} | Sync user stats |
| GET | /api/admin/feedback | Get feedback |
| POST | /api/admin/feedback/{id}/read | Mark read |
| POST | /api/admin/feedback/{id}/unread | Mark unread |
| DELETE | /api/admin/feedback/{id} | Delete feedback |

---

## 11. SEARCH

### Frikt Search
- **Endpoint:** `GET /api/problems?search={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `title`, `when_happens`, `who_affected`
- **Query:**
```python
query["$or"] = [
    {"title": {"$regex": search, "$options": "i"}},
    {"when_happens": {"$regex": search, "$options": "i"}},
    {"who_affected": {"$regex": search, "$options": "i"}},
]
```

### User Search
- **Endpoint:** `GET /api/users/search?q={query}`
- **Type:** Case-insensitive regex
- **Fields searched:** `name`, `displayName`
- **Query:**
```python
query = {
    "status": {"$ne": "banned"},
    "$or": [
        {"name": {"$regex": q, "$options": "i"}},
        {"displayName": {"$regex": q, "$options": "i"}}
    ]
}
```

---

## 12. PROFILE & BADGES

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

**H. Category Specialist (18 = 9 categories × 2)**
- {Category} Apprentice: 1 post in category
- {Category} Master: 5 posts in category

### Badge Check Triggers
- `"post"`: After creating a Frikt
- `"relate"`: After relating to a Frikt
- `"comment"`: After commenting
- `"impact"`: When receiving relates
- `"viral"`: When a single post gets many relates
- `"follow"`: After following users
- `"visit"`: On daily app visit
- `"all"`: Full recalculation (admin sync)

---

## END OF DOCUMENTATION
