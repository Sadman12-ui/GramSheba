from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    area: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    union_code: str = Field(min_length=3, max_length=30)


class UserUpdate(BaseModel):
    phone: Optional[str] = Field(None, min_length=7, max_length=20)
    area: Optional[str] = Field(None, min_length=2, max_length=150)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    phone: str
    area: str
    role: str
    union_id: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class BirthApplicationCreate(BaseModel):
    child_name: str = Field(min_length=2, max_length=150)
    birth_date: date
    gender: str
    father_name: str = Field(min_length=2, max_length=150)
    mother_name: str = Field(min_length=2, max_length=150)
    birth_place: str = Field(min_length=2, max_length=255)
    address: str = Field(min_length=5, max_length=2000)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("জন্মতারিখ ভবিষ্যতের হতে পারে না")
        return value

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        allowed = {"male", "female", "other"}
        if value not in allowed:
            raise ValueError("সঠিক gender নির্বাচন করুন")
        return value


class ApplicationStatusUpdate(BaseModel):
    status: str
    remarks: Optional[str] = Field(None, max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"approved", "rejected", "needs_correction"}
        if value not in allowed:
            raise ValueError(
                "সঠিক স্ট্যাটাস নির্বাচন করুন (approved, rejected, needs_correction)"
            )
        return value


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    action_by_user_id: int
    action: str
    remarks: Optional[str] = None
    created_at: datetime


class BirthApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tracking_id: str
    applicant_user_id: int
    union_id: int
    child_name: str
    birth_date: date
    gender: str
    father_name: str
    mother_name: str
    birth_place: str
    address: str
    status: str
    created_at: datetime
class BirthCertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tracking_id: str
    certificate_number: str
    issue_date: date
    union_name: str
    child_name: str
    birth_date: date
    gender: str
    father_name: str
    mother_name: str
    birth_place: str
    address: str
    status: str
class ApplicationDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    document_type: str
    file_name: str
    uploaded_at: datetime
class UnionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    code: str = Field(min_length=3, max_length=50)


class UnionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    created_at: datetime


class CreateUnionAdminRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=20)
    area: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    union_id: int


class SystemAnalyticsResponse(BaseModel):
    total_unions: int
    total_users: int
    total_citizens: int
    total_admins: int
    total_applications: int
    pending_applications: int
    approved_applications: int
    rejected_applications: int
