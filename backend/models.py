from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Union(Base):
    __tablename__ = "unions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("id", "union_id", name="uq_users_id_union_id"),
        CheckConstraint(
            "role IN ('citizen', 'union_officer', 'union_admin', 'super_admin')",
            name="ck_users_valid_role",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    area: Mapped[str] = mapped_column(String(150), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[str] = mapped_column(
        String(30), default="citizen", nullable=False
    )
    union_id: Mapped[int] = mapped_column(
        ForeignKey("unions.id"), index=True, nullable=False
    )


class BirthApplication(Base):
    __tablename__ = "birth_applications"
    __table_args__ = (
        ForeignKeyConstraint(
            ["applicant_user_id", "union_id"],
            ["users.id", "users.union_id"],
            name="fk_birth_applications_applicant_union",
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'needs_correction')",
            name="ck_birth_applications_valid_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tracking_id: Mapped[str] = mapped_column(
        String(30), unique=True, index=True, nullable=False
    )
    applicant_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    union_id: Mapped[int] = mapped_column(
        ForeignKey("unions.id"), index=True, nullable=False
    )

    child_name: Mapped[str] = mapped_column(String(150), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    father_name: Mapped[str] = mapped_column(String(150), nullable=False)
    mother_name: Mapped[str] = mapped_column(String(150), nullable=False)
    birth_place: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(
        String(30), default="pending", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("birth_applications.id"), index=True, nullable=False
    )
    action_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
class ApplicationDocument(Base):
    __tablename__ = "application_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("birth_applications.id"), index=True, nullable=False
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
