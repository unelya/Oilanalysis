from sqlalchemy import select

try:
    from .database import SessionLocal
    from .models import UserModel, UserMethodPermissionModel
    from .security import hash_password
except ImportError:  # pragma: no cover
    from database import SessionLocal  # type: ignore
    from models import UserModel, UserMethodPermissionModel  # type: ignore
    from security import hash_password  # type: ignore


DEFAULT_USERS = [
    {"username": "admin", "full_name": "Admin User", "email": "admin@labsync.local", "role": "admin", "roles": "admin"},
]
DEFAULT_METHODS = ["SARA", "IR", "Mass Spectrometry", "Viscosity"]
DEFAULT_USER_PASSWORD = "Tatneft123"


def seed_users(*, bootstrap_admin_password: str = "admin"):
    db = SessionLocal()
    try:
        existing_by_username = {
            user.username: user for user in db.execute(select(UserModel)).scalars().all()
        }

        for payload in DEFAULT_USERS:
            username = payload["username"]
            user = existing_by_username.get(username)
            seed_password = bootstrap_admin_password if username == "admin" else DEFAULT_USER_PASSWORD
            if user is None:
                user = UserModel(
                    **payload,
                    password_hash=hash_password(seed_password),
                    must_change_password=True,
                    is_active=True,
                )
                db.add(user)
                db.flush()
                existing_by_username[username] = user
            elif not (user.password_hash or "").strip():
                user.password_hash = hash_password(seed_password)
                user.must_change_password = True
                user.is_active = True
                db.add(user)
        for user in existing_by_username.values():
            if (user.password_hash or "").strip():
                continue
            seed_password = bootstrap_admin_password if user.username == "admin" else DEFAULT_USER_PASSWORD
            user.password_hash = hash_password(seed_password)
            user.must_change_password = True
            user.is_active = True
            db.add(user)
        db.commit()

        existing_users = list(existing_by_username.values())

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
