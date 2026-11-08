from datetime import date, datetime, timezone
import secrets
from main import SessionLocal, password_hash
from models import Union, User, BirthApplication, AuditLog

def seed_data():
    with SessionLocal() as db:
        print("🌱 Seeding Phase 3 test data into GramSheba database...")

        # ১. একাধিক ইউনিয়ন তৈরি (হাজীগঞ্জ, কচুয়া, ফরিদগঞ্জ)
        unions_data = [
            {"name": "১নং রাজারগাঁও উত্তর ইউনিয়ন পরিষদ", "code": "RAJ_01"},
            {"name": "২নং বাকিলা ইউনিয়ন পরিষদ", "code": "BAK_02"},
            {"name": "কালচোঁ উত্তর ইউনিয়ন পরিষদ", "code": "KAL_03"},
        ]

        created_unions = {}
        for u_data in unions_data:
            union = db.query(Union).filter(Union.code == u_data["code"]).first()
            if not union:
                union = Union(name=u_data["name"], code=u_data["code"])
                db.add(union)
                db.commit()
                db.refresh(union)
                print(f"  + Union created: {union.name} ({union.code})")
            created_unions[u_data["code"]] = union

        # ২. সেন্ট্রাল সুপার অ্যাডমিন অ্যাকাউন্ট
        super_admin_email = "superadmin@gramsheba.gov.bd"
        super_admin = db.query(User).filter(User.email == super_admin_email).first()
        if not super_admin:
            super_admin = User(
                full_name="কাজী নজরুল ইসলাম",
                email=super_admin_email,
                phone="01711000000",
                area="স্থানীয় সরকার বিভাগ, ঢাকা",
                password_hash=password_hash.hash("Admin@123"),
                role="super_admin",
                union_id=created_unions["RAJ_01"].id,
            )
            db.add(super_admin)
            print(f"  + Super Admin created: {super_admin_email} (Password: Admin@123)")

        # ৩. ইউনিয়ন অ্যাডমিন (১নং রাজারগাঁও)
        admin1_email = "admin.rajar@gramsheba.gov.bd"
        admin1 = db.query(User).filter(User.email == admin1_email).first()
        if not admin1:
            admin1 = User(
                full_name="মোহাম্মদ রফিকুল ইসলাম",
                email=admin1_email,
                phone="01811000001",
                area="রাজারগাঁও ইউনিয়ন ভবন",
                password_hash=password_hash.hash("Admin@123"),
                role="union_admin",
                union_id=created_unions["RAJ_01"].id,
            )
            db.add(admin1)
            print(f"  + Union Admin 1 created: {admin1_email} (Password: Admin@123)")

        # ৪. সাধারণ নাগরিক (Citizen)
        citizen_email = "citizen.sakib@gramsheba.gov.bd"
        citizen = db.query(User).filter(User.email == citizen_email).first()
        if not citizen:
            citizen = User(
                full_name="শাহ সাদমান সাকিব",
                email=citizen_email,
                phone="01911000002",
                area="মোল্লা বাড়ি, ওয়ার্ড নং ৩",
                password_hash=password_hash.hash("Citizen@123"),
                role="citizen",
                union_id=created_unions["RAJ_01"].id,
            )
            db.add(citizen)
            print(f"  + Citizen created: {citizen_email} (Password: Citizen@123)")

        db.commit()

        # রিফ্রেশ অবজেক্ট
        super_admin = db.query(User).filter(User.email == super_admin_email).first()
        citizen = db.query(User).filter(User.email == citizen_email).first()
        admin1 = db.query(User).filter(User.email == admin1_email).first()

        # ৫. অ্যানালিটিক্স মেট্রিক্স টেস্ট করার জন্য বিভিন্ন স্ট্যাটাসের ডামি আবেদন
        mock_apps = [
            {
                "child": "আরিয়ান আহমেদ",
                "dob": date(2023, 4, 12),
                "gender": "male",
                "father": "জাকির হোসেন",
                "mother": "শিরিন আক্তার",
                "place": "রাজারগাঁও স্বাস্থ্য কমপ্লেক্স",
                "address": "গ্রাম: রামচন্দ্রপুর",
                "status": "pending",
            },
            {
                "child": "ফাতিমা তুজ জোহরা",
                "dob": date(2022, 9, 25),
                "gender": "female",
                "father": "আনোয়ার পারভেজ",
                "mother": "রুমানা বেগম",
                "place": "চাঁদপুর সদর হাসপাতাল",
                "address": "গ্রাম: পশ্চিম রাজারগাঁও",
                "status": "approved",
            },
            {
                "child": "তানভীর হাসান",
                "dob": date(2021, 11, 5),
                "gender": "male",
                "father": "কামাল উদ্দিন",
                "mother": "মমতাজ বেগম",
                "place": "উপজেলা স্বাস্থ্য কমপ্লেক্স",
                "address": "গ্রাম: দক্ষিণ রাজারগাঁও",
                "status": "rejected",
            },
        ]

        for app_data in mock_apps:
            existing_app = (
                db.query(BirthApplication)
                .filter(BirthApplication.child_name == app_data["child"])
                .first()
            )
            if not existing_app:
                track_id = f"GS-B-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"
                app_obj = BirthApplication(
                    tracking_id=track_id,
                    applicant_user_id=citizen.id,
                    union_id=created_unions["RAJ_01"].id,
                    child_name=app_data["child"],
                    birth_date=app_data["dob"],
                    gender=app_data["gender"],
                    father_name=app_data["father"],
                    mother_name=app_data["mother"],
                    birth_place=app_data["place"],
                    address=app_data["address"],
                    status=app_data["status"],
                )
                db.add(app_obj)
                db.commit()
                db.refresh(app_obj)

                # যদি Approved বা Rejected হয়, তবে Audit Log তৈরি
                if app_data["status"] != "pending":
                    audit = AuditLog(
                        application_id=app_obj.id,
                        action_by_user_id=admin1.id,
                        action=app_data["status"],
                        remarks="সীড ডাটা স্বয়ংক্রিয় ভ্যালিডেশন সম্পন্ন।",
                    )
                    db.add(audit)
                    db.commit()

                print(f"  + Application created: {app_data['child']} (Status: {app_data['status']}, Tracking: {track_id})")

        print("✨ Seeding completed successfully!\n")
        print("--- টেস্ট লগইন ক্রেডেনশিয়াল ---")
        print("1. Super Admin:")
        print("   Email: superadmin@gramsheba.gov.bd")
        print("   Password: Admin@123\n")
        print("2. Union Admin:")
        print("   Email: admin.rajar@gramsheba.gov.bd")
        print("   Password: Admin@123\n")
        print("3. Citizen:")
        print("   Email: citizen.sakib@gramsheba.gov.bd")
        print("   Password: Citizen@123\n")

if __name__ == "__main__":
    seed_data()
