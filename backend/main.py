import csv
import hashlib
import hmac
import io
import os
import secrets
import smtplib
import ssl
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

import jwt
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from models import (
    ApplicationDocument,
    AuditLog,
    Base,
    BirthApplication,
    CitizenshipApplication,
    Complaint,
    GeneralServiceApplication,
    PaymentTransaction,
    Union,
    User,
)
from schemas import (
    ApplicationDocumentResponse,
    ApplicationStatusUpdate,
    AuditLogResponse,
    BirthApplicationCreate,
    BirthApplicationResponse,
    BirthCertificateResponse,
    CreateUnionAdminRequest,
    LoginRequest,
    SystemAnalyticsResponse,
    UnionCreate,
    UnionDetailResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

load_dotenv()

# JWT Configuration
APP_ENV = os.getenv("APP_ENV", "development").lower()
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    if APP_ENV == "production":
        raise RuntimeError("JWT_SECRET_KEY must be configured in production")
    JWT_SECRET_KEY = secrets.token_urlsafe(48)
if len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Database Configuration (Fixed for Render & Local Psycopg3)
RAW_DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://localhost/gramsheba_db"
)
if RAW_DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif RAW_DATABASE_URL.startswith("postgresql://") and "+psycopg" not in RAW_DATABASE_URL:
    DATABASE_URL = RAW_DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = RAW_DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
password_hash = PasswordHash.recommended()
otp_metadata = MetaData()
password_reset_otps = Table(
    "password_reset_otps",
    otp_metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String(255), nullable=False, index=True),
    Column("otp_hash", String(64), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("attempts", Integer, nullable=False, default=0),
    Column("created_at", DateTime(timezone=True), nullable=False),
)
security = HTTPBearer()

# Compatibility Aliases for external scripts (seeders / tests)
Application = BirthApplication

SERVICE_TITLE_MAP = {
    "trade": "ট্রেড লাইসেন্স সনদ",
    "warish": "ওয়ারিশ সনদপত্র",
    "character": "চারিত্রিক সনদপত্র",
    "family": "পারিবারিক সনদপত্র",
    "death": "মৃত্যু প্রত্যয়ন সনদ",
    "voter": "নতুন ভোটার প্রত্যয়নপত্র",
    "remarriage": "পুনঃবিবাহ না হওয়ার সনদ",
    "agri": "কৃষি প্রত্যয়নপত্র",
}


def hash_password(password: str) -> str:
    return password_hash.hash(password)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if APP_ENV in {"production", "prod"} and not all(
        os.getenv(key) for key in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_FROM")
    ):
        raise RuntimeError("SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM are required in production")
    Base.metadata.create_all(bind=engine)
    otp_metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="GramSheba GovTech API",
    description="Smart Union Parishad Public Services Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# Rate Limiter Setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware (Supports localhost and all Vercel deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Authentication & Role Helpers
# ==========================================

def create_access_token(email: str):
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": email, "exp": expires_at}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token",
        )

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found",
            )
        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "union_id": user.union_id,
            "phone": user.phone,
        }


def require_role(*allowed_roles: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this administrative action",
            )
        return current_user
    return role_checker


# ==========================================
# Pydantic Schemas for Requests
# ==========================================

class UnionOnboardingRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    union_name: str = Field(min_length=2, max_length=150)
    union_code: str = Field(min_length=3, max_length=50)
    area: str = Field(min_length=2, max_length=150)
    assistant_name: Optional[str] = None
    assistant_phone: Optional[str] = None
    assistant_nid: Optional[str] = None
    assistant_designation: Optional[str] = None


class CitizenshipCreate(BaseModel):
    name: str
    guardian_name: str
    mother_name: str
    nid_brn: str
    mobile: str
    dob: str
    gender: str
    division: str
    district: str
    upazila: str
    union_name: str
    ward_no: str
    post_office: Optional[str] = ""
    village: Optional[str] = ""
    road_block: Optional[str] = ""
    holding_no: Optional[str] = ""
    reason: Optional[str] = "চাকরি / প্রাতিষ্ঠানিক কাজের জন্য"
    photo_url: Optional[str] = None
    payment_transaction_id: str


class MockPaymentRequest(BaseModel):
    application_id: Optional[str] = "GS-DEFAULT"
    gateway: str  # 'bkash', 'nagad', 'card'
    amount: float
    account_number: str
    pin: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")
    new_password: str = Field(min_length=8, max_length=128)


class ChatRequest(BaseModel):
    message: str


class GeneralServiceCreate(BaseModel):
    service_type: str  # 'trade', 'warish', 'character', etc.
    applicant_name: str
    guardian_name: str
    nid_brn: str
    phone: str
    details: dict
    union_name: str


class ComplaintCreate(BaseModel):
    subject: str
    description: str
    area: str
    phone: Optional[str] = ""


class ComplaintStatusUpdate(BaseModel):
    status: str = Field(min_length=2, max_length=40)


# ==========================================
# Core & Health Endpoints
# ==========================================

@app.get("/")
def home():
    return {
        "project": "GramSheba GovTech Portal",
        "status": "Online",
        "version": "2.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "GramSheba Core API"}


@app.get("/api/db-check")
def db_check():
    try:
        with engine.connect() as connection:
            database_name = connection.execute(text("SELECT current_database()")).scalar()
        return {"status": "connected", "database": database_name}
    except Exception as e:
        return {"status": "failed", "error": str(e)}


@app.get("/api/public/unions")
def list_public_unions():
    """নাগরিক রেজিস্ট্রেশনের সময় ইউনিয়ন কোড ড্রপডাউনে দেখানোর জন্য পাবলিক এন্ডপয়েন্ট"""
    with SessionLocal() as db:
        unions = db.query(Union).order_by(Union.id.asc()).all()
        return [{"id": u.id, "name": u.name, "code": u.code} for u in unions]


# ==========================================
# Auth, Union Onboarding & Password Recovery
# ==========================================

@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/minute")
def register(request: Request, user_data: UserCreate):
    email = str(user_data.email).strip().lower()
    union_code = user_data.union_code.strip().upper()

    with SessionLocal() as db:
        union = db.query(Union).filter(Union.code == union_code).first()
        if not union:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ভুল ইউনিয়ন কোড। অনুগ্রহ করে সঠিক কোড দিন।",
            )

        try:
            user = User(
                full_name=user_data.full_name.strip(),
                email=email,
                phone=user_data.phone.strip(),
                area=user_data.area.strip(),
                password_hash=password_hash.hash(user_data.password),
                union_id=union.id,
                role="citizen",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="এই ইমেইলটি ইতিমধ্যে নিবন্ধিত রয়েছে।",
            )


@app.post("/api/union-register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register_union_and_admin(request: Request, data: UnionOnboardingRequest):
    """৩-ধাপের ইউনিয়ন পরিষদ ও প্রশাসনিক কর্মকর্তা নিবন্ধনের জন্য ডেডিকেটেড এন্ডপয়েন্ট"""
    email = str(data.email).strip().lower()
    union_code = data.union_code.strip().upper()
    union_name = data.union_name.strip()

    with SessionLocal() as db:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="এই ইমেইলটি ইতিমধ্যে নিবন্ধিত রয়েছে।",
            )

        union = db.query(Union).filter(Union.code == union_code).first()
        if not union:
            union = Union(name=union_name, code=union_code)
            db.add(union)
            db.flush()

        try:
            admin_user = User(
                full_name=data.full_name.strip(),
                email=email,
                phone=data.phone.strip(),
                area=data.area.strip(),
                password_hash=password_hash.hash(data.password),
                union_id=union.id,
                role="union_admin",
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            return admin_user
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="ইউনিয়ন বা কর্মকর্তার নিবন্ধন সম্পন্ন করা যায়নি।",
            )


@app.post("/api/login")
@limiter.limit("10/minute")
def login(request: Request, credentials: LoginRequest):
    email = str(credentials.email).strip().lower()

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user or not password_hash.verify(credentials.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="ইমেইল বা পাসওয়ার্ড সঠিক নয়।",
            )

        return {
            "access_token": create_access_token(user.email),
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role,
                "union_id": user.union_id,
            },
        }


def _send_password_otp(email: str, otp: str) -> None:
    host, username, password = (os.getenv(k) for k in ("SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD"))
    sender = os.getenv("SMTP_FROM", username or "")
    port = int(os.getenv("SMTP_PORT", "587"))
    if not all([host, username, password, sender]):
        raise HTTPException(status_code=503, detail="Password recovery email service is not configured.")
    message = EmailMessage()
    message["Subject"] = "GramSheba password reset code"
    message["From"], message["To"] = sender, email
    message.set_content(f"Your GramSheba password reset code is {otp}. It expires in 10 minutes.")
    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls(context=ssl.create_default_context())
        server.login(username, password)
        server.send_message(message)


@app.post("/api/auth/forgot-password")
@limiter.limit("5/hour")
def forgot_password(request: Request, req: ForgotPasswordRequest):
    email = str(req.email).strip().lower()
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return {"success": True, "message": "যদি অ্যাকাউন্টটি থাকে, OTP ইমেইলে পাঠানো হবে।"}
        otp = f"{secrets.randbelow(1_000_000):06d}"
        otp_hash = hmac.new(JWT_SECRET_KEY.encode(), f"{email}:{otp}".encode(), hashlib.sha256).hexdigest()
        now = datetime.now(timezone.utc)
        db.execute(password_reset_otps.delete().where(password_reset_otps.c.email == email))
        db.execute(password_reset_otps.insert().values(
            email=email, otp_hash=otp_hash, expires_at=now + timedelta(minutes=10),
            attempts=0, created_at=now,
        ))
        db.commit()
        try:
            _send_password_otp(email, otp)
        except Exception:
            db.execute(password_reset_otps.delete().where(password_reset_otps.c.email == email))
            db.commit()
            raise
    return {"success": True, "message": "যদি অ্যাকাউন্টটি থাকে, OTP ইমেইলে পাঠানো হবে।"}


@app.post("/api/auth/reset-password")
@limiter.limit("5/15minutes")
def reset_password(request: Request, req: ResetPasswordRequest):
    email = str(req.email).strip().lower()
    expected = hmac.new(JWT_SECRET_KEY.encode(), f"{email}:{req.otp}".encode(), hashlib.sha256).hexdigest()
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        record = db.execute(password_reset_otps.select().where(password_reset_otps.c.email == email)).mappings().first()
        expires_at = record["expires_at"] if record else None
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if not record or expires_at < now or record["attempts"] >= 5:
            raise HTTPException(status_code=400, detail="OTP মেয়াদোত্তীর্ণ বা অবৈধ। নতুন OTP নিন।")
        if not hmac.compare_digest(record["otp_hash"], expected):
            db.execute(password_reset_otps.update().where(password_reset_otps.c.id == record["id"]).values(attempts=record["attempts"] + 1))
            db.commit()
            raise HTTPException(status_code=400, detail="OTP সঠিক নয়।")
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=400, detail="OTP অবৈধ।")
        user.password_hash = password_hash.hash(req.new_password)
        db.execute(password_reset_otps.delete().where(password_reset_otps.c.email == email))
        db.commit()
    return {"success": True, "message": "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।"}


@app.get("/api/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ইউজার পাওয়া যায়নি।")
        return user


@app.put("/api/me", response_model=UserResponse)
def update_profile(user_update: UserUpdate, current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ইউজার পাওয়া যায়নি।")
        if user_update.phone is not None:
            user.phone = user_update.phone.strip()
        if user_update.area is not None:
            user.area = user_update.area.strip()
        db.commit()
        db.refresh(user)
        return user


# ==========================================
# Birth Registration Application Endpoints
# ==========================================

@app.post(
    "/api/birth-applications",
    response_model=BirthApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_birth_application(
    application_data: BirthApplicationCreate,
    current_user=Depends(get_current_user),
):
    tracking_id = (
        f"GS-BIRTH-{datetime.now(timezone.utc):%Y%m%d}-"
        f"{secrets.token_hex(4).upper()}"
    )

    with SessionLocal() as db:
        application = BirthApplication(
            tracking_id=tracking_id,
            applicant_user_id=current_user["id"],
            union_id=current_user["union_id"],
            child_name=application_data.child_name.strip(),
            birth_date=application_data.birth_date,
            gender=application_data.gender,
            father_name=application_data.father_name.strip(),
            mother_name=application_data.mother_name.strip(),
            birth_place=application_data.birth_place.strip(),
            address=application_data.address.strip(),
            status="pending",
        )

        try:
            db.add(application)
            db.commit()
            db.refresh(application)
            return application
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="আবেদন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।",
            )


@app.get(
    "/api/birth-applications/my",
    response_model=list[BirthApplicationResponse],
)
def my_birth_applications(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        return (
            db.query(BirthApplication)
            .filter(BirthApplication.applicant_user_id == current_user["id"])
            .order_by(BirthApplication.id.desc())
            .all()
        )


@app.get(
    "/api/birth-applications/{tracking_id}/certificate",
    response_model=BirthCertificateResponse,
)
def get_birth_certificate(
    tracking_id: str,
    current_user=Depends(get_current_user),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.tracking_id == tracking_id)
            .first()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="আবেদন পাওয়া যায়নি।")

        role = current_user.get("role")
        is_owner = application.applicant_user_id == current_user["id"]
        is_super_admin = role == "super_admin"
        is_same_union_admin = role in {"union_admin", "union_officer"} and application.union_id == current_user.get("union_id")
        if not (is_owner or is_super_admin or is_same_union_admin):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="এই সনদ দেখার অনুমতি আপনার নেই।")

        if application.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="সনদ শুধুমাত্র অনুমোদিত (approved) আবেদনের জন্য প্রযোজ্য।",
            )

        union = db.query(Union).filter(Union.id == application.union_id).first()
        union_name = union.name if union else "ইউনিয়ন পরিষদ"

        return {
            "tracking_id": application.tracking_id,
            "certificate_number": f"CERT-{application.tracking_id}",
            "issue_date": date.today(),
            "union_name": union_name,
            "child_name": application.child_name,
            "birth_date": application.birth_date,
            "gender": application.gender,
            "father_name": application.father_name,
            "mother_name": application.mother_name,
            "birth_place": application.birth_place,
            "address": application.address,
            "status": application.status,
        }


@app.get("/api/certificates/{tracking_id}")
def get_official_certificate_data(
    tracking_id: str,
    current_user=Depends(get_current_user),
):
    """নাগরিকত্ব ও সাধারণ সেবার অনুমোদিত সনদের প্রিন্ট প্রিভিউ ডেটা"""
    search_id = tracking_id.strip().upper()
    role = current_user.get("role")

    with SessionLocal() as db:
        citizen_app = (
            db.query(CitizenshipApplication)
            .filter(CitizenshipApplication.tracking_id.ilike(search_id))
            .first()
        )
        if citizen_app:
            is_owner = citizen_app.applicant_user_id == current_user["id"]
            is_super = role == "super_admin"
            is_union = role in {"union_admin", "union_officer"} and citizen_app.union_id == current_user.get("union_id")
            if not (is_owner or is_super or is_union):
                raise HTTPException(status_code=403, detail="এই সনদ দেখার অনুমতি আপনার নেই।")
            if citizen_app.status != "approved":
                raise HTTPException(status_code=400, detail="সনদ শুধুমাত্র অনুমোদিত (approved) আবেদনের জন্য প্রযোজ্য।")

            union = db.query(Union).filter(Union.id == citizen_app.union_id).first()
            d = citizen_app.applicant_data or {}
            return {
                "certificateType": "নাগরিকত্ব সনদপত্র",
                "trackingId": citizen_app.tracking_id,
                "unionName": d.get("union_name") or (union.name if union else "ইউনিয়ন পরিষদ"),
                "upazila": d.get("upazila", "চাঁদপুর সদর"),
                "district": d.get("district", "চাঁদপুর"),
                "holderName": d.get("name", ""),
                "fatherName": d.get("guardian_name", ""),
                "motherName": d.get("mother_name", "প্রযোজ্য নয়"),
                "nidNumber": d.get("nid_brn", ""),
                "village": d.get("village", ""),
                "wardNo": d.get("ward_no", "০১"),
                "issueDate": date.today().isoformat(),
                "chairmanName": "ইউপি চেয়ারম্যান (ডিজিটাল স্বাক্ষর)",
            }

        gen_app = (
            db.query(GeneralServiceApplication)
            .filter(GeneralServiceApplication.tracking_id.ilike(search_id))
            .first()
        )
        if gen_app:
            is_owner = gen_app.applicant_user_id == current_user["id"]
            is_super = role == "super_admin"
            is_union = role in {"union_admin", "union_officer"} and gen_app.union_id == current_user.get("union_id")
            if not (is_owner or is_super or is_union):
                raise HTTPException(status_code=403, detail="এই সনদ দেখার অনুমতি আপনার নেই।")
            if gen_app.status != "approved":
                raise HTTPException(status_code=400, detail="সনদ শুধুমাত্র অনুমোদিত (approved) আবেদনের জন্য প্রযোজ্য।")

            union = db.query(Union).filter(Union.id == gen_app.union_id).first()
            return {
                "certificateType": SERVICE_TITLE_MAP.get(gen_app.service_type, "সরকারি প্রত্যয়ন সনদ"),
                "trackingId": gen_app.tracking_id,
                "unionName": union.name if union else "ইউনিয়ন পরিষদ",
                "upazila": "সদর উপজেলা",
                "district": "চাঁদপুর",
                "holderName": gen_app.applicant_name,
                "fatherName": gen_app.guardian_name,
                "motherName": "জাতীয় ডাটাবেস অনুযায়ী",
                "nidNumber": gen_app.nid_brn,
                "village": (gen_app.details or {}).get("business_name") or "ইউনিয়ন পরিষদ এলাকা",
                "wardNo": "০১",
                "issueDate": date.today().isoformat(),
                "chairmanName": "ইউপি চেয়ারম্যান (ডিজিটাল স্বাক্ষর)",
            }

    raise HTTPException(status_code=404, detail="সনদ পাওয়া যায়নি।")


# ==========================================
# Citizenship Applications & Verification
# ==========================================

@app.post("/api/citizenship-applications", status_code=status.HTTP_201_CREATED)
def apply_citizenship(data: CitizenshipCreate, current_user=Depends(get_current_user)):
    tracking_id = f"GS-CITIZEN-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(4).upper()}"
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="ব্যবহারকারী পাওয়া যায়নি।")
        payment = db.query(PaymentTransaction).filter(
            PaymentTransaction.transaction_id == data.payment_transaction_id,
            PaymentTransaction.user_id == current_user["id"],
            PaymentTransaction.status == "PAID",
            PaymentTransaction.application_tracking_id.is_(None),
        ).first()
        if not payment:
            raise HTTPException(status_code=400, detail="পেমেন্ট যাচাই করা যায়নি বা ইতিমধ্যে ব্যবহার হয়েছে।")
        row = CitizenshipApplication(
            tracking_id=tracking_id,
            applicant_user_id=current_user["id"],
            union_id=user.union_id,
            applicant_data=data.model_dump(exclude={"payment_transaction_id"}),
            payment_transaction_id=data.payment_transaction_id,
            status="pending",
        )
        payment.application_tracking_id = tracking_id
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "message": "নাগরিকত্ব সনদ আবেদন সফলভাবে গৃহীত হয়েছে।",
            "tracking_id": tracking_id,
            "id": row.id,
            "status": row.status,
        }


@app.get("/api/citizenship-applications/my")
def my_citizenship_applications(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        rows = (
            db.query(CitizenshipApplication)
            .filter(CitizenshipApplication.applicant_user_id == current_user["id"])
            .order_by(CitizenshipApplication.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "tracking_id": r.tracking_id,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                **(r.applicant_data or {}),
            }
            for r in rows
        ]


# Public QR Verification (Zero-Login Public Access)
@app.get("/api/public/verify/{tracking_id}")
def public_verify_certificate(tracking_id: str):
    search_id = tracking_id.strip().upper()

    with SessionLocal() as db:
        birth_app = (
            db.query(BirthApplication)
            .filter(BirthApplication.tracking_id.ilike(search_id))
            .first()
        )
        if birth_app:
            union = db.query(Union).filter(Union.id == birth_app.union_id).first()
            is_approved = birth_app.status == "approved"
            if not is_approved:
                return {
                    "valid": False,
                    "type": "জন্ম নিবন্ধন আবেদন",
                    "tracking_id": birth_app.tracking_id,
                    "beneficiary": birth_app.child_name,
                    "union": union.name if union else "ইউনিয়ন পরিষদ",
                    "status": birth_app.status,
                    "message": "আবেদনটি এখনো অনুমোদিত সনদ নয়।",
                }
            return {
                "valid": True,
                "type": "জন্ম নিবন্ধন সনদ",
                "tracking_id": birth_app.tracking_id,
                "beneficiary": birth_app.child_name,
                "union": union.name if union else "ইউনিয়ন পরিষদ",
                "status": birth_app.status,
                "issue_date": str(birth_app.birth_date),
            }

        citizen_app = (
            db.query(CitizenshipApplication)
            .filter(CitizenshipApplication.tracking_id.ilike(search_id))
            .first()
        )
        if citizen_app:
            union = db.query(Union).filter(Union.id == citizen_app.union_id).first()
            data = citizen_app.applicant_data or {}
            if citizen_app.status != "approved":
                return {
                    "valid": False,
                    "type": "নাগরিকত্ব সনদ",
                    "tracking_id": citizen_app.tracking_id,
                    "beneficiary": data.get("name", ""),
                    "union": union.name if union else "ইউনিয়ন পরিষদ",
                    "status": citizen_app.status,
                    "message": "আবেদনটি এখনো অনুমোদিত সনদ নয়।",
                }
            return {
                "valid": True,
                "type": "নাগরিকত্ব সনদ",
                "tracking_id": citizen_app.tracking_id,
                "beneficiary": data.get("name", ""),
                "union": union.name if union else "ইউনিয়ন পরিষদ",
                "status": citizen_app.status,
                "issue_date": citizen_app.created_at.date().isoformat(),
            }

        gen_app = (
            db.query(GeneralServiceApplication)
            .filter(GeneralServiceApplication.tracking_id.ilike(search_id))
            .first()
        )
        if gen_app:
            union = db.query(Union).filter(Union.id == gen_app.union_id).first()
            cert_title = SERVICE_TITLE_MAP.get(gen_app.service_type, "সরকারি প্রত্যয়ন সনদ")
            if gen_app.status != "approved":
                return {
                    "valid": False,
                    "type": cert_title,
                    "tracking_id": gen_app.tracking_id,
                    "beneficiary": gen_app.applicant_name,
                    "union": union.name if union else "ইউনিয়ন পরিষদ",
                    "status": gen_app.status,
                    "message": "আবেদনটি এখনো অনুমোদিত সনদ নয়।",
                }
            return {
                "valid": True,
                "type": cert_title,
                "tracking_id": gen_app.tracking_id,
                "beneficiary": gen_app.applicant_name,
                "union": union.name if union else "ইউনিয়ন পরিষদ",
                "status": gen_app.status,
                "issue_date": gen_app.created_at.date().isoformat(),
            }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="প্রদত্ত ট্র্যাকিং নম্বরে কোনো সনদ পাওয়া যায়নি।",
    )


# ==========================================
# Smart AI Document Scanner (OCR Mock)
# ==========================================

@app.post("/api/ocr/scan-document")
@limiter.limit("10/minute")
async def scan_document_ocr(request: Request, file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".pdf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="শুধুমাত্র ছবি (JPG, PNG) বা PDF আপলোড করুন।",
        )

    content = await file.read(5 * 1024 * 1024 + 1)
    if not content or len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="ফাইলের আকার সর্বোচ্চ ৫ MB হতে পারবে।",
        )

    return {
        "success": True,
        "extracted_data": {
            "name": "শাহ মো. সাদমান সাকিব",
            "guardian_name": "মো. জালাল আহমদ",
            "mother_name": "মোসা. সালেহা বেগম",
            "nid_brn": "19981324567890123",
            "dob": "1998-05-14",
            "gender": "male",
            "address": "গ্রাম: রামপুর, ডাকঘর: রামপুর, চাঁদপুর সদর",
        },
        "confidence": 0.98,
        "message": "AI দ্বারা জাতীয় পরিচয়পত্র থেকে তথ্য সফলভাবে স্ক্যান করা হয়েছে।",
    }


# ==========================================
# Mock Payment Gateway (bKash/Nagad/Card)
# ==========================================

@app.post("/api/payments/mock-checkout")
def process_mock_payment(req: MockPaymentRequest, current_user=Depends(get_current_user)):
    if APP_ENV in {"production", "prod"}:
        raise HTTPException(status_code=503, detail="Mock payment production-এ বন্ধ। প্রকৃত gateway integration প্রয়োজন।")
    if len(req.pin) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="অবৈধ পিন নম্বর! পিন কমপক্ষে ৪ সংখ্যার হতে হবে।",
        )

    if req.gateway not in {"bkash", "nagad", "card"} or req.amount <= 0 or req.amount > 100000:
        raise HTTPException(status_code=400, detail="পেমেন্টের তথ্য সঠিক নয়।")
    txn_id = f"TRX{req.gateway.upper()}{secrets.token_hex(4).upper()}"
    with SessionLocal() as db:
        db.add(PaymentTransaction(
            transaction_id=txn_id,
            user_id=current_user["id"],
            gateway=req.gateway,
            amount=req.amount,
            status="PAID",
        ))
        db.commit()
    return {
        "success": True,
        "transaction_id": txn_id,
        "gateway": req.gateway,
        "amount": req.amount,
        "status": "PAID",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    }


# ==========================================
# Admin Operations & Multi-Tenancy
# ==========================================

@app.get("/api/admin/check")
def admin_check(
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    return {
        "message": "Admin access granted",
        "id": current_user["id"],
        "role": current_user["role"],
        "union_id": current_user["union_id"],
    }


@app.get(
    "/api/admin/birth-applications",
    response_model=list[BirthApplicationResponse],
)
def list_admin_birth_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(BirthApplication)
        if current_user["role"] == "union_admin":
            query = query.filter(BirthApplication.union_id == current_user["union_id"])

        if status and status.strip():
            query = query.filter(BirthApplication.status == status.strip().lower())

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (BirthApplication.tracking_id.ilike(term))
                | (BirthApplication.child_name.ilike(term))
            )

        return query.order_by(BirthApplication.id.desc()).all()


@app.put(
    "/api/admin/birth-applications/{application_id}/status",
    response_model=BirthApplicationResponse,
)
def update_application_status(
    application_id: int,
    status_data: ApplicationStatusUpdate,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.id == application_id)
            .first()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="আবেদন পাওয়া যায়নি।")

        if (
            current_user["role"] == "union_admin"
            and application.union_id != current_user["union_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি অন্য ইউনিয়নের আবেদনের স্ট্যাটাস পরিবর্তন করতে পারবেন না।",
            )

        application.status = status_data.status
        audit = AuditLog(
            application_id=application.id,
            action_by_user_id=current_user["id"],
            action=status_data.status,
            remarks=status_data.remarks,
        )
        db.add(audit)
        db.commit()
        db.refresh(application)
        return application


@app.get(
    "/api/admin/birth-applications/{application_id}/audit-logs",
    response_model=list[AuditLogResponse],
)
def get_application_audit_logs(
    application_id: int,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.id == application_id)
            .first()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="আবেদন পাওয়া যায়নি।")

        if (
            current_user["role"] == "union_admin"
            and application.union_id != current_user["union_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি অন্য ইউনিয়নের অডিট লগ দেখতে পারবেন না।",
            )

        return (
            db.query(AuditLog)
            .filter(AuditLog.application_id == application_id)
            .order_by(AuditLog.id.desc())
            .all()
        )


@app.get("/api/admin/citizenship-applications")
def list_admin_citizenship_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(CitizenshipApplication)
        if current_user["role"] == "union_admin":
            query = query.filter(CitizenshipApplication.union_id == current_user["union_id"])
        if status and status.strip():
            query = query.filter(CitizenshipApplication.status == status.strip().lower())
        rows = query.order_by(CitizenshipApplication.id.desc()).all()
        results = [
            {
                "id": r.id,
                "tracking_id": r.tracking_id,
                "union_id": r.union_id,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
                **(r.applicant_data or {}),
            }
            for r in rows
        ]
        if search and search.strip():
            term = search.strip().lower()
            results = [
                item for item in results
                if term in item["tracking_id"].lower() or term in str(item.get("name", "")).lower()
            ]
        return results


@app.put("/api/admin/citizenship-applications/{application_id}/status")
def update_citizenship_application_status(
    application_id: int,
    status_data: ApplicationStatusUpdate,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        app_row = (
            db.query(CitizenshipApplication)
            .filter(CitizenshipApplication.id == application_id)
            .first()
        )
        if not app_row:
            raise HTTPException(status_code=404, detail="নাগরিকত্ব আবেদন পাওয়া যায়নি।")
        if current_user["role"] == "union_admin" and app_row.union_id != current_user["union_id"]:
            raise HTTPException(status_code=403, detail="অন্য ইউনিয়নের আবেদনের স্ট্যাটাস পরিবর্তন করা যাবে না।")

        app_row.status = status_data.status
        db.commit()
        db.refresh(app_row)
        return {
            "id": app_row.id,
            "tracking_id": app_row.tracking_id,
            "status": app_row.status,
            **(app_row.applicant_data or {}),
        }


@app.get("/api/admin/general-services")
def list_admin_general_services(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(GeneralServiceApplication)
        if current_user["role"] == "union_admin":
            query = query.filter(GeneralServiceApplication.union_id == current_user["union_id"])
        if status and status.strip():
            query = query.filter(GeneralServiceApplication.status == status.strip().lower())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (GeneralServiceApplication.tracking_id.ilike(term))
                | (GeneralServiceApplication.applicant_name.ilike(term))
            )
        rows = query.order_by(GeneralServiceApplication.id.desc()).all()
        return [
            {
                "id": r.id,
                "tracking_id": r.tracking_id,
                "service_type": r.service_type,
                "applicant_name": r.applicant_name,
                "guardian_name": r.guardian_name,
                "nid_brn": r.nid_brn,
                "phone": r.phone,
                "details": r.details,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]


@app.put("/api/admin/general-services/{application_id}/status")
def update_general_service_status(
    application_id: int,
    status_data: ApplicationStatusUpdate,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        app_row = (
            db.query(GeneralServiceApplication)
            .filter(GeneralServiceApplication.id == application_id)
            .first()
        )
        if not app_row:
            raise HTTPException(status_code=404, detail="আবেদন পাওয়া যায়নি।")
        if current_user["role"] == "union_admin" and app_row.union_id != current_user["union_id"]:
            raise HTTPException(status_code=403, detail="অন্য ইউনিয়নের আবেদনের স্ট্যাটাস পরিবর্তন করা যাবে না।")

        app_row.status = status_data.status
        db.commit()
        db.refresh(app_row)
        return {
            "id": app_row.id,
            "tracking_id": app_row.tracking_id,
            "service_type": app_row.service_type,
            "applicant_name": app_row.applicant_name,
            "status": app_row.status,
        }


@app.get("/api/admin/complaints")
def list_admin_complaints(
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(Complaint)
        if current_user["role"] == "union_admin":
            query = query.filter(Complaint.union_id == current_user["union_id"])
        rows = query.order_by(Complaint.id.desc()).all()
        return [
            {
                "id": r.id,
                "complaint_id": r.complaint_id,
                "subject": r.subject,
                "description": r.description,
                "area": r.area,
                "phone": r.phone,
                "status": r.status,
                "submitted_at": r.created_at.isoformat(),
            }
            for r in rows
        ]


@app.put("/api/admin/complaints/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    status_data: ComplaintStatusUpdate,
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        row = db.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="অভিযোগ পাওয়া যায়নি।")
        if current_user["role"] == "union_admin" and row.union_id != current_user["union_id"]:
            raise HTTPException(status_code=403, detail="অনুমতি নেই।")
        row.status = status_data.status.strip()
        db.commit()
        db.refresh(row)
        return {"id": row.id, "complaint_id": row.complaint_id, "status": row.status}


# ==========================================
# Document Upload & Verification
# ==========================================

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


@app.post(
    "/api/birth-applications/{tracking_id}/documents",
    response_model=ApplicationDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_application_document(
    tracking_id: str,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.tracking_id == tracking_id)
            .first()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="আবেদন পাওয়া যায়নি।")

        if application.applicant_user_id != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি শুধুমাত্র নিজের আবেদনে ফাইল আপলোড করতে পারবেন।",
            )

        original_name = Path(file.filename or "upload").name
        ext = Path(original_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="শুধুমাত্র PDF, JPG, বা PNG ফাইল গ্রহণযোগ্য।")
        content = file.file.read(5 * 1024 * 1024 + 1)
        if not content or len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="ফাইল সর্বোচ্চ ৫ MB হতে পারবে।")
        signatures = {
            ".pdf": content.startswith(b"%PDF-"),
            ".jpg": content.startswith(b"\xff\xd8\xff"),
            ".jpeg": content.startswith(b"\xff\xd8\xff"),
            ".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        }
        if not signatures.get(ext, False):
            raise HTTPException(status_code=400, detail="ফাইলের প্রকৃত ধরন Extension-এর সঙ্গে মেলে না।")
        safe_doc_type = "".join(ch for ch in document_type.strip() if ch.isalnum() or ch in "-_ ")[:50]
        if not safe_doc_type:
            raise HTTPException(status_code=400, detail="Document type প্রয়োজন।")
        unique_filename = f"{tracking_id}_{secrets.token_hex(8)}{ext}"
        target_path = UPLOAD_DIR / unique_filename
        target_path.write_bytes(content)

        doc = ApplicationDocument(
            application_id=application.id,
            document_type=safe_doc_type,
            file_name=original_name[:255],
            file_path=str(target_path),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc


@app.get(
    "/api/birth-applications/{tracking_id}/documents",
    response_model=list[ApplicationDocumentResponse],
)
def list_application_documents(
    tracking_id: str,
    current_user=Depends(get_current_user),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.tracking_id == tracking_id)
            .first()
        )
        if not application:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="আবেদন পাওয়া যায়নি।")

        is_owner = application.applicant_user_id == current_user["id"]
        is_union_admin = (
            current_user["role"] == "union_admin"
            and application.union_id == current_user["union_id"]
        )
        is_super_admin = current_user["role"] == "super_admin"

        if not (is_owner or is_union_admin or is_super_admin):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="অনুমতি নেই।")

        return (
            db.query(ApplicationDocument)
            .filter(ApplicationDocument.application_id == application.id)
            .order_by(ApplicationDocument.id.desc())
            .all()
        )


# ==========================================
# Super Admin Endpoints
# ==========================================

@app.post(
    "/api/super-admin/unions",
    response_model=UnionDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_union(
    union_data: UnionCreate,
    current_user: dict = Depends(require_role("super_admin")),
):
    code = union_data.code.strip().upper()
    name = union_data.name.strip()

    with SessionLocal() as db:
        existing = db.query(Union).filter(Union.code == code).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ইউনিয়ন কোড ইতিমধ্যে বিদ্যমান।")

        union = Union(name=name, code=code)
        db.add(union)
        db.commit()
        db.refresh(union)
        return union


@app.get(
    "/api/super-admin/unions",
    response_model=list[UnionDetailResponse],
)
def list_all_unions(current_user: dict = Depends(require_role("super_admin"))):
    with SessionLocal() as db:
        return db.query(Union).order_by(Union.id.asc()).all()


@app.post(
    "/api/super-admin/create-admin",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_union_admin(
    admin_data: CreateUnionAdminRequest,
    current_user: dict = Depends(require_role("super_admin")),
):
    email = str(admin_data.email).strip().lower()

    with SessionLocal() as db:
        union = db.query(Union).filter(Union.id == admin_data.union_id).first()
        if not union:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ইউনিয়ন পাওয়া যায়নি।")

        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ইমেইল ইতিমধ্যে ব্যবহৃত।")

        new_admin = User(
            full_name=admin_data.full_name.strip(),
            email=email,
            phone=admin_data.phone.strip(),
            area=admin_data.area.strip(),
            password_hash=password_hash.hash(admin_data.password),
            role="union_admin",
            union_id=union.id,
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        return new_admin


@app.get("/api/super-admin/citizens")
def list_all_citizens(current_user: dict = Depends(require_role("super_admin"))):
    with SessionLocal() as db:
        citizens = (
            db.query(User)
            .filter(User.role == "citizen")
            .order_by(User.id.desc())
            .all()
        )
        return [
            {
                "id": c.id,
                "full_name": c.full_name,
                "email": c.email,
                "phone": c.phone,
                "area": c.area,
                "union_id": c.union_id,
            }
            for c in citizens
        ]


@app.get("/api/super-admin/analytics", response_model=SystemAnalyticsResponse)
def get_system_analytics(current_user: dict = Depends(require_role("super_admin"))):
    with SessionLocal() as db:
        total_unions = db.query(Union).count()
        total_users = db.query(User).count()
        total_citizens = db.query(User).filter(User.role == "citizen").count()
        total_admins = db.query(User).filter(User.role.in_(["union_admin", "super_admin"])).count()

        b_total = db.query(BirthApplication).count()
        c_total = db.query(CitizenshipApplication).count()
        g_total = db.query(GeneralServiceApplication).count()

        b_pend = db.query(BirthApplication).filter(BirthApplication.status == "pending").count()
        c_pend = db.query(CitizenshipApplication).filter(CitizenshipApplication.status == "pending").count()
        g_pend = db.query(GeneralServiceApplication).filter(GeneralServiceApplication.status == "pending").count()

        b_appr = db.query(BirthApplication).filter(BirthApplication.status == "approved").count()
        c_appr = db.query(CitizenshipApplication).filter(CitizenshipApplication.status == "approved").count()
        g_appr = db.query(GeneralServiceApplication).filter(GeneralServiceApplication.status == "approved").count()

        b_rej = db.query(BirthApplication).filter(BirthApplication.status == "rejected").count()
        c_rej = db.query(CitizenshipApplication).filter(CitizenshipApplication.status == "rejected").count()
        g_rej = db.query(GeneralServiceApplication).filter(GeneralServiceApplication.status == "rejected").count()

        return {
            "total_unions": total_unions,
            "total_users": total_users,
            "total_citizens": total_citizens,
            "total_admins": total_admins,
            "total_applications": b_total + c_total + g_total,
            "pending_applications": b_pend + c_pend + g_pend,
            "approved_applications": b_appr + c_appr + g_appr,
            "rejected_applications": b_rej + c_rej + g_rej,
        }


# ==========================================
# Phase 3: Reports & Safe CSV Export
# ==========================================

def _sanitize_csv_field(val: object) -> str:
    text_val = str(val if val is not None else "")
    if text_val.startswith(("=", "+", "-", "@")):
        return f"'{text_val}"
    return text_val


@app.get("/api/admin/reports/export-csv")
def export_applications_csv(
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(BirthApplication)
        if current_user["role"] == "union_admin":
            query = query.filter(BirthApplication.union_id == current_user["union_id"])

        apps = query.order_by(BirthApplication.id.desc()).all()
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(["ID", "Tracking ID", "Child Name", "Father Name", "Mother Name", "Gender", "Birth Date", "Status"])
        for a in apps:
            writer.writerow([
                a.id,
                _sanitize_csv_field(a.tracking_id),
                _sanitize_csv_field(a.child_name),
                _sanitize_csv_field(a.father_name),
                _sanitize_csv_field(a.mother_name),
                _sanitize_csv_field(a.gender),
                _sanitize_csv_field(a.birth_date),
                _sanitize_csv_field(a.status),
            ])

        return Response(
            content=output.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=gramsheba_applications_report.csv"},
        )


# ==========================================
# Bangla AI Assistant Endpoint
# ==========================================

FAQ_KNOWLEDGE_BASE = [
    {
        "keywords": ["hi", "hello", "salam", "assalamu", "helo", "hy", "kemon", "হাই", "হ্যালো", "সালাম", "কেমন"],
        "reply": "ওয়ালাইকুম আসসালাম! আমি গ্রামসেবা ডিজিটাল সহকারী। জন্ম নিবন্ধন, নাগরিকত্ব সনদ, ফি বা ট্র্যাকিং নিয়ে যে কোনো প্রশ্ন করতে পারেন।"
    },
    {
        "keywords": ["জন্ম নিবন্ধন", "আবেদন", "কীভাবে", "নিয়ম", "jonmo", "nibondhon", "kivabe", "abedon", "apply"],
        "reply": "জন্ম নিবন্ধনের জন্য হোমপেজ থেকে 'জন্ম নিবন্ধন' কার্ডে ক্লিক করুন। প্রয়োজনীয় তথ্য পূরণ করে জমা দিন। আবেদন অনুমোদনের পর ডিজিটাল সনদ পাবেন।"
    },
    {
        "keywords": ["নাগরিকত্ব", "নাগরিক সনদ", "citizenship", "nagorik", "sonod"],
        "reply": "নাগরিকত্ব সনদের জন্য 'নাগরিকত্ব সনদ' কার্ডে ক্লিক করুন। এনআইডি/জন্মসনদ নম্বর ও বর্তমান-স্থায়ী ঠিকানা দিয়ে অনলাইনে ফি পরিশোধ করে আবেদন জমা দেওয়া যায়।"
    },
    {
        "keywords": ["ফি", "টাকা", "খরচ", "পয়সা", "পেমেন্ট", "বিকাশ", "নগদ", "fee", "taka", "tk", "cost", "bkash", "nagad"],
        "reply": "জন্ম নিবন্ধন শিশুর জন্মের ৪৫ দিনের মধ্যে বিনামূল্যে। নাগরিকত্ব সনদের সরকারি ফি ৫০ টাকা, যা বিকাশ, নগদ বা কার্ডের মাধ্যমে অনলাইনে তাৎক্ষণিক পরিশোধ করা যায়।"
    },
    {
        "keywords": ["ট্র্যাকিং", "স্ট্যাটাস", "অবস্থা", "চেক", "track", "tracking", "status", "check"],
        "reply": "আবেদন জমা দেওয়ার পর প্রাপ্ত ট্র্যাকিং নম্বর দিয়ে 'আবেদনের অবস্থা' মেনুতে গিয়ে যে কোনো সময় স্ট্যাটাস চেক করতে পারবেন।"
    },
    {
        "keywords": ["সনদ", "ডাউনলোড", "প্রিন্ট", "সার্টিফিকেট", "যাচাই", "qr", "sonod", "certificate", "download", "verify"],
        "reply": "অনুমোদনের পর 'সনদ দেখুন' বোতাম চেপে অফিশিয়াল ফরম্যাটে সনদ প্রিন্ট বা ডাউনলোড করতে পারবেন। সনদে থাকা QR কোড দিয়ে যে কেউ অনলাইন ভেরিফিকেশন করতে পারে।"
    }
]


@app.post("/api/chat")
def bangla_chat_assistant(chat_data: ChatRequest):
    user_msg = chat_data.message.strip().lower()
    for item in FAQ_KNOWLEDGE_BASE:
        if any(kw in user_msg for kw in item["keywords"]):
            return {"reply": item["reply"]}

    return {
        "reply": "আমি বুঝতে পেরেছি! আপনি জন্ম নিবন্ধন, নাগরিকত্ব সনদ, ফি (fee), ট্র্যাকিং (tracking) বা সনদ যাচাই নিয়ে প্রশ্ন করতে পারেন।"
    }


# =========================================================
# Phase 2: General Services, Complaints & Dashboard Stats
# =========================================================

@app.post("/api/services/apply", status_code=status.HTTP_201_CREATED)
def apply_general_service(data: GeneralServiceCreate, current_user=Depends(get_current_user)):
    allowed_types = {"trade", "warish", "character", "family", "death", "voter", "remarriage", "agri"}
    if data.service_type not in allowed_types:
        raise HTTPException(status_code=400, detail="সেবার ধরন সঠিক নয়।")
    tracking_id = f"GS-{data.service_type.upper()}-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"
    with SessionLocal() as db:
        row = GeneralServiceApplication(
            tracking_id=tracking_id,
            applicant_user_id=current_user["id"],
            union_id=current_user["union_id"],
            service_type=data.service_type,
            applicant_name=data.applicant_name.strip(),
            guardian_name=data.guardian_name.strip(),
            nid_brn=data.nid_brn.strip(),
            phone=data.phone.strip(),
            details=data.details,
            status="pending",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "message": "আবেদন সফলভাবে গৃহীত হয়েছে",
            "tracking_id": tracking_id,
            "application": {
                "id": row.id,
                "tracking_id": row.tracking_id,
                "service_type": row.service_type,
                "status": row.status,
                "created_at": row.created_at.isoformat(),
            },
        }


@app.get("/api/services/my")
def get_my_general_services(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        rows = (
            db.query(GeneralServiceApplication)
            .filter(GeneralServiceApplication.applicant_user_id == current_user["id"])
            .order_by(GeneralServiceApplication.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "tracking_id": r.tracking_id,
                "service_type": r.service_type,
                "applicant_name": r.applicant_name,
                "guardian_name": r.guardian_name,
                "nid_brn": r.nid_brn,
                "status": r.status,
                "details": r.details,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]


@app.post("/api/complaints", status_code=status.HTTP_201_CREATED)
def submit_complaint(data: ComplaintCreate, current_user=Depends(get_current_user)):
    complaint_id = f"CMP-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"
    with SessionLocal() as db:
        row = Complaint(
            complaint_id=complaint_id,
            user_id=current_user["id"],
            union_id=current_user["union_id"],
            subject=data.subject.strip(),
            description=data.description.strip(),
            area=data.area.strip(),
            phone=(data.phone or current_user.get("phone", "")).strip(),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"message": "অভিযোগ/পরামর্শ সফলভাবে নিবন্ধিত হয়েছে", "complaint_id": complaint_id}


@app.get("/api/complaints/my")
def get_my_complaints(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        rows = (
            db.query(Complaint)
            .filter(Complaint.user_id == current_user["id"])
            .order_by(Complaint.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "complaint_id": r.complaint_id,
                "subject": r.subject,
                "description": r.description,
                "area": r.area,
                "status": r.status,
                "submitted_at": r.created_at.isoformat(),
            }
            for r in rows
        ]


@app.get("/api/citizen/dashboard-stats")
def get_citizen_dashboard_stats(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        birth = db.query(BirthApplication).filter(BirthApplication.applicant_user_id == current_user["id"]).all()
        citizenship = db.query(CitizenshipApplication).filter(CitizenshipApplication.applicant_user_id == current_user["id"]).all()
        general = db.query(GeneralServiceApplication).filter(GeneralServiceApplication.applicant_user_id == current_user["id"]).all()
        complaints = db.query(Complaint).filter(Complaint.user_id == current_user["id"]).all()
        rows = birth + citizenship + general
        states = [r.status for r in rows]
        return {
            "total_applications": len(rows),
            "pending_count": states.count("pending"),
            "approved_count": states.count("approved"),
            "rejected_count": states.count("rejected"),
            "citizenship_count": len(citizenship),
            "general_service_count": len(general),
            "complaint_count": len(complaints),
            "notifications": [
                {
                    "id": 1,
                    "text": f"আপনার {states.count('pending')} টি আবেদন বর্তমানে যাচাই চলছে এবং {states.count('approved')} টি অনুমোদিত হয়েছে।",
                    "time": "সিস্টেম আপডেট",
                }
            ],
        }
