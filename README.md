<p align="center">
	 <img src="img/app-logo-short-v2.png" width="100" >
</p>

# Center of Gravity Calculator for ACPH Gliders

PyGliderCG is now a two-tier application:
- **Frontend:** Streamlit UI (pilot and admin workflows)
- **Backend:** FastAPI service (business logic, auth, database access)

Frontend code now lives under `frontend/` and can run either:
- locally with two processes (one for FastAPI, one for Streamlit), or
- in Docker with a **single container** that starts both services.

There are no Streamlit entrypoint/module wrappers at repository root anymore.

## Repository layout (relevant folders)

- `frontend/`: Streamlit application (`streamlit_app.py`, pages, frontend modules)
- `backend/`: FastAPI API service
- `tests/`: pytest suite
- `e2e/`: Playwright E2E tests

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://glider-cg.streamlit.app/)

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
- `BACKEND_URL` (used by Streamlit client, default `http://localhost:8000`)
- `COOKIE_KEY` (JWT signing key for backend auth)
- `DB_NAME` / `DB_PATH` (DuckDB location)

### Run backend and frontend

Run services in two terminals:

**Terminal 1 - Backend (FastAPI)**
```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend (Streamlit)**
```bash
BACKEND_URL=http://localhost:8000 streamlit run frontend/streamlit_app.py
```

Endpoints:
- Frontend: `http://localhost:8501`
- Backend API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`

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
# Unified app container (frontend + backend in one service)
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

You can run the tests using [Playwright](https://playwright.dev/) framework. Make sure backend and Streamlit (`frontend/streamlit_app.py`) are already running.

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
