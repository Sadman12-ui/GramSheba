from datetime import date, datetime, timezone
import io
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
def setup_phase2_data():
    """Phase 2 টেস্টের জন্য প্রয়োজনীয় ইউনিয়ন ও ইউজার ডাটা প্রস্তুত করে"""
    Base.metadata.create_all(bind=test_engine)
    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    with TestSessionLocal() as db:
        u1 = db.query(Union).filter(Union.code == "TEST_U1").first()
        if not u1:
            u1 = Union(name="টেস্ট ইউনিয়ন ১", code="TEST_U1")
            db.add(u1)

        u2 = db.query(Union).filter(Union.code == "TEST_U2").first()
        if not u2:
            u2 = Union(name="টেস্ট ইউনিয়ন ২", code="TEST_U2")
            db.add(u2)
        db.commit()
        db.refresh(u1)
        db.refresh(u2)

        c_email = "phase2_citizen@gramsheba.org"
        citizen = db.query(User).filter(User.email == c_email).first()
        if not citizen:
            citizen = User(
                full_name="Phase2 Citizen",
                email=c_email,
                phone="01700000001",
                area="ওয়ার্ড নং ১",
                password_hash=password_hash.hash("Secret123"),
                role="citizen",
                union_id=u1.id,
            )
            db.add(citizen)

        a1_email = "admin_u1@gramsheba.org"
        admin1 = db.query(User).filter(User.email == a1_email).first()
        if not admin1:
            admin1 = User(
                full_name="Admin Union 1",
                email=a1_email,
                phone="01700000002",
                area="ইউনিয়ন পরিষদ ভবন",
                password_hash=password_hash.hash("Secret123"),
                role="union_admin",
                union_id=u1.id,
            )
            db.add(admin1)

        a2_email = "admin_u2@gramsheba.org"
        admin2 = db.query(User).filter(User.email == a2_email).first()
        if not admin2:
            admin2 = User(
                full_name="Admin Union 2",
                email=a2_email,
                phone="01700000003",
                area="ইউনিয়ন পরিষদ ভবন ২",
                password_hash=password_hash.hash("Secret123"),
                role="union_admin",
                union_id=u2.id,
            )
            db.add(admin2)

        db.commit()
        db.refresh(citizen)
        db.refresh(admin1)
        db.refresh(admin2)

        yield {
            "u1": u1,
            "u2": u2,
            "citizen": citizen,
            "admin1": admin1,
            "admin2": admin2,
        }

    main.SessionLocal = original_session_local


def test_citizen_can_update_profile(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "phone": "01899999999",
        "area": "নতুন ধানমন্ডি রোড",
    }
    response = client.put("/api/me", json=update_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "01899999999"
    assert data["area"] == "নতুন ধানমন্ডি রোড"


def test_admin_can_approve_application_and_creates_audit_log(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    admin1 = setup_phase2_data["admin1"]

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-TEST-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="রাফি আহমেদ",
            birth_date=date(2024, 1, 1),
            gender="male",
            father_name="কামাল আহমেদ",
            mother_name="সালমা আক্তার",
            birth_place="চাঁদপুর",
            address="গ্রাম: বিষ্ণুপুর",
            status="pending",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        app_id = app_entry.id

    admin_token = create_access_token(admin1.email)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    status_payload = {
        "status": "approved",
        "remarks": "সকল তথ্য যাচাইপূর্বক অনুমোদন দেওয়া হলো।",
    }
    res = client.put(
        f"/api/admin/birth-applications/{app_id}/status",
        json=status_payload,
        headers=admin_headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    audit_res = client.get(
        f"/api/admin/birth-applications/{app_id}/audit-logs",
        headers=admin_headers,
    )
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert logs[0]["action"] == "approved"


def test_admin_status_update_rejects_invalid_status(setup_phase2_data):
    admin1 = setup_phase2_data["admin1"]
    admin_token = create_access_token(admin1.email)
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.put(
        "/api/admin/birth-applications/1/status",
        json={"status": "invalid_status", "remarks": "ভুল"},
        headers=headers,
    )
    assert res.status_code == 422


def test_cross_union_admin_cannot_update_application_status(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    admin2 = setup_phase2_data["admin2"]

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-CROSS-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="মিতু আক্তার",
            birth_date=date(2023, 5, 10),
            gender="female",
            father_name="করিম মিয়া",
            mother_name="রাহেলা খাতুন",
            birth_place="চাঁদপুর",
            address="গ্রাম: বালিথুবা",
            status="pending",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        target_app_id = app_entry.id

    admin2_token = create_access_token(admin2.email)
    headers = {"Authorization": f"Bearer {admin2_token}"}

    res = client.put(
        f"/api/admin/birth-applications/{target_app_id}/status",
        json={"status": "rejected", "remarks": "বাতিল"},
        headers=headers,
    )
    assert res.status_code == 403


def test_citizen_cannot_update_application_status(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.put(
        "/api/admin/birth-applications/1/status",
        json={"status": "approved"},
        headers=headers,
    )
    assert res.status_code == 403


def test_certificate_generation_for_approved_application(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-CERT-A-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="আবিদা সুলতানা",
            birth_date=date(2022, 10, 15),
            gender="female",
            father_name="তারিকুল ইসলাম",
            mother_name="ফরিদা আক্তার",
            birth_place="চাঁদপুর সদর",
            address="গ্রাম: বাগাদী",
            status="approved",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        tracking_id = app_entry.tracking_id

    res = client.get(
        f"/api/birth-applications/{tracking_id}/certificate",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["tracking_id"] == tracking_id
    assert data["certificate_number"] == f"CERT-{tracking_id}"
    assert data["status"] == "approved"


def test_certificate_rejected_if_not_approved(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-CERT-P-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="হাসান মাহমুদ",
            birth_date=date(2023, 2, 20),
            gender="male",
            father_name="মাহমুদুল হাসান",
            mother_name="বিলকিস বেগম",
            birth_place="চাঁদপুর",
            address="গ্রাম: বিষ্ণুপুর",
            status="pending",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        tracking_id = app_entry.tracking_id

    res = client.get(
        f"/api/birth-applications/{tracking_id}/certificate",
        headers=headers,
    )
    assert res.status_code == 400


def test_certificate_forbidden_for_other_citizens(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    u1 = setup_phase2_data["u1"]

    with TestSessionLocal() as db:
        other_user = db.query(User).filter(User.email == "other_citizen@gramsheba.org").first()
        if not other_user:
            other_user = User(
                full_name="Other Citizen",
                email="other_citizen@gramsheba.org",
                phone="01900000000",
                area="ওয়ার্ড ২",
                password_hash=password_hash.hash("Secret123"),
                role="citizen",
                union_id=u1.id,
            )
            db.add(other_user)
            db.commit()
            db.refresh(other_user)

        app_entry = BirthApplication(
            tracking_id=f"GS-CERT-O-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="সুমি আক্তার",
            birth_date=date(2021, 6, 12),
            gender="female",
            father_name="মনির হোসেন",
            mother_name="রোজিনা আক্তার",
            birth_place="চাঁদপুর",
            address="গ্রাম: মৈশাদী",
            status="approved",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        tracking_id = app_entry.tracking_id

    other_token = create_access_token("other_citizen@gramsheba.org")
    headers = {"Authorization": f"Bearer {other_token}"}

    res = client.get(
        f"/api/birth-applications/{tracking_id}/certificate",
        headers=headers,
    )
    assert res.status_code == 403


def test_citizen_can_upload_document(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-DOC-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="তামিম ইকবাল",
            birth_date=date(2023, 8, 1),
            gender="male",
            father_name="রফিক ইকবাল",
            mother_name="নাসরিন আক্তার",
            birth_place="চাঁদপুর",
            address="গ্রাম: শিলমুড়",
            status="pending",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        tracking_id = app_entry.tracking_id

    fake_file = io.BytesIO(b"%PDF-1.4 dummy pdf content for testing")

    response = client.post(
        f"/api/birth-applications/{tracking_id}/documents",
        headers=headers,
        data={"document_type": "nid_card"},
        files={"file": ("parents_nid.pdf", fake_file, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["document_type"] == "nid_card"
    assert data["file_name"] == "parents_nid.pdf"


def test_document_upload_rejects_invalid_file_extension(setup_phase2_data):
    citizen = setup_phase2_data["citizen"]
    token = create_access_token(citizen.email)
    headers = {"Authorization": f"Bearer {token}"}

    with TestSessionLocal() as db:
        app_entry = BirthApplication(
            tracking_id=f"GS-DOCE-{datetime.now(timezone.utc):%Y%m%d%H%M%S%f}"[:30],
            applicant_user_id=citizen.id,
            union_id=citizen.union_id,
            child_name="তানভীর আহমেদ",
            birth_date=date(2023, 9, 1),
            gender="male",
            father_name="আহমেদ উল্লাহ",
            mother_name="ফাতেমা বেগম",
            birth_place="চাঁদপুর",
            address="গ্রাম: ফরিদগঞ্জ",
            status="pending",
        )
        db.add(app_entry)
        db.commit()
        db.refresh(app_entry)
        tracking_id = app_entry.tracking_id

    fake_file = io.BytesIO(b"dummy text")

    response = client.post(
        f"/api/birth-applications/{tracking_id}/documents",
        headers=headers,
        data={"document_type": "birth_proof"},
        files={"file": ("virus.exe", fake_file, "application/octet-stream")},
    )

    assert response.status_code == 400
