<p align="center">
	 <img src="frontend/img/app-logo-short-v2.png" width="100" >
</p>

# Center of Gravity Calculator for ACPH Gliders

A simple web  application to calculate center of gravity for [ACPH](https://aeroclub-issoire.fr/) gliders.
- **Frontend:** React + Vite + Tailwind UI (pilot and admin workflows)
- **Backend:** FastAPI service (business logic, auth, database access)

Frontend code now lives under `web/` and can run either:
- locally with two processes (one for FastAPI, one for Vite dev server), or
- in Docker with a **single container** serving built React assets through FastAPI.

## Repository layout (relevant folders)

- `web/`: React frontend application
- `backend/`: FastAPI API service
- `tests/`: pytest suite
- `e2e/`: Playwright E2E tests

## Requirements

- Python 3.12
- Node.js (for Playwright E2E tests)

## Local development setup

Create a virtual environment, clone the repository, then install both frontend and backend dependencies.

```bash
git clone https://github.com/tfraudet/PyGliderCG.git
cd ./PyGliderCG
python3 -m venv .venv
```

On Unix systems

```bash
source .venv/bin/activate
```

On Window systems

```bash
.venv\scripts\activate
```

### Install dependencies

```bash
pip install -r requirements.txt
pip install -r requirements-backend.txt
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Key variables:
- `BACKEND_URL` (backend API URL, default `http://localhost:8000`)
- `VITE_BACKEND_URL` (optional override for React frontend API base URL)
- `COOKIE_KEY` (JWT signing key for backend auth)
- `DB_NAME` (DuckDB file path)

### Launch options (backend + frontend)

You have 4 ways to run the app, depending on your workflow.

#### Option 1 — Local dev (recommended for coding)

Run backend and frontend separately in two terminals:

**Terminal 1 - Backend (FastAPI, with reload)**
```bash
python -m uvicorn backend.main:app --reload
```

**Terminal 2 - Frontend (Vite dev server)**
```bash
npm run web:dev
```

Access:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

---

#### Option 2 — Unified local run (single process)

Build the React app, then serve it directly from FastAPI:

```bash
npm run web:build
./start.sh
```

Access:
- App + API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

---

#### Option 3 — Docker (single container)

```bash
docker compose up --build
```

Access:
- App + API: `http://localhost:8000`

For production-style detached run:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

#### Option 4 — Backend API only

Useful if you only need API testing:

```bash
python -m uvicorn backend.main:app --reload
```

Then call API directly (e.g. with curl/Postman/Swagger).

### Quick API Test

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.access_token')

# List gliders
curl http://localhost:8000/api/gliders \
  -H "Authorization: Bearer $TOKEN"
```

For detailed endpoint documentation, see [API.md](./API.md).

## Run with Docker

```bash
# Unified app container (frontend build served by backend)
docker compose up --build

# Production stack (same unified app model)
docker compose -f docker-compose.prod.yml up -d --build
```

## Run the tests

Start backend and frontend first (see "Run backend and frontend"), then run tests in another terminal.

```bash
# All tests
pytest tests/ -v

 # Glider only
pytest tests/test_glider.py -v

# Integration only
pytest tests/test_integration.py -v  
```

### Run end to end tests

You can run the tests using [Playwright](https://playwright.dev/) framework. The config starts backend and frontend web servers automatically.

```bash
# Install Playwright dependencies
playwright install

# Run all E2E tests
npx playwright test --config=playwright.config.ts

# Run the tests with a specific browser
npx playwright test --config=playwright.config.ts --project=chromium

# Run a specific test file with a specific browser
npx playwright test e2e/glider-mngmt.spec.ts --config=playwright.config.ts --project=chromium

# To open last HTML report run
npx playwright show-report
```
