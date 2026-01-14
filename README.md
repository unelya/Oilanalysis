# LabSync - Oil Sample Workflow Management

Deployed app: http://161.35.194.36/

LabSync is a role-based web application for managing oil samples, laboratory work, and technological actions in one traceable workflow. It helps teams track samples from collection through lab analysis and operational actions, with audit logging and conflict resolution.

## Problem statement
Oil sample management is often fragmented across spreadsheets and emails, making it hard to track sample status, assignments, and approvals. LabSync provides a single system to register samples, plan and track analyses, manage action batches, and resolve data conflicts with a clear audit trail.

## What the system does
- Tracks samples (creation, status changes, storage location, assignees)
- Plans lab analyses and assigns them to staff
- Manages action batches for operational follow-up
- Captures and resolves data conflicts
- Logs audit events for traceability
- Enforces role-based access for sensitive actions

## Roles
- Warehouse worker: registers samples, updates storage info
- Lab operator: manages and executes planned analyses
- Action supervision: manages action batches
- Admin: manages users, roles, and system-level settings

## Architecture overview
- Frontend: React + Vite UI that handles routing, role-based screens, and user actions
- Backend: FastAPI service providing a REST API and OpenAPI contract
- Database: Postgres for persistent storage (SQLAlchemy + Alembic migrations)
- Auth: simple username-based login for demo purposes; roles passed via headers

Data flow (high level):
Frontend -> REST API (FastAPI) -> Database (Postgres)

## Tech stack
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: Postgres (with Alembic migrations)
- Dev tools: Docker for local Postgres

## Project structure
- `backend/` - FastAPI app, models, schemas, database
- `frontend/` - React UI
- `alembic/` - database migrations
- `docker-compose.yml` - Postgres container for local dev

## API contract (OpenAPI)
FastAPI serves the OpenAPI spec automatically:
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

The repo also includes a frozen snapshot in `openapi.yaml`.

The frontend uses a centralized API layer in `frontend/src/lib/api.ts` that aligns to this contract.

## Local development

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker (for Postgres)

### 1) Start the database
```
cd /workspaces/oilanalysis
docker-compose up -d
```

### 2) Start the backend
```
cd /workspaces/oilanalysis/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://app:app@localhost:5432/labsync
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Start the frontend
```
cd /workspaces/oilanalysis/frontend
npm install
npm run dev
```

The UI runs on `http://localhost:8080` and proxies API calls to `http://localhost:8000`.

## Tests
Backend tests (unit + integration):
```
cd /workspaces/oilanalysis
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
pytest -q backend/tests
```

Frontend tests:
```
cd /workspaces/oilanalysis/frontend
npm install
npm test
```

## CI/CD
GitHub Actions runs backend and frontend tests on every push and pull request:
- Workflow: `.github/workflows/ci.yml`

## Deployment (DigitalOcean, Option A - no Docker)
This setup runs everything on a single Ubuntu 22.04 droplet. Postgres, FastAPI, and Nginx run directly on the server. The frontend is built locally and uploaded as static files.

### 1) Create a Droplet
- Ubuntu 22.04 or newer
- Open ports 80 (HTTP) in the firewall

### 2) Install server dependencies (on the droplet)
```
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx postgresql postgresql-contrib
```

### 3) Create Postgres DB and user (on the droplet)
```
sudo -u postgres psql
```
Inside psql:
```
CREATE USER labsync WITH PASSWORD 'CHANGE_THIS_PASSWORD';
CREATE DATABASE labsync OWNER labsync;
\q
```

### 4) Create app folders (on the droplet)
```
sudo mkdir -p /opt/labsync /var/www/labsync
```

### 5) Build frontend locally (Codespaces)
```
cd /workspaces/oilanalysis/frontend
npm ci
npm run build
```

### 6) Upload files to the droplet (Codespaces)
```
rsync -avz /workspaces/oilanalysis/frontend/dist/ root@YOUR_DROPLET_IP:/var/www/labsync/
rsync -avz /workspaces/oilanalysis/backend/ root@YOUR_DROPLET_IP:/opt/labsync/backend/
rsync -avz /workspaces/oilanalysis/alembic root@YOUR_DROPLET_IP:/opt/labsync/
rsync -avz /workspaces/oilanalysis/alembic.ini root@YOUR_DROPLET_IP:/opt/labsync/
```

### 7) Backend venv + deps (on the droplet)
```
python3 -m venv /opt/labsync/venv
/opt/labsync/venv/bin/pip install -r /opt/labsync/backend/requirements.txt
```

### 8) Backend env file (on the droplet)
```
cat <<'EOF' > /opt/labsync/.env
DATABASE_URL=postgresql+psycopg2://labsync:CHANGE_THIS_PASSWORD@localhost:5432/labsync
EOF
```

### 9) Systemd service (on the droplet)
```
cat <<'EOF' > /etc/systemd/system/labsync.service
[Unit]
Description=LabSync FastAPI
After=network.target

[Service]
User=root
WorkingDirectory=/opt/labsync/backend
EnvironmentFile=/opt/labsync/.env
ExecStart=/opt/labsync/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now labsync
```

### 10) Nginx config (on the droplet)
```
server {
  listen 80;
  server_name _;

  root /var/www/labsync;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

Enable the site and restart Nginx:
```
sudo ln -s /etc/nginx/sites-available/labsync /etc/nginx/sites-enabled/labsync
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Your app should be reachable at `http://YOUR_DROPLET_IP`.

### 11) Fast deploy script (Codespaces)
```
/workspaces/oilanalysis/deploy.sh
```
This script builds the frontend, uploads frontend + backend to the droplet, and restarts the backend service.

## Dependency audit note
`npm audit fix` resolves most issues, but remaining advisories require a breaking upgrade to Vite 7.x (not applied). The current setup accepts those moderate advisories to avoid breaking changes.

## AI-assisted development
This project used AI assistants to accelerate scaffolding and refactoring, while keeping changes reviewable and testable.

Tools used:
- ChatGPT: architecture planning, endpoint outline, and documentation drafts
- Codex: incremental code edits, small refactors, and test scaffolding

Workflow:
- Describe the desired workflow and roles
- Generate initial endpoint/UI structure
- Refine with manual edits and run tests

MCP usage: not used in this repository.

## License
MIT
