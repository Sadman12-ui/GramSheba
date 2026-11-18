from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import main
from main import app, password_hash, create_access_token
from models import Base, Union, User, BirthApplication

TEST_DATABASE_URL = "postgresql+psycopg://localhost/gramsheba_test_db"
test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(bind=test_engine)

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_phase3_data():
    """Phase 3 টেস্টের জন্য সুপার অ্যাডমিন, সিটিজেন ও ইউনিয়ন ডাটা প্রস্তুত করে"""
    Base.metadata.create_all(bind=test_engine)
    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    with TestSessionLocal() as db:
        u_hq = db.query(Union).filter(Union.code == "HQ_CENTRAL").first()
        if not u_hq:
            u_hq = Union(name="সেন্ট্রাল হেডকোয়ার্টার", code="HQ_CENTRAL")
            db.add(u_hq)
            db.commit()
            db.refresh(u_hq)

        sa_email = "superadmin@gramsheba.org"
        super_admin = db.query(User).filter(User.email == sa_email).first()
        if not super_admin:
            super_admin = User(
                full_name="Chief Super Admin",
                email=sa_email,
                phone="01999999999",
                area="সচিবালয়, ঢাকা",
                password_hash=password_hash.hash("SuperSecret123"),
                role="super_admin",
                union_id=u_hq.id,
            )
            db.add(super_admin)

        c_email = "citizen_p3@gramsheba.org"
        citizen = db.query(User).filter(User.email == c_email).first()
        if not citizen:
            citizen = User(
                full_name="Phase3 Citizen",
                email=c_email,
                phone="01788888888",
                area="ওয়ার্ড নং ২",
                password_hash=password_hash.hash("CitizenSecret123"),
                role="citizen",
                union_id=u_hq.id,
            )
            db.add(citizen)

        db.commit()

        admin = db.query(User).filter(User.role == "union_admin").first()
        admin_email = admin.email if admin else sa_email

        yield {
            "super_admin_email": sa_email,
            "citizen_email": c_email,
            "admin_email": admin_email,
            "u_hq_id": u_hq.id,
        }

    main.SessionLocal = original_session_local


def test_super_admin_can_create_new_union(setup_phase3_data):
    token = create_access_token(setup_phase3_data["super_admin_email"])
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "name": "রামপুর ইউনিয়ন পরিষদ",
        "code": "RAMPUR_01",
    }
    res = client.post("/api/super-admin/unions", json=payload, headers=headers)
    assert res.status_code in [201, 409]
    if res.status_code == 201:
        data = res.json()
        assert data["name"] == "রামপুর ইউনিয়ন পরিষদ"
        assert data["code"] == "RAMPUR_01"


def test_regular_citizen_forbidden_from_super_admin_endpoints(setup_phase3_data):
    token = create_access_token(setup_phase3_data["citizen_email"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/super-admin/analytics", headers=headers)
    assert res.status_code == 403


def test_super_admin_can_view_system_analytics(setup_phase3_data):
    token = create_access_token(setup_phase3_data["super_admin_email"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/super-admin/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_unions" in data
    assert "total_users" in data
    assert "total_applications" in data
    assert "approved_applications" in data
    assert data["total_unions"] >= 1


def test_admin_applications_status_filter(setup_phase3_data):
    with TestSessionLocal() as db:
        admin = db.query(User).filter(User.email == setup_phase3_data["super_admin_email"]).first()
        admin_email = admin.email
        admin_id = admin.id
        union_id = admin.union_id

        app_pending = BirthApplication(
            tracking_id=f"GS-TPEND-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=admin_id,
            union_id=union_id,
            child_name="পেন্ডিং শিশু",
            birth_date=date(2023, 1, 1),
            gender="male",
            father_name="পিতা ১",
            mother_name="মাতা ১",
            birth_place="ঢাকা",
            address="ঠিকানা ১",
            status="pending",
        )
        app_approved = BirthApplication(
            tracking_id=f"GS-TAPPR-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=admin_id,
            union_id=union_id,
            child_name="অনুমোদিত শিশু",
            birth_date=date(2023, 1, 1),
            gender="female",
            father_name="পিতা ২",
            mother_name="মাতা ২",
            birth_place="ঢাকা",
            address="ঠিকানা ২",
            status="approved",
        )
        db.add_all([app_pending, app_approved])
        db.commit()

    token = create_access_token(admin_email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/birth-applications?status=pending", headers=headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) > 0
    assert all(a["status"] == "pending" for a in apps)


def test_admin_applications_search_by_tracking_id(setup_phase3_data):
    with TestSessionLocal() as db:
        admin = db.query(User).filter(User.email == setup_phase3_data["super_admin_email"]).first()
        admin_email = admin.email

        sample_app = BirthApplication(
            tracking_id=f"GS-TSRCH-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=admin.id,
            union_id=admin.union_id,
            child_name="সার্চ টেস্ট শিশু",
            birth_date=date(2023, 1, 1),
            gender="male",
            father_name="পিতা ৩",
            mother_name="মাতা ৩",
            birth_place="ঢাকা",
            address="ঠিকানা ৩",
            status="pending",
        )
        db.add(sample_app)
        db.commit()
        db.refresh(sample_app)
        target_tracking_id = sample_app.tracking_id

    token = create_access_token(admin_email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/admin/birth-applications?search={target_tracking_id}", headers=headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 1
    assert target_tracking_id in [a["tracking_id"] for a in apps]


def test_login_rate_limiting_blocks_brute_force(setup_phase3_data):
    payload = {
        "email": "bruteforce@test.com",
        "password": "WrongPassword123!",
    }

    status_codes = []
    for _ in range(12):
        res = client.post("/api/login", json=payload)
        status_codes.append(res.status_code)

    assert 429 in status_codes
