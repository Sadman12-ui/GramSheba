import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import Base, User, Application, AuditLog, DATABASE_URL, hash_password

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("Generating 50+ realistic demo records for GramSheba...")

# Service types and names in Bangla
services = [
    ("citizenship", "নাগরিকত্ব সনদপত্র"),
    ("trade_license", "ব্যবসা ট্রেড লাইসেন্স"),
    ("inheritance", "ওয়ারিশান সনদপত্র"),
    ("character", "চারিত্রিক সনদপত্র")
]

statuses = ["Approved", "Under Review", "Pending", "Rejected"]
names = [
    "তানভীর হাসান", "ফারহানা আক্তার", "মেহেদী হাসান শুভ", "রুবাইয়া জাহান",
    "সাইফুল ইসলাম", "নাজমুল হুদা", "তাসলিমা নাসরিন", "কামরুল হাসান",
    "মারুফ আহমেদ", "আফরোজা সুলতানা", "শামীম রেজা", "নুসরাত জাহান মিম",
    "মো. রফিকুল ইসলাম", "শাহনাজ পারভীন", "আবুল কাশেম", "শিরিন আক্তার"
]

fathers = ["মো. আব্দুল কাদের", "মো. রফিকুল আলম", "মো. সামসুল হক", "মো. খোরশেদ আলম"]

# Check or create default citizen
citizen = db.query(User).filter(User.email == "citizen@gramsheba.gov.bd").first()
if not citizen:
    citizen = User(
        full_name="শাহ মো. সাদমান সাকিব",
        email="citizen@gramsheba.gov.bd",
        password_hash=hash_password("Citizen@123"),
        role="citizen",
        nid="19981324567890123",
        phone="01700000001",
        union_id="union-chandpur-01"
    )
    db.add(citizen)
    db.commit()
    db.refresh(citizen)

# Create 55 sample applications
created_count = 0
for i in range(1, 56):
    srv_code, srv_title = random.choice(services)
    status = random.choices(statuses, weights=[60, 20, 15, 5])[0]
    app_name = random.choice(names)
    father_name = random.choice(fathers)
    track_code = f"GS-2026-{srv_code[:3].upper()}-{1000 + i}"
    days_ago = random.randint(1, 20)
    created_at = datetime.utcnow() - timedelta(days=days_ago)

    app_obj = Application(
        tracking_id=track_code,
        service_type=srv_code,
        applicant_name=app_name,
        applicant_nid=f"19{random.randint(70, 99)}{random.randint(10000000, 99999999)}",
        applicant_phone=f"017{random.randint(10000000, 99999999)}",
        union_id="union-chandpur-01",
        user_id=citizen.id,
        status=status,
        remarks="যাচাইবাছাই সম্পন্ন করে নিয়ম অনুযায়ী সিদ্ধান্ত নেওয়া হয়েছে।" if status == "Approved" else "অফিসার দ্বারা প্রাথমিক যাচাই চলছে।" if status == "Under Review" else None,
        created_at=created_at
    )
    db.add(app_obj)

    # Add Audit log
    audit = AuditLog(
        action=f"APPLICATION_{status.upper()}",
        performed_by="admin@gramsheba.gov.bd" if status != "Pending" else citizen.email,
        details=f"Application {track_code} changed to {status}",
        union_id="union-chandpur-01",
        created_at=created_at + timedelta(hours=random.randint(2, 12))
    )
    db.add(audit)
    created_count += 1

db.commit()
print(f"Successfully generated {created_count} realistic records with audit trails!")
db.close()
