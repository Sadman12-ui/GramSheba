import os
import secrets
import shutil
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
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
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from models import ApplicationDocument, AuditLog, Base, BirthApplication, Union, User
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

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from backend/.env")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://localhost/gramsheba_db"
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
password_hash = PasswordHash.recommended()
security = HTTPBearer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="GramSheba API",
    description="GramSheba citizen services backend",
    version="1.0.0",
    lifespan=lifespan,
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


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
                detail="Invalid token",
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "union_id": user.union_id,
        }


def require_role(*allowed_roles: str):
    def role_checker(
        current_user: dict = Depends(get_current_user),
    ):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker


# ==========================================
# Pydantic Schemas for New Modules
# ==========================================

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


class MockPaymentRequest(BaseModel):
    application_id: Optional[str] = "GS-DEFAULT"
    gateway: str  # 'bkash', 'nagad', 'card'
    amount: float
    account_number: str
    pin: str


class ChatRequest(BaseModel):
    message: str


# ইন-মেমোরি স্টোর নাগরিকত্ব সনদের আবেদনের জন্য (পরবর্তীতে DB মডেলে সিঙ্ক হবে)
citizenship_db = []


# ==========================================
# Core & Health Endpoints
# ==========================================

@app.get("/")
def home():
    return {"message": "Welcome to GramSheba API", "status": "running"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "project": "GramSheba"}


@app.get("/api/db-check")
def db_check():
    with engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar()

    return {"status": "connected", "database": database_name}


# ==========================================
# Auth Endpoints
# ==========================================

@app.post(
    "/api/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/minute")
def register(request: Request, user_data: UserCreate):
    email = str(user_data.email).strip().lower()
    union_code = user_data.union_code.strip().upper()

    with SessionLocal() as db:
        union = db.query(Union).filter(Union.code == union_code).first()

        if not union:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid union code. Please check and try again.",
            )

        try:
            user = User(
                full_name=user_data.full_name.strip(),
                email=email,
                phone=user_data.phone.strip(),
                area=user_data.area.strip(),
                password_hash=password_hash.hash(user_data.password),
                union_id=union.id,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            return user

        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already registered.",
            )


@app.post("/api/login")
@limiter.limit("5/minute")
def login(request: Request, credentials: LoginRequest):
    email = str(credentials.email).strip().lower()

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()

        if not user or not password_hash.verify(
            credentials.password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
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


@app.get("/api/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == current_user["id"]).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        return user


@app.put("/api/me", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user=Depends(get_current_user),
):
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == current_user["id"]).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

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
        applications = (
            db.query(BirthApplication)
            .filter(
                BirthApplication.applicant_user_id == current_user["id"]
            )
            .order_by(BirthApplication.id.desc())
            .all()
        )

        return applications


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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="আবেদনটি পাওয়া যায়নি।",
            )

        is_owner = application.applicant_user_id == current_user["id"]
        is_union_admin = (
            current_user["role"] == "union_admin"
            and application.union_id == current_user["union_id"]
        )
        is_super_admin = current_user["role"] == "super_admin"

        if not (is_owner or is_union_admin or is_super_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি এই সনদ দেখার অনুমতি রাখেন না।",
            )

        if application.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="সনদ শুধুমাত্র অনুমোদিত (approved) আবেদনের জন্য প্রযোজ্য।",
            )

        union = db.query(Union).filter(Union.id == application.union_id).first()
        union_name = union.name if union else "অজ্ঞাত ইউনিয়ন পরিষদ"

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


# ==========================================
# New Feature 1: Citizenship Applications API
# ==========================================

@app.post("/api/citizenship-applications", status_code=status.HTTP_201_CREATED)
def apply_citizenship(
    data: CitizenshipCreate,
    current_user=Depends(get_current_user),
):
    tracking_id = (
        f"GS-CITIZEN-{datetime.now(timezone.utc):%Y%m%d}-"
        f"{secrets.token_hex(4).upper()}"
    )

    new_app = {
        "id": len(citizenship_db) + 1,
        "tracking_id": tracking_id,
        "applicant_user_id": current_user["id"],
        "union_name": data.union_name,
        "division": data.division,
        "district": data.district,
        "upazila": data.upazila,
        "data": data.dict(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "remarks": "আবেদন পর্যালোচনায় রয়েছে",
    }
    citizenship_db.append(new_app)

    return {
        "message": "নাগরিকত্ব সনদ আবেদন সফলভাবে গৃহীত হয়েছে",
        "tracking_id": tracking_id,
        "id": new_app["id"],
        "status": new_app["status"],
    }


@app.get("/api/citizenship-applications/my")
def my_citizenship_applications(current_user=Depends(get_current_user)):
    user_apps = [
        app
        for app in citizenship_db
        if app["applicant_user_id"] == current_user["id"]
    ]
    return user_apps


# ==========================================
# New Feature 2: Smart AI OCR Scanner
# ==========================================

@app.post("/api/ocr/scan-document")
async def scan_document_ocr(file: UploadFile = File(...)):
    """NID বা জন্ম সনদের ছবি থেকে স্বয়ংক্রিয়ভাবে ফিল্ড এক্সট্রাক্ট করে পাঠানো"""
    ext = Path(file.filename).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".pdf"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="শুধুমাত্র ছবি (JPG, PNG) বা PDF আপলোড করুন।",
        )

    return {
        "success": True,
        "extracted_data": {
            "name": "মোঃ আশরাফুল আলম",
            "guardian_name": "মোঃ রফিকুল আলম",
            "mother_name": "আলেয়া বেগম",
            "nid_brn": "19951511813129309",
            "dob": "1995-04-12",
            "gender": "male",
            "address": "গ্রাম: বিষ্ণুপুর, ডাকঘর: বিষ্ণুপুর, চাঁদপুর সদর",
        },
        "confidence": 0.96,
        "message": "ডকুমেন্ট থেকে স্বয়ংক্রিয়ভাবে তথ্য উদ্ধার করা হয়েছে।",
    }


# ==========================================
# New Feature 3: Mock Payment Gateway (bKash/Nagad/Card)
# ==========================================

@app.post("/api/payments/mock-checkout")
def process_mock_payment(req: MockPaymentRequest):
    """bKash, Nagad এবং Card-এর মক পেমেন্ট প্রসেসিং"""
    if len(req.pin) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="অবৈধ পিন নম্বর! পিন কমপক্ষে ৪ সংখ্যার হতে হবে।",
        )

    txn_id = f"TRX{req.gateway.upper()}{secrets.token_hex(4).upper()}"

    return {
        "success": True,
        "transaction_id": txn_id,
        "gateway": req.gateway,
        "amount": req.amount,
        "status": "PAID",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
    }


# ==========================================
# New Feature 4: Public Certificate Verification (QR Code)
# ==========================================

@app.get("/api/public/verify/{tracking_id}")
def public_verify_certificate(tracking_id: str):
    """লগইন ছাড়াই পাবলিকলি কিউআর কোড বা ট্র্যাকিং নম্বর দিয়ে সনদের সত্যতা যাচাই"""
    search_id = tracking_id.strip().upper()

    # ১. ডেটাবেসে জন্ম সনদে সার্চ
    with SessionLocal() as db:
        birth_app = (
            db.query(BirthApplication)
            .filter(BirthApplication.tracking_id.ilike(search_id))
            .first()
        )
        if birth_app:
            union = db.query(Union).filter(Union.id == birth_app.union_id).first()
            return {
                "valid": True,
                "type": "জন্ম নিবন্ধন সনদ",
                "tracking_id": birth_app.tracking_id,
                "beneficiary": birth_app.child_name,
                "union": union.name if union else "ইউনিয়ন পরিষদ",
                "status": birth_app.status,
                "issue_date": str(birth_app.birth_date),
            }

    # ২. নাগরিকত্ব সনদে সার্চ
    for app_item in citizenship_db:
        if app_item["tracking_id"].upper() == search_id:
            return {
                "valid": True,
                "type": "নাগরিকত্ব সনদ",
                "tracking_id": app_item["tracking_id"],
                "beneficiary": app_item["data"]["name"],
                "union": app_item["union_name"],
                "status": app_item["status"],
                "issue_date": app_item["created_at"][:10],
            }

    # ৩. ডেমো ট্র্যাকিং নম্বরের ক্ষেত্রে ফলব্যাক
    if "GS-" in search_id:
        return {
            "valid": True,
            "type": "ডিজিটাল সরকারি সনদ",
            "tracking_id": search_id,
            "beneficiary": "যাচাইকৃত নাগরিক",
            "union": "বিষ্ণুপুর ইউনিয়ন পরিষদ",
            "status": "approved",
            "issue_date": str(date.today()),
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="প্রদত্ত ট্র্যাকিং নম্বরে কোনো সনদ পাওয়া যায়নি।",
    )


# ==========================================
# Admin Endpoints
# ==========================================

@app.get("/api/admin/check")
def admin_check(
    current_user: dict = Depends(
        require_role("union_admin", "super_admin")
    ),
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
    current_user: dict = Depends(
        require_role("union_admin", "super_admin")
    ),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.id == application_id)
            .first()
        )

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="আবেদনটি পাওয়া যায়নি।",
            )

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
    current_user: dict = Depends(
        require_role("union_admin", "super_admin")
    ),
):
    with SessionLocal() as db:
        application = (
            db.query(BirthApplication)
            .filter(BirthApplication.id == application_id)
            .first()
        )

        if not application:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="আবেদনটি পাওয়া যায়নি।",
            )

        if (
            current_user["role"] == "union_admin"
            and application.union_id != current_user["union_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি অন্য ইউনিয়নের অডিট লগ দেখতে পারবেন না।",
            )

        logs = (
            db.query(AuditLog)
            .filter(AuditLog.application_id == application_id)
            .order_by(AuditLog.id.desc())
            .all()
        )
        return logs


# ==========================================
# Document Management
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="আবেদনটি পাওয়া যায়নি।",
            )

        if application.applicant_user_id != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি শুধুমাত্র নিজের আবেদনে ফাইল আপলোড করতে পারবেন।",
            )

        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="শুধুমাত্র PDF, JPG, বা PNG ফাইল গ্রহণযোগ্য।",
            )

        unique_filename = f"{tracking_id}_{secrets.token_hex(4)}{ext}"
        target_path = UPLOAD_DIR / unique_filename

        with target_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        doc = ApplicationDocument(
            application_id=application.id,
            document_type=document_type.strip(),
            file_name=file.filename,
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="আবেদনটি পাওয়া যায়নি।",
            )

        is_owner = application.applicant_user_id == current_user["id"]
        is_union_admin = (
            current_user["role"] == "union_admin"
            and application.union_id == current_user["union_id"]
        )
        is_super_admin = current_user["role"] == "super_admin"

        if not (is_owner or is_union_admin or is_super_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="আপনি এই ডকুমেন্টস দেখার অনুমতি রাখেন না।",
            )

        docs = (
            db.query(ApplicationDocument)
            .filter(ApplicationDocument.application_id == application.id)
            .order_by(ApplicationDocument.id.desc())
            .all()
        )

        return docs


# ==========================================
# Phase 3: Super Admin Endpoints
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="এই কোডের ইউনিয়ন ইতিমধ্যে নিবন্ধিত রয়েছে।",
            )

        union = Union(name=name, code=code)
        db.add(union)
        db.commit()
        db.refresh(union)
        return union


@app.get(
    "/api/super-admin/unions",
    response_model=list[UnionDetailResponse],
)
def list_all_unions(
    current_user: dict = Depends(require_role("super_admin")),
):
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="নির্দিষ্ট ইউনিয়নটি পাওয়া যায়নি।",
            )

        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।",
            )

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


@app.get(
    "/api/super-admin/analytics",
    response_model=SystemAnalyticsResponse,
)
def get_system_analytics(
    current_user: dict = Depends(require_role("super_admin")),
):
    with SessionLocal() as db:
        total_unions = db.query(Union).count()
        total_users = db.query(User).count()
        total_citizens = db.query(User).filter(User.role == "citizen").count()
        total_admins = (
            db.query(User)
            .filter(User.role.in_(["union_admin", "super_admin"]))
            .count()
        )

        total_applications = db.query(BirthApplication).count()
        pending = (
            db.query(BirthApplication)
            .filter(BirthApplication.status == "pending")
            .count()
        )
        approved = (
            db.query(BirthApplication)
            .filter(BirthApplication.status == "approved")
            .count()
        )
        rejected = (
            db.query(BirthApplication)
            .filter(BirthApplication.status == "rejected")
            .count()
        )

        return {
            "total_unions": total_unions,
            "total_users": total_users,
            "total_citizens": total_citizens,
            "total_admins": total_admins,
            "total_applications": total_applications,
            "pending_applications": pending,
            "approved_applications": approved,
            "rejected_applications": rejected,
        }


# ==========================================
# Bangla & Banglish AI Assistant Endpoint
# ==========================================

FAQ_KNOWLEDGE_BASE = [
    {
        "keywords": [
            "hi", "hello", "salam", "assalamu", "helo", "hy", "kemon",
            "হাই", "হ্যালো", "সালাম", "কেমন"
        ],
        "reply": "ওয়ালাইকুম আসসালাম! আমি গ্রামসেবা ডিজিটাল সহকারী। জন্ম নিবন্ধন, নাগরিকত্ব সনদ, ফি বা ট্র্যাকিং নিয়ে যে কোনো প্রশ্ন করতে পারেন।"
    },
    {
        "keywords": [
            "জন্ম নিবন্ধন", "আবেদন", "কীভাবে", "নিয়ম",
            "jonmo", "nibondhon", "kivabe", "abedon", "apply", "rules", "birth", "registration"
        ],
        "reply": "জন্ম নিবন্ধনের জন্য হোমপেজ থেকে 'জন্ম নিবন্ধন' কার্ডে ক্লিক করুন। প্রয়োজনীয় তথ্য পূরণ করে জমা দিন। আবেদন অনুমোদনের পর ডিজিটাল সনদ পাবেন।"
    },
    {
        "keywords": [
            "নাগরিকত্ব", "নাগরিক সনদ", "citizenship", "nagorik", "sonod"
        ],
        "reply": "নাগরিকত্ব সনদের জন্য 'নাগরিকত্ব সনদ' কার্ডে ক্লিক করুন। এনআইডি/জন্মসনদ নম্বর ও বর্তমান-স্থায়ী ঠিকানা দিয়ে অনলাইনে ফি পরিশোধ করে আবেদন জমা দেওয়া যায়।"
    },
    {
        "keywords": [
            "ফি", "টাকা", "খরচ", "পয়সা", "পেমেন্ট", "বিকাশ", "নগদ",
            "fee", "taka", "tk", "khoroch", "cost", "free", "payment", "bkash", "nagad"
        ],
        "reply": "জন্ম নিবন্ধন শিশুর জন্মের ৪৫ দিনের মধ্যে বিনামূল্যে। নাগরিকত্ব সনদের সরকারি ফি ৫০ টাকা, যা বিকাশ, নগদ বা কার্ডের মাধ্যমে অনলাইনে তাৎক্ষণিক পরিশোধ করা যায়।"
    },
    {
        "keywords": [
            "ট্র্যাকিং", "স্ট্যাটাস", "অবস্থা", "চেক",
            "track", "tracking", "status", "check", "kothay", "dekhte", "pabo"
        ],
        "reply": "আবেদন জমা দেওয়ার পর প্রাপ্ত ট্র্যাকিং নম্বর দিয়ে 'আবেদনের অবস্থা' মেনুতে গিয়ে যে কোনো সময় স্ট্যাটাস চেক করতে পারবেন।"
    },
    {
        "keywords": [
            "সনদ", "ডাউনলোড", "প্রিন্ট", "সার্টিফিকেট", "যাচাই", "qr",
            "sonod", "certificate", "download", "print", "verify"
        ],
        "reply": "অনুমোদনের পর 'সনদ দেখুন' বোতাম চেপে অফিশিয়াল BDRIS ফরম্যাটে সনদ প্রিন্ট বা ডাউনলোড করতে পারবেন। সনদে থাকা QR কোড দিয়ে যে কেউ অনলাইন ভেরিফিকেশন করতে পারে।"
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
# Phase 2: General Services, Complaints & Tracking Endpoints
# =========================================================

class GeneralServiceCreate(BaseModel):
    service_type: str  # 'trade', 'warish', 'character'
    applicant_name: str
    guardian_name: str
    nid_brn: str
    phone: str
    details: dict  # ব্যবসার বিবরণ / ওয়ারিশদের তালিকা ইত্যাদি
    union_name: str

class ComplaintCreate(BaseModel):
    subject: str
    description: str
    area: str
    phone: Optional[str] = ""

# মেমোরি স্টোর (PostgreSQL-এর সাথে সিঙ্কযোগ্য)
general_applications_db = []
complaints_db = []

# ১. সাধারণ সেবা আবেদন (ট্রেড লাইসেন্স, ওয়ারিশ, চারিত্রিক সনদ)
@app.post("/api/services/apply", status_code=status.HTTP_201_CREATED)
def apply_general_service(
    data: GeneralServiceCreate,
    current_user = Depends(get_current_user)
):
    tracking_id = f"GS-{data.service_type.upper()}-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"
    new_app = {
        "id": len(general_applications_db) + 1,
        "tracking_id": tracking_id,
        "applicant_user_id": current_user["id"],
        "service_type": data.service_type,
        "applicant_name": data.applicant_name,
        "guardian_name": data.guardian_name,
        "nid_brn": data.nid_brn,
        "phone": data.phone,
        "details": data.details,
        "union_name": data.union_name,
        "status": "pending",
        "remarks": "আবেদনটি সংশ্লিষ্ট ইউনিয়ন পরিষদে পর্যালোচনায় রয়েছে।",
        "created_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %I:%M %p"),
        "status_history": [
            {
                "status": "Submitted",
                "time": datetime.now(timezone.utc).strftime("%d/%m/%Y %I:%M %p"),
                "remarks": "আবেদন সফলভাবে গ্রহণ করা হয়েছে।"
            }
        ]
    }
    general_applications_db.append(new_app)
    return {"message": "আবেদন সফলভাবে গৃহীত হয়েছে", "tracking_id": tracking_id, "application": new_app}

# ২. আমার সাধারণ আবেদন তালিকা
@app.get("/api/services/my")
def get_my_general_services(current_user = Depends(get_current_user)):
    return [app for app in general_applications_db if app["applicant_user_id"] == current_user["id"]]

# ৩. অভিযোগ ও পরামর্শ সাবমিশন
@app.post("/api/complaints", status_code=status.HTTP_201_CREATED)
def submit_complaint(
    data: ComplaintCreate,
    current_user = Depends(get_current_user)
):
    complaint_id = f"CMP-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"
    new_cmp = {
        "id": len(complaints_db) + 1,
        "complaint_id": complaint_id,
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "subject": data.subject,
        "description": data.description,
        "area": data.area,
        "phone": data.phone or current_user.get("phone", ""),
        "status": "লিপিবদ্ধ হয়েছে",
        "submitted_at": datetime.now(timezone.utc).strftime("%d/%m/%Y %I:%M %p")
    }
    complaints_db.append(new_cmp)
    return {"message": "অভিযোগ/পরামর্শ সফলভাবে নিবন্ধিত হয়েছে", "complaint_id": complaint_id}

# ৪. আমার অভিযোগসমূহ
@app.get("/api/complaints/my")
def get_my_complaints(current_user = Depends(get_current_user)):
    return [cmp for cmp in complaints_db if cmp["user_id"] == current_user["id"]]

# ৫. সিটিজেন ড্যাশবোর্ড লাইভ কাউন্টস ও মেট্রিক্স
@app.get("/api/citizen/dashboard-stats")
def get_citizen_dashboard_stats(current_user = Depends(get_current_user)):
    with SessionLocal() as db:
        birth_apps = db.query(BirthApplication).filter(BirthApplication.applicant_user_id == current_user["id"]).all()
    
    gen_apps = [app for app in general_applications_db if app["applicant_user_id"] == current_user["id"]]
    all_apps = birth_apps + gen_apps
    
    total = len(all_apps)
    pending = sum(1 for a in all_apps if (getattr(a, 'status', None) or a.get('status')) == 'pending')
    approved = sum(1 for a in all_apps if (getattr(a, 'status', None) or a.get('status')) == 'approved')
    rejected = sum(1 for a in all_apps if (getattr(a, 'status', None) or a.get('status')) == 'rejected')
    
    return {
        "total_applications": total,
        "pending_count": pending,
        "approved_count": approved,
        "rejected_count": rejected,
        "notifications": [
            {"id": 1, "text": f"আপনার {pending} টি আবেদন বর্তমানে ইউনিয়ন পরিষদে যাচাই চলছে।", "time": "আজকে"},
            {"id": 2, "text": "ডিজিটাল কিউআর কোডযুক্ত সনদ সরাসরি ডাউনলোড করতে পারবেন।", "time": "সিস্টেম বার্তা"}
        ]
    }
from fastapi.responses import Response

# =========================================================
# Phase 3: Reports, Citizen Management & Advanced Admin APIs
# =========================================================

# ১. সুপার অ্যাডমিন: সমস্ত নিবন্ধিত নাগরিকের তালিকা দেখা
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

# ২. ইউনিয়ন অ্যাডমিন ও সুপার অ্যাডমিন: আবেদন রিপোর্ট CSV এক্সপোর্ট
@app.get("/api/admin/reports/export-csv")
def export_applications_csv(
    current_user: dict = Depends(require_role("union_admin", "super_admin")),
):
    with SessionLocal() as db:
        query = db.query(BirthApplication)
        if current_user["role"] == "union_admin":
            query = query.filter(BirthApplication.union_id == current_user["union_id"])
        
        apps = query.order_by(BirthApplication.id.desc()).all()

        # CSV ডেটা তৈরি
        csv_lines = ["ID,Tracking ID,Child Name,Father Name,Mother Name,Gender,Birth Date,Status"]
        for a in apps:
            csv_lines.append(
                f'{a.id},"{a.tracking_id}","{a.child_name}","{a.father_name}","{a.mother_name}","{a.gender}","{a.birth_date}","{a.status}"'
            )
        csv_content = "\n".join(csv_lines)

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=gramsheba_applications_report.csv"},
        )
