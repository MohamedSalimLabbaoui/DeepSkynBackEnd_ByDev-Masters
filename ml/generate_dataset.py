"""
DeepSkyn - Realistic User Dataset Generator
=============================================
Generates a CSV dataset simulating 6 months of real user behavior
on the DeepSkyn skincare platform (August 2025 → February 2026).

Users are segmented into realistic behavioral cohorts:
  - Power users (skincare addicts)
  - Regular users (consistent routine followers)
  - Casual users (check in occasionally)
  - New users (recently joined, exploring)
  - Declining users (were active, losing interest)
  - Ghost users (signed up, barely used)
  - Seasonal users (active during specific periods)
  - Re-engaged users (came back after inactivity)

Output: ml/data/deepskyn_users_6months.csv

"""

import os
import csv
import random
import uuid
import math
from datetime import datetime, timedelta

random.seed(42)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_FILE = os.path.join(DATA_DIR, "deepskyn_users_6months.csv")

# Simulation window
SIM_START = datetime(2025, 8, 1)
SIM_END = datetime(2026, 2, 11)
TOTAL_DAYS = (SIM_END - SIM_START).days  # ~195 days

FIRST_NAMES_F = [
    "Amina", "Fatima", "Yasmine", "Nour", "Sara", "Leila", "Hiba", "Meryem",
    "Aya", "Lina", "Rania", "Salma", "Imane", "Khadija", "Zineb", "Hajar",
    "Sofia", "Rim", "Dounia", "Samia", "Nawal", "Houda", "Chaimae", "Siham",
    "Asmae", "Wiam", "Ilham", "Ghita", "Loubna", "Hanane", "Malika", "Basma",
    "Lamia", "Soukaina", "Mariam", "Ikram", "Kawtar", "Oumaima", "Hibatallah",
    "Maha", "Nadia", "Rachida", "Sabah", "Soumaya", "Jamila", "Najat",
    "Aicha", "Btissam", "Fadwa", "Karima",
]
FIRST_NAMES_M = [
    "Youssef", "Adam", "Amine", "Omar", "Mohamed", "Hamza", "Mehdi", "Ayoub",
    "Zakaria", "Walid", "Karim", "Reda", "Bilal", "Saad", "Othmane", "Ilyas",
    "Taha", "Ismail", "Adil", "Rachid", "Nabil", "Mouad", "Badr", "Soufiane",
    "Younes", "Anas", "Hicham", "Abdelkader", "Driss", "Khalid", "Jamal",
    "Tarik", "Fouad", "Brahim", "Sami", "Faycal", "Mounir", "Said", "Aziz",
    "Hassan",
]
LAST_NAMES = [
    "Benali", "El Amrani", "Tazi", "Idrissi", "Fassi", "Berrada", "Alaoui",
    "Chraibi", "Bennani", "El Mansouri", "Lahlou", "Sqalli", "Benjelloun",
    "Ziani", "Bouzid", "Kabbaj", "El Ouafi", "Tahiri", "Mouline", "Cherkaoui",
    "Naciri", "El Harti", "Bouazza", "Filali", "Kettani", "Sefrioui", "Raiss",
    "Hakimi", "Amzil", "Ouazzani", "Belkadi", "Sbai", "Meziane", "Raji",
    "Toumi", "Guessous", "Kadiri", "El Fassi", "Benkirane", "Lamrani",
]

SKIN_TYPES = ["dry", "oily", "combination", "normal", "sensitive"]
GENDERS = ["female", "male", "non-binary"]
GENDER_WEIGHTS = [0.72, 0.24, 0.04]  # Skincare app skews female
CITIES = [
    "Casablanca", "Rabat", "Marrakech", "Fès", "Tanger", "Agadir", "Meknès",
    "Oujda", "Kénitra", "Tétouan", "Paris", "Lyon", "Marseille", "Bruxelles",
    "Montréal", "Tunis", "Alger", "Dakar", "Abidjan", "Dubai",
]
PLANS = ["free", "free", "free", "free", "premium_monthly", "premium_yearly"]
SIGNUP_SOURCES = ["organic", "organic", "google_ads", "instagram", "tiktok", "referral", "facebook", "influencer"]


def random_name(gender: str) -> str:
    if gender == "male":
        first = random.choice(FIRST_NAMES_M)
    else:
        first = random.choice(FIRST_NAMES_F)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"


def random_email(name: str, idx: int) -> str:
    clean = name.lower().replace(" ", ".").replace("'", "")
    domains = ["gmail.com", "gmail.com", "outlook.com", "yahoo.fr", "hotmail.com", "icloud.com"]
    return f"{clean}{idx}@{random.choice(domains)}"


def random_date_between(start: datetime, end: datetime) -> datetime:
    delta = end - start
    random_seconds = random.randint(0, int(delta.total_seconds()))
    return start + timedelta(seconds=random_seconds)


# ============================================================
# USER BEHAVIOR COHORTS
# ============================================================

def generate_power_user(signup_date: datetime) -> dict:
    """Skincare addicts - very high engagement, daily usage"""
    days_active = (SIM_END - signup_date).days
    sessions = random.randint(int(days_active * 0.7), int(days_active * 1.2))
    interactions = random.randint(sessions * 3, sessions * 8)
    last_activity = SIM_END - timedelta(days=random.randint(0, 2))
    return {
        "sessionCount": max(sessions, 50),
        "interactionCount": max(interactions, 200),
        "lastActivity": last_activity,
        "churned": 0,
    }


def generate_regular_user(signup_date: datetime) -> dict:
    """Consistent routine followers - moderate, steady engagement"""
    days_active = (SIM_END - signup_date).days
    sessions_per_week = random.uniform(3, 6)
    sessions = int((days_active / 7) * sessions_per_week)
    interactions = random.randint(sessions * 2, sessions * 5)
    last_activity = SIM_END - timedelta(days=random.randint(0, 7))
    return {
        "sessionCount": max(sessions, 15),
        "interactionCount": max(interactions, 40),
        "lastActivity": last_activity,
        "churned": 0,
    }


def generate_casual_user(signup_date: datetime) -> dict:
    """Check in occasionally - low but present engagement"""
    days_active = (SIM_END - signup_date).days
    sessions_per_week = random.uniform(0.5, 2)
    sessions = int((days_active / 7) * sessions_per_week)
    interactions = random.randint(sessions * 1, sessions * 3)
    last_activity = SIM_END - timedelta(days=random.randint(3, 21))
    churned = 1 if random.random() < 0.25 else 0
    return {
        "sessionCount": max(sessions, 4),
        "interactionCount": max(interactions, 8),
        "lastActivity": last_activity,
        "churned": churned,
    }


def generate_new_user(signup_date: datetime) -> dict:
    """Recently joined, exploring the app"""
    days_since_signup = (SIM_END - signup_date).days
    # Burst of activity then leveling off
    sessions = random.randint(3, int(days_since_signup * 0.8) + 5)
    interactions = random.randint(sessions * 2, sessions * 6)
    last_activity = SIM_END - timedelta(days=random.randint(0, min(days_since_signup, 10)))
    churned = 1 if random.random() < 0.15 else 0
    return {
        "sessionCount": max(sessions, 2),
        "interactionCount": max(interactions, 5),
        "lastActivity": last_activity,
        "churned": churned,
    }


def generate_declining_user(signup_date: datetime) -> dict:
    """Were active, losing interest - key churn candidates"""
    days_active = (SIM_END - signup_date).days
    # Had decent sessions early
    peak_sessions = random.randint(20, 60)
    # But tapered off
    recent_sessions = random.randint(0, 5)
    sessions = peak_sessions + recent_sessions
    interactions = random.randint(sessions, sessions * 3)
    # Last seen a while ago
    last_activity = SIM_END - timedelta(days=random.randint(20, 90))
    churned = 1 if random.random() < 0.70 else 0
    return {
        "sessionCount": sessions,
        "interactionCount": interactions,
        "lastActivity": last_activity,
        "churned": churned,
    }


def generate_ghost_user(signup_date: datetime) -> dict:
    """Signed up but barely used the app"""
    sessions = random.randint(0, 3)
    interactions = random.randint(0, sessions * 2 + 1)
    # Last seen shortly after signup or never
    days_after_signup = random.randint(0, 7)
    last_activity = signup_date + timedelta(days=days_after_signup) if sessions > 0 else None
    return {
        "sessionCount": sessions,
        "interactionCount": interactions,
        "lastActivity": last_activity,
        "churned": 1 if random.random() < 0.90 else 0,
    }


def generate_seasonal_user(signup_date: datetime) -> dict:
    """Active during specific periods (summer, holidays)"""
    days_active = (SIM_END - signup_date).days
    # Burst in Aug-Sep and Dec-Jan
    sessions = random.randint(15, 45)
    interactions = random.randint(sessions * 2, sessions * 5)
    # May or may not be active now (Feb)
    if random.random() < 0.4:
        last_activity = SIM_END - timedelta(days=random.randint(0, 10))
        churned = 0
    else:
        last_activity = SIM_END - timedelta(days=random.randint(30, 70))
        churned = 1 if random.random() < 0.50 else 0
    return {
        "sessionCount": sessions,
        "interactionCount": interactions,
        "lastActivity": last_activity,
        "churned": churned,
    }


def generate_reengaged_user(signup_date: datetime) -> dict:
    """Came back after a period of inactivity"""
    sessions = random.randint(12, 40)
    interactions = random.randint(sessions * 2, sessions * 5)
    # Recently came back
    last_activity = SIM_END - timedelta(days=random.randint(0, 5))
    return {
        "sessionCount": sessions,
        "interactionCount": interactions,
        "lastActivity": last_activity,
        "churned": 0,
    }


# ============================================================
# MAIN GENERATOR
# ============================================================

COHORT_DISTRIBUTION = [
    ("power_user",    0.06, generate_power_user),
    ("regular_user",  0.18, generate_regular_user),
    ("casual_user",   0.20, generate_casual_user),
    ("new_user",      0.14, generate_new_user),
    ("declining_user",0.17, generate_declining_user),
    ("ghost_user",    0.13, generate_ghost_user),
    ("seasonal_user", 0.08, generate_seasonal_user),
    ("reengaged_user",0.04, generate_reengaged_user),
]


def generate_dataset(n_users: int = 2500) -> list[dict]:
    print(f"Generating {n_users} users across {len(COHORT_DISTRIBUTION)} cohorts...")

    users = []
    user_idx = 0

    for cohort_name, ratio, generator_fn in COHORT_DISTRIBUTION:
        count = int(n_users * ratio)
        print(f"  {cohort_name:20s}: {count} users ({ratio:.0%})")

        for _ in range(count):
            user_idx += 1

            gender = random.choices(GENDERS, GENDER_WEIGHTS)[0]
            name = random_name(gender)
            email = random_email(name, user_idx)

            # Signup date distribution depends on cohort
            if cohort_name == "new_user":
                signup_date = random_date_between(
                    SIM_END - timedelta(days=30), SIM_END - timedelta(days=2)
                )
            elif cohort_name == "ghost_user":
                signup_date = random_date_between(SIM_START, SIM_END - timedelta(days=14))
            else:
                signup_date = random_date_between(SIM_START, SIM_END - timedelta(days=30))

            behavior = generator_fn(signup_date)
            account_age_days = (SIM_END - signup_date).days

            days_since_last = (
                (SIM_END - behavior["lastActivity"]).days
                if behavior["lastActivity"]
                else account_age_days
            )

            user = {
                "userId": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "gender": gender,
                "age": random.randint(16, 55),
                "city": random.choice(CITIES),
                "skinType": random.choice(SKIN_TYPES),
                "plan": random.choice(PLANS),
                "signupSource": random.choice(SIGNUP_SOURCES),
                "signupDate": signup_date.strftime("%Y-%m-%d"),
                "lastActivity": behavior["lastActivity"].strftime("%Y-%m-%d") if behavior["lastActivity"] else "",
                "accountAgeDays": account_age_days,
                "daysSinceLastActivity": days_since_last,
                "sessionCount": behavior["sessionCount"],
                "interactionCount": behavior["interactionCount"],
                "analysisCount": max(0, behavior["sessionCount"] // random.randint(3, 8)),
                "routineUpdates": max(0, random.randint(0, behavior["sessionCount"] // 4)),
                "chatMessages": max(0, random.randint(0, behavior["interactionCount"] // 5)),
                "postsCreated": max(0, random.randint(0, behavior["interactionCount"] // 15)),
                "likesGiven": max(0, random.randint(0, behavior["interactionCount"] // 4)),
                "commentsGiven": max(0, random.randint(0, behavior["interactionCount"] // 8)),
                "cohort": cohort_name,
                "churned": behavior["churned"],
            }
            users.append(user)

    # Shuffle
    random.shuffle(users)
    return users


def write_csv(users: list[dict], filepath: str):
    if not users:
        return
    fieldnames = list(users[0].keys())
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(users)
    print(f"\n✓ Dataset saved to {filepath}")
    print(f"  Total rows: {len(users)}")


def print_stats(users: list[dict]):
    total = len(users)
    churned = sum(1 for u in users if u["churned"] == 1)
    active = total - churned

    print(f"\n{'='*50}")
    print(f"  DATASET STATISTICS")
    print(f"{'='*50}")
    print(f"  Total users:    {total}")
    print(f"  Active:         {active} ({active/total:.1%})")
    print(f"  Churned:        {churned} ({churned/total:.1%})")

    # Per cohort
    from collections import Counter
    cohorts = Counter(u["cohort"] for u in users)
    churn_by_cohort = {}
    for u in users:
        c = u["cohort"]
        if c not in churn_by_cohort:
            churn_by_cohort[c] = {"total": 0, "churned": 0}
        churn_by_cohort[c]["total"] += 1
        churn_by_cohort[c]["churned"] += u["churned"]

    print(f"\n  {'Cohort':<20s} {'Count':<8s} {'Churn Rate'}")
    print(f"  {'─'*45}")
    for cohort, counts in sorted(churn_by_cohort.items()):
        rate = counts["churned"] / counts["total"] if counts["total"] > 0 else 0
        print(f"  {cohort:<20s} {counts['total']:<8d} {rate:.1%}")

    # Feature ranges
    print(f"\n  Feature Ranges:")
    for feat in ["interactionCount", "sessionCount", "daysSinceLastActivity", "accountAgeDays"]:
        vals = [u[feat] for u in users]
        print(f"    {feat:<30s} min={min(vals):<6d} max={max(vals):<6d} avg={sum(vals)/len(vals):.1f}")


if __name__ == "__main__":
    print("=" * 50)
    print("  DeepSkyn - User Dataset Generator")
    print("  Period: Aug 2025 → Feb 2026 (6 months)")
    print("=" * 50 + "\n")

    users = generate_dataset(2500)
    write_csv(users, OUTPUT_FILE)
    print_stats(users)
    print(f"\n{'='*50}")
    print("  Done!")
    print(f"{'='*50}")
