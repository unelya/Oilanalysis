# LabSync - Oil Sample Workflow Management

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
cd final-project
docker-compose up -d
```

### 2) Start the backend
```
cd final-project/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://app:app@localhost:5432/labsync
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3) Start the frontend
```
cd final-project/frontend
npm install
npm run dev
```

The UI runs on `http://localhost:8080` and proxies API calls to `http://localhost:8000`.

## Tests
Backend tests (unit + integration):
```
cd final-project
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
pytest -q backend/tests
```

Frontend tests:
```
cd final-project/frontend
npm install
npm test
```

## CI/CD
GitHub Actions runs backend and frontend tests on every push and pull request:
- Workflow: `.github/workflows/ci.yml`

## Deployment (DigitalOcean)
This is a simple, manual deployment path using a Droplet and Docker for the database.

### 1) Create a Droplet
- Ubuntu 22.04 or newer
- Open ports 80 and 8000 in the firewall

### 2) Install dependencies
```
sudo apt update
sudo apt install -y docker.io docker-compose nginx
```

### 3) Deploy the project
```
git clone <your-repo-url>
cd final-project
```

### 4) Start Postgres
```
docker-compose up -d
```

### 5) Run the backend
```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+psycopg2://app:app@localhost:5432/labsync
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 6) Build and serve the frontend
```
cd ../frontend
npm install
npm run build
```

Copy the build output to Nginx:
```
sudo rm -rf /var/www/labsync
sudo mkdir -p /var/www/labsync
sudo cp -r dist/* /var/www/labsync/
```

Create an Nginx config at `/etc/nginx/sites-available/labsync`:
```
server {
  listen 80;
  server_name YOUR_DROPLET_IP_OR_DOMAIN;

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
sudo nginx -t
sudo systemctl restart nginx
```

Your app should be reachable at `http://YOUR_DROPLET_IP`.

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
