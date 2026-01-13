from sqlalchemy import select

try:
    from .database import SessionLocal
    from .models import UserModel
except ImportError:  # pragma: no cover
    from database import SessionLocal  # type: ignore
    from models import UserModel  # type: ignore


DEFAULT_USERS = [
    {"username": "warehouse", "full_name": "Warehouse Worker", "role": "warehouse_worker", "roles": "warehouse_worker"},
    {"username": "lab", "full_name": "Lab Operator", "role": "lab_operator", "roles": "lab_operator"},
    {"username": "action", "full_name": "Action Supervisor", "role": "action_supervision", "roles": "action_supervision"},
    {"username": "admin", "full_name": "Admin User", "role": "admin", "roles": "admin"},
]


def seed_users():
    db = SessionLocal()
    try:
        existing = db.execute(select(UserModel)).scalars().all()
        if existing:
            return
        db.add_all([UserModel(**u) for u in DEFAULT_USERS])
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
