# Text Freeze Contract (Pre-Translation)

## Purpose
This document freezes high-impact user-visible wording before RU translation starts.
Status values:
- `freeze`: do not change wording until i18n extraction is complete.
- `can_change`: safe to refine later.

## Scope
- Auth/Login/Password reset UI strings
- Admin users page toasts/validation strings
- Backend API `detail` error texts used by UI
- Event log `action` names and `details` format templates

## Frontend: Auth Strings
Status: `freeze`

- `Sign in`
- `Enter your credentials to continue.`
- `Username`
- `Password`
- `Remember me`
- `Forgot password?`
- `Signing in...`
- `Current password is required.`
- `New password must be at least 8 characters.`
- `New password and confirmation do not match.`
- `Password change failed`
- `Username is required.`
- `Email is required.`
- `Failed to request password reset.`
- `Reset token is required.`
- `Failed to reset password.`
- `If that email exists, a reset email has been sent.`
- `Password reset completed. You can now sign in with your new password.`

## Frontend: Admin Strings
Status: `freeze`

- `Failed to load users`
- `Failed to load event log`
- `Username required`
- `Full name required`
- `Default role required`
- `Email required`
- `Enter a valid email address`
- `User created`
- `Default password: {password}`
- `Failed to create user`
- `Failed to delete user`
- `Username updated`
- `Failed to update username`
- `Full name updated`
- `Failed to update full name`
- `Email updated`
- `Failed to update email`

## Frontend: Generic API Error Prefixes
Status: `freeze`

- `Failed to load samples ({status})`
- `Failed to create sample ({status})`
- `Failed to delete sample ({status})`
- `Failed to update sample ({status})`
- `Failed to load planned analyses ({status})`
- `Failed to create analysis ({status})`
- `Failed to update analysis ({status})`
- `Failed to load filter methods ({status})`
- `Failed to update filter methods ({status})`
- `Failed to load action batches ({status})`
- `Failed to create action batch ({status})`
- `Failed to load conflicts ({status})`
- `Failed to create conflict ({status})`
- `Failed to resolve conflict ({status})`
- `Failed to load users ({status})`
- `Failed to create user ({status})`
- `Failed to update user ({status})`
- `Failed to delete user ({status})`
- `Failed to load event log ({status})`

## Backend: API Error `detail` Text
Status: `freeze`

- `Unauthorized`
- `Invalid token`
- `Invalid username or password`
- `Username is required`
- `Email is required`
- `Reset token is required`
- `New password must be at least 8 characters`
- `Invalid reset token`
- `Reset token is invalid`
- `Reset token expired`
- `New password must be different`
- `Current password is invalid`
- `Sample not found`
- `Sample exists`
- `Admin only`
- `Sample IDs required`
- `Analysis type required`
- `Only these analysis types are allowed: SARA, IR, Mass Spectrometry, Viscosity`
- `Assignee user not found`
- `Assignee must have lab operator role`
- `Planned analysis not found`
- `Only lab operator can self-assign`
- `Lab operator can assign only themselves`
- `Lab operator can only add or remove self`
- `Conflict not found`
- `Username required`
- `Email required`
- `Username already exists`
- `Method permissions are only for lab operators`
- `User not found`
- `Full name required`

## Event Log Contract
Status: `freeze`

### Action names
- `created`
- `updated`
- `deleted`
- `status_change`
- `operator_assigned`
- `operator_unassigned`
- `password_changed`
- `password_reset_requested`
- `password_reset_completed`

### `details` format templates
- `status:{old}->{new}`
- `resolution_note:{old}->{new}`
- `username:{old}->{new}`
- `full_name:{old}->{new}`
- `email:{old}->{new}`
- `roles:{old}->{new}`
- `methods:{old}->{new}`
- `sample={sample_id};method={analysis_type};assignees={list}`
- `sample={sample_id};method={analysis_type};target={name};assignees:{old}->{new}`
- `username={username};roles={roles};methods={methods}`
- `username={username};email={email}`
- `self_service`
- `email_flow`

## Can Change Later (Not Frozen Now)
Status: `can_change`

- Visual-only labels unrelated to test assertions
- Non-critical helper descriptions/tooltips
- Placeholder examples (e.g., `e.g. user@company.com`)

## Change Control Rule (Until i18n extraction finishes)
- No edits to `freeze` strings in frontend/backend.
- If change is unavoidable, update this file in the same commit and note rationale.
