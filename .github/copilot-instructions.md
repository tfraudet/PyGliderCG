# PyGliderCG Copilot Instructions

## Build, test, and lint commands

### Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

### Run app locally (two processes)
```bash
# Terminal 1 - Backend
python -m uvicorn backend.main:app --reload

# Terminal 2 - React Frontend (Vite dev server)
cd web && npm run dev
```

### Run unified app entrypoint (used in container)
```bash
./start.sh
```

### Build container
```bash
docker compose up --build
```

### Python tests (pytest)
```bash
# Full suite
pytest tests/ -v

# Single file
pytest tests/test_glider.py -v

# Single test
pytest tests/test_glider.py::Test_Glider_D2080::test_center_gravity_calculation -v

# Single integration test
pytest tests/test_integration.py::TestAuthentication::test_login_valid_credentials -v
```

### E2E tests (Playwright)
```bash
playwright install

# Full E2E suite
npx playwright test --config=playwright.config.ts

# Single spec file
npx playwright test e2e/glider-mngmt.spec.ts --config=playwright.config.ts --project=chromium

# Single test case
npx playwright test e2e/glider-mngmt.spec.ts -g "your test title" --config=playwright.config.ts --project=chromium
```

### Lint
```bash
# CI-style lint used in workflow
pylint backend/ --exit-zero --disable=all --enable=E,F
```

### Integration-test environment variables
```bash
export BACKEND_URL=http://localhost:8000
export TEST_ADMIN_USERNAME=testadmin
export TEST_ADMIN_PASSWORD=testpass123
```

## High-level architecture

- The app is split between a **React frontend** (`web/`) and a **FastAPI backend** (`backend/`). Frontend calls backend over HTTP (`VITE_BACKEND_URL`, default `http://localhost:8000`).
- Backend serves both API routes and React built assets from a single FastAPI application for production deployment.
- `backend/main.py` wires routers (`auth`, `users`, `gliders`, `audit`, `database`) and initializes DuckDB schema at startup via `backend/init_db.py`.
- Backend logic is layered: **API routers** (`backend/api/*`) -> **query layer** (`backend/db/*`) -> **domain models** (`backend/models/*`). CG formulas live in `backend/models/glider.py`.
- Data is persisted in a single **DuckDB** file (`DB_NAME` env). `glider_queries` rebuilds full `Glider` aggregates (limits, arms, weighings, inventory, WB points) from normalized tables.
- `web/src/lib/api.ts` is the single API client for React components. It handles JWT bearer headers, retries for GET requests, and error mapping.
- Authentication is JWT-based (`COOKIE_KEY`), with roles `administrator`, `editor`, `viewer`. Frontend routing (`web/src/App.tsx`) is role-gated via React Router.

## Key codebase conventions

- Keep existing **tab indentation** and **single-quote string style** in Python files; match surrounding file style when editing mixed-style files.
- Glider API supports both legacy and canonical routes. Frontend uses `/api/gliders/by-id/{glider_id:path}/...` to support registrations containing `/`; prefer `backend.glider_endpoint(...)`.
- Public vs protected API behavior matters:
	- Public: glider list/details/limits/calculate.
	- Admin-only: user CRUD, database import/export, glider mutations, weighing/instrument/WB updates.
- React pages under `web/src/pages/` are components, usually with:
	- `useQuery` / `useMutation` from react-query for data fetching,
	- authentication check via `auth` context,
	- layout via App shell component.
- `@react-query` hooks use caching; after mutations, invalidate related queries with `queryClient.invalidateQueries()`.
- User management endpoints intentionally return hashed `password` values in responses; frontend `UsersPage` edits them via form submissions.
- Date input handling is lenient in glider API (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY/MM/DD`); preserve this behavior when changing request parsing.
