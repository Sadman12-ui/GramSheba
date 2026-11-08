from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient

from main import app, SessionLocal, password_hash, create_access_token
from models import Union, User, BirthApplication

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_phase3_data():
    """Phase 3 টেস্টের জন্য সুপার অ্যাডমিন ও ইউনিয়ন ডাটা প্রস্তুত করে"""
    with SessionLocal() as db:
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
            db.commit()
            db.refresh(super_admin)

        yield {
            "super_admin": super_admin,
            "u_hq": u_hq,
        }


def test_super_admin_can_create_new_union(setup_phase3_data):
    """FR-01: সুপার অ্যাডমিন নতুন ইউনিয়ন রেজিস্টার করতে পারবে"""
    sa = setup_phase3_data["super_admin"]
    token = create_access_token(sa.email)
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
    """সাধারণ নাগরিক সুপার অ্যাডমিন এন্ডপয়েন্টে অ্যাক্সেস করতে পারবে না (403 Forbidden)"""
    with SessionLocal() as db:
        citizen = db.query(User).filter(User.role == "citizen").first()

    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/super-admin/analytics", headers=headers)
    assert res.status_code == 403


def test_super_admin_can_view_system_analytics(setup_phase3_data):
    """FR-15: সুপার অ্যাডমিন সেন্ট্রাল অ্যানালিটিক্স রিপোর্ট দেখতে পারবে"""
    sa = setup_phase3_data["super_admin"]
    token = create_access_token(sa.email)
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
    """FR-10: অ্যাডমিন স্ট্যাটাস কুয়েরি দিয়ে শুধু নির্দিষ্ট স্ট্যাটাসের আবেদন ফিল্টার করতে পারবে"""
    with SessionLocal() as db:
        admin = db.query(User).filter(User.role == "union_admin").first()
        if not admin:
            admin = setup_phase3_data["super_admin"]

        # টেস্টের জন্য নিশ্চিতভাবে একটি pending এবং একটি approved আবেদন তৈরি করা
        app_pending = BirthApplication(
            tracking_id=f"GS-TEST-PEND-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
            applicant_user_id=admin.id,
            union_id=admin.union_id,
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
            tracking_id=f"GS-TEST-APPR-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
            applicant_user_id=admin.id,
            union_id=admin.union_id,
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

    token = create_access_token(admin.email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/admin/birth-applications?status=pending", headers=headers)
    assert res.status_code == 200
    apps = res.json()

    assert len(apps) > 0
    assert all(a["status"] == "pending" for a in apps)


def test_admin_applications_search_by_tracking_id(setup_phase3_data):
    """FR-10: ট্র্যাকিং আইডি দিয়ে সঠিক আবেদন খুঁজে পাওয়া যায়"""
    with SessionLocal() as db:
        admin = db.query(User).filter(User.role == "union_admin").first()
        if not admin:
            admin = setup_phase3_data["super_admin"]

        sample_app = db.query(BirthApplication).filter(BirthApplication.union_id == admin.union_id).first()
        if not sample_app:
            sample_app = BirthApplication(
                tracking_id=f"GS-TEST-SEARCH-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
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

    token = create_access_token(admin.email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/api/admin/birth-applications?search={sample_app.tracking_id}", headers=headers)
    assert res.status_code == 200
    apps = res.json()
    assert len(apps) >= 1
    assert sample_app.tracking_id in [a["tracking_id"] for a in apps]
from datetime import date, datetime, timezone
import pytest
from fastapi.testclient import TestClient

from main import app, SessionLocal, password_hash, create_access_token
from models import Union, User, BirthApplication

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_phase3_data():
    """Phase 3 টেস্টের জন্য সুপার অ্যাডমিন ও ইউনিয়ন ডাটা প্রস্তুত করে"""
    with SessionLocal() as db:
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
            db.commit()
            db.refresh(super_admin)

        admin = db.query(User).filter(User.role == "union_admin").first()
        admin_email = admin.email if admin else sa_email

        yield {
            "super_admin_email": sa_email,
            "admin_email": admin_email,
            "u_hq_id": u_hq.id,
        }


def test_super_admin_can_create_new_union(setup_phase3_data):
    """FR-01: সুপার অ্যাডমিন নতুন ইউনিয়ন রেজিস্টার করতে পারবে"""
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
    """সাধারণ নাগরিক সুপার অ্যাডমিন এন্ডপয়েন্টে অ্যাক্সেস করতে পারবে না (403 Forbidden)"""
    with SessionLocal() as db:
        citizen = db.query(User).filter(User.role == "citizen").first()
        citizen_email = citizen.email

    token = create_access_token(citizen_email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/super-admin/analytics", headers=headers)
    assert res.status_code == 403


def test_super_admin_can_view_system_analytics(setup_phase3_data):
    """FR-15: সুপার অ্যাডমিন সেন্ট্রাল অ্যানালিটিক্স রিপোর্ট দেখতে পারবে"""
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
    """FR-10: অ্যাডমিন স্ট্যাটাস কুয়েরি দিয়ে শুধু নির্দিষ্ট স্ট্যাটাসের আবেদন ফিল্টার করতে পারবে"""
    with SessionLocal() as db:
        admin = db.query(User).filter(User.role == "union_admin").first()
        if not admin:
            admin = db.query(User).filter(User.email == setup_phase3_data["super_admin_email"]).first()

        admin_email = admin.email
        admin_id = admin.id
        union_id = admin.union_id

        # টেস্টের জন্য নিশ্চিতভাবে একটি pending এবং একটি approved আবেদন তৈরি
        app_pending = BirthApplication(
            tracking_id=f"GS-TEST-PEND-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
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
            tracking_id=f"GS-TEST-APPR-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
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
    """FR-10: ট্র্যাকিং আইডি দিয়ে সঠিক আবেদন খুঁজে পাওয়া যায়"""
    with SessionLocal() as db:
        admin = db.query(User).filter(User.role == "union_admin").first()
        if not admin:
            admin = db.query(User).filter(User.email == setup_phase3_data["super_admin_email"]).first()

        admin_email = admin.email
        sample_app = db.query(BirthApplication).filter(BirthApplication.union_id == admin.union_id).first()
        if not sample_app:
            sample_app = BirthApplication(
                tracking_id=f"GS-TEST-SEARCH-{datetime.now(timezone.utc):%Y%m%d%H%M%S}",
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
def test_login_rate_limiting_blocks_brute_force():
    """Security Hardening: একই আইপি থেকে প্রতি মিনিটে ৫ বারের বেশি লগইন চেষ্টা করলে 429 Too Many Requests ফেরত আসবে"""
    payload = {
        "email": "bruteforce@test.com",
        "password": "WrongPassword123!",
    }

    status_codes = []
    # পরপর ৬ বার ভুল পাসওয়ার্ড দিয়ে লগইন রিকোয়েস্ট পাঠানো
    for _ in range(6):
        res = client.post("/api/login", json=payload)
        status_codes.append(res.status_code)

    # প্রথম ৫টি ব্যর্থ চেষ্টার জন্য 401 আসবে, কিন্তু ৬ষ্ঠ চেষ্টায় রেট লিমিট ব্লক (429) করবে
    assert 429 in status_codes, "ব্রুট-ফোর্স রোধে অন্তত একটি রিকোয়েস্টে 429 স্ট্যাটাস কোড আসা উচিত"
