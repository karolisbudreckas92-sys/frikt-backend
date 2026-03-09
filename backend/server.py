from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile
from fastapi import File as FastAPIFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import re
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import secrets
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import httpx

# Optional import for resend (email service)
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logging.warning("resend package not installed - password reset emails will be disabled")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'pathgro_db')]

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET', 'pathgro-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Admin Settings
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip()]

# Email Settings (Resend)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_NAME = "FRIKT"
RESET_TOKEN_EXPIRE_HOURS = 1  # Password reset tokens expire after 1 hour

# Initialize Resend if API key is present and package is available
if RESEND_API_KEY and RESEND_AVAILABLE:
    resend.api_key = RESEND_API_KEY

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="FRIKT API")
api_router = APIRouter(prefix="/api")

# Create uploads directory
UPLOADS_DIR = Path("/app/backend/uploads/avatars")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static files for serving uploaded avatars
app.mount("/api/uploads", StaticFiles(directory="/app/backend/uploads"), name="uploads")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

# Predefined Categories
CATEGORIES = [
    {"id": "money", "name": "Money", "icon": "cash-outline", "color": "#10B981"},
    {"id": "work", "name": "Work", "icon": "briefcase-outline", "color": "#3B82F6"},
    {"id": "health", "name": "Health", "icon": "heart-outline", "color": "#EF4444"},
    {"id": "home", "name": "Home", "icon": "home-outline", "color": "#F59E0B"},
    {"id": "tech", "name": "Tech", "icon": "hardware-chip-outline", "color": "#8B5CF6"},
    {"id": "school", "name": "School", "icon": "school-outline", "color": "#EC4899"},
    {"id": "relationships", "name": "Relationships", "icon": "people-outline", "color": "#F97316"},
    {"id": "travel", "name": "Travel/Transport", "icon": "car-outline", "color": "#06B6D4"},
    {"id": "services", "name": "Services", "icon": "construct-outline", "color": "#84CC16"},
]

FREQUENCY_OPTIONS = ["daily", "weekly", "monthly", "rare"]
PAIN_LEVELS = [1, 2, 3, 4, 5]
WILLING_TO_PAY = ["$0", "$1-10", "$10-50", "$50+"]

# ===================== GAMIFICATION SYSTEM =====================

# Test accounts to exclude from OG/Early badges
TEST_ACCOUNTS = ["velvetcrumb", "noxloop", "graydrizzle", "toastedblip", "cuatropatas", "eleclerk", "driftmoss"]

# Badge definitions - 45 total (27 core + 18 category)
BADGES = {
    # A. Visit Streaks (5 badges)
    "streak_2": {"name": "Just Browsing", "icon": "👀", "threshold": 2, "category": "streak",
                 "description": "You're starting to like the drama, aren't you?"},
    "streak_7": {"name": "Hooked", "icon": "🍿", "threshold": 7, "category": "streak",
                 "description": "One week of pure friction. Welcome home."},
    "streak_14": {"name": "Regular Visitor", "icon": "☕", "threshold": 14, "category": "streak",
                  "description": "You check Frikt more than your bank account."},
    "streak_30": {"name": "Mayor of Frikt", "icon": "🏛️", "threshold": 30, "category": "streak",
                  "description": "You basically live here now. Want a key?"},
    "streak_100": {"name": "I Love Problems", "icon": "🤯", "threshold": 100, "category": "streak",
                   "description": "100 days of complaining. Seek help. (Just kidding, keep going)."},
    
    # B. Explorer (3 badges)
    "explorer_3": {"name": "Curious Human", "icon": "🧭", "threshold": 3, "category": "explorer",
                   "description": "Just a quick peek at other people's misery."},
    "explorer_25": {"name": "Nosey", "icon": "🕵️", "threshold": 25, "category": "explorer",
                    "description": "Admit it, you love a good gossip session."},
    "explorer_100": {"name": "Rabbit Hole", "icon": "🕳️", "threshold": 100, "category": "explorer",
                     "description": "You've officially scrolled to the bottom of human frustration."},
    
    # C. The Relater (5 badges)
    "relater_1": {"name": "Not Alone", "icon": "🫂", "threshold": 1, "category": "relater",
                  "description": "First time feeling someone else's pain. It bonds us."},
    "relater_10": {"name": "Empathy Expert", "icon": "🤝", "threshold": 10, "category": "relater",
                   "description": "You're the friend everyone needs but nobody deserves."},
    "relater_50": {"name": "Honorary Therapist", "icon": "🛋️", "threshold": 50, "category": "relater",
                   "description": "You've listened to more problems than a professional."},
    "relater_200": {"name": "Community Pillar", "icon": "🧱", "threshold": 200, "category": "relater",
                    "description": "The glue holding this frustrated community together."},
    "relater_500": {"name": "Frikt Saint", "icon": "😇", "threshold": 500, "category": "relater",
                    "description": "You have the patience of a god. Or you're just very bored."},
    
    # D. Friction Creator (5 badges)
    "creator_1": {"name": "First Vent", "icon": "💣", "threshold": 1, "category": "creator",
                  "description": "It feels good to let it out, doesn't it?"},
    "creator_5": {"name": "Professional Hater", "icon": "🎤", "threshold": 5, "category": "creator",
                  "description": "You clearly have a lot to complain about. We love it."},
    "creator_10": {"name": "Certified Complainer", "icon": "📢", "threshold": 10, "category": "creator",
                   "description": "Official Karen status achieved. Management is terrified."},
    "drama_influencer": {"name": "Drama Influencer", "icon": "🤳", "threshold": 20, "category": "viral", "hidden": True,
                         "description": "Your misfortune is officially our entertainment."},
    "universal_problem": {"name": "Universal Problem", "icon": "🌍", "threshold": 50, "category": "viral", "hidden": True,
                          "description": "You've united the world through a shared annoyance."},
    
    # E. The Commenter (3 badges)
    "commenter_1": {"name": "Helpful Stranger", "icon": "💬", "threshold": 1, "category": "commenter",
                    "description": "Giving advice to a stranger. How noble."},
    "commenter_10": {"name": "Conversation Starter", "icon": "🗣️", "threshold": 10, "category": "commenter",
                     "description": "You always have something to say, don't you?"},
    "commenter_25": {"name": "Internet Philosopher", "icon": "🧠", "threshold": 25, "category": "commenter",
                     "description": "Deep thoughts about shallow problems."},
    
    # F. Social Impact (3 badges)
    "impact_5": {"name": "You're Not Crazy", "icon": "😅", "threshold": 5, "category": "impact",
                 "description": "5 people agree: that thing is definitely annoying."},
    "impact_25": {"name": "Relatable Pain", "icon": "🔥", "threshold": 25, "category": "impact",
                  "description": "You've touched a nerve. 25 nerves, to be exact."},
    "impact_100": {"name": "Everyone Feels This", "icon": "🌎", "threshold": 100, "category": "impact",
                   "description": "Congratulations, you've found a glitch in the Matrix."},
    
    # G. Special Milestones (3 badges)
    "follow_5": {"name": "Nosey Neighbor", "icon": "🕵️‍♂️", "threshold": 5, "category": "special",
                 "description": "You want to know what everyone's complaining about, don't you?"},
    "og_member": {"name": "OG Member", "icon": "🛡️", "threshold": None, "category": "special",
                  "description": "You were here before it was cool. A true Frikt-ster.",
                  "date_before": "2026-03-15"},
    "early_frikter": {"name": "Early Frikter", "icon": "🚀", "threshold": None, "category": "special",
                      "description": "You saw the potential in complaining early on.",
                      "date_before": "2026-06-01"},
}

# Category badges - generated dynamically for each category
CATEGORY_IDS = ["money", "work", "health", "home", "tech", "school", "relationships", "travel", "services"]
CATEGORY_NAMES = {
    "money": "Money", "work": "Work", "health": "Health", "home": "Home",
    "tech": "Tech", "school": "School", "relationships": "Relationships",
    "travel": "Travel", "services": "Services"
}

# Add category badges to BADGES dict
for cat_id in CATEGORY_IDS:
    cat_name = CATEGORY_NAMES[cat_id]
    BADGES[f"category_{cat_id}_apprentice"] = {
        "name": f"{cat_name} Apprentice", "icon": "🎓", "threshold": 1,
        "category": "category_specialist", "category_id": cat_id,
        "description": f"New to the {cat_name} drama."
    }
    BADGES[f"category_{cat_id}_master"] = {
        "name": f"{cat_name} Master", "icon": "👑", "threshold": 5,
        "category": "category_specialist", "category_id": cat_id,
        "description": f"You are the final boss of {cat_name} problems."
    }

# User Stats Model
class UserStats(BaseModel):
    user_id: str
    total_posts: int = 0
    total_relates_given: int = 0
    total_relates_received: int = 0
    total_comments: int = 0
    total_frikts_opened: int = 0
    users_followed: int = 0
    current_visit_streak: int = 0
    last_visit_date: Optional[str] = None
    streak_miss_count: int = 0
    posts_per_category: dict = {}
    max_relates_on_single_post: int = 0

# User Achievement Model
class UserAchievement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    badge_id: str
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    role: str = "user"  # "user" | "admin"
    status: str = "active"  # "active" | "banned" | "shadowbanned"
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    showCity: bool = False
    rocket10_completed: bool = False
    rocket10_day: int = 0
    rocket10_start_date: Optional[datetime] = None
    posts_today: int = 0
    last_post_date: Optional[str] = None
    streak_days: int = 0
    followed_categories: List[str] = []
    followed_problems: List[str] = []
    saved_problems: List[str] = []

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    displayName: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    showCity: bool = False
    created_at: datetime
    role: str = "user"
    status: str = "active"
    rocket10_completed: bool
    streak_days: int
    followed_categories: List[str]

class ProfileUpdate(BaseModel):
    displayName: str
    bio: Optional[str] = None
    city: Optional[str] = None
    showCity: Optional[bool] = False
    avatarUrl: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Problem Models
class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=10)
    category_id: str = "other"
    frequency: Optional[str] = None
    pain_level: Optional[int] = Field(None, ge=1, le=5)
    willing_to_pay: Optional[str] = "$0"
    when_happens: Optional[str] = None
    who_affected: Optional[str] = None
    what_tried: Optional[str] = None
    is_problem_not_solution: bool = True

class Problem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_avatar_url: Optional[str] = None
    title: str
    category_id: str
    frequency: Optional[str] = None
    pain_level: Optional[int] = None
    willing_to_pay: str = "$0"
    when_happens: Optional[str] = None
    who_affected: Optional[str] = None
    what_tried: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    relates_count: int = 0
    comments_count: int = 0
    unique_commenters: int = 0
    signal_score: float = 0.0
    reports_count: int = 0
    is_hidden: bool = False
    # Admin fields
    status: str = "active"  # "active" | "hidden" | "removed"
    is_pinned: bool = False
    needs_context: bool = False
    merged_into: Optional[str] = None  # ID of primary problem if this is a duplicate

class ProblemResponse(Problem):
    category_name: str = ""
    category_color: str = ""
    user_has_related: bool = False
    user_has_saved: bool = False
    user_is_following: bool = False

# Comment Models
class CommentCreate(BaseModel):
    problem_id: str
    content: str = Field(..., min_length=10)

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    problem_id: str
    user_id: str
    user_name: str
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    edited_at: Optional[datetime] = None
    helpful_count: int = 0
    is_pinned: bool = False
    status: str = "active"  # "active" | "hidden" | "removed"
    reports_count: int = 0

class CommentResponse(Comment):
    user_marked_helpful: bool = False

# Relate Model
class Relate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    problem_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helpful Model (for comments)
class Helpful(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    comment_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Notification Model
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "new_comment", "new_relate", "problem_trending"
    problem_id: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Mission of the Day
class MissionOfDay(BaseModel):
    theme: str
    prompt: str
    category_id: Optional[str] = None

MISSIONS = [
    MissionOfDay(theme="Money", prompt="What's one friction you hate about managing money?", category_id="money"),
    MissionOfDay(theme="Work", prompt="What's annoying about your daily work routine?", category_id="work"),
    MissionOfDay(theme="Health", prompt="What health-related friction do you face regularly?", category_id="health"),
    MissionOfDay(theme="Tech", prompt="What tech problem keeps bugging you?", category_id="tech"),
    MissionOfDay(theme="Home", prompt="What's frustrating about your home or living situation?", category_id="home"),
    MissionOfDay(theme="Travel", prompt="What travel or transport friction do you encounter?", category_id="travel"),
    MissionOfDay(theme="Relationships", prompt="What communication friction do you face with others?", category_id="relationships"),
]

# Push Token Model
class PushToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class PushTokenCreate(BaseModel):
    token: str

# Notification Settings Model
class NotificationSettings(BaseModel):
    user_id: str
    push_notifications: bool = True  # Global toggle
    new_comments: bool = True
    new_relates: bool = True
    trending: bool = True

class NotificationSettingsUpdate(BaseModel):
    push_notifications: Optional[bool] = None  # Global toggle
    new_comments: Optional[bool] = None
    new_relates: Optional[bool] = None
    trending: Optional[bool] = None

# Report Model (for posts and comments)
REPORT_REASONS = ["spam", "harassment", "hate", "sexual", "other", "abuse", "off-topic", "duplicate"]

class Report(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reporter_id: str
    reporter_name: str
    target_type: str  # "problem" | "comment"
    target_id: str
    reason: str  # spam, abuse, off-topic, duplicate
    details: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # "pending" | "reviewed" | "dismissed"

class ReportCreate(BaseModel):
    target_type: str
    target_id: str
    reason: str
    details: Optional[str] = None

# Blocked User Model
class BlockedUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    blocker_user_id: str
    blocked_user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class PasswordResetToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    email: str
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Admin Audit Log Model
class AdminAuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_email: str
    action: str  # "hide_post", "unhide_post", "delete_post", "ban_user", etc.
    target_type: str  # "problem" | "comment" | "user"
    target_id: str
    details: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Notification Batching Model
class PendingNotificationBatch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    recipient_user_id: str  # User who will receive the notification
    batch_type: str  # "relate_batch" | "comment_batch"
    target_id: str  # problem_id for relates/comments
    target_title: str  # Frikt title for the notification message
    user_ids: List[str] = []  # List of user IDs who triggered the action
    user_names: List[str] = []  # List of user names for the notification
    first_action_at: datetime = Field(default_factory=datetime.utcnow)
    last_action_at: datetime = Field(default_factory=datetime.utcnow)
    notification_sent: bool = False

# Batching constants
RELATE_BATCH_WINDOW_MINUTES = 5
COMMENT_BATCH_WINDOW_MINUTES = 3

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id})
        return user
    except jwt.PyJWTError:
        return None

async def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Check if user is banned
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Your account has been suspended")
    return user

def is_admin(user: dict) -> bool:
    """Check if user has admin role"""
    return user.get("role") == "admin"

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Require admin role for route access"""
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def log_admin_action(admin: dict, action: str, target_type: str, target_id: str, details: dict = None):
    """Log admin actions for audit trail"""
    log_entry = AdminAuditLog(
        admin_id=admin["id"],
        admin_email=admin["email"],
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details
    )
    await db.admin_audit_logs.insert_one(log_entry.dict())
    logger.info(f"Admin action: {admin['email']} performed {action} on {target_type}/{target_id}")

# ===================== NOTIFICATION BATCHING HELPERS =====================

async def add_to_notification_batch(
    recipient_user_id: str,
    batch_type: str,  # "relate_batch" or "comment_batch"
    target_id: str,
    target_title: str,
    actor_user_id: str,
    actor_user_name: str
) -> bool:
    """
    Add an action to a notification batch. Returns True if this is the first action
    (immediate notification should be sent), False if batched.
    """
    now = datetime.utcnow()
    
    # Check if there's an existing pending batch for this recipient + target
    existing_batch = await db.pending_notification_batches.find_one({
        "recipient_user_id": recipient_user_id,
        "batch_type": batch_type,
        "target_id": target_id,
        "notification_sent": False
    })
    
    if existing_batch:
        # Add to existing batch
        if actor_user_id not in existing_batch.get("user_ids", []):
            await db.pending_notification_batches.update_one(
                {"id": existing_batch["id"]},
                {
                    "$push": {
                        "user_ids": actor_user_id,
                        "user_names": actor_user_name
                    },
                    "$set": {"last_action_at": now}
                }
            )
        return False  # Batched, don't send immediate notification
    
    # Check if we recently sent a notification for this target
    window_minutes = RELATE_BATCH_WINDOW_MINUTES if batch_type == "relate_batch" else COMMENT_BATCH_WINDOW_MINUTES
    cutoff_time = now - timedelta(minutes=window_minutes)
    
    recent_sent = await db.pending_notification_batches.find_one({
        "recipient_user_id": recipient_user_id,
        "batch_type": batch_type,
        "target_id": target_id,
        "notification_sent": True,
        "last_action_at": {"$gte": cutoff_time}
    })
    
    if recent_sent:
        # Create new pending batch (notification was recently sent)
        batch = PendingNotificationBatch(
            recipient_user_id=recipient_user_id,
            batch_type=batch_type,
            target_id=target_id,
            target_title=target_title,
            user_ids=[actor_user_id],
            user_names=[actor_user_name],
            first_action_at=now,
            last_action_at=now,
            notification_sent=False
        )
        await db.pending_notification_batches.insert_one(batch.dict())
        return False  # Batched, don't send immediate
    
    # No recent notification, this is the first action - send immediately
    # But also create a batch record to track the window
    batch = PendingNotificationBatch(
        recipient_user_id=recipient_user_id,
        batch_type=batch_type,
        target_id=target_id,
        target_title=target_title,
        user_ids=[actor_user_id],
        user_names=[actor_user_name],
        first_action_at=now,
        last_action_at=now,
        notification_sent=True  # Mark as sent since we're sending immediately
    )
    await db.pending_notification_batches.insert_one(batch.dict())
    return True  # Send immediate notification

def format_batch_notification_message(user_names: List[str], action_type: str) -> str:
    """Format a batched notification message."""
    if len(user_names) == 0:
        return ""
    elif len(user_names) == 1:
        return f"{user_names[0]} {action_type}"
    elif len(user_names) == 2:
        return f"{user_names[0]} and {user_names[1]} {action_type}"
    else:
        others_count = len(user_names) - 2
        return f"{user_names[0]}, {user_names[1]}, and {others_count} others {action_type}"

async def process_pending_notification_batches():
    """Process and send pending notification batches that have expired their window."""
    now = datetime.utcnow()
    
    # Find relate batches older than 5 minutes
    relate_cutoff = now - timedelta(minutes=RELATE_BATCH_WINDOW_MINUTES)
    relate_batches = await db.pending_notification_batches.find({
        "batch_type": "relate_batch",
        "notification_sent": False,
        "last_action_at": {"$lte": relate_cutoff}
    }).to_list(100)
    
    # Find comment batches older than 3 minutes
    comment_cutoff = now - timedelta(minutes=COMMENT_BATCH_WINDOW_MINUTES)
    comment_batches = await db.pending_notification_batches.find({
        "batch_type": "comment_batch",
        "notification_sent": False,
        "last_action_at": {"$lte": comment_cutoff}
    }).to_list(100)
    
    all_batches = relate_batches + comment_batches
    
    for batch in all_batches:
        try:
            user_names = batch.get("user_names", [])
            target_title = batch.get("target_title", "your Frikt")[:40]
            target_id = batch.get("target_id")
            recipient_id = batch.get("recipient_user_id")
            
            if batch["batch_type"] == "relate_batch":
                action_text = "related to your Frikt"
                title = "New relates!"
            else:
                action_text = "commented on your Frikt"
                title = "New comments!"
            
            message = format_batch_notification_message(user_names, action_text)
            
            if message:
                # Create in-app notification
                notification = Notification(
                    user_id=recipient_id,
                    type="batched_" + batch["batch_type"],
                    problem_id=target_id,
                    message=message
                )
                await db.notifications.insert_one(notification.dict())
                
                # Send push notification
                await send_notification_to_user(
                    recipient_id,
                    title,
                    message,
                    {"type": batch["batch_type"], "problemId": target_id}
                )
            
            # Mark batch as sent
            await db.pending_notification_batches.update_one(
                {"id": batch["id"]},
                {"$set": {"notification_sent": True}}
            )
            
        except Exception as e:
            logger.error(f"Error processing notification batch {batch.get('id')}: {e}")
    
    # Cleanup old batches (older than 24 hours)
    cleanup_cutoff = now - timedelta(hours=24)
    await db.pending_notification_batches.delete_many({
        "notification_sent": True,
        "last_action_at": {"$lte": cleanup_cutoff}
    })

# Background task to process batches
notification_batch_task_running = False

async def notification_batch_processor():
    """Background task that runs every minute to process pending batches."""
    global notification_batch_task_running
    if notification_batch_task_running:
        return
    
    notification_batch_task_running = True
    try:
        while True:
            await asyncio.sleep(60)  # Check every minute
            try:
                await process_pending_notification_batches()
            except Exception as e:
                logger.error(f"Error in notification batch processor: {e}")
    finally:
        notification_batch_task_running = False

# ===================== GAMIFICATION HELPERS =====================

async def get_or_create_user_stats(user_id: str) -> dict:
    """Get user stats, creating default if not exists"""
    stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    if not stats:
        stats = UserStats(user_id=user_id).dict()
        await db.user_stats.insert_one(stats)
        # Re-fetch without _id to ensure clean dict
        stats = await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})
    return stats

async def update_user_stats(user_id: str, updates: dict) -> dict:
    """Update user stats and return the updated document"""
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$set": updates},
        upsert=True
    )
    return await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})

async def increment_user_stat(user_id: str, field: str, amount: int = 1) -> dict:
    """Increment a numeric stat field"""
    await get_or_create_user_stats(user_id)  # Ensure stats exist
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$inc": {field: amount}}
    )
    return await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})

async def increment_category_posts(user_id: str, category_id: str) -> dict:
    """Increment posts count for a specific category"""
    await get_or_create_user_stats(user_id)
    await db.user_stats.update_one(
        {"user_id": user_id},
        {"$inc": {f"posts_per_category.{category_id}": 1}}
    )
    return await db.user_stats.find_one({"user_id": user_id}, {"_id": 0})

async def has_badge(user_id: str, badge_id: str) -> bool:
    """Check if user already has a badge"""
    existing = await db.user_achievements.find_one({"user_id": user_id, "badge_id": badge_id})
    return existing is not None

async def award_badge(user_id: str, badge_id: str) -> Optional[dict]:
    """Award a badge to user if not already earned. Returns badge info if newly awarded."""
    if await has_badge(user_id, badge_id):
        return None
    
    badge_info = BADGES.get(badge_id)
    if not badge_info:
        return None
    
    achievement = UserAchievement(user_id=user_id, badge_id=badge_id)
    await db.user_achievements.insert_one(achievement.dict())
    
    logger.info(f"Badge awarded: {badge_id} to user {user_id}")
    return {
        "badge_id": badge_id,
        "name": badge_info["name"],
        "icon": badge_info["icon"],
        "description": badge_info["description"],
        "unlocked_at": achievement.unlocked_at.isoformat()
    }

async def check_and_award_badges(user_id: str, user: dict, stats: dict, trigger: str) -> List[dict]:
    """
    Check and award badges based on trigger event.
    Returns list of newly awarded badges.
    """
    newly_awarded = []
    
    # Streak badges
    if trigger in ["visit", "all"]:
        streak = stats.get("current_visit_streak", 0)
        streak_thresholds = [
            ("streak_2", 2), ("streak_7", 7), ("streak_14", 14),
            ("streak_30", 30), ("streak_100", 100)
        ]
        for badge_id, threshold in streak_thresholds:
            if streak >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Explorer badges
    if trigger in ["explore", "all"]:
        opened = stats.get("total_frikts_opened", 0)
        explorer_thresholds = [("explorer_3", 3), ("explorer_25", 25), ("explorer_100", 100)]
        for badge_id, threshold in explorer_thresholds:
            if opened >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Relater badges (giving relates)
    if trigger in ["relate", "all"]:
        relates_given = stats.get("total_relates_given", 0)
        relater_thresholds = [
            ("relater_1", 1), ("relater_10", 10), ("relater_50", 50),
            ("relater_200", 200), ("relater_500", 500)
        ]
        for badge_id, threshold in relater_thresholds:
            if relates_given >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Creator badges
    if trigger in ["create", "all"]:
        total_posts = stats.get("total_posts", 0)
        creator_thresholds = [("creator_1", 1), ("creator_5", 5), ("creator_10", 10)]
        for badge_id, threshold in creator_thresholds:
            if total_posts >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Commenter badges
    if trigger in ["comment", "all"]:
        total_comments = stats.get("total_comments", 0)
        commenter_thresholds = [("commenter_1", 1), ("commenter_10", 10), ("commenter_25", 25)]
        for badge_id, threshold in commenter_thresholds:
            if total_comments >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Social Impact badges (relates received)
    if trigger in ["impact", "all"]:
        relates_received = stats.get("total_relates_received", 0)
        impact_thresholds = [("impact_5", 5), ("impact_25", 25), ("impact_100", 100)]
        for badge_id, threshold in impact_thresholds:
            if relates_received >= threshold:
                badge = await award_badge(user_id, badge_id)
                if badge:
                    newly_awarded.append(badge)
    
    # Viral badges (Drama Influencer, Universal Problem)
    if trigger in ["viral", "all"]:
        max_relates = stats.get("max_relates_on_single_post", 0)
        if max_relates >= 20:
            badge = await award_badge(user_id, "drama_influencer")
            if badge:
                newly_awarded.append(badge)
        if max_relates >= 50:
            badge = await award_badge(user_id, "universal_problem")
            if badge:
                newly_awarded.append(badge)
    
    # Follow badge
    if trigger in ["follow", "all"]:
        users_followed = stats.get("users_followed", 0)
        if users_followed >= 5:
            badge = await award_badge(user_id, "follow_5")
            if badge:
                newly_awarded.append(badge)
    
    # Category badges
    if trigger in ["create", "category", "all"]:
        posts_per_cat = stats.get("posts_per_category", {})
        for cat_id in CATEGORY_IDS:
            cat_posts = posts_per_cat.get(cat_id, 0)
            if cat_posts >= 1:
                badge = await award_badge(user_id, f"category_{cat_id}_apprentice")
                if badge:
                    newly_awarded.append(badge)
            if cat_posts >= 5:
                badge = await award_badge(user_id, f"category_{cat_id}_master")
                if badge:
                    newly_awarded.append(badge)
    
    # Special date-based badges (check user creation date)
    if trigger in ["special", "all"]:
        # Check if user is a test account
        username = user.get("name", "").lower()
        if username not in TEST_ACCOUNTS:
            created_at = user.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                
                # OG Member - before March 15, 2026
                og_date = datetime(2026, 3, 15)
                if created_at < og_date:
                    badge = await award_badge(user_id, "og_member")
                    if badge:
                        newly_awarded.append(badge)
                
                # Early Frikter - before June 1, 2026
                early_date = datetime(2026, 6, 1)
                if created_at < early_date:
                    badge = await award_badge(user_id, "early_frikter")
                    if badge:
                        newly_awarded.append(badge)
    
    return newly_awarded

async def update_visit_streak(user_id: str) -> tuple[dict, bool]:
    """
    Update visit streak logic with grace window.
    Returns (updated_stats, is_qualifying_visit)
    """
    stats = await get_or_create_user_stats(user_id)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    last_visit = stats.get("last_visit_date")
    current_streak = stats.get("current_visit_streak", 0)
    streak_miss_count = stats.get("streak_miss_count", 0)
    
    # If already visited today, no change
    if last_visit == today:
        return stats, False
    
    is_qualifying = True
    
    if last_visit:
        last_date = datetime.strptime(last_visit, "%Y-%m-%d")
        today_date = datetime.strptime(today, "%Y-%m-%d")
        days_diff = (today_date - last_date).days
        
        if days_diff == 1:
            # Consecutive day - reset miss count, increment streak
            current_streak += 1
            streak_miss_count = 0
        elif days_diff <= 2:
            # 1 day missed - grace window, increment miss count
            streak_miss_count += 1
            if streak_miss_count <= 2:
                current_streak += 1
            else:
                # Too many misses, reset streak
                current_streak = 1
                streak_miss_count = 0
        else:
            # More than 2 days missed - reset streak
            current_streak = 1
            streak_miss_count = 0
    else:
        # First ever visit
        current_streak = 1
        streak_miss_count = 0
    
    # Update stats
    updated_stats = await update_user_stats(user_id, {
        "last_visit_date": today,
        "current_visit_streak": current_streak,
        "streak_miss_count": streak_miss_count
    })
    
    return updated_stats, is_qualifying

async def get_user_badges_status(user_id: str, user: dict) -> dict:
    """Get complete badge status for a user"""
    stats = await get_or_create_user_stats(user_id)
    achievements = await db.user_achievements.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(100)
    
    unlocked_badge_ids = {a["badge_id"] for a in achievements}
    unlocked_badges = []
    locked_badges = []
    
    for badge_id, badge_info in BADGES.items():
        badge_data = {
            "badge_id": badge_id,
            "name": badge_info["name"],
            "icon": badge_info["icon"],
            "category": badge_info["category"],
            "threshold": badge_info.get("threshold"),
            "description": badge_info.get("description", ""),
        }
        
        if badge_id in unlocked_badge_ids:
            # Find unlock date
            achievement = next((a for a in achievements if a["badge_id"] == badge_id), None)
            badge_data["unlocked"] = True
            badge_data["unlocked_at"] = achievement["unlocked_at"].isoformat() if achievement and isinstance(achievement.get("unlocked_at"), datetime) else achievement.get("unlocked_at") if achievement else None
            unlocked_badges.append(badge_data)
        else:
            # Show ALL badges as locked (including hidden and category badges)
            badge_data["unlocked"] = False
            badge_data["progress"] = get_badge_progress(badge_id, stats)
            badge_data["requirement"] = get_badge_requirement(badge_id)
            locked_badges.append(badge_data)
    
    return {
        "unlocked": unlocked_badges,
        "locked": locked_badges,
        "total_unlocked": len(unlocked_badges),
        "total_possible": len(BADGES),
        "stats": stats
    }

def get_badge_progress(badge_id: str, stats: dict) -> Optional[dict]:
    """Get progress towards a badge. Returns None for badges user can't control."""
    badge_info = BADGES.get(badge_id)
    if not badge_info:
        return None
    
    category = badge_info.get("category")
    threshold = badge_info.get("threshold")
    
    if not threshold:
        return None  # Date-based badges
    
    # Badges that depend on others' actions - no progress shown
    if badge_id in ["drama_influencer", "universal_problem"]:
        return None
    if category == "impact":
        return None  # Social impact depends on others relating
    
    current = 0
    if category == "streak":
        current = stats.get("current_visit_streak", 0)
    elif category == "explorer":
        current = stats.get("total_frikts_opened", 0)
    elif category == "relater":
        current = stats.get("total_relates_given", 0)
    elif category == "creator":
        current = stats.get("total_posts", 0)
    elif category == "commenter":
        current = stats.get("total_comments", 0)
    elif category == "special" and badge_id == "follow_5":
        current = stats.get("users_followed", 0)
    elif category == "category_specialist":
        cat_id = badge_info.get("category_id")
        current = stats.get("posts_per_category", {}).get(cat_id, 0)
    
    return {"current": current, "target": threshold}

def get_badge_requirement(badge_id: str) -> str:
    """Get human-readable requirement text for a badge"""
    badge_info = BADGES.get(badge_id)
    if not badge_info:
        return ""
    
    category = badge_info.get("category")
    threshold = badge_info.get("threshold")
    
    if category == "streak":
        return f"Maintain a {threshold}-day visit streak"
    elif category == "explorer":
        return f"Open {threshold} Frikts"
    elif category == "relater":
        return f"Relate to {threshold} Frikts"
    elif category == "creator":
        return f"Post {threshold} Frikts"
    elif category == "commenter":
        return f"Leave {threshold} comments"
    elif category == "impact":
        return f"Receive {threshold} total relates on your posts"
    elif category == "viral":
        return f"Get {threshold}+ relates on a single post"
    elif category == "special":
        if badge_id == "follow_5":
            return f"Follow {threshold} users"
        elif "og_member" in badge_id:
            return "Be an early adopter (before March 15, 2026)"
        elif "early_frikter" in badge_id:
            return "Join before June 1, 2026"
    elif category == "category_specialist":
        cat_id = badge_info.get("category_id", "")
        cat_name = CATEGORY_NAMES.get(cat_id, cat_id.title())
        return f"Post {threshold} Frikts in {cat_name}"
    
    return ""

# ===================== SIGNAL SCORE =====================

# Signal Score Weights (transparent and configurable)
SIGNAL_WEIGHTS = {
    "relate": 3.0,      # 1 relate = 3 points (most valuable - shows resonance)
    "comment": 2.0,     # 1 comment = 2 points (engagement but easier to game)
    "unique_commenter": 1.0,  # Bonus per unique person commenting
    "follow": 1.0,      # 1 follow = 1 point
    "pain_base": 0.5,   # Pain level multiplier (1-5 scale)
    "frequency_daily": 1.0,    # Daily friction bonus
    "frequency_weekly": 0.5,   # Weekly friction bonus
    "frequency_monthly": 0.25, # Monthly friction bonus
    "recency_max_boost": 2.0,  # Max recency boost for brand new posts
    "recency_decay_hours": 72, # Hours until recency boost = 0
}

def calculate_signal_score(problem: dict, include_breakdown: bool = False) -> float | dict:
    """
    Calculate SignalScore based on engagement metrics.
    
    Formula: 
    base_score = (relates × 3) + (comments × 2) + (unique_commenters × 1) + (pain × freq_modifier)
    recency_boost = linear decay from 2.0 to 0 over 72 hours
    final_score = base_score + recency_boost
    
    Key principle: Posts with interaction ALWAYS beat posts without (except for very new posts)
    """
    relates = problem.get("relates_count", 0)
    comments = problem.get("comments_count", 0)
    unique_commenters = problem.get("unique_commenters", 0)
    pain = problem.get("pain_level") or 0  # Can be None
    frequency = problem.get("frequency")
    
    # Calculate base engagement score
    relate_score = relates * SIGNAL_WEIGHTS["relate"]
    comment_score = comments * SIGNAL_WEIGHTS["comment"]
    commenter_score = unique_commenters * SIGNAL_WEIGHTS["unique_commenter"]
    
    # Pain/frequency bonus (small, doesn't dominate)
    freq_bonus = 0
    if frequency == "daily":
        freq_bonus = SIGNAL_WEIGHTS["frequency_daily"]
    elif frequency == "weekly":
        freq_bonus = SIGNAL_WEIGHTS["frequency_weekly"]
    elif frequency == "monthly":
        freq_bonus = SIGNAL_WEIGHTS["frequency_monthly"]
    
    pain_score = (pain * SIGNAL_WEIGHTS["pain_base"] * (1 + freq_bonus)) if pain else 0
    
    # Base score (engagement-driven)
    base_score = relate_score + comment_score + commenter_score + pain_score
    
    # Recency boost (linear decay, small so it doesn't dominate engagement)
    created_at = problem.get("created_at", datetime.utcnow())
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        except:
            created_at = datetime.utcnow()
    
    hours_old = (datetime.utcnow() - created_at.replace(tzinfo=None)).total_seconds() / 3600
    recency_boost = max(0, SIGNAL_WEIGHTS["recency_max_boost"] * (1 - hours_old / SIGNAL_WEIGHTS["recency_decay_hours"]))
    
    final_score = round(base_score + recency_boost, 2)
    
    if include_breakdown:
        return {
            "total": final_score,
            "breakdown": {
                "relates": {"count": relates, "weight": SIGNAL_WEIGHTS["relate"], "score": round(relate_score, 2)},
                "comments": {"count": comments, "weight": SIGNAL_WEIGHTS["comment"], "score": round(comment_score, 2)},
                "unique_commenters": {"count": unique_commenters, "weight": SIGNAL_WEIGHTS["unique_commenter"], "score": round(commenter_score, 2)},
                "pain_frequency": {"pain": pain or 0, "frequency": frequency or "none", "score": round(pain_score, 2)},
                "recency": {"hours_old": round(hours_old, 1), "boost": round(recency_boost, 2)},
            },
            "formula": "Signal = (relates×3) + (comments×2) + (unique_commenters×1) + pain_bonus + recency_boost"
        }
    
    return final_score

# ===================== AUTH ROUTES =====================

# Email validation regex pattern
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def is_valid_email_format(email: str) -> bool:
    """Validate email format using regex"""
    return bool(EMAIL_REGEX.match(email))

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Normalize email to lowercase for consistent storage and lookup
    email_lower = user_data.email.lower().strip()
    
    # Validate email format
    if not is_valid_email_format(email_lower):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Check if email exists (case-insensitive)
    existing = await db.users.find_one({"email": email_lower})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Determine role based on admin email list
    role = "admin" if email_lower in ADMIN_EMAILS else "user"
    
    # Create user with normalized email
    user = User(
        email=email_lower,
        name=user_data.name,
        role=role,
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
    # Log if admin user created
    if role == "admin":
        logger.info(f"Admin user registered: {user_data.email}")
    
    # Create token
    token = create_access_token({"sub": user.id})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user_dict)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Normalize email to lowercase for case-insensitive lookup
    email_lower = credentials.email.lower().strip()
    user = await db.users.find_one({"email": email_lower})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is banned
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Your account has been suspended")
    
    # Update role if email is in admin list (in case list was updated)
    if email_lower in ADMIN_EMAILS and user.get("role") != "admin":
        await db.users.update_one({"id": user["id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"
        logger.info(f"User promoted to admin on login: {credentials.email}")
    
    token = create_access_token({"sub": user["id"]})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user)
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_auth)):
    return UserResponse(**user)

# ===================== PASSWORD RESET ROUTES =====================

async def send_password_reset_email(email: str, token: str, user_name: str):
    """Send password reset email using Resend"""
    if not RESEND_AVAILABLE:
        logger.warning("resend package not installed - cannot send password reset email")
        return False
        
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured - cannot send password reset email")
        return False
    
    # Generate reset link - this would be a deep link or web page in production
    reset_link = f"frikt://reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F6F3EE;">
        <div style="background-color: #2B2F36; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #E4572E; margin: 0; font-size: 28px;">FRIKT</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #2B2F36; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6;">Hi {user_name},</p>
            <p style="color: #666; line-height: 1.6;">We received a request to reset your password. Use the code below to reset it:</p>
            <div style="background-color: #F6F3EE; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #E4572E; letter-spacing: 4px;">{token}</span>
            </div>
            <p style="color: #666; line-height: 1.6;">This code expires in <strong>1 hour</strong>.</p>
            <p style="color: #666; line-height: 1.6;">If you didn't request this reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Share frictions. Find patterns.</p>
        </div>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"Reset your {APP_NAME} password",
        "html": html_content
    }
    
    try:
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {email}, id: {email_result.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {str(e)}")
        return False

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest, background_tasks: BackgroundTasks):
    """Request a password reset email"""
    email_lower = request.email.lower().strip()
    
    # Find user by email
    user = await db.users.find_one({"email": email_lower})
    
    # Always return success even if user doesn't exist (security best practice)
    if not user:
        logger.info(f"Password reset requested for non-existent email: {email_lower}")
        return {"success": True, "message": "If an account exists with this email, you will receive a reset code."}
    
    # Check if user is banned
    if user.get("status") == "banned":
        return {"success": True, "message": "If an account exists with this email, you will receive a reset code."}
    
    # Generate a simple 6-digit code (easier for users to type on mobile)
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Invalidate any existing reset tokens for this user
    await db.password_reset_tokens.update_many(
        {"user_id": user["id"], "used": False},
        {"$set": {"used": True}}
    )
    
    # Create new reset token
    reset_token = PasswordResetToken(
        user_id=user["id"],
        token=reset_code,
        email=email_lower,
        expires_at=datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
    )
    await db.password_reset_tokens.insert_one(reset_token.dict())
    
    # Send email in background
    user_name = user.get("displayName") or user.get("name", "User")
    background_tasks.add_task(send_password_reset_email, email_lower, reset_code, user_name)
    
    logger.info(f"Password reset token created for user: {user['id']}")
    return {"success": True, "message": "If an account exists with this email, you will receive a reset code."}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetConfirm):
    """Reset password using the reset token/code"""
    # Find the token
    token_doc = await db.password_reset_tokens.find_one({
        "token": request.token,
        "used": False
    }, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    # Check expiration
    expires_at = token_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    
    if datetime.utcnow() > expires_at:
        # Mark token as used
        await db.password_reset_tokens.update_one(
            {"id": token_doc["id"]},
            {"$set": {"used": True}}
        )
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")
    
    # Find the user
    user = await db.users.find_one({"id": token_doc["user_id"]})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed_password = hash_password(request.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hashed_password}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"id": token_doc["id"]},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset successful for user: {user['id']}")
    return {"success": True, "message": "Password has been reset successfully. You can now log in with your new password."}

@api_router.post("/auth/verify-reset-code")
async def verify_reset_code(token: str):
    """Verify if a reset code is valid (without using it)"""
    token_doc = await db.password_reset_tokens.find_one({
        "token": token,
        "used": False
    }, {"_id": 0})
    
    if not token_doc:
        return {"valid": False, "message": "Invalid or expired reset code"}
    
    # Check expiration
    expires_at = token_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    
    if datetime.utcnow() > expires_at:
        return {"valid": False, "message": "Reset code has expired"}
    
    return {"valid": True, "email": token_doc.get("email")}

# ===================== CATEGORIES ROUTES =====================

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ===================== PROBLEMS ROUTES =====================

@api_router.post("/problems")
async def create_problem(problem_data: ProblemCreate, user: dict = Depends(require_auth)):
    # Validate title - must not be empty or whitespace only
    title_stripped = problem_data.title.strip() if problem_data.title else ""
    if len(title_stripped) < 10:
        raise HTTPException(status_code=400, detail="Title must have at least 10 non-whitespace characters")
    
    # Check rate limit (max 10 posts/day - generous for MVP)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if user.get("last_post_date") == today and user.get("posts_today", 0) >= 10:
        raise HTTPException(status_code=429, detail="Maximum 10 Frikts per day allowed")
    
    # Validate category (default to "other" if not provided)
    category_id = problem_data.category_id or "other"
    category = next((c for c in CATEGORIES if c["id"] == category_id), CATEGORIES[-1])
    
    # Frequency and pain are optional now - no validation needed for null values
    frequency = problem_data.frequency if problem_data.frequency in FREQUENCY_OPTIONS else None
    pain_level = problem_data.pain_level if problem_data.pain_level and 1 <= problem_data.pain_level <= 5 else None
    
    # Create problem with trimmed title
    problem = Problem(
        user_id=user["id"],
        user_name=user.get("displayName") or user["name"],
        user_avatar_url=user.get("avatarUrl"),
        title=title_stripped,
        category_id=category_id,
        frequency=frequency,
        pain_level=pain_level,
        willing_to_pay=problem_data.willing_to_pay or "$0",
        when_happens=problem_data.when_happens,
        who_affected=problem_data.who_affected,
        what_tried=problem_data.what_tried,
    )
    
    problem_dict = problem.dict()
    problem_dict["signal_score"] = calculate_signal_score(problem_dict)
    
    await db.problems.insert_one(problem_dict)
    
    # Update user post count
    if user.get("last_post_date") == today:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"posts_today": 1}})
    else:
        await db.users.update_one({"id": user["id"]}, {"$set": {"posts_today": 1, "last_post_date": today}})
    
    # GAMIFICATION: Update stats and check badges
    stats = await increment_user_stat(user["id"], "total_posts")
    stats = await increment_category_posts(user["id"], category_id)
    newly_awarded = await check_and_award_badges(user["id"], user, stats, "create")
    
    response = ProblemResponse(
        **problem_dict,
        category_name=category["name"],
        category_color=category["color"]
    )
    
    # Return with newly awarded badges
    return {
        **response.dict(),
        "newly_awarded_badges": newly_awarded
    }

class ProblemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=10)
    category_id: Optional[str] = None
    frequency: Optional[str] = None
    pain_level: Optional[int] = Field(None, ge=1, le=5)
    when_happens: Optional[str] = None
    who_affected: Optional[str] = None
    what_tried: Optional[str] = None

@api_router.patch("/problems/{problem_id}")
async def update_problem(problem_id: str, update: ProblemUpdate, user: dict = Depends(require_auth)):
    """Update a problem (owner only)"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check ownership
    if problem["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to edit this problem")
    
    # Build update dict with only provided fields
    update_data = {}
    if update.title is not None:
        update_data["title"] = update.title.strip()
    if update.category_id is not None:
        update_data["category_id"] = update.category_id
    if update.frequency is not None:
        update_data["frequency"] = update.frequency
    if update.pain_level is not None:
        update_data["pain_level"] = update.pain_level
    if update.when_happens is not None:
        update_data["when_happens"] = update.when_happens.strip() if update.when_happens else None
    if update.who_affected is not None:
        update_data["who_affected"] = update.who_affected.strip() if update.who_affected else None
    if update.what_tried is not None:
        update_data["what_tried"] = update.what_tried.strip() if update.what_tried else None
    
    if update_data:
        await db.problems.update_one({"id": problem_id}, {"$set": update_data})
    
    # Return updated problem
    updated = await db.problems.find_one({"id": problem_id})
    category = next((c for c in CATEGORIES if c["id"] == updated["category_id"]), CATEGORIES[-1])
    
    return ProblemResponse(
        **updated,
        category_name=category["name"],
        category_color=category["color"]
    )

@api_router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str, user: dict = Depends(require_auth)):
    """Delete a problem (owner or admin only)"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Check ownership or admin
    is_admin = user.get("role") == "admin"
    if problem["user_id"] != user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this problem")
    
    # Delete problem
    await db.problems.delete_one({"id": problem_id})
    
    # Also delete associated comments and relates
    await db.comments.delete_many({"problem_id": problem_id})
    await db.relates.delete_many({"problem_id": problem_id})
    
    return {"message": "Problem deleted successfully"}

@api_router.get("/problems", response_model=List[ProblemResponse])
async def get_problems(
    feed: str = "new",  # "new", "trending", "foryou"
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(require_auth)  # Changed from get_current_user to require_auth for security
):
    # Handle empty search - return empty results instead of 404
    if search is not None:
        search = search.strip()
        if not search:  # Empty or whitespace-only search
            return []  # Return empty array with 200 status
    
    query = {"is_hidden": False, "status": "active"}
    
    # Filter out blocked users' content
    if user:
        blocked_ids = await get_blocked_user_ids(user["id"])
        if blocked_ids:
            query["user_id"] = {"$nin": blocked_ids}
    
    if category_id:
        query["category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"when_happens": {"$regex": search, "$options": "i"}},
            {"who_affected": {"$regex": search, "$options": "i"}},
        ]
    
    # NEW feed: simply sort by created_at desc (latest first)
    if feed == "new":
        sort = [("created_at", -1)]
        problems = await db.problems.find(query).sort(sort).skip(skip).limit(limit).to_list(limit)
    
    # TRENDING feed: hot score over last 7 days
    # hotScore = (relates * 3) + (comments * 2) + (follows * 1)
    elif feed == "trending":
        # Only include posts from last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        query["created_at"] = {"$gte": week_ago}
        
        # Use aggregation to calculate hot_score on the fly
        pipeline = [
            {"$match": query},
            {"$addFields": {
                "hot_score": {
                    "$add": [
                        {"$multiply": [{"$ifNull": ["$relates_count", 0]}, 3]},
                        {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 2]},
                        {"$ifNull": ["$unique_commenters", 0]}
                    ]
                }
            }},
            {"$sort": {"hot_score": -1, "created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        problems = await db.problems.aggregate(pipeline).to_list(limit)
    
    # FOR YOU feed: personalized based on followed categories
    elif feed == "foryou":
        if user:
            followed_cats = user.get("followed_categories", [])
            followed_problems = user.get("followed_problems", [])
            
            if followed_cats or followed_problems:
                # Mix: prioritize followed categories + some new for freshness
                # First get from followed categories
                followed_query = {**query}
                if followed_cats:
                    followed_query["category_id"] = {"$in": followed_cats}
                
                # Sort by engagement + recency
                pipeline = [
                    {"$match": followed_query},
                    {"$addFields": {
                        "engagement_score": {
                            "$add": [
                                {"$multiply": [{"$ifNull": ["$relates_count", 0]}, 2]},
                                {"$multiply": [{"$ifNull": ["$comments_count", 0]}, 1.5]}
                            ]
                        }
                    }},
                    {"$sort": {"engagement_score": -1, "created_at": -1}},
                    {"$skip": skip},
                    {"$limit": limit}
                ]
                problems = await db.problems.aggregate(pipeline).to_list(limit)
            else:
                # No followed categories: show balanced mix across categories
                sort = [("created_at", -1)]
                problems = await db.problems.find(query).sort(sort).skip(skip).limit(limit).to_list(limit)
        else:
            # No user: just show by recency
            sort = [("created_at", -1)]
            problems = await db.problems.find(query).sort(sort).skip(skip).limit(limit).to_list(limit)
    else:
        # Fallback
        sort = [("created_at", -1)]
        problems = await db.problems.find(query).sort(sort).skip(skip).limit(limit).to_list(limit)
    
    # Get user's relates and saves if authenticated
    user_relates = set()
    user_saves = set()
    user_follows = set()
    if user:
        relates = await db.relates.find({"user_id": user["id"]}, {"problem_id": 1}).to_list(1000)
        user_relates = {r["problem_id"] for r in relates}
        user_saves = set(user.get("saved_problems", []))
        user_follows = set(user.get("followed_problems", []))
    
    results = []
    
    # Fetch fresh usernames from user records
    user_ids = list(set(p["user_id"] for p in problems))
    users = await db.users.find({"id": {"$in": user_ids}}, {"id": 1, "name": 1, "displayName": 1, "avatarUrl": 1}).to_list(len(user_ids))
    user_map = {u["id"]: {"name": u.get("displayName") or u.get("name", "Unknown"), "avatar": u.get("avatarUrl")} for u in users}
    
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        # Update with fresh username from user record
        fresh_user = user_map.get(p["user_id"], {})
        p["user_name"] = fresh_user.get("name", p.get("user_name", "Unknown"))
        if fresh_user.get("avatar"):
            p["user_avatar_url"] = fresh_user.get("avatar")
        
        results.append(ProblemResponse(
            **p,
            category_name=category["name"] if category else "",
            category_color=category["color"] if category else "#666",
            user_has_related=p["id"] in user_relates,
            user_has_saved=p["id"] in user_saves,
            user_is_following=p["id"] in user_follows
        ))
    
    return results

@api_router.get("/problems/similar")
async def get_similar_problems(title: str, limit: int = 3):
    """Find similar problems based on title for duplicate detection"""
    if len(title) < 5:
        return []
    
    # Simple keyword-based search
    words = title.lower().split()
    keywords = [w for w in words if len(w) > 3]
    
    if not keywords:
        return []
    
    query = {
        "is_hidden": False,
        "$or": [{"title": {"$regex": kw, "$options": "i"}} for kw in keywords[:3]]
    }
    
    problems = await db.problems.find(query).sort("signal_score", -1).limit(limit).to_list(limit)
    
    results = []
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        results.append({
            "id": p["id"],
            "title": p["title"],
            "relates_count": p["relates_count"],
            "comments_count": p["comments_count"],
            "category_name": category["name"] if category else "",
            "category_color": category["color"] if category else "#666",
        })
    
    return results

@api_router.get("/problems/{problem_id}")
async def get_problem(problem_id: str, user: dict = Depends(get_current_user)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    category = next((c for c in CATEGORIES if c["id"] == problem["category_id"]), None)
    
    user_has_related = False
    user_has_saved = False
    user_is_following = False
    newly_awarded = []
    
    if user:
        relate = await db.relates.find_one({"problem_id": problem_id, "user_id": user["id"]})
        user_has_related = relate is not None
        user_has_saved = problem_id in user.get("saved_problems", [])
        user_is_following = problem_id in user.get("followed_problems", [])
        
        # GAMIFICATION: Track frikt opened (for explorer badges)
        # Only count if viewing someone else's post
        if problem["user_id"] != user["id"]:
            stats = await increment_user_stat(user["id"], "total_frikts_opened")
            newly_awarded = await check_and_award_badges(user["id"], user, stats, "explore")
    
    response = ProblemResponse(
        **problem,
        category_name=category["name"] if category else "",
        category_color=category["color"] if category else "#666",
        user_has_related=user_has_related,
        user_has_saved=user_has_saved,
        user_is_following=user_is_following
    )
    
    return {**response.dict(), "newly_awarded_badges": newly_awarded}

@api_router.get("/problems/{problem_id}/related")
async def get_related_problems(problem_id: str, limit: int = 5):
    """Get related problems in same category"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    related = await db.problems.find({
        "category_id": problem["category_id"],
        "id": {"$ne": problem_id},
        "is_hidden": False
    }).sort("signal_score", -1).limit(limit).to_list(limit)
    
    results = []
    for p in related:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        results.append({
            "id": p["id"],
            "title": p["title"],
            "relates_count": p["relates_count"],
            "category_color": category["color"] if category else "#666",
        })
    
    return results

# ===================== RELATE ROUTES =====================

@api_router.post("/problems/{problem_id}/relate")
async def relate_to_problem(problem_id: str, user: dict = Depends(require_auth)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Prevent self-relates
    if problem["user_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot relate to your own post")
    
    # Check if already related
    existing = await db.relates.find_one({"problem_id": problem_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already related to this problem")
    
    # Check if problem owner is banned (don't send notifications to banned users)
    problem_owner = await db.users.find_one({"id": problem["user_id"]})
    owner_is_banned = problem_owner and problem_owner.get("status") in ["banned", "shadowbanned"]
    
    # Create relate
    relate = Relate(problem_id=problem_id, user_id=user["id"])
    await db.relates.insert_one(relate.dict())
    
    # Update problem count and signal score
    new_count = problem["relates_count"] + 1
    problem["relates_count"] = new_count
    new_score = calculate_signal_score(problem)
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"relates_count": new_count, "signal_score": new_score}}
    )
    
    # GAMIFICATION: Update stats for the relater (user giving the relate)
    relater_stats = await increment_user_stat(user["id"], "total_relates_given")
    relater_badges = await check_and_award_badges(user["id"], user, relater_stats, "relate")
    
    # GAMIFICATION: Update stats for the post author (receiving the relate)
    post_author_id = problem["user_id"]
    await increment_user_stat(post_author_id, "total_relates_received")
    
    # Check if this post now has the most relates for the author
    author_stats = await get_or_create_user_stats(post_author_id)
    current_max = author_stats.get("max_relates_on_single_post", 0)
    if new_count > current_max:
        await update_user_stats(post_author_id, {"max_relates_on_single_post": new_count})
        author_stats["max_relates_on_single_post"] = new_count
    
    # Check badges for the post author (impact + viral badges)
    post_author = await db.users.find_one({"id": post_author_id})
    if post_author:
        author_badges = await check_and_award_badges(post_author_id, post_author, author_stats, "impact")
        author_viral_badges = await check_and_award_badges(post_author_id, post_author, author_stats, "viral")
        
        # Store pending badges for author to see on next app open
        all_author_badges = author_badges + author_viral_badges
        if all_author_badges:
            for badge in all_author_badges:
                await db.pending_badge_notifications.insert_one({
                    "user_id": post_author_id,
                    "badge": badge,
                    "created_at": datetime.utcnow()
                })
    
    # Create notification for problem owner (if not self and not banned)
    if problem["user_id"] != user["id"] and not owner_is_banned:
        # Check global push toggle first
        settings = await db.notification_settings.find_one({"user_id": problem["user_id"]})
        global_push_enabled = not settings or settings.get("push_notifications", True)
        relates_enabled = not settings or settings.get("new_relates", True)
        
        if global_push_enabled and relates_enabled:
            # Use notification batching
            should_send_immediate = await add_to_notification_batch(
                recipient_user_id=problem["user_id"],
                batch_type="relate_batch",
                target_id=problem_id,
                target_title=problem.get("title", "your Frikt"),
                actor_user_id=user["id"],
                actor_user_name=user["name"]
            )
            
            if should_send_immediate:
                # First relate - send immediate notification
                notification = Notification(
                    user_id=problem["user_id"],
                    type="new_relate",
                    problem_id=problem_id,
                    message=f"{user['name']} related to your Frikt"
                )
                await db.notifications.insert_one(notification.dict())
                
                await send_notification_to_user(
                    problem["user_id"],
                    "Someone related to your Frikt",
                    f"{user['name']} related to: {problem['title'][:50]}...",
                    {"type": "new_relate", "problemId": problem_id}
                )
            # If not immediate, the batch processor will send later
    
    return {
        "relates_count": new_count,
        "signal_score": new_score,
        "newly_awarded_badges": relater_badges
    }

@api_router.delete("/problems/{problem_id}/relate")
async def unrelate_to_problem(problem_id: str, user: dict = Depends(require_auth)):
    result = await db.relates.delete_one({"problem_id": problem_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not related to this problem")
    
    problem = await db.problems.find_one({"id": problem_id})
    if problem:
        new_count = max(0, problem["relates_count"] - 1)
        problem["relates_count"] = new_count
        new_score = calculate_signal_score(problem)
        
        await db.problems.update_one(
            {"id": problem_id},
            {"$set": {"relates_count": new_count, "signal_score": new_score}}
        )
        return {"relates_count": new_count, "signal_score": new_score}
    
    return {"relates_count": 0}

# ===================== SAVE/FOLLOW ROUTES =====================

@api_router.post("/problems/{problem_id}/save")
async def save_problem(problem_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"saved_problems": problem_id}}
    )
    return {"saved": True}

@api_router.delete("/problems/{problem_id}/save")
async def unsave_problem(problem_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"saved_problems": problem_id}}
    )
    return {"saved": False}

@api_router.post("/problems/{problem_id}/follow")
async def follow_problem(problem_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"followed_problems": problem_id}}
    )
    return {"following": True}

@api_router.delete("/problems/{problem_id}/follow")
async def unfollow_problem(problem_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"followed_problems": problem_id}}
    )
    return {"following": False}

@api_router.post("/categories/{category_id}/follow")
async def follow_category(category_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$addToSet": {"followed_categories": category_id}}
    )
    return {"following": True}

@api_router.delete("/categories/{category_id}/follow")
async def unfollow_category(category_id: str, user: dict = Depends(require_auth)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$pull": {"followed_categories": category_id}}
    )
    return {"following": False}

# ===================== COMMENTS ROUTES =====================

@api_router.post("/comments")
async def create_comment(comment_data: CommentCreate, user: dict = Depends(require_auth)):
    problem = await db.problems.find_one({"id": comment_data.problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    comment = Comment(
        problem_id=comment_data.problem_id,
        user_id=user["id"],
        user_name=user["name"],
        content=comment_data.content
    )
    
    await db.comments.insert_one(comment.dict())
    
    # Update problem stats
    comments_count = problem["comments_count"] + 1
    
    # Check if user is a unique commenter
    existing_comment = await db.comments.find_one({
        "problem_id": comment_data.problem_id,
        "user_id": user["id"],
        "id": {"$ne": comment.id}
    })
    unique_commenters = problem["unique_commenters"]
    if not existing_comment:
        unique_commenters += 1
    
    problem["comments_count"] = comments_count
    problem["unique_commenters"] = unique_commenters
    new_score = calculate_signal_score(problem)
    
    await db.problems.update_one(
        {"id": comment_data.problem_id},
        {"$set": {
            "comments_count": comments_count,
            "unique_commenters": unique_commenters,
            "signal_score": new_score
        }}
    )
    
    # GAMIFICATION: Update stats and check badges
    stats = await increment_user_stat(user["id"], "total_comments")
    newly_awarded = await check_and_award_badges(user["id"], user, stats, "comment")
    
    # Check if problem owner is banned
    problem_owner = await db.users.find_one({"id": problem["user_id"]})
    owner_is_banned = problem_owner and problem_owner.get("status") in ["banned", "shadowbanned"]
    
    # Create notification for problem owner (with batching)
    if problem["user_id"] != user["id"] and not owner_is_banned:
        settings = await db.notification_settings.find_one({"user_id": problem["user_id"]})
        global_push_enabled = not settings or settings.get("push_notifications", True)
        comments_enabled = not settings or settings.get("new_comments", True)
        
        if global_push_enabled and comments_enabled:
            # Use notification batching for comments (3 min window)
            should_send_immediate = await add_to_notification_batch(
                recipient_user_id=problem["user_id"],
                batch_type="comment_batch",
                target_id=comment_data.problem_id,
                target_title=problem.get("title", "your Frikt"),
                actor_user_id=user["id"],
                actor_user_name=user["name"]
            )
            
            if should_send_immediate:
                # First comment - send immediate notification
                notification = Notification(
                    user_id=problem["user_id"],
                    type="new_comment",
                    problem_id=comment_data.problem_id,
                    message=f"{user['name']} commented on your Frikt"
                )
                await db.notifications.insert_one(notification.dict())
                
                await send_notification_to_user(
                    problem["user_id"],
                    "New comment on your Frikt",
                    f"{user['name']}: {comment_data.content[:50]}...",
                    {"type": "new_comment", "problemId": comment_data.problem_id}
                )
            # If not immediate, the batch processor will send later
    
    # Notify followers - optimized with projections and batch query
    followers = await db.users.find(
        {"followed_problems": comment_data.problem_id},
        {"id": 1}
    ).to_list(100)
    
    # Get all follower IDs to exclude current user and problem owner
    follower_ids = [f["id"] for f in followers if f["id"] != user["id"] and f["id"] != problem["user_id"]]
    
    if follower_ids:
        # Batch query notification settings to avoid N+1
        follower_settings_list = await db.notification_settings.find(
            {"user_id": {"$in": follower_ids}},
            {"user_id": 1, "new_comments": 1, "push_notifications": 1}
        ).to_list(100)
        follower_settings_map = {s["user_id"]: s for s in follower_settings_list}
        
        for follower_id in follower_ids:
            follower_settings = follower_settings_map.get(follower_id)
            global_push = not follower_settings or follower_settings.get("push_notifications", True)
            comments_on = not follower_settings or follower_settings.get("new_comments", True)
            
            if global_push and comments_on:
                # Also use batching for followers
                should_send = await add_to_notification_batch(
                    recipient_user_id=follower_id,
                    batch_type="comment_batch",
                    target_id=comment_data.problem_id,
                    target_title=problem.get("title", "a followed Frikt"),
                    actor_user_id=user["id"],
                    actor_user_name=user["name"]
                )
                
                if should_send:
                    notification = Notification(
                        user_id=follower_id,
                        type="new_comment",
                        problem_id=comment_data.problem_id,
                        message="New comment on a Frikt you follow"
                    )
                    await db.notifications.insert_one(notification.dict())
                    
                    await send_notification_to_user(
                        follower_id,
                        "New comment on followed Frikt",
                        f"{user['name']} commented on: {problem['title'][:40]}...",
                        {"type": "new_comment", "problemId": comment_data.problem_id}
                    )
    
    response = CommentResponse(**comment.dict())
    return {**response.dict(), "newly_awarded_badges": newly_awarded}

@api_router.get("/problems/{problem_id}/comments")
async def get_comments(problem_id: str, user: dict = Depends(get_current_user)):
    query = {"problem_id": problem_id}
    
    # Filter out blocked users' comments
    if user:
        blocked_ids = await get_blocked_user_ids(user["id"])
        if blocked_ids:
            query["user_id"] = {"$nin": blocked_ids}
    
    comments = await db.comments.find(query).sort("helpful_count", -1).to_list(100)
    
    # Get user's helpful marks
    user_helpfuls = set()
    if user:
        helpfuls = await db.helpfuls.find({"user_id": user["id"]}, {"comment_id": 1}).to_list(1000)
        user_helpfuls = {h["comment_id"] for h in helpfuls}
    
    # Fetch fresh usernames from user records
    user_ids = list(set(c["user_id"] for c in comments))
    users = await db.users.find({"id": {"$in": user_ids}}, {"id": 1, "name": 1, "displayName": 1}).to_list(len(user_ids))
    user_map = {u["id"]: u.get("displayName") or u.get("name", "Unknown") for u in users}
    
    result = []
    for c in comments:
        # Use fresh username from user record
        fresh_username = user_map.get(c["user_id"], c.get("user_name", "Unknown"))
        comment_data = {**c, "user_name": fresh_username, "user_marked_helpful": c["id"] in user_helpfuls}
        # Remove _id if present
        comment_data.pop("_id", None)
        result.append(comment_data)
    
    return result

@api_router.post("/comments/{comment_id}/helpful")
async def mark_helpful(comment_id: str, user: dict = Depends(require_auth)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    existing = await db.helpfuls.find_one({"comment_id": comment_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already marked as helpful")
    
    helpful = Helpful(comment_id=comment_id, user_id=user["id"])
    await db.helpfuls.insert_one(helpful.dict())
    
    new_count = comment["helpful_count"] + 1
    await db.comments.update_one({"id": comment_id}, {"$set": {"helpful_count": new_count}})
    
    return {"helpful_count": new_count}

@api_router.delete("/comments/{comment_id}/helpful")
async def unmark_helpful(comment_id: str, user: dict = Depends(require_auth)):
    result = await db.helpfuls.delete_one({"comment_id": comment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not marked as helpful")
    
    comment = await db.comments.find_one({"id": comment_id})
    if comment:
        new_count = max(0, comment["helpful_count"] - 1)
        await db.comments.update_one({"id": comment_id}, {"$set": {"helpful_count": new_count}})
        return {"helpful_count": new_count}
    
    return {"helpful_count": 0}

# ===================== COMMENT EDIT/DELETE =====================

class CommentEditRequest(BaseModel):
    content: str

@api_router.put("/comments/{comment_id}")
async def edit_comment(comment_id: str, request: CommentEditRequest, user: dict = Depends(require_auth)):
    """Edit a comment. Only the comment author can edit."""
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only comment author can edit
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")
    
    if len(request.content.strip()) == 0:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {
            "content": request.content.strip(),
            "edited_at": datetime.utcnow()
        }}
    )
    
    updated_comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    return updated_comment

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_auth)):
    """Delete a comment. Only the comment author can delete."""
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only comment author can delete
    if comment["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    problem_id = comment["problem_id"]
    
    # Delete the comment
    await db.comments.delete_one({"id": comment_id})
    
    # Update problem's comment count
    problem = await db.problems.find_one({"id": problem_id})
    if problem:
        new_count = max(0, problem["comments_count"] - 1)
        await db.problems.update_one(
            {"id": problem_id},
            {"$set": {"comments_count": new_count}}
        )
    
    # Decrement user's comment count in gamification stats (but don't revoke badges)
    await db.user_stats.update_one(
        {"user_id": user["id"]},
        {"$inc": {"total_comments": -1}}
    )
    
    # Also delete any helpfuls on this comment
    await db.helpfuls.delete_many({"comment_id": comment_id})
    
    return {"success": True, "message": "Comment deleted"}

# ===================== NOTIFICATIONS ROUTES =====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(require_auth), limit: int = 50):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({"user_id": user["id"], "is_read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.post("/notifications/read")
async def mark_notifications_read(user: dict = Depends(require_auth)):
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(require_auth)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    return {"success": True}

# ===================== MISSION OF THE DAY =====================

@api_router.get("/mission")
async def get_mission_of_day():
    # Rotate based on day of week
    day_index = datetime.utcnow().weekday() % len(MISSIONS)
    return MISSIONS[day_index].dict()

# ===================== USER STATS =====================

@api_router.get("/users/search")
async def search_users(
    q: str = "",
    limit: int = 20,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    """Search users by display name"""
    if not q or len(q.strip()) < 2:
        return []
    
    search_term = q.strip().lower()
    
    # Search by normalized display name or email prefix
    query = {
        "$or": [
            {"normalizedDisplayName": {"$regex": search_term, "$options": "i"}},
            {"name": {"$regex": search_term, "$options": "i"}},
        ],
        "status": "active"
    }
    
    # Filter out blocked users
    if user:
        blocked_ids = await get_blocked_user_ids(user["id"])
        if blocked_ids:
            query["id"] = {"$nin": blocked_ids}
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    
    results = []
    for u in users:
        posts_count = await db.problems.count_documents({"user_id": u["id"], "is_hidden": False})
        results.append({
            "id": u["id"],
            "displayName": u.get("displayName") or u.get("name"),
            "avatarUrl": u.get("avatarUrl"),
            "bio": u.get("bio"),
            "posts_count": posts_count,
        })
    
    return results

# --- User "me" routes (must be before {user_id} routes to avoid conflict) ---

@api_router.get("/users/me/saved")
async def get_saved_problems(user: dict = Depends(require_auth)):
    saved_ids = user.get("saved_problems", [])
    if not saved_ids:
        return []
    
    problems = await db.problems.find({"id": {"$in": saved_ids}}).to_list(100)
    
    results = []
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        results.append(ProblemResponse(
            **p,
            category_name=category["name"] if category else "",
            category_color=category["color"] if category else "#666",
            user_has_saved=True
        ))
    
    return results

@api_router.get("/users/me/posts")
async def get_my_posts(user: dict = Depends(require_auth)):
    problems = await db.problems.find({"user_id": user["id"]}).sort("created_at", -1).to_list(100)
    
    results = []
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        results.append(ProblemResponse(
            **p,
            category_name=category["name"] if category else "",
            category_color=category["color"] if category else "#666"
        ))
    
    return results

# --- User public profile routes ---

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get public user profile"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts_count = await db.problems.count_documents({"user_id": user_id, "is_hidden": False})
    comments_count = await db.comments.count_documents({"user_id": user_id})
    relates_count = await db.relates.count_documents({"user_id": user_id})
    
    return {
        "id": user["id"],
        "displayName": user.get("displayName") or user.get("name"),
        "avatarUrl": user.get("avatarUrl"),
        "bio": user.get("bio"),
        "created_at": user.get("created_at"),
        "posts_count": posts_count,
        "comments_count": comments_count,
        "relates_count": relates_count,
    }

@api_router.get("/users/{user_id}/posts")
async def get_user_posts(
    user_id: str, 
    sort: str = "newest",  # "newest" or "top"
    limit: int = 50,
    skip: int = 0
):
    """Get a user's public posts"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = {"user_id": user_id, "is_hidden": False, "status": "active"}
    
    if sort == "top":
        sort_order = [("signal_score", -1), ("created_at", -1)]
    else:
        sort_order = [("created_at", -1)]
    
    problems = await db.problems.find(query).sort(sort_order).skip(skip).limit(limit).to_list(limit)
    
    results = []
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
        results.append({
            "id": p["id"],
            "title": p["title"],
            "category_id": p.get("category_id"),
            "category_name": category["name"] if category else "",
            "category_color": category["color"] if category else "#666",
            "relates_count": p.get("relates_count", 0),
            "comments_count": p.get("comments_count", 0),
            "created_at": p.get("created_at"),
            "signal_score": p.get("signal_score", 0),
        })
    
    return results

# ===================== GAMIFICATION ROUTES =====================

@api_router.get("/users/me/badges")
async def get_my_badges(user: dict = Depends(require_auth)):
    """Get current user's badge status"""
    return await get_user_badges_status(user["id"], user)

@api_router.get("/users/{user_id}/badges")
async def get_user_badges(user_id: str):
    """Get another user's badge status (public view)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await get_user_badges_status(user_id, user)

@api_router.get("/users/me/gamification-stats")
async def get_my_gamification_stats(user: dict = Depends(require_auth)):
    """Get detailed gamification stats for current user"""
    stats = await get_or_create_user_stats(user["id"])
    return stats

@api_router.post("/users/me/visit")
async def track_visit(user: dict = Depends(require_auth)):
    """Track app visit for streak calculation"""
    updated_stats, is_qualifying = await update_visit_streak(user["id"])
    newly_awarded = []
    
    if is_qualifying:
        newly_awarded = await check_and_award_badges(user["id"], user, updated_stats, "visit")
    
    # Also check for pending badge notifications from other users' actions
    pending_badges = await db.pending_badge_notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).to_list(50)
    
    # Delete pending notifications after retrieval
    if pending_badges:
        await db.pending_badge_notifications.delete_many({"user_id": user["id"]})
        for pb in pending_badges:
            if pb.get("badge"):
                newly_awarded.append(pb["badge"])
    
    # Check special badges (OG Member, Early Frikter) on visit
    special_badges = await check_and_award_badges(user["id"], user, updated_stats, "special")
    newly_awarded.extend(special_badges)
    
    return {
        "stats": updated_stats,
        "is_qualifying_visit": is_qualifying,
        "newly_awarded_badges": newly_awarded
    }

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, user: dict = Depends(require_auth)):
    """Follow another user"""
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already following (using a user_follows collection)
    existing = await db.user_follows.find_one({
        "follower_id": user["id"],
        "following_id": user_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already following this user")
    
    # Create follow relationship
    await db.user_follows.insert_one({
        "id": str(uuid.uuid4()),
        "follower_id": user["id"],
        "following_id": user_id,
        "created_at": datetime.utcnow()
    })
    
    # GAMIFICATION: Update stats and check badges
    stats = await increment_user_stat(user["id"], "users_followed")
    newly_awarded = await check_and_award_badges(user["id"], user, stats, "follow")
    
    # Send notification to the user being followed (if not banned)
    target_is_banned = target_user.get("status") in ["banned", "shadowbanned"]
    if not target_is_banned:
        # Create in-app notification
        notification = Notification(
            user_id=user_id,
            type="new_follower",
            problem_id="",  # No problem associated
            message=f"{user['name']} started following you"
        )
        await db.notifications.insert_one(notification.dict())
        
        # Check settings and send push
        settings = await db.notification_settings.find_one({"user_id": user_id})
        global_push = not settings or settings.get("push_notifications", True)
        if global_push:
            await send_notification_to_user(
                user_id,
                "New follower!",
                f"{user['name']} started following you",
                {"type": "new_follower", "userId": user["id"]}
            )
    
    return {"following": True, "newly_awarded_badges": newly_awarded}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, user: dict = Depends(require_auth)):
    """Unfollow a user"""
    result = await db.user_follows.delete_one({
        "follower_id": user["id"],
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not following this user")
    
    return {"following": False}

@api_router.get("/users/{user_id}/is-following")
async def check_if_following(user_id: str, user: dict = Depends(require_auth)):
    """Check if current user is following another user"""
    existing = await db.user_follows.find_one({
        "follower_id": user["id"],
        "following_id": user_id
    })
    return {"is_following": existing is not None}

@api_router.get("/badges/definitions")
async def get_badge_definitions():
    """Get all badge definitions for frontend"""
    definitions = []
    for badge_id, badge_info in BADGES.items():
        definitions.append({
            "badge_id": badge_id,
            "name": badge_info["name"],
            "icon": badge_info["icon"],
            "category": badge_info["category"],
            "threshold": badge_info.get("threshold"),
            "hidden": badge_info.get("hidden", False),
            "requirement": get_badge_requirement(badge_id)
        })
    return {"badges": definitions}

@api_router.get("/users/{user_id}/stats")
async def get_user_stats(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts_count = await db.problems.count_documents({"user_id": user_id})
    comments_count = await db.comments.count_documents({"user_id": user_id})
    relates_count = await db.relates.count_documents({"user_id": user_id})
    
    return {
        "posts_count": posts_count,
        "comments_count": comments_count,
        "relates_count": relates_count,
        "streak_days": user.get("streak_days", 0),
        "rocket10_completed": user.get("rocket10_completed", False)
    }

@api_router.put("/users/me/profile")
async def update_profile(profile: ProfileUpdate, user: dict = Depends(require_auth)):
    """Update user profile"""
    import re
    
    # Validate display name
    display_name = profile.displayName.strip()
    if len(display_name) < 2 or len(display_name) > 20:
        raise HTTPException(status_code=400, detail="Name must be 2-20 characters")
    
    # Check for at least one alphanumeric character
    if not re.search(r'[a-zA-Z0-9]', display_name):
        raise HTTPException(status_code=400, detail="Name must contain at least one letter or number")
    
    # Create normalized display name for uniqueness check (lowercase, trimmed)
    normalized_name = display_name.lower().strip()
    
    # Check if this normalized name is already taken by another user
    existing_user = await db.users.find_one({
        "normalizedDisplayName": normalized_name,
        "id": {"$ne": user["id"]}  # Exclude current user
    })
    if existing_user:
        raise HTTPException(status_code=409, detail="Name already taken")
    
    update_data = {
        "displayName": display_name,
        "normalizedDisplayName": normalized_name,  # Store normalized version
        "bio": (profile.bio or "").strip()[:80],
        "city": (profile.city or "").strip()[:50],
        "showCity": profile.showCity or False,
    }
    
    if profile.avatarUrl is not None:
        update_data["avatarUrl"] = profile.avatarUrl
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user["id"]})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        displayName=updated_user.get("displayName"),
        avatarUrl=updated_user.get("avatarUrl"),
        bio=updated_user.get("bio"),
        city=updated_user.get("city"),
        showCity=updated_user.get("showCity", False),
        created_at=updated_user["created_at"],
        role=updated_user.get("role", "user"),
        status=updated_user.get("status", "active"),
        rocket10_completed=updated_user.get("rocket10_completed", False),
        streak_days=updated_user.get("streak_days", 0),
        followed_categories=updated_user.get("followed_categories", [])
    )

@api_router.post("/users/me/avatar")
async def upload_avatar(file: UploadFile = FastAPIFile(...), user: dict = Depends(require_auth)):
    """Upload avatar image"""
    import base64
    import os
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read file content
    content = await file.read()
    
    # Limit file size (2MB)
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if file.filename else 'jpg'
    filename = f"{user['id']}_{str(uuid.uuid4())[:8]}.{file_ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(content)
    
    # Generate URL (served via static files)
    avatar_url = f"/api/uploads/avatars/{filename}"
    
    # Update user record
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatarUrl": avatar_url}}
    )
    
    return {"url": avatar_url, "message": "Avatar uploaded successfully"}

class AvatarBase64Upload(BaseModel):
    image: str
    mimeType: str = "image/jpeg"

@api_router.post("/users/me/avatar-base64")
async def upload_avatar_base64(data: AvatarBase64Upload, user: dict = Depends(require_auth)):
    """Upload avatar image as base64"""
    import base64
    import os
    
    # Decode base64
    try:
        image_data = base64.b64decode(data.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")
    
    # Limit file size (2MB)
    if len(image_data) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "/app/backend/uploads/avatars"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Determine file extension from mimeType
    ext = 'jpg'
    if 'png' in data.mimeType:
        ext = 'png'
    elif 'gif' in data.mimeType:
        ext = 'gif'
    elif 'webp' in data.mimeType:
        ext = 'webp'
    
    # Generate unique filename
    filename = f"{user['id']}_{str(uuid.uuid4())[:8]}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(image_data)
    
    # Generate URL (served via static files)
    avatar_url = f"/api/uploads/avatars/{filename}"
    
    # Update user record
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"avatarUrl": avatar_url}}
    )
    
    return {"url": avatar_url, "message": "Avatar uploaded successfully"}

# ===================== DELETE ACCOUNT =====================

@api_router.delete("/users/me")
async def delete_account(user: dict = Depends(require_auth)):
    """Permanently delete user account and all associated data"""
    user_id = user["id"]
    
    logger.info(f"Deleting account for user: {user_id}")
    
    # Delete all user's problems (posts)
    await db.problems.delete_many({"user_id": user_id})
    
    # Delete all user's comments
    await db.comments.delete_many({"user_id": user_id})
    
    # Delete all user's relates
    await db.relates.delete_many({"user_id": user_id})
    
    # Delete all user's helpfuls (on comments)
    await db.helpfuls.delete_many({"user_id": user_id})
    
    # Delete all user's notifications
    await db.notifications.delete_many({"user_id": user_id})
    
    # Delete blocked user records (both as blocker and blocked)
    await db.blocked_users.delete_many({"blocker_user_id": user_id})
    await db.blocked_users.delete_many({"blocked_user_id": user_id})
    
    # Delete user's reports
    await db.reports.delete_many({"reporter_id": user_id})
    
    # Delete push tokens
    await db.push_tokens.delete_many({"user_id": user_id})
    
    # Delete notification settings
    await db.notification_settings.delete_many({"user_id": user_id})
    
    # Delete feedback from this user
    await db.feedback.delete_many({"user_id": user_id})
    
    # Finally, delete the user record
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"Successfully deleted account for user: {user_id}")
    
    return {"success": True, "message": "Account deleted successfully"}

# ===================== CHANGE PASSWORD =====================

@api_router.post("/users/me/change-password")
async def change_password(request: ChangePasswordRequest, user: dict = Depends(require_auth)):
    """Change user password"""
    # Verify current password
    db_user = await db.users.find_one({"id": user["id"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(request.current_password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    # Hash and save new password
    new_hash = hash_password(request.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"success": True, "message": "Password changed successfully"}

# ===================== BLOCKED USERS =====================

@api_router.get("/users/me/blocked")
async def get_blocked_users(user: dict = Depends(require_auth)):
    """Get list of users blocked by current user"""
    blocked = await db.blocked_users.find(
        {"blocker_user_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich with user info
    results = []
    for b in blocked:
        blocked_user = await db.users.find_one({"id": b["blocked_user_id"]})
        results.append({
            "id": b["id"],
            "blocked_user_id": b["blocked_user_id"],
            "blocked_user_name": blocked_user.get("displayName") or blocked_user.get("name") if blocked_user else "Unknown",
            "blocked_user_avatar": blocked_user.get("avatarUrl") if blocked_user else None,
            "created_at": b["created_at"].isoformat() if isinstance(b["created_at"], datetime) else b["created_at"],
        })
    
    return results

@api_router.post("/users/{user_id}/block")
async def block_user(user_id: str, user: dict = Depends(require_auth)):
    """Block another user"""
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    # Check if target user exists
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already blocked
    existing = await db.blocked_users.find_one({
        "blocker_user_id": user["id"],
        "blocked_user_id": user_id
    })
    if existing:
        return {"success": True, "message": "User already blocked"}
    
    # Create block record
    block_record = BlockedUser(
        blocker_user_id=user["id"],
        blocked_user_id=user_id
    )
    await db.blocked_users.insert_one(block_record.dict())
    
    return {"success": True, "message": "User blocked"}

@api_router.delete("/users/{user_id}/block")
async def unblock_user(user_id: str, user: dict = Depends(require_auth)):
    """Unblock a user"""
    result = await db.blocked_users.delete_one({
        "blocker_user_id": user["id"],
        "blocked_user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    
    return {"success": True, "message": "User unblocked"}

# Helper function to get blocked user IDs for filtering
async def get_blocked_user_ids(user_id: str) -> List[str]:
    """Get list of user IDs that the given user has blocked or is blocked by"""
    # Users I blocked
    blocked_by_me = await db.blocked_users.find(
        {"blocker_user_id": user_id}
    ).to_list(1000)
    
    # Users who blocked me (mutual invisibility)
    blocked_me = await db.blocked_users.find(
        {"blocked_user_id": user_id}
    ).to_list(1000)
    
    blocked_ids = set()
    for b in blocked_by_me:
        blocked_ids.add(b["blocked_user_id"])
    for b in blocked_me:
        blocked_ids.add(b["blocker_user_id"])
    
    return list(blocked_ids)

# ===================== REPORT =====================

@api_router.post("/problems/{problem_id}/report")
async def report_problem(problem_id: str, user: dict = Depends(require_auth)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    new_count = problem.get("reports_count", 0) + 1
    is_hidden = new_count >= 3
    status = "hidden" if is_hidden else problem.get("status", "active")
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"reports_count": new_count, "is_hidden": is_hidden, "status": status}}
    )
    
    return {"reported": True, "is_hidden": is_hidden}

# Enhanced Report endpoint with reason
class ReportRequest(BaseModel):
    reason: str = "spam"
    details: Optional[str] = None

@api_router.post("/report/problem/{problem_id}")
async def create_problem_report(problem_id: str, report_data: ReportRequest, user: dict = Depends(require_auth)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    if report_data.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Invalid report reason")
    
    # Check if user already reported this
    existing = await db.reports.find_one({
        "reporter_id": user["id"],
        "target_type": "problem",
        "target_id": problem_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this")
    
    # Create report
    report = Report(
        reporter_id=user["id"],
        reporter_name=user["name"],
        target_type="problem",
        target_id=problem_id,
        reason=report_data.reason,
        details=report_data.details
    )
    await db.reports.insert_one(report.dict())
    
    # Update problem report count
    new_count = problem.get("reports_count", 0) + 1
    is_hidden = new_count >= 3
    status = "hidden" if is_hidden else problem.get("status", "active")
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"reports_count": new_count, "is_hidden": is_hidden, "status": status}}
    )
    
    return {"reported": True, "is_hidden": is_hidden, "report_count": new_count}

@api_router.post("/report/comment/{comment_id}")
async def create_comment_report(comment_id: str, report_data: ReportRequest, user: dict = Depends(require_auth)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if report_data.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Invalid report reason")
    
    # Check if user already reported this
    existing = await db.reports.find_one({
        "reporter_id": user["id"],
        "target_type": "comment",
        "target_id": comment_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this")
    
    # Create report
    report = Report(
        reporter_id=user["id"],
        reporter_name=user["name"],
        target_type="comment",
        target_id=comment_id,
        reason=report_data.reason,
        details=report_data.details
    )
    await db.reports.insert_one(report.dict())
    
    # Update comment report count
    new_count = comment.get("reports_count", 0) + 1
    is_hidden = new_count >= 3
    status = "hidden" if is_hidden else comment.get("status", "active")
    
    await db.comments.update_one(
        {"id": comment_id},
        {"$set": {"reports_count": new_count, "status": status}}
    )
    
    return {"reported": True, "is_hidden": is_hidden, "report_count": new_count}

@api_router.post("/report/user/{user_id}")
async def create_user_report(user_id: str, report_data: ReportRequest, user: dict = Depends(require_auth)):
    """Report a user"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    if report_data.reason not in REPORT_REASONS:
        raise HTTPException(status_code=400, detail="Invalid report reason")
    
    # Check if user already reported this user
    existing = await db.reports.find_one({
        "reporter_id": user["id"],
        "target_type": "user",
        "target_id": user_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reported this user")
    
    # Create report
    report = Report(
        reporter_id=user["id"],
        reporter_name=user["name"],
        target_type="user",
        target_id=user_id,
        reason=report_data.reason,
        details=report_data.details
    )
    await db.reports.insert_one(report.dict())
    
    return {"reported": True, "message": "Report submitted"}

# ===================== ADMIN ROUTES =====================

# --- Admin: Moderation ---

@api_router.get("/admin/reports")
async def get_reports(
    status: str = "pending",
    target_type: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(require_admin)
):
    """Get list of reports for moderation"""
    query = {}
    if status:
        query["status"] = status
    if target_type:
        query["target_type"] = target_type
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reports.count_documents(query)
    
    # Batch fetch target data to avoid N+1 queries
    problem_ids = [r["target_id"] for r in reports if r["target_type"] == "problem"]
    comment_ids = [r["target_id"] for r in reports if r["target_type"] == "comment"]
    user_ids = [r["target_id"] for r in reports if r["target_type"] == "user"]
    
    problems_map = {}
    if problem_ids:
        problems = await db.problems.find(
            {"id": {"$in": problem_ids}}, 
            {"_id": 0, "id": 1, "title": 1, "status": 1, "user_name": 1}
        ).to_list(len(problem_ids))
        problems_map = {p["id"]: p for p in problems}
    
    comments_map = {}
    if comment_ids:
        comments = await db.comments.find(
            {"id": {"$in": comment_ids}}, 
            {"_id": 0, "id": 1, "content": 1, "status": 1, "user_name": 1}
        ).to_list(len(comment_ids))
        comments_map = {c["id"]: c for c in comments}
    
    users_map = {}
    if user_ids:
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "id": 1, "displayName": 1, "name": 1, "email": 1}
        ).to_list(len(user_ids))
        users_map = {u["id"]: u for u in users}
    
    # Enrich reports with target data
    for report in reports:
        if report["target_type"] == "problem":
            report["target_data"] = problems_map.get(report["target_id"])
        elif report["target_type"] == "comment":
            report["target_data"] = comments_map.get(report["target_id"])
        elif report["target_type"] == "user":
            report["target_data"] = users_map.get(report["target_id"])
        
        # Convert datetime to ISO string for JSON serialization
        if "created_at" in report and hasattr(report["created_at"], "isoformat"):
            report["created_at"] = report["created_at"].isoformat()
    
    return {"reports": reports, "total": total}

@api_router.get("/admin/reported-problems")
async def get_reported_problems(limit: int = 50, skip: int = 0, admin: dict = Depends(require_admin)):
    """Get problems sorted by report count"""
    problems = await db.problems.find({"reports_count": {"$gt": 0}}).sort("reports_count", -1).skip(skip).limit(limit).to_list(limit)
    return problems

@api_router.get("/admin/reported-comments")
async def get_reported_comments(limit: int = 50, skip: int = 0, admin: dict = Depends(require_admin)):
    """Get comments sorted by report count"""
    comments = await db.comments.find({"reports_count": {"$gt": 0}}).sort("reports_count", -1).skip(skip).limit(limit).to_list(limit)
    return comments

@api_router.post("/admin/reports/{report_id}/dismiss")
async def dismiss_report(report_id: str, admin: dict = Depends(require_admin)):
    """Dismiss a report"""
    result = await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "dismissed"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await log_admin_action(admin, "dismiss_report", "report", report_id)
    return {"success": True}

@api_router.post("/admin/reports/{report_id}/reviewed")
async def mark_report_reviewed(report_id: str, admin: dict = Depends(require_admin)):
    """Mark a report as reviewed"""
    result = await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "reviewed"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    await log_admin_action(admin, "review_report", "report", report_id)
    return {"success": True}

# --- Admin: Problem Management ---

@api_router.post("/admin/problems/{problem_id}/hide")
async def hide_problem(problem_id: str, admin: dict = Depends(require_admin)):
    """Hide a problem (soft delete)"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"status": "hidden", "is_hidden": True}}
    )
    
    await log_admin_action(admin, "hide_problem", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "status": "hidden"}

@api_router.post("/admin/problems/{problem_id}/unhide")
async def unhide_problem(problem_id: str, admin: dict = Depends(require_admin)):
    """Unhide a problem"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"status": "active", "is_hidden": False}}
    )
    
    await log_admin_action(admin, "unhide_problem", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "status": "active"}

@api_router.delete("/admin/problems/{problem_id}")
async def delete_problem(problem_id: str, admin: dict = Depends(require_admin)):
    """Permanently delete a problem"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Delete related data
    await db.comments.delete_many({"problem_id": problem_id})
    await db.relates.delete_many({"problem_id": problem_id})
    await db.reports.delete_many({"target_type": "problem", "target_id": problem_id})
    await db.problems.delete_one({"id": problem_id})
    
    await log_admin_action(admin, "delete_problem", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "deleted": True}

@api_router.post("/admin/problems/{problem_id}/pin")
async def pin_problem(problem_id: str, admin: dict = Depends(require_admin)):
    """Pin a problem (featured)"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one({"id": problem_id}, {"$set": {"is_pinned": True}})
    
    await log_admin_action(admin, "pin_problem", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "is_pinned": True}

@api_router.post("/admin/problems/{problem_id}/unpin")
async def unpin_problem(problem_id: str, admin: dict = Depends(require_admin)):
    """Unpin a problem"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one({"id": problem_id}, {"$set": {"is_pinned": False}})
    
    await log_admin_action(admin, "unpin_problem", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "is_pinned": False}

@api_router.post("/admin/problems/{problem_id}/needs-context")
async def mark_needs_context(problem_id: str, admin: dict = Depends(require_admin)):
    """Mark a problem as needing more context"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one({"id": problem_id}, {"$set": {"needs_context": True}})
    
    # Notify the author
    notification = Notification(
        user_id=problem["user_id"],
        type="needs_context",
        problem_id=problem_id,
        message="Your problem needs more context. Please add more details."
    )
    await db.notifications.insert_one(notification.dict())
    
    await log_admin_action(admin, "mark_needs_context", "problem", problem_id, {"title": problem["title"]})
    return {"success": True, "needs_context": True}

@api_router.post("/admin/problems/{problem_id}/clear-needs-context")
async def clear_needs_context(problem_id: str, admin: dict = Depends(require_admin)):
    """Clear needs context flag"""
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    await db.problems.update_one({"id": problem_id}, {"$set": {"needs_context": False}})
    
    await log_admin_action(admin, "clear_needs_context", "problem", problem_id)
    return {"success": True, "needs_context": False}

# ===================== BROADCAST NOTIFICATIONS =====================

class BroadcastNotificationRequest(BaseModel):
    title: str
    body: str

@api_router.post("/admin/broadcast-notification")
async def broadcast_notification(request: BroadcastNotificationRequest, admin: dict = Depends(require_admin)):
    """Send a push notification to all users with notifications enabled"""
    
    # Validate input
    if len(request.title) > 50:
        raise HTTPException(status_code=400, detail="Title must be 50 characters or less")
    if len(request.body) > 150:
        raise HTTPException(status_code=400, detail="Body must be 150 characters or less")
    if not request.title.strip() or not request.body.strip():
        raise HTTPException(status_code=400, detail="Title and body are required")
    
    # Rate limit: max 3 broadcasts per day
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_start = datetime.strptime(today, "%Y-%m-%d")
    today_end = today_start + timedelta(days=1)
    
    broadcasts_today = await db.broadcast_logs.count_documents({
        "sent_at": {"$gte": today_start, "$lt": today_end}
    })
    
    if broadcasts_today >= 3:
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Max 3 broadcasts per day. You have sent {broadcasts_today} today."
        )
    
    # Get all users with notifications enabled
    # First get users who have NOT disabled notifications (default is enabled)
    users_with_disabled = await db.notification_settings.find(
        {"push_notifications": False},
        {"user_id": 1}
    ).to_list(10000)
    disabled_user_ids = {u["user_id"] for u in users_with_disabled}
    
    # Get all active push tokens for users who haven't disabled notifications
    all_tokens = await db.push_tokens.find(
        {"is_active": True},
        {"token": 1, "user_id": 1}
    ).to_list(50000)
    
    # Filter out tokens for users who disabled notifications
    active_tokens = [t for t in all_tokens if t["user_id"] not in disabled_user_ids]
    
    if not active_tokens:
        raise HTTPException(status_code=400, detail="No users with push notifications enabled")
    
    # Send notifications in batches
    tokens_list = [t["token"] for t in active_tokens]
    recipient_count = len(set(t["user_id"] for t in active_tokens))  # Unique users
    
    # Send the push notification
    await send_push_notification(
        tokens=tokens_list,
        title=request.title.strip(),
        body=request.body.strip(),
        data={"type": "broadcast"}
    )
    
    # Store broadcast in each recipient's notifications collection
    recipient_user_ids = list(set(t["user_id"] for t in active_tokens))
    broadcast_notifications = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "broadcast",
            "problem_id": "",  # No problem associated
            "message": f"{request.title.strip()}: {request.body.strip()[:80]}...",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        for user_id in recipient_user_ids
    ]
    if broadcast_notifications:
        await db.notifications.insert_many(broadcast_notifications)
    
    # Log the broadcast
    broadcast_log = {
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_email": admin["email"],
        "title": request.title.strip(),
        "body": request.body.strip(),
        "sent_at": datetime.utcnow(),
        "recipient_count": recipient_count,
        "tokens_count": len(tokens_list)
    }
    await db.broadcast_logs.insert_one(broadcast_log)
    
    # Also log as admin action
    await log_admin_action(admin, "broadcast_notification", "broadcast", broadcast_log["id"], {
        "title": request.title,
        "recipient_count": recipient_count
    })
    
    return {
        "success": True,
        "message": f"Notification sent to {recipient_count} users",
        "recipient_count": recipient_count
    }

@api_router.get("/admin/broadcast-history")
async def get_broadcast_history(admin: dict = Depends(require_admin)):
    """Get recent broadcast notification history"""
    broadcasts = await db.broadcast_logs.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).limit(10).to_list(10)
    
    return {"broadcasts": broadcasts}

@api_router.get("/admin/broadcast-stats")
async def get_broadcast_stats(admin: dict = Depends(require_admin)):
    """Get broadcast stats including rate limit info"""
    # Get today's broadcast count
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_start = datetime.strptime(today, "%Y-%m-%d")
    today_end = today_start + timedelta(days=1)
    
    broadcasts_today = await db.broadcast_logs.count_documents({
        "sent_at": {"$gte": today_start, "$lt": today_end}
    })
    
    # Get total users with active push tokens
    total_tokens = await db.push_tokens.count_documents({"is_active": True})
    
    # Get users who disabled push notifications
    disabled_count = await db.notification_settings.count_documents({"push_notifications": False})
    
    return {
        "broadcasts_today": broadcasts_today,
        "max_broadcasts_per_day": 3,
        "remaining_broadcasts": max(0, 3 - broadcasts_today),
        "total_push_tokens": total_tokens,
        "users_with_disabled_notifications": disabled_count
    }

@api_router.get("/admin/debug-push-tokens")
async def debug_push_tokens(admin: dict = Depends(require_admin)):
    """Debug endpoint to check push token formats"""
    tokens = await db.push_tokens.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    valid_expo_tokens = []
    invalid_tokens = []
    
    for t in tokens:
        token = t.get("token", "")
        user_id = t.get("user_id", "")
        
        if token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken["):
            valid_expo_tokens.append({
                "user_id": user_id[:8] + "...",
                "token_prefix": token[:30] + "...",
                "platform": t.get("platform", "unknown")
            })
        elif token.startswith("simulator-") or token.startswith("web-"):
            invalid_tokens.append({
                "user_id": user_id[:8] + "...",
                "reason": "simulator/web token",
                "token_prefix": token[:20]
            })
        else:
            invalid_tokens.append({
                "user_id": user_id[:8] + "...",
                "reason": "unknown format",
                "token_prefix": token[:30] if token else "empty"
            })
    
    return {
        "total_tokens": len(tokens),
        "valid_expo_tokens": len(valid_expo_tokens),
        "invalid_tokens": len(invalid_tokens),
        "valid_tokens_sample": valid_expo_tokens[:5],
        "invalid_tokens_sample": invalid_tokens[:5]
    }

@api_router.post("/admin/test-push")
async def test_push_notification(admin: dict = Depends(require_admin)):
    """Send a test push notification to the admin's devices"""
    # Get admin's push tokens
    admin_tokens = await db.push_tokens.find(
        {"user_id": admin["id"], "is_active": True},
        {"token": 1}
    ).to_list(10)
    
    if not admin_tokens:
        return {
            "success": False,
            "error": "No push tokens registered for your account",
            "hint": "Open the app on your physical device to register a push token"
        }
    
    tokens = [t["token"] for t in admin_tokens]
    
    # Filter valid tokens
    valid_tokens = [t for t in tokens if t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")]
    invalid_count = len(tokens) - len(valid_tokens)
    
    if not valid_tokens:
        return {
            "success": False,
            "error": f"All {len(tokens)} tokens are invalid format",
            "tokens_preview": [t[:30] for t in tokens[:3]]
        }
    
    # Send test notification
    await send_push_notification(
        tokens=valid_tokens,
        title="Test Notification",
        body="This is a test push notification from FRIKT admin panel.",
        data={"type": "test", "timestamp": datetime.utcnow().isoformat()}
    )
    
    return {
        "success": True,
        "message": f"Test notification sent to {len(valid_tokens)} valid tokens",
        "invalid_tokens_skipped": invalid_count
    }

class MergeDuplicatesRequest(BaseModel):
    duplicate_ids: List[str]

@api_router.post("/admin/problems/{problem_id}/merge")
async def merge_duplicates(problem_id: str, merge_data: MergeDuplicatesRequest, admin: dict = Depends(require_admin)):
    """Merge duplicate problems into a primary one"""
    primary = await db.problems.find_one({"id": problem_id})
    if not primary:
        raise HTTPException(status_code=404, detail="Primary problem not found")
    
    merged_count = 0
    for dup_id in merge_data.duplicate_ids:
        if dup_id == problem_id:
            continue
        
        dup = await db.problems.find_one({"id": dup_id})
        if dup:
            # Mark as merged and hidden
            await db.problems.update_one(
                {"id": dup_id},
                {"$set": {
                    "merged_into": problem_id,
                    "status": "hidden",
                    "is_hidden": True
                }}
            )
            
            # Add relates from duplicate to primary
            primary_relates = primary.get("relates_count", 0) + dup.get("relates_count", 0)
            await db.problems.update_one(
                {"id": problem_id},
                {"$set": {"relates_count": primary_relates}}
            )
            
            merged_count += 1
    
    await log_admin_action(admin, "merge_duplicates", "problem", problem_id, {
        "duplicates": merge_data.duplicate_ids,
        "merged_count": merged_count
    })
    
    return {"success": True, "merged_count": merged_count}

# --- Admin: Comment Management ---

@api_router.post("/admin/comments/{comment_id}/hide")
async def hide_comment(comment_id: str, admin: dict = Depends(require_admin)):
    """Hide a comment"""
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    await db.comments.update_one({"id": comment_id}, {"$set": {"status": "hidden"}})
    
    await log_admin_action(admin, "hide_comment", "comment", comment_id)
    return {"success": True, "status": "hidden"}

@api_router.post("/admin/comments/{comment_id}/unhide")
async def unhide_comment(comment_id: str, admin: dict = Depends(require_admin)):
    """Unhide a comment"""
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    await db.comments.update_one({"id": comment_id}, {"$set": {"status": "active"}})
    
    await log_admin_action(admin, "unhide_comment", "comment", comment_id)
    return {"success": True, "status": "active"}

@api_router.delete("/admin/comments/{comment_id}")
async def delete_comment(comment_id: str, admin: dict = Depends(require_admin)):
    """Permanently delete a comment"""
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Update problem comment count
    await db.problems.update_one(
        {"id": comment["problem_id"]},
        {"$inc": {"comments_count": -1}}
    )
    
    await db.helpfuls.delete_many({"comment_id": comment_id})
    await db.reports.delete_many({"target_type": "comment", "target_id": comment_id})
    await db.comments.delete_one({"id": comment_id})
    
    await log_admin_action(admin, "delete_comment", "comment", comment_id)
    return {"success": True, "deleted": True}

# --- Admin: User Management ---

@api_router.get("/admin/users")
async def get_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(require_admin)
):
    """Get list of users"""
    query = {}
    if status:
        query["status"] = status
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"password_hash": 0, "_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total}

@api_router.get("/admin/users/{user_id}")
async def get_user_detail(user_id: str, admin: dict = Depends(require_admin)):
    """Get detailed user info"""
    user = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user stats
    posts_count = await db.problems.count_documents({"user_id": user_id})
    comments_count = await db.comments.count_documents({"user_id": user_id})
    
    # Get problem IDs for reports calculation
    user_problems = await db.problems.find({"user_id": user_id}, {"id": 1}).to_list(1000)
    problem_ids = [p["id"] for p in user_problems]
    reports_received = await db.reports.count_documents({"target_id": {"$in": problem_ids}}) if problem_ids else 0
    reports_made = await db.reports.count_documents({"reporter_id": user_id})
    
    user["stats"] = {
        "posts_count": posts_count,
        "comments_count": comments_count,
        "reports_received": reports_received,
        "reports_made": reports_made
    }
    
    return user

@api_router.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, admin: dict = Depends(require_admin)):
    """Ban a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban an admin user")
    
    await db.users.update_one({"id": user_id}, {"$set": {"status": "banned"}})
    
    await log_admin_action(admin, "ban_user", "user", user_id, {"email": user["email"]})
    return {"success": True, "status": "banned"}

@api_router.post("/admin/users/{user_id}/shadowban")
async def shadowban_user(user_id: str, admin: dict = Depends(require_admin)):
    """Shadowban a user (their content is hidden from others)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot shadowban an admin user")
    
    await db.users.update_one({"id": user_id}, {"$set": {"status": "shadowbanned"}})
    
    await log_admin_action(admin, "shadowban_user", "user", user_id, {"email": user["email"]})
    return {"success": True, "status": "shadowbanned"}

@api_router.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, admin: dict = Depends(require_admin)):
    """Unban a user"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one({"id": user_id}, {"$set": {"status": "active"}})
    
    await log_admin_action(admin, "unban_user", "user", user_id, {"email": user["email"]})
    return {"success": True, "status": "active"}

# --- Admin: Analytics ---

@api_router.get("/admin/analytics")
async def get_analytics(admin: dict = Depends(require_admin)):
    """Get basic analytics with proper DAU/WAU and signal breakdown"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # User counts
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    banned_users = await db.users.count_documents({"status": {"$in": ["banned", "shadowbanned"]}})
    
    # DAU - unique users who performed an ACTION today (post / relate / comment / follow)
    # "Active" = at least one action, not just app open
    dau_posted = await db.problems.distinct("user_id", {"created_at": {"$gte": today_start}})
    dau_commented = await db.comments.distinct("user_id", {"created_at": {"$gte": today_start}})
    dau_related = await db.relates.distinct("user_id", {"created_at": {"$gte": today_start}})
    # Note: follows don't have timestamps, so we skip them for now
    dau = len(set(dau_posted + dau_commented + dau_related))
    
    # WAU - unique users who performed an ACTION in last 7 days
    wau_posted = await db.problems.distinct("user_id", {"created_at": {"$gte": week_start}})
    wau_commented = await db.comments.distinct("user_id", {"created_at": {"$gte": week_start}})
    wau_related = await db.relates.distinct("user_id", {"created_at": {"$gte": week_start}})
    wau = len(set(wau_posted + wau_commented + wau_related))
    
    # Content counts
    total_problems = await db.problems.count_documents({})
    problems_today = await db.problems.count_documents({"created_at": {"$gte": today_start}})
    problems_week = await db.problems.count_documents({"created_at": {"$gte": week_start}})
    
    total_comments = await db.comments.count_documents({})
    comments_today = await db.comments.count_documents({"created_at": {"$gte": today_start}})
    comments_week = await db.comments.count_documents({"created_at": {"$gte": week_start}})
    
    # Top problems by SignalScore WITH BREAKDOWN
    top_problems_cursor = await db.problems.find(
        {"status": "active"},
        {"_id": 0}
    ).sort("signal_score", -1).limit(10).to_list(10)
    
    # Build top problems with signal breakdown
    top_problems = []
    for p in top_problems_cursor:
        # Recalculate with breakdown for transparency
        signal_data = calculate_signal_score(p, include_breakdown=True)
        top_problems.append({
            "id": p.get("id", ""),
            "title": p.get("title", ""),
            "signal_score": signal_data["total"],
            "signal_breakdown": signal_data["breakdown"],
            "relates_count": p.get("relates_count", 0),
            "comments_count": p.get("comments_count", 0),
            "unique_commenters": p.get("unique_commenters", 0),
        })
    
    # Pending reports
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "banned": banned_users,
            "dau": dau,
            "wau": wau,
            "dau_definition": "Users who posted, related, or commented today",
            "wau_definition": "Users who posted, related, or commented in last 7 days"
        },
        "problems": {
            "total": total_problems,
            "today": problems_today,
            "week": problems_week
        },
        "comments": {
            "total": total_comments,
            "today": comments_today,
            "week": comments_week
        },
        "top_problems": top_problems,
        "signal_formula": {
            "description": "Signal = (relates×3) + (comments×2) + (unique_commenters×1) + pain_bonus + recency_boost",
            "weights": SIGNAL_WEIGHTS,
            "notes": "Recency boost decays to 0 over 72h. Posts with engagement always beat posts without (except very new)."
        },
        "pending_reports": pending_reports
    }

# --- Admin: Audit Log ---

@api_router.get("/admin/audit-log")
async def get_audit_log(
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    admin: dict = Depends(require_admin)
):
    """Get admin audit log"""
    query = {}
    if admin_id:
        query["admin_id"] = admin_id
    if action:
        query["action"] = action
    
    logs = await db.admin_audit_logs.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.admin_audit_logs.count_documents(query)
    
    return {"logs": logs, "total": total}

# ===================== PUSH NOTIFICATIONS =====================

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(tokens: List[str], title: str, body: str, data: dict = None):
    """Send push notification via Expo's push notification service"""
    if not tokens:
        logger.warning("send_push_notification called with empty tokens list")
        return
    
    messages = []
    skipped_tokens = []
    for token in tokens:
        # Skip invalid tokens
        if not token:
            skipped_tokens.append("empty")
            continue
        if token.startswith('simulator-') or token.startswith('web-'):
            skipped_tokens.append(f"invalid:{token[:20]}")
            continue
        
        # Validate Expo token format
        if not (token.startswith('ExponentPushToken[') or token.startswith('ExpoPushToken[')):
            skipped_tokens.append(f"wrong_format:{token[:30]}")
            continue
            
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",  # Ensure high priority for immediate delivery
            "channelId": "default",  # Android notification channel
        }
        messages.append(message)
    
    if skipped_tokens:
        logger.warning(f"Skipped {len(skipped_tokens)} invalid tokens: {skipped_tokens[:5]}")
    
    if not messages:
        logger.warning("No valid messages to send after filtering tokens")
        return
    
    logger.info(f"Sending {len(messages)} push notifications with title: {title}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                }
            )
            result = response.json()
            logger.info(f"Expo Push API response status: {response.status_code}")
            logger.info(f"Expo Push API result: {result}")
            
            # Handle failed tokens (remove them from database)
            if "data" in result:
                success_count = 0
                error_count = 0
                for i, ticket in enumerate(result["data"]):
                    if ticket.get("status") == "ok":
                        success_count += 1
                    elif ticket.get("status") == "error":
                        error_count += 1
                        error_type = ticket.get("details", {}).get("error")
                        error_message = ticket.get("message", "")
                        logger.error(f"Push ticket error: {error_type} - {error_message} for token: {messages[i]['to'][:30]}...")
                        
                        if error_type in ["DeviceNotRegistered", "InvalidCredentials"]:
                            # Remove invalid token
                            await db.push_tokens.delete_one({"token": messages[i]["to"]})
                            logger.info(f"Removed invalid push token: {messages[i]['to'][:30]}...")
                
                logger.info(f"Push notification results: {success_count} success, {error_count} errors")
            else:
                logger.warning(f"Unexpected Expo response format: {result}")
                
    except httpx.TimeoutException:
        logger.error("Timeout sending push notification to Expo API")
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")

async def send_notification_to_user(user_id: str, title: str, body: str, data: dict = None):
    """Send push notification to a specific user"""
    # Get user's notification settings
    settings = await db.notification_settings.find_one({"user_id": user_id})
    
    # Get user's push tokens
    tokens_cursor = db.push_tokens.find({"user_id": user_id, "is_active": True})
    tokens = [t["token"] async for t in tokens_cursor]
    
    if tokens:
        await send_push_notification(tokens, title, body, data)

@api_router.post("/push/register")
async def register_push_token(token_data: PushTokenCreate, user: dict = Depends(require_auth)):
    """Register a push notification token for the user"""
    # Check if token already exists for this user
    existing = await db.push_tokens.find_one({
        "user_id": user["id"],
        "token": token_data.token
    })
    
    if existing:
        # Update to active
        await db.push_tokens.update_one(
            {"id": existing["id"]},
            {"$set": {"is_active": True, "created_at": datetime.utcnow()}}
        )
        return {"success": True, "message": "Token updated"}
    
    # Check if token exists for another user (device transfer)
    old_token = await db.push_tokens.find_one({"token": token_data.token})
    if old_token:
        await db.push_tokens.delete_one({"id": old_token["id"]})
    
    # Create new token
    push_token = PushToken(
        user_id=user["id"],
        token=token_data.token
    )
    await db.push_tokens.insert_one(push_token.dict())
    
    # Initialize notification settings if not exists
    settings = await db.notification_settings.find_one({"user_id": user["id"]})
    if not settings:
        default_settings = NotificationSettings(user_id=user["id"])
        await db.notification_settings.insert_one(default_settings.dict())
    
    return {"success": True, "message": "Token registered"}

@api_router.delete("/push/unregister")
async def unregister_push_token(user: dict = Depends(require_auth)):
    """Unregister all push tokens for the user"""
    await db.push_tokens.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_active": False}}
    )
    return {"success": True, "message": "Tokens unregistered"}

@api_router.get("/push/settings")
async def get_push_settings(user: dict = Depends(require_auth)):
    """Get user's notification settings"""
    settings = await db.notification_settings.find_one({"user_id": user["id"]})
    if not settings:
        # Return defaults
        return {
            "push_notifications": True,
            "new_comments": True,
            "new_relates": True,
            "trending": True
        }
    return {
        "push_notifications": settings.get("push_notifications", True),
        "new_comments": settings.get("new_comments", True),
        "new_relates": settings.get("new_relates", True),
        "trending": settings.get("trending", True)
    }

@api_router.put("/push/settings")
async def update_push_settings(
    settings_update: NotificationSettingsUpdate,
    user: dict = Depends(require_auth)
):
    """Update user's notification settings"""
    update_data = {k: v for k, v in settings_update.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No settings to update")
    
    await db.notification_settings.update_one(
        {"user_id": user["id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "updated": update_data}

@api_router.post("/push/test")
async def test_push_notification(user: dict = Depends(require_auth)):
    """Send a test push notification to the user"""
    await send_notification_to_user(
        user["id"],
        "Test Notification",
        "Push notifications are working! 🎉",
        {"type": "test"}
    )
    return {"success": True, "message": "Test notification sent"}

# ===================== FEEDBACK =====================

class FeedbackCreate(BaseModel):
    message: str = Field(..., min_length=5, max_length=2000)
    appVersion: Optional[str] = "1.0.0"

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_email: str
    message: str
    app_version: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False

@api_router.post("/feedback")
async def submit_feedback(feedback_data: FeedbackCreate, user: dict = Depends(require_auth)):
    """Submit user feedback"""
    feedback = Feedback(
        user_id=user["id"],
        user_name=user.get("displayName") or user["name"],
        user_email=user["email"],
        message=feedback_data.message.strip(),
        app_version=feedback_data.appVersion or "1.0.0"
    )
    
    await db.feedbacks.insert_one(feedback.dict())
    
    # Send push notification to all admin users
    admin_users = await db.users.find({"role": "admin"}, {"id": 1}).to_list(100)
    for admin in admin_users:
        if admin["id"] != user["id"]:  # Don't notify if admin sends feedback to themselves
            await send_notification_to_user(
                admin["id"],
                "New Feedback Received",
                f"From {user.get('displayName') or user['name']}: {feedback_data.message[:60]}...",
                {"type": "new_feedback", "feedbackId": feedback.id}
            )
            # Also create in-app notification
            notification = Notification(
                user_id=admin["id"],
                type="new_feedback",
                problem_id=feedback.id,  # Repurpose this field for feedback ID
                message=f"New feedback from {user.get('displayName') or user['name']}"
            )
            await db.notifications.insert_one(notification.dict())
    
    logger.info(f"Feedback submitted by {user['email']}: {feedback_data.message[:50]}...")
    return {"success": True, "id": feedback.id}

@api_router.get("/admin/feedback")
async def get_admin_feedback(
    is_read: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    admin: dict = Depends(require_admin)
):
    """Get all feedback (admin only)"""
    query = {}
    if is_read == "true":
        query["is_read"] = True
    elif is_read == "false":
        query["is_read"] = False
    
    feedbacks = await db.feedbacks.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.feedbacks.count_documents(query)
    unread_count = await db.feedbacks.count_documents({"is_read": False})
    
    # Convert datetime objects to strings for JSON serialization
    for feedback in feedbacks:
        if "created_at" in feedback and isinstance(feedback["created_at"], datetime):
            feedback["created_at"] = feedback["created_at"].isoformat()
    
    return {"feedbacks": feedbacks, "total": total, "unread_count": unread_count}

@api_router.post("/admin/feedback/{feedback_id}/read")
async def mark_feedback_read(feedback_id: str, admin: dict = Depends(require_admin)):
    """Mark feedback as read"""
    result = await db.feedbacks.update_one(
        {"id": feedback_id},
        {"$set": {"is_read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True}

@api_router.post("/admin/feedback/{feedback_id}/unread")
async def mark_feedback_unread(feedback_id: str, admin: dict = Depends(require_admin)):
    """Mark feedback as unread"""
    result = await db.feedbacks.update_one(
        {"id": feedback_id},
        {"$set": {"is_read": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"success": True}

@api_router.delete("/admin/feedback/{feedback_id}")
async def delete_feedback(feedback_id: str, admin: dict = Depends(require_admin)):
    """Delete feedback"""
    result = await db.feedbacks.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    await log_admin_action(admin, "delete_feedback", "feedback", feedback_id)
    return {"success": True}

# ===================== HEALTH CHECK =====================

@api_router.get("/")
async def root():
    return {"message": "PathGro API", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on app startup."""
    asyncio.create_task(notification_batch_processor())
    logger.info("Notification batch processor started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
