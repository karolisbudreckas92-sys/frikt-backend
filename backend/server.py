from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile
from fastapi import File as FastAPIFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import httpx

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
    category_id: str
    frequency: str
    pain_level: int = Field(..., ge=1, le=5)
    willing_to_pay: Optional[str] = "$0"
    when_happens: str = Field(..., min_length=40)
    who_affected: str = Field(..., min_length=40)
    what_tried: str = Field(..., min_length=40)
    is_problem_not_solution: bool = True

class Problem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    title: str
    category_id: str
    frequency: str
    pain_level: int
    willing_to_pay: str = "$0"
    when_happens: str
    who_affected: str
    what_tried: str
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
    new_comments: bool = True
    new_relates: bool = True
    trending: bool = True

class NotificationSettingsUpdate(BaseModel):
    new_comments: Optional[bool] = None
    new_relates: Optional[bool] = None
    trending: Optional[bool] = None

# Report Model (for posts and comments)
REPORT_REASONS = ["spam", "abuse", "off-topic", "duplicate"]

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

# ===================== SIGNAL SCORE =====================

def calculate_signal_score(problem: dict) -> float:
    """Calculate SignalScore based on relates, comments, frequency, and pain"""
    relates = problem.get("relates_count", 0)
    comments = problem.get("comments_count", 0)
    unique_commenters = problem.get("unique_commenters", 0)
    pain = problem.get("pain_level", 1)
    
    frequency_weights = {"daily": 4, "weekly": 3, "monthly": 2, "rare": 1}
    freq_weight = frequency_weights.get(problem.get("frequency", "rare"), 1)
    
    # Score formula: weighted combination
    score = (relates * 2) + (comments * 1.5) + (unique_commenters * 3) + (pain * freq_weight)
    
    # Time decay (optional, for trending)
    created_at = problem.get("created_at", datetime.utcnow())
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    hours_old = (datetime.utcnow() - created_at.replace(tzinfo=None)).total_seconds() / 3600
    decay = max(0.5, 1 - (hours_old / 168))  # Decay over 1 week
    
    return round(score * decay, 2)

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Determine role based on admin email list
    email_lower = user_data.email.lower()
    role = "admin" if email_lower in ADMIN_EMAILS else "user"
    
    # Create user
    user = User(
        email=user_data.email,
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
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if user is banned
    if user.get("status") == "banned":
        raise HTTPException(status_code=403, detail="Your account has been suspended")
    
    # Update role if email is in admin list (in case list was updated)
    email_lower = credentials.email.lower()
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

# ===================== CATEGORIES ROUTES =====================

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ===================== PROBLEMS ROUTES =====================

@api_router.post("/problems", response_model=ProblemResponse)
async def create_problem(problem_data: ProblemCreate, user: dict = Depends(require_auth)):
    # Check rate limit (max 3 posts/day)
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if user.get("last_post_date") == today and user.get("posts_today", 0) >= 3:
        raise HTTPException(status_code=429, detail="Maximum 3 posts per day allowed")
    
    # Validate category
    category = next((c for c in CATEGORIES if c["id"] == problem_data.category_id), None)
    if not category:
        raise HTTPException(status_code=400, detail="Invalid category")
    
    # Validate frequency and pain
    if problem_data.frequency not in FREQUENCY_OPTIONS:
        raise HTTPException(status_code=400, detail="Invalid frequency")
    
    # Create problem
    problem = Problem(
        user_id=user["id"],
        user_name=user["name"],
        title=problem_data.title,
        category_id=problem_data.category_id,
        frequency=problem_data.frequency,
        pain_level=problem_data.pain_level,
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
    
    return ProblemResponse(
        **problem_dict,
        category_name=category["name"],
        category_color=category["color"]
    )

@api_router.get("/problems", response_model=List[ProblemResponse])
async def get_problems(
    feed: str = "new",  # "new", "trending", "foryou"
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    query = {"is_hidden": False}
    
    if category_id:
        query["category_id"] = category_id
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"when_happens": {"$regex": search, "$options": "i"}},
            {"who_affected": {"$regex": search, "$options": "i"}},
        ]
    
    # For "foryou" feed, filter by followed categories
    if feed == "foryou" and user:
        followed_cats = user.get("followed_categories", [])
        followed_problems = user.get("followed_problems", [])
        if followed_cats or followed_problems:
            query["$or"] = [
                {"category_id": {"$in": followed_cats}},
                {"id": {"$in": followed_problems}}
            ]
    
    # Sorting
    if feed == "trending":
        sort = [("signal_score", -1)]
    else:  # new or foryou
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
    for p in problems:
        category = next((c for c in CATEGORIES if c["id"] == p["category_id"]), None)
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

@api_router.get("/problems/{problem_id}", response_model=ProblemResponse)
async def get_problem(problem_id: str, user: dict = Depends(get_current_user)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    category = next((c for c in CATEGORIES if c["id"] == problem["category_id"]), None)
    
    user_has_related = False
    user_has_saved = False
    user_is_following = False
    if user:
        relate = await db.relates.find_one({"problem_id": problem_id, "user_id": user["id"]})
        user_has_related = relate is not None
        user_has_saved = problem_id in user.get("saved_problems", [])
        user_is_following = problem_id in user.get("followed_problems", [])
    
    return ProblemResponse(
        **problem,
        category_name=category["name"] if category else "",
        category_color=category["color"] if category else "#666",
        user_has_related=user_has_related,
        user_has_saved=user_has_saved,
        user_is_following=user_is_following
    )

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
    
    # Check if already related
    existing = await db.relates.find_one({"problem_id": problem_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already related to this problem")
    
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
    
    # Create notification for problem owner (if not self)
    if problem["user_id"] != user["id"]:
        notification = Notification(
            user_id=problem["user_id"],
            type="new_relate",
            problem_id=problem_id,
            message=f"{user['name']} relates to your problem"
        )
        await db.notifications.insert_one(notification.dict())
        
        # Send push notification
        settings = await db.notification_settings.find_one({"user_id": problem["user_id"]})
        if not settings or settings.get("new_relates", True):
            await send_notification_to_user(
                problem["user_id"],
                "Someone relates to your problem",
                f"{user['name']} relates to: {problem['title'][:50]}...",
                {"type": "new_relate", "problemId": problem_id}
            )
    
    return {"relates_count": new_count, "signal_score": new_score}

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

@api_router.post("/comments", response_model=CommentResponse)
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
    
    # Create notification for problem owner and followers
    if problem["user_id"] != user["id"]:
        notification = Notification(
            user_id=problem["user_id"],
            type="new_comment",
            problem_id=comment_data.problem_id,
            message=f"{user['name']} commented on your problem"
        )
        await db.notifications.insert_one(notification.dict())
        
        # Send push notification to problem owner
        settings = await db.notification_settings.find_one({"user_id": problem["user_id"]})
        if not settings or settings.get("new_comments", True):
            await send_notification_to_user(
                problem["user_id"],
                "New comment on your problem",
                f"{user['name']}: {comment_data.content[:60]}...",
                {"type": "new_comment", "problemId": comment_data.problem_id}
            )
    
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
            {"user_id": 1, "new_comments": 1}
        ).to_list(100)
        follower_settings_map = {s["user_id"]: s for s in follower_settings_list}
        
        for follower_id in follower_ids:
            notification = Notification(
                user_id=follower_id,
                type="new_comment",
                problem_id=comment_data.problem_id,
                message=f"New comment on a problem you follow"
            )
            await db.notifications.insert_one(notification.dict())
            
            # Send push notification to follower
            follower_settings = follower_settings_map.get(follower_id)
            if not follower_settings or follower_settings.get("new_comments", True):
                await send_notification_to_user(
                    follower_id,
                    "New comment on followed problem",
                    f"{user['name']} commented on: {problem['title'][:40]}...",
                    {"type": "new_comment", "problemId": comment_data.problem_id}
                )
    
    return CommentResponse(**comment.dict())

@api_router.get("/problems/{problem_id}/comments", response_model=List[CommentResponse])
async def get_comments(problem_id: str, user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"problem_id": problem_id}).sort("helpful_count", -1).to_list(100)
    
    # Get user's helpful marks
    user_helpfuls = set()
    if user:
        helpfuls = await db.helpfuls.find({"user_id": user["id"]}, {"comment_id": 1}).to_list(1000)
        user_helpfuls = {h["comment_id"] for h in helpfuls}
    
    return [
        CommentResponse(**c, user_marked_helpful=c["id"] in user_helpfuls)
        for c in comments
    ]

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

# ===================== NOTIFICATIONS ROUTES =====================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(require_auth), limit: int = 50):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}
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

@api_router.put("/users/me/profile")
async def update_profile(profile: ProfileUpdate, user: dict = Depends(require_auth)):
    """Update user profile"""
    # Validate display name
    display_name = profile.displayName.strip()
    if len(display_name) < 2 or len(display_name) > 20:
        raise HTTPException(status_code=400, detail="Name must be 2-20 characters")
    
    # Check for at least one alphanumeric character
    import re
    if not re.search(r'[a-zA-Z0-9]', display_name):
        raise HTTPException(status_code=400, detail="Name must contain at least one letter or number")
    
    update_data = {
        "displayName": display_name,
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
    
    reports = await db.reports.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reports.count_documents(query)
    
    # Batch fetch target data to avoid N+1 queries
    problem_ids = [r["target_id"] for r in reports if r["target_type"] == "problem"]
    comment_ids = [r["target_id"] for r in reports if r["target_type"] == "comment"]
    
    problems_map = {}
    if problem_ids:
        problems = await db.problems.find(
            {"id": {"$in": problem_ids}}, 
            {"id": 1, "title": 1, "status": 1, "user_name": 1}
        ).to_list(len(problem_ids))
        problems_map = {p["id"]: p for p in problems}
    
    comments_map = {}
    if comment_ids:
        comments = await db.comments.find(
            {"id": {"$in": comment_ids}}, 
            {"id": 1, "content": 1, "status": 1, "user_name": 1}
        ).to_list(len(comment_ids))
        comments_map = {c["id"]: c for c in comments}
    
    # Enrich reports with target data
    for report in reports:
        if report["target_type"] == "problem":
            report["target_data"] = problems_map.get(report["target_id"])
        elif report["target_type"] == "comment":
            report["target_data"] = comments_map.get(report["target_id"])
    
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
    """Get basic analytics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    
    # User counts
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"status": "active"})
    banned_users = await db.users.count_documents({"status": {"$in": ["banned", "shadowbanned"]}})
    
    # DAU - users who posted or commented today
    dau_posts = await db.problems.distinct("user_id", {"created_at": {"$gte": today_start}})
    dau_comments = await db.comments.distinct("user_id", {"created_at": {"$gte": today_start}})
    dau = len(set(dau_posts + dau_comments))
    
    # WAU - users who posted or commented this week
    wau_posts = await db.problems.distinct("user_id", {"created_at": {"$gte": week_start}})
    wau_comments = await db.comments.distinct("user_id", {"created_at": {"$gte": week_start}})
    wau = len(set(wau_posts + wau_comments))
    
    # Content counts
    total_problems = await db.problems.count_documents({})
    problems_today = await db.problems.count_documents({"created_at": {"$gte": today_start}})
    problems_week = await db.problems.count_documents({"created_at": {"$gte": week_start}})
    
    total_comments = await db.comments.count_documents({})
    comments_today = await db.comments.count_documents({"created_at": {"$gte": today_start}})
    comments_week = await db.comments.count_documents({"created_at": {"$gte": week_start}})
    
    # Top problems by SignalScore
    top_problems = await db.problems.find(
        {"status": "active"},
        {"id": 1, "title": 1, "signal_score": 1, "relates_count": 1, "comments_count": 1}
    ).sort("signal_score", -1).limit(10).to_list(10)
    
    # Pending reports
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "banned": banned_users,
            "dau": dau,
            "wau": wau
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
        return
    
    messages = []
    for token in tokens:
        # Skip invalid tokens
        if not token or token.startswith('simulator-') or token.startswith('web-'):
            continue
            
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        messages.append(message)
    
    if not messages:
        return
    
    try:
        async with httpx.AsyncClient() as client:
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
            logger.info(f"Push notification sent: {result}")
            
            # Handle failed tokens (remove them from database)
            if "data" in result:
                for i, ticket in enumerate(result["data"]):
                    if ticket.get("status") == "error":
                        error_type = ticket.get("details", {}).get("error")
                        if error_type in ["DeviceNotRegistered", "InvalidCredentials"]:
                            # Remove invalid token
                            await db.push_tokens.delete_one({"token": messages[i]["to"]})
                            logger.info(f"Removed invalid push token: {messages[i]['to']}")
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
            "new_comments": True,
            "new_relates": True,
            "trending": True
        }
    return {
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
