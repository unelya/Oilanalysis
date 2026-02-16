from sqlalchemy import select

try:
    from .database import SessionLocal
    from .models import UserModel, UserMethodPermissionModel
except ImportError:  # pragma: no cover
    from database import SessionLocal  # type: ignore
    from models import UserModel, UserMethodPermissionModel  # type: ignore


DEFAULT_USERS = [
    {"username": "warehouse", "full_name": "Warehouse Worker", "email": "warehouse@labsync.local", "role": "warehouse_worker", "roles": "warehouse_worker"},
    {"username": "lab", "full_name": "Lab Operator", "email": "lab@labsync.local", "role": "lab_operator", "roles": "lab_operator"},
    {"username": "action", "full_name": "Action Supervisor", "email": "action@labsync.local", "role": "action_supervision", "roles": "action_supervision"},
    {"username": "admin", "full_name": "Admin User", "email": "admin@labsync.local", "role": "admin", "roles": "admin"},
]
DEFAULT_METHODS = ["SARA", "IR", "Mass Spectrometry", "Viscosity"]


def seed_users():
    db = SessionLocal()
    try:
        existing_users = db.execute(select(UserModel)).scalars().all()
        if not existing_users:
            db.add_all([UserModel(**u) for u in DEFAULT_USERS])
            db.commit()
            existing_users = db.execute(select(UserModel)).scalars().all()

        existing_permissions = db.execute(select(UserMethodPermissionModel)).scalars().all()
        if not existing_permissions:
            for user in existing_users:
                roles = [part.strip() for part in (user.roles or user.role or "").split(",") if part.strip()]
                if "lab_operator" not in roles:
                    continue
                for method in DEFAULT_METHODS:
                    db.add(UserMethodPermissionModel(user_id=user.id, method_name=method))
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()
