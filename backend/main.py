import os
from datetime import datetime, timezone
import re
import secrets
import smtplib
from email.message import EmailMessage

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, distinct, delete
from sqlalchemy.orm import Session

# Support running as a module or script
try:
    from .database import Base, engine, get_db
    from .models import ActionBatchModel, ActionBatchStatus, AuditLogModel, ConflictModel, ConflictStatus, FilterMethodModel, SampleModel, SampleStatus, PlannedAnalysisModel, PlannedAnalysisAssigneeModel, AnalysisStatus, UserModel, UserMethodPermissionModel, PasswordResetTokenModel
    from .schemas import ActionBatchCreate, ActionBatchOut, AuditEventOut, ConflictCreate, ConflictOut, ConflictUpdate, FilterMethodsOut, FilterMethodsUpdate, PlannedAnalysisCreate, PlannedAnalysisOut, PlannedAnalysisUpdate, UserOut, UserCreate, UserCreateOut, UserUpdate
    from .seed import seed_users
    from .security import hash_password, verify_password, hash_token
except ImportError:  # pragma: no cover - fallback for script execution
  from database import Base, engine, get_db  # type: ignore
  from models import ActionBatchModel, ActionBatchStatus, AuditLogModel, ConflictModel, ConflictStatus, FilterMethodModel, SampleModel, SampleStatus, PlannedAnalysisModel, PlannedAnalysisAssigneeModel, AnalysisStatus, UserModel, UserMethodPermissionModel, PasswordResetTokenModel  # type: ignore
  from schemas import ActionBatchCreate, ActionBatchOut, AuditEventOut, ConflictCreate, ConflictOut, ConflictUpdate, FilterMethodsOut, FilterMethodsUpdate, PlannedAnalysisCreate, PlannedAnalysisOut, PlannedAnalysisUpdate, UserOut, UserCreate, UserCreateOut, UserUpdate  # type: ignore
  from seed import seed_users  # type: ignore
  from security import hash_password, verify_password, hash_token  # type: ignore

app = FastAPI(title="LabSync backend", version="0.1.0")

DEFAULT_PASSWORD = "Tatneft123"
DEFAULT_METHOD_PERMISSIONS = ["SARA", "IR", "Mass Spectrometry", "Viscosity"]
APP_ENV = (os.getenv("APP_ENV") or "development").strip().lower()
IS_PRODUCTION = APP_ENV in {"prod", "production"}
BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin")
PASSWORD_RESET_TTL_MINUTES = int(os.getenv("PASSWORD_RESET_TTL_MINUTES", "30"))
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@labsync.local").strip()
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://127.0.0.1:8080").strip()

if IS_PRODUCTION and BOOTSTRAP_ADMIN_PASSWORD == "admin":
  raise RuntimeError("Set BOOTSTRAP_ADMIN_PASSWORD in production; default 'admin' is blocked.")

Base.metadata.create_all(bind=engine)
seed_users(bootstrap_admin_password=BOOTSTRAP_ADMIN_PASSWORD)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


class LoginRequest(BaseModel):
  username: str
  password: str
  full_name: str | None = None


class LoginResponse(BaseModel):
  token: str
  role: str
  roles: list[str]
  full_name: str
  must_change_password: bool


class ChangePasswordRequest(BaseModel):
  current_password: str
  new_password: str


class RequestPasswordResetRequest(BaseModel):
  username: str
  email: str


class RequestPasswordResetResponse(BaseModel):
  message: str
  reset_token: str | None = None


class ConfirmPasswordResetRequest(BaseModel):
  token: str
  new_password: str


def get_user_from_authorization(authorization: str | None, db: Session) -> tuple[UserModel, str]:
  if not authorization or not authorization.lower().startswith("bearer "):
    raise HTTPException(status_code=401, detail="Unauthorized")
  token = authorization.split(" ", 1)[1]
  user_id = token.split("-", 1)[1] if token.startswith("fake-") else token
  try:
    user_id_int = int(user_id)
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid token")
  user = db.get(UserModel, user_id_int)
  if not user:
    raise HTTPException(status_code=401, detail="Invalid token")
  return user, token


def send_password_reset_email(email: str, token: str):
  if not SMTP_HOST:
    return
  reset_link = f"{FRONTEND_BASE_URL}/login?resetToken={token}"
  message = EmailMessage()
  message["Subject"] = "LabSync password reset"
  message["From"] = SMTP_FROM
  message["To"] = email
  message.set_content(
    "Use the following token to reset your password:\n"
    f"{token}\n\n"
    "Or open this link:\n"
    f"{reset_link}\n\n"
    f"Token expires in {PASSWORD_RESET_TTL_MINUTES} minutes."
  )
  with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
    smtp.starttls()
    if SMTP_USER and SMTP_PASSWORD:
      smtp.login(SMTP_USER, SMTP_PASSWORD)
    smtp.send_message(message)


@app.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)):
  username = payload.username.strip()
  if not username:
    raise HTTPException(status_code=401, detail="Invalid username or password")
  user = db.execute(select(UserModel).where(UserModel.username == username)).scalars().first()
  if not user or not verify_password(payload.password, user.password_hash) or not user.is_active:
    raise HTTPException(status_code=401, detail="Invalid username or password")
  token = f"fake-{user.id}"
  roles = parse_roles(user.roles)
  return LoginResponse(
    token=token,
    role=roles[0] if roles else user.role,
    roles=roles,
    full_name=user.full_name,
    must_change_password=bool(user.must_change_password),
  )


@app.post("/auth/request-password-reset", response_model=RequestPasswordResetResponse)
async def request_password_reset(payload: RequestPasswordResetRequest, db: Session = Depends(get_db)):
  username = (payload.username or "").strip()
  email = (payload.email or "").strip().lower()
  if not username:
    raise HTTPException(status_code=400, detail="Username is required")
  if not email:
    raise HTTPException(status_code=400, detail="Email is required")
  user = db.execute(
    select(UserModel).where(UserModel.username == username, UserModel.email == email)
  ).scalars().first()
  if user is None:
    return RequestPasswordResetResponse(message="If that email exists, a reset email has been sent.")
  if not user.is_active:
    return RequestPasswordResetResponse(message="If that email exists, a reset email has been sent.")
  now_iso = datetime.now(timezone.utc).isoformat()
  db.execute(
    delete(PasswordResetTokenModel).where(
      PasswordResetTokenModel.user_id == user.id,
      PasswordResetTokenModel.used_at.is_(None),
    )
  )
  raw_token = secrets.token_urlsafe(32)
  expires_at = datetime.now(timezone.utc).timestamp() + PASSWORD_RESET_TTL_MINUTES * 60
  expires_iso = datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat()
  db.add(
    PasswordResetTokenModel(
      user_id=user.id,
      token_hash=hash_token(raw_token),
      requested_at=now_iso,
      expires_at=expires_iso,
      used_at=None,
    )
  )
  db.commit()
  try:
    send_password_reset_email(email, raw_token)
  except Exception:
    # Do not leak transport details to clients.
    pass
  log_audit(
    db,
    entity_type="user",
    entity_id=str(user.id),
    action="password_reset_requested",
    performed_by=user.username,
    details=f"username={username};email={email}",
  )
  # In development, expose token in response for testing without SMTP.
  dev_token = raw_token if not IS_PRODUCTION and not SMTP_HOST else None
  return RequestPasswordResetResponse(
    message="If that email exists, a reset email has been sent.",
    reset_token=dev_token,
  )


@app.post("/auth/confirm-password-reset", response_model=LoginResponse)
async def confirm_password_reset(payload: ConfirmPasswordResetRequest, db: Session = Depends(get_db)):
  token = (payload.token or "").strip()
  if not token:
    raise HTTPException(status_code=400, detail="Reset token is required")
  new_password = (payload.new_password or "").strip()
  if len(new_password) < 8:
    raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
  now_iso = datetime.now(timezone.utc).isoformat()
  hashed = hash_token(token)
  reset_row = db.execute(
    select(PasswordResetTokenModel).where(PasswordResetTokenModel.token_hash == hashed)
  ).scalars().first()
  if not reset_row or reset_row.used_at is not None:
    raise HTTPException(status_code=400, detail="Invalid reset token")
  try:
    expires_at_dt = datetime.fromisoformat(reset_row.expires_at)
  except Exception:
    raise HTTPException(status_code=400, detail="Reset token is invalid")
  if expires_at_dt <= datetime.now(timezone.utc):
    raise HTTPException(status_code=400, detail="Reset token expired")
  user = db.get(UserModel, reset_row.user_id)
  if not user or not user.is_active:
    raise HTTPException(status_code=400, detail="Reset token is invalid")
  if verify_password(new_password, user.password_hash):
    raise HTTPException(status_code=400, detail="New password must be different")
  user.password_hash = hash_password(new_password)
  user.must_change_password = False
  user.password_changed_at = now_iso
  reset_row.used_at = now_iso
  db.execute(
    delete(PasswordResetTokenModel).where(
      PasswordResetTokenModel.user_id == user.id,
      PasswordResetTokenModel.id != reset_row.id,
    )
  )
  db.add(user)
  db.add(reset_row)
  db.commit()
  db.refresh(user)
  log_audit(
    db,
    entity_type="user",
    entity_id=str(user.id),
    action="password_reset_completed",
    performed_by=user.username,
    details="email_flow",
  )
  token_out = f"fake-{user.id}"
  roles = parse_roles(user.roles)
  return LoginResponse(
    token=token_out,
    role=roles[0] if roles else user.role,
    roles=roles,
    full_name=user.full_name,
    must_change_password=bool(user.must_change_password),
  )


@app.get("/auth/me", response_model=LoginResponse)
async def me(request: Request, db: Session = Depends(get_db)):
  user, token = get_user_from_authorization(request.headers.get("authorization"), db)
  roles = parse_roles(user.roles)
  return LoginResponse(
    token=token,
    role=roles[0] if roles else user.role,
    roles=roles,
    full_name=user.full_name,
    must_change_password=bool(user.must_change_password),
  )


@app.post("/auth/change-password", response_model=LoginResponse)
async def change_password(payload: ChangePasswordRequest, request: Request, db: Session = Depends(get_db)):
  user, token = get_user_from_authorization(request.headers.get("authorization"), db)
  if not verify_password(payload.current_password, user.password_hash):
    raise HTTPException(status_code=401, detail="Current password is invalid")
  new_password = (payload.new_password or "").strip()
  if len(new_password) < 8:
    raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
  if payload.current_password == new_password:
    raise HTTPException(status_code=400, detail="New password must be different")
  user.password_hash = hash_password(new_password)
  user.must_change_password = False
  user.password_changed_at = datetime.now(timezone.utc).isoformat()
  db.add(user)
  db.commit()
  db.refresh(user)
  log_audit(
    db,
    entity_type="user",
    entity_id=str(user.id),
    action="password_changed",
    performed_by=user.username,
    details="self_service",
  )
  roles = parse_roles(user.roles)
  return LoginResponse(
    token=token,
    role=roles[0] if roles else user.role,
    roles=roles,
    full_name=user.full_name,
    must_change_password=bool(user.must_change_password),
  )


class Sample(BaseModel):
  sample_id: str
  well_id: str
  horizon: str
  sampling_date: str
  status: str = "new"
  storage_location: str | None = None
  assigned_to: str | None = None


class SamplePurgeRequest(BaseModel):
  sample_ids: list[str]


@app.get("/samples")
async def list_samples(status: str | None = None, db: Session = Depends(get_db)):
  stmt = select(SampleModel)
  if status:
    stmt = stmt.where(SampleModel.status == SampleStatus(status))
  rows = db.execute(stmt).scalars().all()
  return [to_sample_out(r) for r in rows]


@app.get("/samples/{sample_id}")
async def get_sample(sample_id: str, db: Session = Depends(get_db)):
  row = db.get(SampleModel, sample_id)
  if not row:
    raise HTTPException(status_code=404, detail="Sample not found")
  return to_sample_out(row)


@app.delete("/samples/{sample_id}")
async def delete_sample(sample_id: str, db: Session = Depends(get_db)):
  row = db.get(SampleModel, sample_id)
  if not row:
    raise HTTPException(status_code=404, detail="Sample not found")
  db.delete(row)
  db.commit()
  return {"deleted": True}


@app.post("/samples", status_code=201)
async def create_sample(sample: Sample, db: Session = Depends(get_db)):
  existing = db.get(SampleModel, sample.sample_id)
  if existing:
    raise HTTPException(status_code=400, detail="Sample exists")
  row = SampleModel(
    sample_id=sample.sample_id,
    well_id=sample.well_id,
    horizon=sample.horizon,
    sampling_date=sample.sampling_date,
    status=SampleStatus(sample.status),
    storage_location=sample.storage_location,
    assigned_to=sample.assigned_to,
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  return to_sample_out(row)


@app.patch("/samples/{sample_id}")
async def update_sample(sample_id: str, payload: dict, request: Request, db: Session = Depends(get_db)):
  row = db.get(SampleModel, sample_id)
  if not row:
    raise HTTPException(status_code=404, detail="Sample not found")
  old_values = {
    "well_id": row.well_id,
    "horizon": row.horizon,
    "sampling_date": row.sampling_date,
    "status": row.status.value,
    "storage_location": row.storage_location or "",
    "assigned_to": row.assigned_to or "",
  }
  old_status = row.status.value
  for key, value in payload.items():
    if key == "status":
      setattr(row, key, SampleStatus(value))
    elif key == "assigned_to":
      setattr(row, key, value)
    elif hasattr(row, key):
      setattr(row, key, value)
  db.add(row)
  db.commit()
  db.refresh(row)
  actor = request.headers.get("x-user")
  new_values = {
    "well_id": row.well_id,
    "horizon": row.horizon,
    "sampling_date": row.sampling_date,
    "status": row.status.value,
    "storage_location": row.storage_location or "",
    "assigned_to": row.assigned_to or "",
  }
  if "status" in payload and old_status != row.status.value:
    log_audit(
      db,
      entity_type="sample",
      entity_id=sample_id,
      action="status_change",
      performed_by=actor,
      details=f"status:{old_status}->{row.status.value}",
    )
  detail_parts: list[str] = []
  for key in ("well_id", "horizon", "sampling_date", "storage_location", "assigned_to"):
    if key not in payload:
      continue
    if old_values[key] != new_values[key]:
      detail_parts.append(f"{key}:{old_values[key]}->{new_values[key]}")
  if detail_parts:
    log_audit(
      db,
      entity_type="sample",
      entity_id=sample_id,
      action="updated",
      performed_by=actor,
      details=";".join(detail_parts),
    )
  return to_sample_out(row)


@app.delete("/admin/samples")
async def delete_samples(payload: SamplePurgeRequest, request: Request, db: Session = Depends(get_db)):
  roles_header = (request.headers.get("x-roles") or "").lower()
  role_header = (request.headers.get("x-role") or "").lower()
  is_admin = "admin" in roles_header.split(",") or role_header == "admin"
  if not is_admin:
    raise HTTPException(status_code=403, detail="Admin only")
  sample_ids = [sid.strip() for sid in payload.sample_ids if sid.strip()]
  if not sample_ids:
    raise HTTPException(status_code=400, detail="Sample IDs required")
  deleted = (
    db.query(SampleModel)
    .filter(SampleModel.sample_id.in_(sample_ids))
    .delete(synchronize_session=False)
  )
  db.commit()
  actor = request.headers.get("x-user")
  for sid in sample_ids:
    log_audit(db, entity_type="sample", entity_id=sid, action="delete", performed_by=actor)
  return {"deleted": deleted}


def to_sample_out(row: SampleModel):
  return Sample(
    sample_id=row.sample_id,
    well_id=row.well_id,
    horizon=row.horizon,
    sampling_date=row.sampling_date,
    status=row.status.value,
    storage_location=row.storage_location,
    assigned_to=row.assigned_to,
  )

def normalize_assignees(value: list[str] | str | None) -> list[str]:
  if value is None:
    return []
  if isinstance(value, str):
    items = re.split(r"[;,]+", value)
  else:
    items = value
  cleaned: list[str] = []
  for item in items:
    name = (item or "").strip()
    if not name:
      continue
    if name not in cleaned:
      cleaned.append(name)
  return cleaned

def normalize_methods(value: list[str] | None) -> list[str]:
  cleaned: list[str] = []
  for item in value or []:
    name = (item or "").strip()
    if not name:
      continue
    if name not in cleaned:
      cleaned.append(name)
  return cleaned


def normalize_method_key(name: str | None) -> str:
  return (name or "").strip().lower()


def get_user_method_permissions(db: Session, user_id: int) -> list[str]:
  rows = db.execute(
    select(UserMethodPermissionModel.method_name).where(UserMethodPermissionModel.user_id == user_id)
  ).all()
  methods = [r[0] for r in rows if r and r[0]]
  return normalize_methods(methods)


def set_user_method_permissions(db: Session, user_id: int, methods: list[str]):
  db.execute(delete(UserMethodPermissionModel).where(UserMethodPermissionModel.user_id == user_id))
  for method in normalize_methods(methods):
    db.add(UserMethodPermissionModel(user_id=user_id, method_name=method))

def is_admin_from_headers(request: Request) -> bool:
  roles_header = (request.headers.get("x-roles") or "").lower()
  role_header = (request.headers.get("x-role") or "").lower()
  return "admin" in roles_header.split(",") or role_header == "admin"

def get_assignees(db: Session, analysis_id: int, fallback: str | None = None) -> list[str]:
  rows = db.execute(
    select(PlannedAnalysisAssigneeModel.assignee).where(
      PlannedAnalysisAssigneeModel.analysis_id == analysis_id
    )
  ).all()
  assignees = [r[0] for r in rows if r and r[0]]
  if assignees:
    return assignees
  if fallback and fallback.strip():
    return normalize_assignees(fallback)
  return []


@app.get("/planned-analyses")
async def list_planned_analyses(status: str | None = None, db: Session = Depends(get_db)):
  stmt = select(PlannedAnalysisModel)
  if status:
    stmt = stmt.where(PlannedAnalysisModel.status == AnalysisStatus(status))
  rows = db.execute(stmt).scalars().all()
  return [to_planned_out(r, db) for r in rows]


@app.post("/planned-analyses", response_model=PlannedAnalysisOut, status_code=201)
async def create_planned_analysis(payload: PlannedAnalysisCreate, request: Request, db: Session = Depends(get_db)):
  default_allowed = {"SARA", "IR", "Mass Spectrometry", "Viscosity"}
  is_admin = is_admin_from_headers(request)
  name = payload.analysis_type.strip()
  if not name:
    raise HTTPException(status_code=400, detail="Analysis type required")
  if not is_admin and name not in default_allowed:
    raise HTTPException(status_code=403, detail="Only these analysis types are allowed: SARA, IR, Mass Spectrometry, Viscosity")
  assignees = normalize_assignees(payload.assigned_to)
  method_key = normalize_method_key(name)
  for assignee in assignees:
    assignee_user = find_user_by_identity(db, assignee)
    if assignee_user is None:
      raise HTTPException(status_code=400, detail="Assignee user not found")
    if not has_role(assignee_user, "lab_operator"):
      raise HTTPException(status_code=400, detail="Assignee must have lab operator role")
    allowed_methods = {normalize_method_key(method_name) for method_name in get_user_method_permissions(db, assignee_user.id)}
    if method_key not in allowed_methods:
      raise HTTPException(status_code=400, detail=f"{assignee_user.full_name} is not allowed for {name}")
  row = PlannedAnalysisModel(
    sample_id=payload.sample_id,
    analysis_type=name,
    assigned_to=None,
    status=AnalysisStatus.planned,
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  for assignee in assignees:
    db.add(PlannedAnalysisAssigneeModel(analysis_id=row.id, assignee=assignee))
  if assignees:
    row.assigned_to = assignees[0]
    db.add(row)
  db.commit()
  db.refresh(row)
  actor = request.headers.get("x-user")
  log_audit(
    db,
    entity_type="planned_analysis",
    entity_id=str(row.id),
    action="created",
    performed_by=actor,
    details=f"sample={row.sample_id};method={row.analysis_type};assignees={','.join(assignees) if assignees else ''}",
  )
  return to_planned_out(row, db)


@app.patch("/planned-analyses/{analysis_id}", response_model=PlannedAnalysisOut)
async def update_planned_analysis(analysis_id: int, payload: PlannedAnalysisUpdate, request: Request, db: Session = Depends(get_db)):
  row = db.get(PlannedAnalysisModel, analysis_id)
  if not row:
    raise HTTPException(status_code=404, detail="Planned analysis not found")
  old_status = row.status.value
  prev_assignees = get_assignees(db, row.id, row.assigned_to)
  if payload.status:
    row.status = AnalysisStatus(payload.status)
  if payload.assigned_to is not None:
    actor_identity = (request.headers.get("x-user") or "").strip()
    actor_user = find_user_by_identity(db, actor_identity)
    is_admin = is_admin_from_headers(request) or (actor_user is not None and has_role(actor_user, "admin"))
    assignees = normalize_assignees(payload.assigned_to)
    method_key = normalize_method_key(row.analysis_type)
    if not is_admin:
      if actor_user is None or not has_role(actor_user, "lab_operator"):
        raise HTTPException(status_code=403, detail="Only lab operator can self-assign")
      actor_names = {
        (actor_user.username or "").strip().lower(),
        (actor_user.full_name or "").strip().lower(),
      }
      existing_assignees = [name.strip().lower() for name in get_assignees(db, row.id, row.assigned_to)]
      requested_assignees = [name.strip().lower() for name in assignees]
      if not set(actor_names).intersection(requested_assignees):
        raise HTTPException(status_code=403, detail="Lab operator can assign only themselves")
      existing_non_actor = {name for name in existing_assignees if name and name not in actor_names}
      requested_non_actor = {name for name in requested_assignees if name and name not in actor_names}
      if existing_non_actor != requested_non_actor:
        raise HTTPException(status_code=403, detail="Lab operator can only add or remove self")
      allowed_methods = {normalize_method_key(name) for name in get_user_method_permissions(db, actor_user.id)}
      if method_key and method_key not in allowed_methods:
        raise HTTPException(status_code=400, detail=f"{actor_user.full_name} is not allowed for {row.analysis_type}")
    else:
      assignee_users = [find_user_by_identity(db, assignee) for assignee in assignees]
      if any(user is None for user in assignee_users):
        raise HTTPException(status_code=400, detail="Assignee user not found")
      assignee_users = [user for user in assignee_users if user is not None]
      if any(not has_role(user, "lab_operator") for user in assignee_users):
        raise HTTPException(status_code=400, detail="Assignee must have lab operator role")
      for user in assignee_users:
        allowed_methods = {normalize_method_key(name) for name in get_user_method_permissions(db, user.id)}
        if method_key and method_key not in allowed_methods:
          raise HTTPException(status_code=400, detail=f"{user.full_name} is not allowed for {row.analysis_type}")
    db.execute(
      delete(PlannedAnalysisAssigneeModel).where(
        PlannedAnalysisAssigneeModel.analysis_id == row.id
      )
    )
    if assignees:
      for assignee in assignees:
        db.add(PlannedAnalysisAssigneeModel(analysis_id=row.id, assignee=assignee))
      row.assigned_to = assignees[0]
    else:
      row.assigned_to = None
  db.add(row)
  db.commit()
  db.refresh(row)
  if payload.status and old_status != row.status.value:
    actor = request.headers.get("x-user")
    log_audit(
      db,
      entity_type="planned_analysis",
      entity_id=str(analysis_id),
      action="status_change",
      performed_by=actor,
      details=f"status:{old_status}->{row.status.value}",
    )
  if payload.assigned_to is not None:
    actor = request.headers.get("x-user")
    next_assignees = assignees
    old_assignees_text = ",".join(prev_assignees)
    new_assignees_text = ",".join(next_assignees)
    added = [name for name in next_assignees if name not in prev_assignees]
    removed = [name for name in prev_assignees if name not in next_assignees]
    for target in added:
      log_audit(
        db,
        entity_type="planned_analysis",
        entity_id=str(analysis_id),
        action="operator_assigned",
        performed_by=actor,
        details=f"sample={row.sample_id};method={row.analysis_type};target={target};assignees:{old_assignees_text}->{new_assignees_text}",
      )
    for target in removed:
      log_audit(
        db,
        entity_type="planned_analysis",
        entity_id=str(analysis_id),
        action="operator_unassigned",
        performed_by=actor,
        details=f"sample={row.sample_id};method={row.analysis_type};target={target};assignees:{old_assignees_text}->{new_assignees_text}",
      )
  return to_planned_out(row, db)


@app.get("/filter-methods", response_model=FilterMethodsOut)
async def list_filter_methods(db: Session = Depends(get_db)):
  rows = db.execute(select(FilterMethodModel.method_name).where(FilterMethodModel.visible == True)).all()
  methods = [r[0] for r in rows if r and r[0]]
  return {"methods": methods}


@app.put("/filter-methods", response_model=FilterMethodsOut)
async def update_filter_methods(payload: FilterMethodsUpdate, request: Request, db: Session = Depends(get_db)):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  methods = normalize_methods(payload.methods)
  db.execute(delete(FilterMethodModel))
  for name in methods:
    db.add(FilterMethodModel(method_name=name, visible=True))
  db.commit()
  return {"methods": methods}


def to_planned_out(row: PlannedAnalysisModel, db: Session):
  return {
    "id": row.id,
    "sample_id": row.sample_id,
    "analysis_type": row.analysis_type,
    "status": row.status.value,
    "assigned_to": get_assignees(db, row.id, row.assigned_to),
  }


@app.post("/action-batches", response_model=ActionBatchOut, status_code=201)
async def create_action_batch(payload: ActionBatchCreate, db: Session = Depends(get_db)):
  row = ActionBatchModel(
    title=payload.title,
    date=payload.date,
    status=ActionBatchStatus(payload.status),
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  return to_action_batch_out(row)


@app.get("/action-batches", response_model=list[ActionBatchOut])
async def list_action_batches(db: Session = Depends(get_db)):
  rows = db.execute(select(ActionBatchModel)).scalars().all()
  return [to_action_batch_out(r) for r in rows]


@app.post("/conflicts", response_model=ConflictOut, status_code=201)
async def create_conflict(payload: ConflictCreate, db: Session = Depends(get_db)):
  row = ConflictModel(
    old_payload=payload.old_payload,
    new_payload=payload.new_payload,
    status=ConflictStatus(payload.status),
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  return to_conflict_out(row)

@app.get("/conflicts", response_model=list[ConflictOut])
async def list_conflicts(db: Session = Depends(get_db)):
  rows = db.execute(select(ConflictModel)).scalars().all()
  return [to_conflict_out(r) for r in rows]


@app.patch("/conflicts/{conflict_id}", response_model=ConflictOut)
async def update_conflict(conflict_id: int, payload: ConflictUpdate, request: Request, db: Session = Depends(get_db), authorization: str | None = None):
  row = db.get(ConflictModel, conflict_id)
  if not row:
    raise HTTPException(status_code=404, detail="Conflict not found")
  old_status = row.status.value
  old_resolution_note = row.resolution_note or ""
  if payload.status:
    row.status = ConflictStatus(payload.status)
  if payload.resolution_note is not None:
    row.resolution_note = payload.resolution_note
  row.updated_at = datetime.now(timezone.utc).isoformat()
  if authorization and authorization.lower().startswith("bearer "):
    row.updated_by = authorization.split(" ", 1)[1]
  db.add(row)
  db.commit()
  db.refresh(row)
  actor = request.headers.get("x-user") or row.updated_by
  if payload.status and old_status != row.status.value:
    log_audit(
      db,
      entity_type="conflict",
      entity_id=str(conflict_id),
      action="status_change",
      performed_by=actor,
      details=f"status:{old_status}->{row.status.value}",
    )
  if payload.resolution_note is not None and old_resolution_note != (row.resolution_note or ""):
    log_audit(
      db,
      entity_type="conflict",
      entity_id=str(conflict_id),
      action="updated",
      performed_by=actor,
      details=f"resolution_note:{old_resolution_note}->{row.resolution_note or ''}",
    )
  return to_conflict_out(row)


def to_action_batch_out(row: ActionBatchModel):
  return {"id": row.id, "title": row.title, "date": row.date, "status": row.status.value}


def to_conflict_out(row: ConflictModel):
  return {
    "id": row.id,
    "old_payload": row.old_payload,
    "new_payload": row.new_payload,
    "status": row.status.value,
    "resolution_note": row.resolution_note,
    "updated_by": row.updated_by,
    "updated_at": row.updated_at,
  }

@app.delete("/admin/purge-nondefault-analyses")
async def purge_nondefault_analyses(request: Request, db: Session = Depends(get_db)):
  allowed = {"sara", "ir", "mass spectrometry", "viscosity"}
  roles_header = (request.headers.get("x-roles") or "").lower()
  role_header = (request.headers.get("x-role") or "").lower()
  is_admin = "admin" in roles_header.split(",") or role_header == "admin"
  if not is_admin:
    raise HTTPException(status_code=403, detail="Admin only")
  deleted = (
    db.query(PlannedAnalysisModel)
    .filter(~PlannedAnalysisModel.analysis_type.in_(allowed))
    .delete(synchronize_session=False)
  )
  db.commit()
  return {"deleted": deleted}


def log_audit(db: Session, *, entity_type: str, entity_id: str, action: str, performed_by: str | None, details: str | None = None):
  log_row = AuditLogModel(
    entity_type=entity_type,
    entity_id=entity_id,
    action=action,
    performed_by=performed_by,
    performed_at=datetime.now(timezone.utc).isoformat(),
    details=details,
  )
  db.add(log_row)
  db.commit()


def parse_roles(role_str: str | None) -> list[str]:
  if not role_str:
    return []
  return [r for r in (role_str.split(",") if "," in role_str else [role_str]) if r]


def serialize_roles(roles: list[str]) -> str:
  cleaned = [r for r in roles if r]
  return ",".join(cleaned) if cleaned else "lab_operator"


def has_role(user: UserModel, role_name: str) -> bool:
  roles = parse_roles(user.roles) or [user.role]
  normalized = {r.strip().lower() for r in roles if r}
  return role_name.strip().lower() in normalized


def find_user_by_identity(db: Session, identity: str | None) -> UserModel | None:
  value = (identity or "").strip().lower()
  if not value:
    return None
  rows = db.execute(select(UserModel)).scalars().all()
  for user in rows:
    if (user.username or "").strip().lower() == value:
      return user
    if (user.full_name or "").strip().lower() == value:
      return user
  return None


@app.get("/admin/events", response_model=list[AuditEventOut])
async def list_admin_events(
  request: Request,
  db: Session = Depends(get_db),
  entity_type: str | None = None,
  action: str | None = None,
  actor: str | None = None,
  entity_id: str | None = None,
  q: str | None = None,
  sort: str = "desc",
  limit: int = 200,
):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  rows = db.execute(select(AuditLogModel)).scalars().all()
  events = [
    AuditEventOut(
      id=row.id,
      entity_type=row.entity_type,
      entity_id=row.entity_id,
      action=row.action,
      performed_by=row.performed_by,
      performed_at=row.performed_at,
      details=row.details,
    )
    for row in rows
  ]
  if entity_type:
    events = [e for e in events if e.entity_type == entity_type]
  if action:
    events = [e for e in events if e.action == action]
  if actor:
    key = actor.strip().lower()
    events = [e for e in events if (e.performed_by or "").strip().lower().find(key) >= 0]
  if entity_id:
    key = entity_id.strip()
    events = [e for e in events if key in e.entity_id]
  if q:
    key = q.strip().lower()
    events = [
      e
      for e in events
      if key in e.entity_type.lower()
      or key in e.action.lower()
      or key in (e.entity_id or "").lower()
      or key in (e.performed_by or "").lower()
      or key in (e.details or "").lower()
    ]
  reverse = sort != "asc"
  events = sorted(events, key=lambda e: e.performed_at or "", reverse=reverse)
  return events[: max(1, min(limit, 1000))]


@app.get("/admin/users", response_model=list[UserOut])
async def list_users(request: Request, db: Session = Depends(get_db)):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  rows = db.execute(select(UserModel)).scalars().all()
  return [
    UserOut(
      id=r.id,
      username=r.username,
      full_name=r.full_name,
      email=r.email,
      role=parse_roles(r.roles)[0] if parse_roles(r.roles) else r.role,
      roles=parse_roles(r.roles) or [r.role],
      method_permissions=get_user_method_permissions(db, r.id),
    )
    for r in rows
  ]

@app.post("/admin/users", response_model=UserCreateOut, status_code=201)
async def create_user(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  username = payload.username.strip()
  if not username:
    raise HTTPException(status_code=400, detail="Username required")
  email = str(payload.email).strip().lower()
  if not email:
    raise HTTPException(status_code=400, detail="Email required")
  existing = db.execute(select(UserModel).where(UserModel.username == username)).scalars().first()
  if existing:
    raise HTTPException(status_code=400, detail="Username already exists")
  full_name = payload.full_name.strip()
  roles = payload.roles or ([payload.role] if payload.role else ["lab_operator"])
  roles = [r for r in roles if r]
  primary = roles[0] if roles else "lab_operator"
  if payload.method_permissions is not None and "lab_operator" not in roles:
    raise HTTPException(status_code=400, detail="Method permissions are only for lab operators")
  row = UserModel(
    username=username,
    full_name=full_name,
    email=email,
    password_hash=hash_password(DEFAULT_PASSWORD),
    must_change_password=True,
    is_active=True,
    role=primary,
    roles=serialize_roles(roles),
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  method_permissions = normalize_methods(payload.method_permissions) if payload.method_permissions is not None else []
  if has_role(row, "lab_operator"):
    method_permissions = method_permissions or DEFAULT_METHOD_PERMISSIONS
  set_user_method_permissions(db, row.id, method_permissions)
  db.commit()
  actor = request.headers.get("x-user")
  log_audit(
    db,
    entity_type="user",
    entity_id=str(row.id),
    action="created",
    performed_by=actor,
    details=f"username={row.username};roles={row.roles};methods={','.join(get_user_method_permissions(db, row.id))}",
  )
  return UserCreateOut(
    id=row.id,
    username=row.username,
    full_name=row.full_name,
    email=row.email,
    role=row.role,
    roles=parse_roles(row.roles) or [row.role],
    method_permissions=get_user_method_permissions(db, row.id),
    default_password=DEFAULT_PASSWORD,
  )


@app.patch("/admin/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db)):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  row = db.get(UserModel, user_id)
  if not row:
    raise HTTPException(status_code=404, detail="User not found")
  old_username = row.username
  old_full_name = row.full_name
  old_email = row.email or ""
  old_roles = parse_roles(row.roles) or [row.role]
  old_methods = get_user_method_permissions(db, row.id)
  if payload.username is not None:
    next_username = payload.username.strip()
    if not next_username:
      raise HTTPException(status_code=400, detail="Username required")
    existing_username = db.execute(
      select(UserModel).where(UserModel.username == next_username, UserModel.id != user_id)
    ).scalars().first()
    if existing_username:
      raise HTTPException(status_code=400, detail="Username already exists")
    row.username = next_username
  if payload.full_name is not None:
    next_full_name = payload.full_name.strip()
    if not next_full_name:
      raise HTTPException(status_code=400, detail="Full name required")
    row.full_name = next_full_name
  if payload.email is not None:
    next_email = str(payload.email).strip().lower()
    row.email = next_email
  roles = payload.roles or ([payload.role] if payload.role else parse_roles(row.roles) or [row.role])
  primary = roles[0] if roles else row.role
  row.role = primary
  row.roles = serialize_roles(roles)
  if payload.method_permissions is not None:
    if not has_role(row, "lab_operator"):
      raise HTTPException(status_code=400, detail="Method permissions are only for lab operators")
    set_user_method_permissions(db, row.id, payload.method_permissions)
  elif not has_role(row, "lab_operator"):
    set_user_method_permissions(db, row.id, [])
  db.add(row)
  db.commit()
  db.refresh(row)
  actor = request.headers.get("x-user")
  new_roles = parse_roles(row.roles) or [row.role]
  new_methods = get_user_method_permissions(db, row.id)
  detail_parts: list[str] = []
  if old_username != row.username:
    detail_parts.append(f"username:{old_username}->{row.username}")
  if old_full_name != row.full_name:
    detail_parts.append(f"full_name:{old_full_name}->{row.full_name}")
  if old_email != (row.email or ""):
    detail_parts.append(f"email:{old_email}->{row.email or ''}")
  if old_roles != new_roles:
    detail_parts.append(f"roles:{','.join(old_roles)}->{','.join(new_roles)}")
  if old_methods != new_methods:
    detail_parts.append(f"methods:{','.join(old_methods)}->{','.join(new_methods)}")
  if not detail_parts:
    detail_parts.append("no_changes")
  log_audit(
    db,
    entity_type="user",
    entity_id=str(row.id),
    action="updated",
    performed_by=actor,
    details=";".join(detail_parts),
  )
  return UserOut(
    id=row.id,
    username=row.username,
    full_name=row.full_name,
    email=row.email,
    role=row.role,
    roles=new_roles,
    method_permissions=new_methods,
  )


@app.delete("/admin/users/{user_id}")
async def delete_user(user_id: int, request: Request, db: Session = Depends(get_db)):
  if not is_admin_from_headers(request):
    raise HTTPException(status_code=403, detail="Admin only")
  row = db.get(UserModel, user_id)
  if not row:
    raise HTTPException(status_code=404, detail="User not found")
  actor = request.headers.get("x-user")
  details = f"username={row.username};roles={row.roles}"
  db.delete(row)
  db.commit()
  log_audit(db, entity_type="user", entity_id=str(user_id), action="deleted", performed_by=actor, details=details)
  return {"deleted": True}
