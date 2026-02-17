# LabSync Integration Workflow Spec

## Purpose
This document defines the current workflow contract for end-to-end and integration tests.
It consolidates:
- Product workflow intent from `Vibecodeplan.docx`
- Current implemented behavior in `backend/main.py` and related models

If this spec and code diverge, tests should follow this spec only after code is updated and reviewed.

## Scope
In scope:
- Auth and account lifecycle
- Role-based operational workflows (warehouse, lab operator, action supervision, admin)
- Sample, planned analysis, action batch, conflict, and admin event-log flows
- Audit traceability requirements
- Current UI workflow labels relevant to scenario assertions

Out of scope:
- Instrument file ingestion and parsing
- Full well/horizon reference normalization from the long-term schema
- External integrations

## Canonical Roles
- `warehouse_worker`
- `lab_operator`
- `action_supervision`
- `admin`

Users may have multiple roles (`roles` list), with one primary role field for display.

## Current Data Objects Used in Workflow
- `Sample`
  - `sample_id`, `well_id`, `horizon`, `sampling_date`, `status`, `storage_location`, `assigned_to`
  - status enum: `new`, `progress`, `review`, `done`
- `PlannedAnalysis`
  - `id`, `sample_id`, `analysis_type`, `status`, `assigned_to`
  - status enum: `planned`, `in_progress`, `review`, `completed`, `failed`
- `ActionBatch`
  - `id`, `title`, `date`, `status`
  - status enum: `new`, `review`, `done`
- `Conflict`
  - `id`, `old_payload`, `new_payload`, `status`, `resolution_note`, `updated_by`, `updated_at`
  - status enum: `open`, `resolved`
- `AuditEvent`
  - `entity_type`, `entity_id`, `action`, `performed_by`, `performed_at`, `details`

## Authentication and Identity Rules
- Login is username + password.
- Passwords are hashed server-side.
- Bootstrap admin account is supported.
- New users created by admin receive default password `Tatneft123`.
- New users are forced to change password on first login (`must_change_password=true`).
- Self-service password change requires current password and a different new password.
- Password reset flow:
  - Request by `username + email`
  - Token is single-use and expiring
  - Reset rejects new password equal to current password
- In development without SMTP, reset token may be returned in API response for testing.

## Seeding Rules
- On startup, only bootstrap `admin` is auto-seeded if missing.
- `warehouse`, `lab`, and `action` are not auto-recreated anymore.
- Existing non-default users are preserved.

## Authorization Rules (Current Implementation)
Important: authorization is currently enforced via request role headers (`X-Role` / `X-Roles`) on many admin/role-sensitive endpoints.

Admin-only endpoints (enforced):
- `DELETE /admin/samples`
- `PUT /filter-methods`
- `DELETE /admin/purge-nondefault-analyses`
- `GET /admin/events`
- `POST /admin/users`
- `PATCH /admin/users/{user_id}`

Admin endpoints not currently role-guarded in code (security debt, should be fixed):
- `GET /admin/users`
- `DELETE /admin/users/{user_id}`

Lab assignment rules for planned analyses:
- Non-admin lab operator can only add/remove self.
- Non-admin must have method permission for the analysis type.
- Admin can assign any user with `lab_operator` role and matching method permission.

## Canonical Workflow Scenarios for Integration Tests

### Scenario A: End-to-End Happy Path
1. Admin logs in and changes temporary password.
2. Admin creates users for warehouse, lab operator, and action supervision.
3. Warehouse creates sample and advances sample status.
4. Lab operator creates planned analysis for sample.
5. Lab operator/admin assigns operator and advances analysis status to completion.
6. Action supervision creates action batch and handles a conflict to resolution.
7. Admin checks event log for all major transitions.

Expected:
- Each state transition persisted and queryable after reload.
- Role constraints respected.
- Audit events exist for created/updated/status actions.

### Scenario B: Multi-Role Handoff with Assignment Boundaries
1. Admin creates two lab operators with different method permissions.
2. Planned analysis created with a method.
3. Admin assignment to operator without permission fails.
4. Admin updates permissions, assignment succeeds.
5. Non-admin operator attempts to change other assignees and is denied.
6. Non-admin operator self-assigns and succeeds.

Expected:
- Clear 4xx on forbidden actions.
- Correct assignee list after each valid change.
- Assignment and unassignment audit events include old/new assignee info.

### Scenario C: Conflict Resolution and Traceability
1. Create conflict with `open` status.
2. Update to `resolved` with resolution note.
3. Query admin events by entity and action.

Expected:
- Conflict status and note updated.
- Audit has `status_change` details (`old->new`) and `updated` details for note changes.

### Scenario D: Account Lifecycle and Recovery
1. Admin creates user with default password.
2. User logs in and is forced to change password.
3. User changes password successfully.
4. Recovery request with wrong username/email pair returns generic response but no valid reset.
5. Recovery request with correct pair issues reset token.
6. Reset with same password is rejected.
7. Reset with different password succeeds.

Expected:
- `must_change_password` transitions true -> false.
- Old password no longer valid after successful change/reset.
- Recovery flow is non-enumerating in outward response.

## Required Audit Assertions
For key tests, assert that audit log contains:
- Entity-specific action names (`created`, `updated`, `status_change`, `operator_assigned`, `operator_unassigned`, `password_changed`, `password_reset_requested`, `password_reset_completed`)
- Old/new details for update/status actions where implemented
- Correct `entity_type` and `entity_id`

## Superseded or Deferred Items from Initial Plan
- Early UI-only stages are complete and superseded by backend-backed flows.
- Full `wells` and `horizon` normalized entities are deferred; current sample model stores minimal fields directly.
- Fine-grained token-backed server-side authorization is not fully implemented yet; header-based role checks remain in current backend logic.
- Current lab board title copy is `Lab view: analyses • Sample Tracking Board` (used in UI assertions if needed).

## Test Organization Recommendation
- `backend/tests/integration/scenarios/test_happy_path.py`
- `backend/tests/integration/scenarios/test_role_handoffs.py`
- `backend/tests/integration/scenarios/test_conflict_traceability.py`
- `backend/tests/integration/scenarios/test_identity_lifecycle.py`

Each scenario should:
- Create its own deterministic fixtures/data IDs.
- Avoid dependence on startup-seeded non-admin users.
- Assert both behavior and audit traceability.
