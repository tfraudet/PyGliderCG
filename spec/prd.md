# Product Requirements Document (PRD): PyGliderCG

## 1. Executive Summary

- **Problem Statement**: Glider pilots and administrators need a reliable way to compute center-of-gravity (CG), maintain glider technical data, and manage operational records without manual spreadsheet workflows that are error-prone and hard to audit.
- **Proposed Solution**: PyGliderCG provides a Streamlit frontend and FastAPI backend backed by DuckDB to support CG calculations, glider data management, user/role administration, and audit logging in a single operational system.
- **Success Criteria**:
	- `GET /health` returns `200` with valid service metadata and p95 response time <= 1 second in local/integration environments.
	- CG calculation logic in `backend/models/glider.py` remains covered by unit tests with all existing assertions passing.
	- Role protection remains correct: admin-only routes (`/api/users`, `/api/database`, glider mutation routes) return `403` for non-admin users.
	- Public read/calc glider routes remain accessible without authentication (`/api/gliders`, `/api/gliders/{id}`, `/limits`, `/calculate`).
	- Database export/import workflow remains operable from admin UI/API with successful zip export and valid DuckDB import.

## 2. User Experience & Functionality

- **User Personas**:
	- **Pilot/Viewer**: Reads glider data and computes flight loading CG.
	- **Technician/Editor**: Maintains glider weighing/instrument and operational data.
	- **Administrator**: Manages users/roles, audit access, and database import/export.

- **User Stories**:
	- As a **pilot**, I want to select a glider and compute CG with pilot/ballast inputs so that I can verify flight envelope compliance.
	- As an **editor/admin**, I want to manage glider datasheets, weighings, and inventory so that aircraft technical records stay current.
	- As an **administrator**, I want to create/update/delete users and roles so that system access matches organization responsibilities.
	- As an **administrator**, I want to export/import the database so that I can back up and restore operational data.
	- As an **administrator**, I want to review audit logs so that key changes remain traceable.

- **Acceptance Criteria**:
	- **CG calculation flow**
		- User can select a glider in Streamlit and submit loading inputs.
		- Backend returns total weight and CG values for requested configuration.
		- UI displays envelope result and highlights out-of-sector conditions.
	- **Glider management**
		- Admin/editor pages allow create/update/delete of glider data via backend routes.
		- Inventory and weighing entries persist in DuckDB and are returned in subsequent reads.
		- Registration formats accepted by UI/backend remain consistent with existing validation patterns.
	- **Authentication/RBAC**
		- Login issues JWT token; logout clears session state in frontend.
		- `administrator`, `editor`, `viewer` role semantics remain enforced server-side.
		- Unauthorized access attempts return `401/403` without exposing sensitive internals.
	- **Admin operations**
		- Users CRUD works from `/api/users` and users UI.
		- Database export returns zip payload; database import replaces active DB with validated import content.
		- Audit routes return paginated logs and support admin-only purge action.
	- **Operational reliability**
		- App can run as split processes (uvicorn + streamlit) and via unified `start.sh`.
		- Existing pytest and Playwright suites remain runnable from repository scripts/commands.

- **Non-Goals**:
	- Mobile-native app development.
	- Multi-tenant/org-level partitioning.
	- External identity providers (OIDC/SAML) beyond current JWT credential flow.
	- Replacing Streamlit/FastAPI/DuckDB stack.

## 3. AI System Requirements (If Applicable)

- **Tool Requirements**: Not applicable for product runtime; PyGliderCG is not currently an AI inference system.
- **Evaluation Strategy**: Not applicable for model quality. Validation is based on deterministic API behavior, calculation correctness, and test suite outcomes.

## 4. Technical Specifications

- **Architecture Overview**:
	- **Frontend**: Streamlit app (`frontend/streamlit_app.py` + `frontend/pages/*`) handles authentication state, role-based navigation, and forms/workflows.
	- **Backend**: FastAPI app (`backend/main.py`) exposes routers for auth, users, gliders, audit, and database admin functions.
	- **Domain Logic**: Core CG and mass/balance formulas are implemented in `backend/models/glider.py`.
	- **Persistence**: DuckDB stores users, gliders, weighings, WB limits, inventory, and audit logs; startup initialization occurs in `backend/init_db.py`.
	- **Client Integration**: `frontend/backend_client.py` centralizes HTTP calls, bearer token header injection, retry behavior for GETs, and error mapping.

- **Integration Points**:
	- **APIs**:
		- Auth: `/api/auth/*`
		- Users: `/api/users/*` (admin-only)
		- Gliders: `/api/gliders/*` (mixed public/admin operations)
		- Audit: `/api/audit-logs/*`
		- Database Admin: `/api/database/export`, `/api/database/import`
	- **Database**: DuckDB file path from `DB_NAME`.
	- **Auth**: JWT signed with `JWT_SECRET_KEY`, role checks via middleware dependencies.
	- **E2E Base URL**: Playwright uses Streamlit base URL (`http://127.0.0.1:8501` by default).

- **Security & Privacy**:
	- Passwords are bcrypt-hashed; plaintext is not persisted.
	- JWT bearer authentication gates protected routes; role checks enforce least-privilege access.
	- Database import/export restricted to administrator role.
	- Audit log captures operational change events to support traceability.
	- Environment secrets (`JWT_SECRET_KEY`, DB path, backend URL) are externalized via `.env`.

## 5. Risks & Roadmap

- **Phased Rollout**:
	- **MVP (Current Baseline)**:
		- Operational Streamlit + FastAPI + DuckDB stack.
		- CG calculation and glider technical workflows.
		- JWT auth, RBAC, users admin, audit log, DB import/export.
	- **v1.1 (Stabilization)**:
		- Tighten endpoint consistency and API documentation drift checks.
		- Improve negative-path test coverage for auth, import/export, and audit filtering.
		- Harden migration and backup operational procedures.
	- **v2.0 (Scalability/Operational Maturity)**:
		- Enhanced observability (structured logs/metrics dashboarding).
		- Optional modularization of frontend/backend deployment modes.
		- Expanded compliance/reporting exports for operational governance.

- **Technical Risks**:
	- **Schema evolution risk**: DuckDB schema changes can break read/write assumptions across query layer and frontend payload expectations.
	- **Route compatibility risk**: Multiple glider route variants (`/{id}` and `/by-id/{id:path}`) can diverge if not kept aligned.
	- **Access control regression risk**: RBAC drift may expose admin actions or block valid workflows.
	- **Data import risk**: Invalid import archives can corrupt operational DB if validation/regression coverage is insufficient.
	- **Operational coupling risk**: Frontend and backend availability are tightly coupled for user workflows.
