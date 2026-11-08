import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import main
from models import Base, BirthApplication, Union, User

TEST_DATABASE_URL = "postgresql+psycopg://localhost/gramsheba_test_db"

test_engine = create_engine(TEST_DATABASE_URL)
TestSessionLocal = sessionmaker(bind=test_engine)


def test_phase1_test_file_is_running():
    assert True

def test_test_database_is_separate():
    with test_engine.connect() as connection:
        database_name = connection.exec_driver_sql(
            "SELECT current_database()"
        ).scalar_one()

    assert database_name == "gramsheba_test_db"

def test_test_database_tables_exist():
    with test_engine.connect() as connection:
        tables = set(
            connection.exec_driver_sql(
                """
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                """
            ).scalars().all()
        )

    assert {"users", "unions", "birth_applications"}.issubset(tables)



def test_citizen_cannot_access_admin_endpoint():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    union_code = f"TEST-UNION-{test_id}"
    citizen_email = f"citizen-{test_id}@example.com"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(
                name="Test Union",
                code=union_code,
            )
            db.add(union)
            db.flush()

            citizen = User(
                full_name="Test Citizen",
                email=citizen_email,
                phone="01700000000",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "TestPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(citizen)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(citizen_email)

        response = client.get(
            "/api/admin/check",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    finally:
        try:
            with TestSessionLocal() as db:
                citizen = db.query(User).filter(
                    User.email == citizen_email
                ).first()

                if citizen:
                    db.delete(citizen)
                    db.flush()

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()

                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_admin_sees_only_own_union_applications():
    import uuid
    from datetime import date

    test_id = uuid.uuid4().hex[:12]
    union_a_code = f"UNION-A-{test_id}"
    union_b_code = f"UNION-B-{test_id}"
    admin_email = f"admin-a-{test_id}@example.com"
    citizen_email = f"citizen-b-{test_id}@example.com"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union_a = Union(name="Union A", code=union_a_code)
            union_b = Union(name="Union B", code=union_b_code)
            db.add_all([union_a, union_b])
            db.flush()

            admin = User(
                full_name="Union A Admin",
                email=admin_email,
                phone="01700000001",
                area="Area A",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="union_admin",
                union_id=union_a.id,
            )
            citizen = User(
                full_name="Union B Citizen",
                email=citizen_email,
                phone="01700000002",
                area="Area B",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="citizen",
                union_id=union_b.id,
            )
            db.add_all([admin, citizen])
            db.flush()

            from models import BirthApplication

            application = BirthApplication(
                tracking_id=f"GS-TEST-{test_id}",
                applicant_user_id=citizen.id,
                union_id=union_b.id,
                child_name="Test Child",
                birth_date=date(2020, 1, 1),
                gender="male",
                father_name="Test Father",
                mother_name="Test Mother",
                birth_place="Test Hospital",
                address="Test Address",
                status="pending",
            )
            db.add(application)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(admin_email)

        response = client.get(
            "/api/admin/birth-applications",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert all(
            item["tracking_id"] != f"GS-TEST-{test_id}"
            for item in response.json()
        )

    finally:
        try:
            from models import BirthApplication

            with TestSessionLocal() as db:
                application = db.query(BirthApplication).filter(
                    BirthApplication.tracking_id == f"GS-TEST-{test_id}"
                ).first()

                if application:
                    db.delete(application)

                for email in (admin_email, citizen_email):
                    user = db.query(User).filter(
                        User.email == email
                    ).first()
                    if user:
                        db.delete(user)

                for code in (union_a_code, union_b_code):
                    union = db.query(Union).filter(
                        Union.code == code
                    ).first()
                    if union:
                        db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_admin_endpoint_requires_token():
    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        client = TestClient(main.app)
        response = client.get("/api/admin/check")

        assert response.status_code == 401

    finally:
        main.SessionLocal = original_session_local

def test_login_rejects_invalid_password():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    email = f"login-test-{test_id}@example.com"
    union_code = f"LOGIN-UNION-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(
                name="Login Test Union",
                code=union_code,
            )
            db.add(union)
            db.flush()

            user = User(
                full_name="Login Test Citizen",
                email=email,
                phone="01700000003",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "CorrectPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(user)
            db.commit()

        client = TestClient(main.app)

        response = client.post(
            "/api/login",
            json={
                "email": email,
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401

    finally:
        try:
            with TestSessionLocal() as db:
                user = db.query(User).filter(
                    User.email == email
                ).first()

                if user:
                    db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()

                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_authenticated_user_can_access_me():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    email = f"me-test-{test_id}@example.com"
    union_code = f"ME-UNION-{test_id}"
    full_name = "Profile Test Citizen"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(name="Profile Test Union", code=union_code)
            db.add(union)
            db.flush()

            user = User(
                full_name=full_name,
                email=email,
                phone="01700000004",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "TestPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(user)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(email)

        response = client.get(
            "/api/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == email
        assert response.json()["full_name"] == full_name

    finally:
        try:
            with TestSessionLocal() as db:
                user = db.query(User).filter(
                    User.email == email
                ).first()

                if user:
                    db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()

                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_birth_application_uses_authenticated_users_union():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    email = f"birth-test-{test_id}@example.com"
    union_code = f"BIRTH-UNION-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    tracking_id = None

    try:
        with TestSessionLocal() as db:
            union = Union(
                name="Birth Test Union",
                code=union_code,
            )
            db.add(union)
            db.flush()

            user = User(
                full_name="Birth Test Citizen",
                email=email,
                phone="01700000005",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "TestPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(user)
            db.commit()
            expected_union_id = union.id

        client = TestClient(main.app)
        token = main.create_access_token(email)

        response = client.post(
            "/api/birth-applications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "child_name": "Test Child",
                "birth_date": "2020-01-01",
                "gender": "male",
                "father_name": "Test Father",
                "mother_name": "Test Mother",
                "birth_place": "Test Hospital",
                "address": "Test Address, Test Area",
            },
        )

        assert response.status_code == 201

        application_data = response.json()
        tracking_id = application_data["tracking_id"]

        with TestSessionLocal() as db:
            from models import BirthApplication

            application = db.query(BirthApplication).filter(
                BirthApplication.tracking_id == tracking_id
            ).first()

            assert application is not None
            assert application.union_id == expected_union_id
            assert application.status == "pending"

    finally:
        try:
            with TestSessionLocal() as db:
                from models import BirthApplication

                if tracking_id:
                    application = db.query(BirthApplication).filter(
                        BirthApplication.tracking_id == tracking_id
                    ).first()

                    if application:
                        db.delete(application)

                user = db.query(User).filter(
                    User.email == email
                ).first()

                if user:
                    db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()

                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_birth_application_rejects_future_birth_date():
    import uuid
    from datetime import date, timedelta

    test_id = uuid.uuid4().hex[:12]
    email = f"future-birth-{test_id}@example.com"
    union_code = f"FUTURE-UNION-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(
                name="Future Date Test Union",
                code=union_code,
            )
            db.add(union)
            db.flush()

            user = User(
                full_name="Future Date Test Citizen",
                email=email,
                phone="01700000006",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "TestPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(user)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(email)

        response = client.post(
            "/api/birth-applications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "child_name": "Test Child",
                "birth_date": (
                    date.today() + timedelta(days=30)
                ).isoformat(),
                "gender": "male",
                "father_name": "Test Father",
                "mother_name": "Test Mother",
                "birth_place": "Test Hospital",
                "address": "Test Address, Test Area",
            },
        )

        assert response.status_code == 422

    finally:
        try:
            with TestSessionLocal() as db:
                user = db.query(User).filter(
                    User.email == email
                ).first()
                if user:
                    db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()
                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_birth_application_rejects_invalid_gender():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    email = f"gender-test-{test_id}@example.com"
    union_code = f"GENDER-UNION-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(
                name="Gender Test Union",
                code=union_code,
            )
            db.add(union)
            db.flush()

            user = User(
                full_name="Gender Test Citizen",
                email=email,
                phone="01700000007",
                area="Test Area",
                password_hash=main.password_hash.hash(
                    "TestPassword123!"
                ),
                role="citizen",
                union_id=union.id,
            )
            db.add(user)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(email)

        response = client.post(
            "/api/birth-applications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "child_name": "Test Child",
                "birth_date": "2020-01-01",
                "gender": "invalid",
                "father_name": "Test Father",
                "mother_name": "Test Mother",
                "birth_place": "Test Hospital",
                "address": "Test Address, Test Area",
            },
        )

        assert response.status_code == 422

    finally:
        try:
            with TestSessionLocal() as db:
                user = db.query(User).filter(
                    User.email == email
                ).first()
                if user:
                    db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()
                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_citizen_sees_only_own_birth_applications():
    import uuid
    from datetime import date
    from models import BirthApplication

    test_id = uuid.uuid4().hex[:12]
    union_code = f"MY-UNION-{test_id}"
    user_a_email = f"user-a-{test_id}@example.com"
    user_b_email = f"user-b-{test_id}@example.com"
    tracking_id = f"GS-MY-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union = Union(name="My Test Union", code=union_code)
            db.add(union)
            db.flush()

            user_a = User(
                full_name="Citizen A",
                email=user_a_email,
                phone="01700000008",
                area="Test Area",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="citizen",
                union_id=union.id,
            )
            user_b = User(
                full_name="Citizen B",
                email=user_b_email,
                phone="01700000009",
                area="Test Area",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="citizen",
                union_id=union.id,
            )
            db.add_all([user_a, user_b])
            db.flush()

            application = BirthApplication(
                tracking_id=tracking_id,
                applicant_user_id=user_b.id,
                union_id=union.id,
                child_name="Citizen B Child",
                birth_date=date(2020, 1, 1),
                gender="male",
                father_name="Father B",
                mother_name="Mother B",
                birth_place="Test Hospital",
                address="Test Address",
                status="pending",
            )
            db.add(application)
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(user_a_email)

        response = client.get(
            "/api/birth-applications/my",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert all(
            item["tracking_id"] != tracking_id
            for item in response.json()
        )

    finally:
        try:
            with TestSessionLocal() as db:
                application = db.query(BirthApplication).filter(
                    BirthApplication.tracking_id == tracking_id
                ).first()
                if application:
                    db.delete(application)

                for email in (user_a_email, user_b_email):
                    user = db.query(User).filter(
                        User.email == email
                    ).first()
                    if user:
                        db.delete(user)

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()
                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_me_rejects_invalid_token():
    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        client = TestClient(main.app)

        response = client.get(
            "/api/me",
            headers={
                "Authorization": "Bearer invalid-token-for-testing"
            },
        )

        assert response.status_code == 401

    finally:
        main.SessionLocal = original_session_local

def test_me_rejects_expired_token():
    from datetime import datetime, timedelta, timezone
    import jwt

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        expired_payload = {
            "sub": "expired-token-test@example.com",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=5),
        }

        expired_token = jwt.encode(
            expired_payload,
            main.JWT_SECRET_KEY,
            algorithm=main.JWT_ALGORITHM,
        )

        client = TestClient(main.app)

        response = client.get(
            "/api/me",
            headers={
                "Authorization": f"Bearer {expired_token}"
            },
        )

        assert response.status_code == 401

    finally:
        main.SessionLocal = original_session_local



def test_registration_rejects_duplicate_email():
    import uuid

    test_id = uuid.uuid4().hex[:12]
    email = f"duplicate-{test_id}@example.com"
    union_code = f"DUPLICATE-UNION-{test_id}".upper()

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        # Step 1: Create a test union
        with TestSessionLocal() as db:
            union = Union(
                name="Duplicate Test Union",
                code=union_code,
            )
            db.add(union)
            db.commit()

        # Step 2: Verify the union exists
        with TestSessionLocal() as db:
            saved_union = db.query(Union).filter(
                Union.code == union_code
            ).first()

            assert saved_union is not None, (
                f"Test union was not saved: {union_code}"
            )

        # Step 3: Check database session
        print(
            "TEST DB:",
            TestSessionLocal.kw["bind"].url.database,
        )
        print(
            "MAIN DB:",
            main.SessionLocal.kw["bind"].url.database,
        )

        with main.SessionLocal() as db:
            check_union = db.query(Union).filter(
                Union.code == union_code
            ).first()

            print(
                "UNION FOUND THROUGH MAIN SESSION:",
                check_union is not None,
            )

        # Step 4: Prepare registration data
        client = TestClient(main.app)

        registration_data = {
            "full_name": "Duplicate Test Citizen",
            "email": email,
            "phone": "01700000011",
            "area": "Test Area",
            "password": "CorrectPassword123!",
            "union_code": union_code,
        }

        # Step 5: First registration should succeed
        first_response = client.post(
            "/api/register",
            json=registration_data,
        )

        assert first_response.status_code == 201, (
            f"First registration failed: "
            f"status={first_response.status_code}, "
            f"detail={first_response.text}"
        )

        # Step 6: Duplicate email should return 409
        second_response = client.post(
            "/api/register",
            json=registration_data,
        )

        assert second_response.status_code == 409, (
            f"Duplicate registration failed: "
            f"status={second_response.status_code}, "
            f"detail={second_response.text}"
        )

    finally:
        # Step 7: Clean up test data
        try:
            with TestSessionLocal() as db:
                user = db.query(User).filter(
                    User.email == email
                ).first()

                if user:
                    db.delete(user)
                    db.flush()

                union = db.query(Union).filter(
                    Union.code == union_code
                ).first()

                if union:
                    db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local


def test_login_accepts_uppercase_email():
    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    test_id = uuid.uuid4().hex[:8]
    email = f"uppercase-{test_id}@example.com"
    password = "TestPassword123!"

    db = TestSessionLocal()
    try:
        union = Union(
            name=f"Uppercase Email Union {test_id}",
            code=f"UPPERCASE-{test_id}".upper(),
        )
        db.add(union)
        db.commit()
        db.refresh(union)

        user = User(
            full_name="Uppercase Email Test",
            email=email,
            phone=f"017{test_id[:8]}",
            area="Test Area",
            password_hash=main.password_hash.hash(password),
            union_id=union.id,
            role="citizen",
        )
        db.add(user)
        db.commit()

        with TestClient(main.app) as client:
            response = client.post(
                "/api/login",
                json={
                    "email": email.upper(),
                    "password": password,
                },
            )

        assert response.status_code == 200
        assert "access_token" in response.json()

    finally:
        db.query(User).filter(User.email == email).delete()
        db.query(Union).filter(
            Union.code == f"UPPERCASE-{test_id}".upper()
        ).delete()
        db.commit()
        db.close()
        main.SessionLocal = original_session_local

def test_super_admin_sees_applications_from_all_unions():
    import uuid
    from datetime import date
    from models import BirthApplication

    test_id = uuid.uuid4().hex[:12]
    union_a_code = f"SUPER-A-{test_id}"
    union_b_code = f"SUPER-B-{test_id}"
    admin_email = f"super-admin-{test_id}@example.com"
    citizen_a_email = f"citizen-a-{test_id}@example.com"
    citizen_b_email = f"citizen-b-{test_id}@example.com"
    tracking_a = f"GS-SUPER-A-{test_id}"
    tracking_b = f"GS-SUPER-B-{test_id}"

    original_session_local = main.SessionLocal
    main.SessionLocal = TestSessionLocal

    try:
        with TestSessionLocal() as db:
            union_a = Union(name="Super Admin Union A", code=union_a_code)
            union_b = Union(name="Super Admin Union B", code=union_b_code)
            db.add_all([union_a, union_b])
            db.flush()

            admin = User(
                full_name="Super Admin",
                email=admin_email,
                phone="01700000021",
                area="Test Area",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="super_admin",
                union_id=union_a.id,
            )
            citizen_a = User(
                full_name="Citizen A",
                email=citizen_a_email,
                phone="01700000022",
                area="Area A",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="citizen",
                union_id=union_a.id,
            )
            citizen_b = User(
                full_name="Citizen B",
                email=citizen_b_email,
                phone="01700000023",
                area="Area B",
                password_hash=main.password_hash.hash("TestPassword123!"),
                role="citizen",
                union_id=union_b.id,
            )
            db.add_all([admin, citizen_a, citizen_b])
            db.flush()

            db.add_all([
                BirthApplication(
                    tracking_id=tracking_a,
                    applicant_user_id=citizen_a.id,
                    union_id=union_a.id,
                    child_name="Child A",
                    birth_date=date(2020, 1, 1),
                    gender="male",
                    father_name="Father A",
                    mother_name="Mother A",
                    birth_place="Hospital A",
                    address="Address A",
                    status="pending",
                ),
                BirthApplication(
                    tracking_id=tracking_b,
                    applicant_user_id=citizen_b.id,
                    union_id=union_b.id,
                    child_name="Child B",
                    birth_date=date(2020, 1, 2),
                    gender="female",
                    father_name="Father B",
                    mother_name="Mother B",
                    birth_place="Hospital B",
                    address="Address B",
                    status="pending",
                ),
            ])
            db.commit()

        client = TestClient(main.app)
        token = main.create_access_token(admin_email)

        response = client.get(
            "/api/admin/birth-applications",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        tracking_ids = {
            item["tracking_id"] for item in response.json()
        }
        assert tracking_a in tracking_ids
        assert tracking_b in tracking_ids

    finally:
        try:
            with TestSessionLocal() as db:
                for tracking_id in (tracking_a, tracking_b):
                    application = db.query(BirthApplication).filter(
                        BirthApplication.tracking_id == tracking_id
                    ).first()
                    if application:
                        db.delete(application)

                for email in (
                    admin_email,
                    citizen_a_email,
                    citizen_b_email,
                ):
                    user = db.query(User).filter(
                        User.email == email
                    ).first()
                    if user:
                        db.delete(user)

                for code in (union_a_code, union_b_code):
                    union = db.query(Union).filter(
                        Union.code == code
                    ).first()
                    if union:
                        db.delete(union)

                db.commit()
        finally:
            main.SessionLocal = original_session_local

def test_database_rejects_application_from_wrong_union():
    from datetime import date
    from sqlalchemy.exc import IntegrityError

    suffix = uuid.uuid4().hex[:10]
    union_a_code = f"TEST_A_{suffix}"
    union_b_code = f"TEST_B_{suffix}"
    email = f"citizen_{suffix}@example.com"

    with TestSessionLocal() as db:
        union_a = Union(name="Test Union A", code=union_a_code)
        union_b = Union(name="Test Union B", code=union_b_code)
        db.add_all([union_a, union_b])
        db.flush()

        citizen = User(
            full_name="Test Citizen",
            email=email,
            phone="01700000000",
            area="Test Area",
            password_hash=main.password_hash.hash("TestPassword123!"),
            role="citizen",
            union_id=union_a.id,
        )
        db.add(citizen)
        db.flush()

        invalid_application = BirthApplication(
            tracking_id=f"TRK-{suffix}",
            applicant_user_id=citizen.id,
            union_id=union_b.id,
            child_name="Test Child",
            birth_date=date(2020, 1, 1),
            gender="male",
            father_name="Test Father",
            mother_name="Test Mother",
            birth_place="Test Hospital",
            address="Test Address",
            status="pending",
        )
        db.add(invalid_application)

        try:
            with pytest.raises(IntegrityError):
                db.flush()
        finally:
            db.rollback()

        # Confirm rollback removed the test records.
        assert db.query(BirthApplication).filter_by(
            tracking_id=f"TRK-{suffix}"
        ).first() is None
