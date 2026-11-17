import os
import random
import secrets
from datetime import date, datetime, timedelta, timezone

from main import (
    AuditLog,
    Base,
    BirthApplication,
    SessionLocal,
    Union,
    User,
    engine,
    password_hash,
)

# ডেটাবেস টেবিল নিশ্চিত করা
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("🌱 GramSheba ডেটাবেসে বাস্তবসম্মত ৫০+ ডামি রেকর্ড তৈরি হচ্ছে...")

# ১. ইউনিয়ন চেক বা স্বয়ংক্রিয় তৈরি
union = db.query(Union).filter(Union.code == "RAMPUR01").first()
if not union:
    union = Union(name="১ নং রামপুর ইউনিয়ন পরিষদ", code="RAMPUR01")
    db.add(union)
    db.commit()
    db.refresh(union)
    print(f"✓ ইউনিয়ন তৈরি হয়েছে: {union.name} (ID: {union.id})")

# ২. ডেমো অ্যাডমিন ইউজার তৈরি
admin = db.query(User).filter(User.email == "admin@gramsheba.gov.bd").first()
if not admin:
    admin = User(
        full_name="ইউপি সচিব (প্রশাসক)",
        email="admin@gramsheba.gov.bd",
        phone="01811223344",
        area="ইউনিয়ন পরিষদ কার্যালয়",
        password_hash=password_hash.hash("Admin@123"),
        role="union_admin",
        union_id=union.id,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print("✓ ডেমো অ্যাডমিন অ্যাকাউন্ট তৈরি হয়েছে: admin@gramsheba.gov.bd (Pass: Admin@123)")

# ৩. ডেমো সিটিজেন ইউজার তৈরি
citizen = db.query(User).filter(User.email == "citizen@gramsheba.gov.bd").first()
if not citizen:
    citizen = User(
        full_name="শাহ মো. সাদমান সাকিব",
        email="citizen@gramsheba.gov.bd",
        phone="01712345678",
        area="রামপুর, ওয়ার্ড নং ০৪",
        password_hash=password_hash.hash("Citizen@123"),
        role="citizen",
        union_id=union.id,
    )
    db.add(citizen)
    db.commit()
    db.refresh(citizen)
    print("✓ ডেমো সিটিজেন অ্যাকাউন্ট তৈরি হয়েছে: citizen@gramsheba.gov.bd (Pass: Citizen@123)")

# ৪. বাস্তবসম্মত নাম ও ঠিকানার পুল
first_names_male = ["তানভীর", "আরিফুল", "মেহেদী", "তাহমিদ", "সাকিব", "রাকিবুল", "নাজমুল", "শামীম"]
first_names_female = ["ফারহানা", "আফরিন", "নুসরাত", "সুমাইয়া", "সাদিয়া", "মীম", "তাসলিমা", "শিরিন"]
last_names = ["হাসান", "ইসলাম", "আক্তার", "জাহান", "হোসেন", "চৌধুরী", "সুলতানা", "খান", "রহমান"]

fathers = [
    "মো. রফিকুল ইসলাম",
    "মো. আব্দুল কাদের",
    "মো. শামসুল হক",
    "মো. দেলোয়ার হোসেন",
    "মো. খোরশেদ আলম",
    "মো. জালাল আহমদ",
]
mothers = [
    "রাবেয়া বেগম",
    "ফাতেমা বেগম",
    "সালেহা খাতুন",
    "আলেয়া বেগম",
    "মোরশেদা পারভীন",
    "মোসা. সালেহা বেগম",
]

hospitals = [
    "চাঁদপুর সদর হাসপাতাল",
    "রামপুর মা ও শিশু কল্যাণ কেন্দ্র",
    "উপজেলা স্বাস্থ্য কমপ্লেক্স",
    "চাঁদপুর সেন্ট্রাল ক্লিনিক",
]

statuses = ["approved", "pending", "rejected"]

# ৫. ৫০টি বাস্তবসম্মত আবেদন ও অডিট ট্রেইল জেনারেশন
created_apps = 0
for i in range(1, 56):
    gender = random.choice(["male", "female"])
    if gender == "male":
        child_name = f"{random.choice(first_names_male)} {random.choice(last_names)}"
    else:
        child_name = f"{random.choice(first_names_female)} {random.choice(last_names)}"

    status = random.choices(statuses, weights=[65, 25, 10])[0]
    
    # এলোমেলো ট্র্যাকিং কোড (অফিসিয়াল ফরম্যাট)
    track_code = f"GS-BIRTH-202611{random.randint(1, 28):02d}-{secrets.token_hex(2).upper()}"
    
    # এলোমেলো জন্ম তারিখ (২০১৬ থেকে ২০২৬ সালের মধ্যে)
    random_year = random.randint(2016, 2026)
    random_month = random.randint(1, 12)
    random_day = random.randint(1, 28)
    b_date = date(random_year, random_month, random_day)

    ward_no = random.randint(1, 9)
    address = f"গ্রাম: রামপুর, ওয়ার্ড নং: ০{ward_no}, ডাকঘর: রামপুর, চাঁদপুর"

    # BirthApplication ইনস্ট্যান্স তৈরি
    app_record = BirthApplication(
        tracking_id=track_code,
        applicant_user_id=citizen.id,
        union_id=union.id,
        child_name=child_name,
        birth_date=b_date,
        gender=gender,
        father_name=random.choice(fathers),
        mother_name=random.choice(mothers),
        birth_place=random.choice(hospitals),
        address=address,
        status=status,
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)

    # সংশ্লিষ্ট অডিট ট্রেইল তৈরি
    remarks_text = (
        "উপযুক্ত কাগজপত্র যাচাইবাছাইপূর্বক চেয়ারম্যান কর্তৃক অনুমোদন ও ডিজিটাল সনদ প্রস্তুত।"
        if status == "approved"
        else "ইউপি সহকারী কর্তৃক প্রাথমিক স্ক্রুটিনি ও ফিল্ড ভেরিফিকেশন চলমান।"
        if status == "pending"
        else "জমাকৃত তথ্যে অসঙ্গতি থাকায় আবেদনটি বাতিল করা হয়েছে।"
    )

    audit = AuditLog(
        application_id=app_record.id,
        action_by_user_id=admin.id if status != "pending" else citizen.id,
        action=status,
        remarks=remarks_text,
    )
    db.add(audit)
    created_apps += 1

db.commit()
db.close()

print(f"\n🎉 সফলভাবে সম্পন্ন হয়েছে!")
print(f"📊 মোট {created_apps} টি আবেদন এবং {created_apps} টি অডিট ট্রেইল ডাটাবেসে ইনসার্ট করা হয়েছে।")
print(f"💡 এখন অ্যাডমিন ড্যাশবোর্ড ও অ্যানালিটিক্স গ্রাফ পূর্ণাঙ্গ দেখাবে।")
