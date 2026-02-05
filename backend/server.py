from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer(auto_error=False)

# Create the main app
app = FastAPI(title="PathGro API")
api_router = APIRouter(prefix="/api")

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
    created_at: datetime
    rocket10_completed: bool
    streak_days: int
    followed_categories: List[str]

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
    return user

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
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
    )
    user_dict = user.dict()
    user_dict["password_hash"] = hash_password(user_data.password)
    
    await db.users.insert_one(user_dict)
    
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
        relates = await db.relates.find({"user_id": user["id"]}).to_list(1000)
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
    
    # Notify followers
    followers = await db.users.find({"followed_problems": comment_data.problem_id}).to_list(100)
    for follower in followers:
        if follower["id"] != user["id"] and follower["id"] != problem["user_id"]:
            notification = Notification(
                user_id=follower["id"],
                type="new_comment",
                problem_id=comment_data.problem_id,
                message=f"New comment on a problem you follow"
            )
            await db.notifications.insert_one(notification.dict())
    
    return CommentResponse(**comment.dict())

@api_router.get("/problems/{problem_id}/comments", response_model=List[CommentResponse])
async def get_comments(problem_id: str, user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"problem_id": problem_id}).sort("helpful_count", -1).to_list(100)
    
    # Get user's helpful marks
    user_helpfuls = set()
    if user:
        helpfuls = await db.helpfuls.find({"user_id": user["id"]}).to_list(1000)
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

# ===================== REPORT =====================

@api_router.post("/problems/{problem_id}/report")
async def report_problem(problem_id: str, user: dict = Depends(require_auth)):
    problem = await db.problems.find_one({"id": problem_id})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    new_count = problem.get("reports_count", 0) + 1
    is_hidden = new_count >= 3
    
    await db.problems.update_one(
        {"id": problem_id},
        {"$set": {"reports_count": new_count, "is_hidden": is_hidden}}
    )
    
    return {"reported": True, "is_hidden": is_hidden}

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
