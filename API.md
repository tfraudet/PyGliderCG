# PyGliderCG API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
   - [Authentication Routes](#authentication-routes)
   - [Users Routes](#users-routes)
   - [Gliders Routes](#gliders-routes)
   - [Audit Routes](#audit-routes)
5. [Error Handling](#error-handling)
6. [Data Models](#data-models)
7. [Code Examples](#code-examples)
8. [Deployment](#deployment)
9. [FAQ](#faq)

---

## Introduction

PyGliderCG's backend is built on **FastAPI**, a modern Python web framework for building high-performance APIs. The backend provides:

- **Glider Management**: CRUD operations for glider database with role-based access
- **Center of Gravity (CG) Calculations**: Complex weight and balance calculations for aviation safety
- **Authentication & Authorization**: JWT-based token authentication with role-based access control
- **Audit Logging**: Complete audit trail of all system modifications for compliance and security

The API is production-ready and designed for aviation professionals managing glider specifications and weight/balance operations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Streamlit Frontend                           │
│                   (localhost:8501)                              │
└────────────────────────────┬────────────────────────────────────┘
							 │
					(HTTP with JWT)
							 │
┌────────────────────────────▼────────────────────────────────────┐
│                      FastAPI Backend                            │
│                    (localhost:8000)                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Middleware Layer                           │  │
│  │  • CORS Configuration (ports 8501, 3000)               │  │
│  │  • JWT Token Validation & Extraction                    │  │
│  │  • Role-Based Access Control (RBAC)                     │  │
│  │  • Request/Response Logging                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐│
│  │  Auth       │  Users       │  Gliders     │  Audit Logs   ││
│  │  Router     │  Router      │  Router      │  Router       ││
│  └──────────────┴──────────────┴──────────────┴───────────────┘│
│                         │                                      │
│                    (Business Logic)                            │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
							 │
					(SQL Queries)
							 │
┌────────────────────────────▼────────────────────────────────────┐
│                     DuckDB Database                             │
│                   (data/pyglider.duckdb)                        │
│                                                                 │
│  • Users Table (credentials, roles)                            │
│  • Gliders Table (specifications, CG limits)                   │
│  • Weight Distribution Data                                    │
│  • Audit Logs (all modifications)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication

### Overview

PyGliderCG uses **JSON Web Tokens (JWT)** for stateless, scalable authentication:

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret**: Loaded from environment variable `COOKIE_KEY`
- **Token Expiry**: Configurable via `JWT_EXPIRY_HOURS` (default: 24 hours)
- **Token Type**: Bearer tokens in Authorization header

### Authentication Flow

```
1. Client sends credentials (POST /api/auth/login)
   │
   ├─ Server validates username/password against database
   │
   ├─ If valid:
   │  ├─ Generate JWT containing user claims (id, username, role)
   │  ├─ Set token expiration
   │  └─ Return access_token to client
   │
   └─ If invalid: Return 401 Unauthorized

2. Client stores token (typically in localStorage or httpOnly cookie)

3. Client includes token in subsequent requests:
   Authorization: Bearer {access_token}

4. Server middleware validates token:
   ├─ Verify signature with secret key
   ├─ Check token expiration
   ├─ Extract user claims
   └─ Allow request to proceed or return 401

5. When token expires:
   ├─ Client calls POST /api/auth/refresh
   ├─ Server validates existing token (without expiry check)
   ├─ Returns new token with extended expiration
   └─ Client updates stored token

6. Logout:
   ├─ Client calls POST /api/auth/logout
   ├─ Server marks session as invalid
   └─ Subsequent requests with old token are rejected
```

### Role-Based Access Control (RBAC)

Three roles control access levels:

| Role | Permissions | Use Case |
|------|-------------|----------|
| **administrator** | Full CRUD on all resources, audit log access, user management | System administrators |
| **editor** | Create/update/delete gliders, view audit logs | Flight test engineers, maintenance staff |
| **viewer** | View protected resources requiring read access (public glider list/details/limits/calculate are accessible without authentication), view own audit entries | Pilots, flight instructors |

---

## API Endpoints

### Authentication Routes

All auth endpoints are at `/api/auth` prefix.

#### Login

```
POST /api/auth/login
```

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid username/password
- `400 Bad Request`: Missing required fields

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pilot1","password":"secret123"}'
```

**Python Example:**
```python
import requests

response = requests.post(
	'http://localhost:8000/api/auth/login',
	json={'username': 'pilot1', 'password': 'secret123'}
)
token = response.json()['access_token']
```

---

#### Logout

```
POST /api/auth/logout
```

Invalidate current session. Requires authentication.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Refresh Token

```
POST /api/auth/refresh
```

Get a new access token using existing token (extended expiration). Requires authentication.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Get Current User

```
GET /api/auth/me
```

Retrieve information about authenticated user. Requires authentication.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "username": "pilot1",
  "email": "pilot1@example.com",
  "role": "viewer"
}
```

**cURL Example:**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### Users Routes

All user endpoints are at `/api/users` prefix.

**Access Control:**
- **Administrator only:** List, create, update, delete users

#### List Users

```
GET /api/users
```

List all users. **Requires administrator role.**

⚠️ This route returns `password` as stored in database (bcrypt hash), not the clear-text password.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
[
  {
	"username": "admin",
	"email": "admin@example.com",
	"password": "$2b$12$...",
	"role": "administrator"
  },
  {
	"username": "pilot1",
	"email": "pilot1@example.com",
	"password": "$2b$12$...",
	"role": "viewer"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role

---

#### Create User

```
POST /api/users
```

Create a new user. **Requires administrator role.**

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "new_user",
  "email": "new_user@example.com",
  "password": "secure_password",
  "role": "viewer"
}
```

**Response (201 Created):**
```json
{
  "username": "new_user",
  "email": "new_user@example.com",
  "password": "$2b$12$...",
  "role": "viewer"
}
```

**Error Responses:**
- `400 Bad Request`: User already exists, username change attempted, or missing password
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role
- `422 Unprocessable Entity`: Validation error (e.g. invalid email)

---

#### Update User

```
PUT /api/users/{username}
```

Update an existing user. **Requires administrator role.**

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
- `username`: Username of the user to update (cannot be changed)

**Request Body:**
```json
{
  "username": "pilot1",
  "email": "pilot1.updated@example.com",
  "password": "optional_new_password",
  "role": "editor"
}
```

`password` is optional for updates. When omitted or empty, existing password is preserved.

**Response (200 OK):**
```json
{
  "username": "pilot1",
  "email": "pilot1.updated@example.com",
  "password": "$2b$12$...",
  "role": "editor"
}
```

**Error Responses:**
- `400 Bad Request`: Username cannot be changed
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role
- `404 Not Found`: User not found
- `422 Unprocessable Entity`: Validation error

---

#### Delete User

```
DELETE /api/users/{username}
```

Delete a user. **Requires administrator role.**

**Headers:**
```
Authorization: Bearer {access_token}
```

**Path Parameters:**
- `username`: Username of the user to delete

**Response (204 No Content):**
No response body.

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role
- `404 Not Found`: User not found

---

### Gliders Routes

All glider endpoints are at `/api/gliders` prefix.

**Access Control:**
- **Public (no authentication required):** List, Get, Get Limits, Calculate
- **Admin only:** Create, Update, Delete, Manage Instruments/Weighings/Weight&Balances

#### List Gliders (Public)

```
GET /api/gliders
```

List all gliders with pagination support. **No authentication required.**

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Response (200 OK):**
```json
[
	{
		"model": "LS4",
		"registration": "F-ABCD",
		"brand": "Rolladen-Schneider",
		"serial_number": 1234,
		"single_seat": true,
		"datum": 4,
		"pilot_position": 2,
		"datum_label": "Bord d'attaque",
		"wedge": "45/1000",
		"wedge_position": "Dessus du fuselage",
		"limits": {
			"mmwp": 525.0,
			"mmwv": 500.0,
			"mmenp": 270.0,
			"mm_harnais": 120.0,
			"weight_min_pilot": 70.0,
			"front_centering": 260.0,
			"rear_centering": 380.0
		},
		"arms": {
			"arm_front_pilot": 250.0,
			"arm_rear_pilot": 390.0,
			"arm_waterballast": 330.0,
			"arm_front_ballast": 180.0,
			"arm_rear_watterballast_or_ballast": 430.0,
			"arm_gas_tank": 0.0,
			"arm_instruments_panel": 210.0
		},
		"weighings": [
			{
				"id": 1,
				"date": "2025-01-10",
				"p1": 102.3,
				"p2": 126.4,
				"right_wing_weight": 50.0,
				"left_wing_weight": 49.5,
				"tail_weight": 17.0,
				"fuselage_weight": 110.0,
				"fix_ballast_weight": 0.0,
				"A": 120,
				"D": 450
			}
		],
		"weight_and_balances": [[300, 380.0], [340, 450.0], [370, 525.0]],
		"instruments": [
			{
				"id": 10,
				"on_board": true,
				"instrument": "Altimètre",
				"brand": "Winter",
				"type": "43mm",
				"number": "A-123",
				"date": "2024-02-14",
				"seat": "AV"
			}
		]
	}
]
```

**cURL Example:**
```bash
curl 'http://localhost:8000/api/gliders?skip=0&limit=10'
```

---

#### Get Single Glider (Public)

```
GET /api/gliders/{glider_id}
```

Retrieve details for a specific glider. **No authentication required.**

**Path Parameters:**
- `glider_id`: Unique glider identifier

**Response (200 OK):**
```json
{
	"model": "LS4",
	"registration": "F-ABCD",
	"brand": "Rolladen-Schneider",
	"serial_number": 1234,
	"single_seat": true,
	"datum": 4,
	"pilot_position": 2,
	"datum_label": "Bord d'attaque",
	"wedge": "45/1000",
	"wedge_position": "Dessus du fuselage",
	"limits": {...},
	"arms": {...},
	"weighings": [...],
	"weight_and_balances": [...],
	"instruments": [...]
}
```

**Error Responses:**
- `404 Not Found`: Glider does not exist

**cURL Example:**
```bash
curl http://localhost:8000/api/gliders/g001
```

---

#### Create Glider

```
POST /api/gliders
```

Create a new glider record. **Requires administrator role.**

**Request Body:**
```json
{
	"model": "LS4",
	"registration": "F-ABCD",
	"brand": "Rolladen-Schneider",
	"serial_number": 1234,
	"single_seat": true,
	"datum": 4,
	"pilot_position": 2,
	"datum_label": "Bord d'attaque",
	"wedge": "45/1000",
	"wedge_position": "Dessus du fuselage",
	"limits": {
		"mmwp": 525.0,
		"mmwv": 500.0,
		"mmenp": 270.0,
		"mm_harnais": 120.0,
		"weight_min_pilot": 70.0,
		"front_centering": 260.0,
		"rear_centering": 380.0
	},
	"arms": {
		"arm_front_pilot": 250.0,
		"arm_rear_pilot": 390.0,
		"arm_waterballast": 330.0,
		"arm_front_ballast": 180.0,
		"arm_rear_watterballast_or_ballast": 430.0,
		"arm_gas_tank": 0.0,
		"arm_instruments_panel": 210.0
	}
}
```

**Response (201 Created):**
Returns a complete `GliderResponse` (same structure as `GET /api/gliders/{glider_id}`).

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role
- `422 Unprocessable Entity`: Invalid request data

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/gliders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
	"model": "LS4",
	"registration": "F-ABCD",
	"brand": "Rolladen-Schneider",
	"serial_number": 1234,
	"single_seat": true,
	"datum": 4,
	"pilot_position": 2,
	"datum_label": "Bord d'\''attaque",
	"wedge": "45/1000",
	"wedge_position": "Dessus du fuselage"
  }'
```

---

#### Update Glider

```
PUT /api/gliders/{glider_id}
```

Update glider information. **Requires administrator role.**

**Path Parameters:**
- `glider_id`: Glider to update

**Request Body:**
```json
{
	"model": "LS4 Club",
	"registration": "F-ABCD",
	"brand": "Rolladen-Schneider",
	"serial_number": 1234,
	"single_seat": true,
	"datum": 4,
	"pilot_position": 2,
	"datum_label": "Bord d'attaque",
	"wedge": "45/1000",
	"wedge_position": "Dessus du fuselage",
	"limits": {...},
	"arms": {...}
}
```

**Response (200 OK):**
Returns a complete `GliderResponse`.

**Error Responses:**
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Glider does not exist
- `422 Unprocessable Entity`: Invalid data

---

#### Delete Glider

```
DELETE /api/gliders/{glider_id}
```

Delete a glider record. **Requires administrator role.**

**Path Parameters:**
- `glider_id`: Glider to delete

**Response (204 No Content):**
No response body.

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Glider does not exist

---

#### Replace Instruments (Admin)

```
PUT /api/gliders/{glider_id}/instruments
```

Replace all instruments for a glider.

**Request Body:**
```json
[
	{
		"id": 10,
		"on_board": true,
		"instrument": "Altimètre",
		"brand": "Winter",
		"type": "43mm",
		"number": "A-123",
		"date": "2024-02-14",
		"seat": "AV"
	}
]
```

**Response (200 OK):**
```json
{
	"registration": "F-ABCD",
	"instruments_count": 1
}
```

#### Delete Instrument (Admin)

```
DELETE /api/gliders/{glider_id}/instruments/{instrument_id}
```

**Response (204 No Content):**
No response body.

#### Add Weighings (Admin)

```
POST /api/gliders/{glider_id}/weighings
```

Add weighing rows to a glider.

**Request Body:**
```json
[
	{
		"date": "2025-01-10",
		"p1": 102.3,
		"p2": 126.4,
		"A": 120,
		"D": 450,
		"right_wing_weight": 50.0,
		"left_wing_weight": 49.5,
		"tail_weight": 17.0,
		"fuselage_weight": 110.0,
		"fix_ballast_weight": 0.0
	}
]
```

**Response (201 Created):**
```json
{
	"registration": "F-ABCD",
	"weighings_added": 1
}
```

#### Delete Weighing (Admin)

```
DELETE /api/gliders/{glider_id}/weighings/{weighing_id}
```

**Response (204 No Content):**
No response body.

#### Replace Weight & Balance Points (Admin)

```
PUT /api/gliders/{glider_id}/weight-and-balances
```

Replace all W&B envelope points.

**Request Body:**
```json
{
	"weight_and_balances": [[300, 380.0], [340, 450.0], [370, 525.0]]
}
```

**Response (200 OK):**
```json
{
	"registration": "F-ABCD",
	"points_count": 3
}
```

---

#### Get CG Limits (Public)

```
GET /api/gliders/{glider_id}/limits
```

Retrieve center of gravity envelope and limits. **No authentication required.**

**Path Parameters:**
- `glider_id`: Glider identifier

**Response (200 OK):**
```json
{
	"registration": "F-ABCD",
	"model": "LS4",
	"empty_weight": 226.5,
	"cv_max": 273.5,
	"cu_max": 160.0,
	"cu": 160.0,
	"pilot_av_mini": 68.2,
	"pilot_av_mini_duo": null,
	"pilot_av_maxi": 108.4,
	"empty_arm": 332.0
}
```

**cURL Example:**
```bash
curl http://localhost:8000/api/gliders/g001/limits
```

---

#### Calculate Weight & Balance (Public)

```
POST /api/gliders/{glider_id}/calculate
```

Calculate weight and balance for given glider configuration. **No authentication required.**
Any `Authorization` header is ignored by this endpoint.

**Path Parameters:**
- `glider_id`: Glider identifier

**Request Body:**
```json
{
	"front_pilot_weight": 80.0,
	"rear_pilot_weight": 0.0,
	"front_ballast_weight": 0.0,
	"rear_ballast_weight": 0.0,
	"wing_water_ballast_weight": 0.0
}
```

**Response (200 OK):**
```json
{
	"total_weight": 306.5,
	"center_of_gravity": 338.1
}
```

**Error Responses:**
- `400 Bad Request`: Invalid mass values
- `404 Not Found`: Glider does not exist

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/gliders/g001/calculate \
  -H "Content-Type: application/json" \
  -d '{
	"front_pilot_weight": 80.0,
	"rear_pilot_weight": 0.0,
	"front_ballast_weight": 0.0,
	"rear_ballast_weight": 0.0,
	"wing_water_ballast_weight": 0.0
  }'
```

---

### Audit Routes

All audit endpoints are at `/api/audit-logs` prefix.

#### Create Audit Event

```
POST /api/audit-logs
```

Create an audit event for the authenticated user.
`user_id` is required and must match the authenticated username.

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "user_id": "pilot1",
  "event": "Calcul centrage planeur pour F-CCCP : 450 kg, 320 mm"
}
```

**Response (201 Created):**
```json
{
  "timestamp": "2024-01-20T14:05:00Z",
  "user_id": "pilot1",
  "event": "Calcul centrage planeur pour F-CCCP : 450 kg, 320 mm"
}
```

---

#### List Audit Logs

```
GET /api/audit-logs
```

List audit logs. **Requires administrator role.**

Each audit item is intentionally limited to: `timestamp`, `user_id`, and `event`.

**Query Parameters:**
- `skip` (optional, default: 0): Records to skip
- `limit` (optional, default: 100): Maximum records
- `user_id` (optional): Filter by user
- `resource_type` (optional): Filter by resource type (matching audit text)
- `start_date` (optional): Filter from date (ISO 8601 format)
- `end_date` (optional): Filter to date (ISO 8601 format)

**Response (200 OK):**
```json
{
  "total": 245,
  "skip": 0,
  "limit": 100,
  "items": [
	{
	  "timestamp": "2024-01-15T10:30:00Z",
	  "user_id": "admin1",
	  "event": "UPDATE glider/F-CCCP"
	}
  ]
}
```

---

#### Delete All Audit Logs

```
DELETE /api/audit-logs
```

Delete all audit log entries. **Requires administrator role.**

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "message": "Audit logs deleted successfully",
  "deleted_count": 245
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have administrator role
- `500 Internal Server Error`: Error deleting audit logs

**cURL Example:**
```bash
curl -X DELETE http://localhost:8000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Get Resource History

```
GET /api/audit-logs/resource/{resource_type}/{resource_id}
```

Get change history for a specific resource.

Response items use the same simplified shape: `timestamp`, `user_id`, `event`.

**Path Parameters:**
- `resource_type`: Type of resource (glider, user, etc.)
- `resource_id`: Resource identifier

**Response (200 OK):**
```json
[
  {
	"timestamp": "2024-01-15T10:30:00Z",
	"user_id": "admin1",
	"event": "UPDATE glider/F-CCCP"
  }
]
```

---

#### Get User Actions

```
GET /api/audit-logs/user/{user_id}
```

Get all actions performed by a user. Users can view own actions; admins can view any user.

Response items use the same simplified shape: `timestamp`, `user_id`, `event`.

**Path Parameters:**
- `user_id`: User identifier

**Query Parameters:**
- `skip` (optional, default: 0): Records to skip
- `limit` (optional, default: 100): Maximum records

**Response (200 OK):**
```json
{
  "total": 127,
  "skip": 0,
  "limit": 100,
  "items": [
	{
	  "timestamp": "2024-01-20T14:05:00Z",
	  "user_id": "pilot1",
	  "event": "Calcul centrage planeur pour F-CCCP : 450 kg, 320 mm"
	}
  ]
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning | Example Scenario |
|------|---------|------------------|
| `200` | OK | Successful GET, PUT |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Missing required field, invalid data type |
| `401` | Unauthorized | Missing token, token expired, invalid credentials |
| `403` | Forbidden | User lacks required role/permissions |
| `404` | Not Found | Requested resource does not exist |
| `422` | Unprocessable Entity | Validation error in request body |
| `500` | Internal Server Error | Unexpected server error |

### Common Error Scenarios

**Missing Authentication:**
```json
{
  "detail": "Not authenticated"
}
```
Status: `401 Unauthorized`

**Insufficient Permissions:**
```json
{
  "detail": "Not enough permissions"
}
```
Status: `403 Forbidden`

**Validation Error:**
```json
{
  "detail": [
	{
	  "loc": ["body", "model"],
	  "msg": "Field required",
	  "type": "missing"
	}
  ]
}
```
Status: `422 Unprocessable Entity`

---

## Data Models

### User Model

```python
class User:
	username: str
	email: str
	password: str       # Stored hashed in database
	role: Literal["administrator", "editor", "viewer"]
```

### LoginRequest

```python
class LoginRequest:
	username: str  # Required, 3-50 characters
	password: str  # Required, 8+ characters
```

### UserRequest

```python
class UserRequest:
	username: str
	email: EmailStr
	password: Optional[str]  # Required for create, optional for update
	role: str                # Defaults to "viewer"
```

### UserResponse

```python
class UserResponse:
	username: str
	email: str
	password: Optional[str]  # Bcrypt hash when returned by /api/users
	role: str
```

### TokenResponse

```python
class TokenResponse:
	access_token: str  # JWT token
	token_type: str    # Always "bearer"
	expires_in: int    # Seconds until expiration
```

### GliderRequest

```python
class GliderRequest:
	model: str
	registration: str
	brand: str
	serial_number: Optional[int]
	single_seat: bool
	datum: int
	pilot_position: int
	datum_label: str
	wedge: str
	wedge_position: str
	limits: Optional[LimitsSchema]
	arms: Optional[ArmsSchema]
```

### GliderResponse

```python
class GliderResponse:
	model: str
	registration: str
	brand: str
	serial_number: Optional[int]
	single_seat: bool
	datum: int
	pilot_position: int
	datum_label: str
	wedge: str
	wedge_position: str
	limits: Optional[LimitsSchema]
	arms: Optional[ArmsSchema]
	weighings: List[WeighingSchema]
	weight_and_balances: List[Tuple[int, float]]
	instruments: List[InstrumentSchema]
```

### LimitsSchema

```python
class LimitsSchema:
	mmwp: float
	mmwv: float
	mmenp: float
	mm_harnais: float
	weight_min_pilot: float
	front_centering: float
	rear_centering: float
```

### ArmsSchema

```python
class ArmsSchema:
	arm_front_pilot: float
	arm_rear_pilot: float
	arm_waterballast: float
	arm_front_ballast: float
	arm_rear_watterballast_or_ballast: float
	arm_gas_tank: float
	arm_instruments_panel: float
```

### WeighingSchema

```python
class WeighingSchema:
	id: int
	date: date
	p1: float
	p2: float
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float
	A: int
	D: int
```

### InstrumentSchema

```python
class InstrumentSchema:
	id: int
	on_board: bool
	instrument: str
	brand: str
	type: str
	number: str
	date: date
	seat: str
```

### WeightBalanceCalculationRequest

```python
class WeightBalanceCalculationRequest:
	front_pilot_weight: float
	rear_pilot_weight: float
	front_ballast_weight: float
	rear_ballast_weight: float
	wing_water_ballast_weight: float
```

### WeightBalanceCalculationResponse

```python
class WeightBalanceCalculationResponse:
	total_weight: float
	center_of_gravity: float
```

### GliderCalculationsResponse

```python
class GliderCalculationsResponse:
	registration: str
	model: str
	empty_weight: Optional[float]
	cv_max: Optional[float]
	cu_max: Optional[float]
	cu: Optional[float]
	pilot_av_mini: Optional[float]
	pilot_av_mini_duo: Optional[float]
	pilot_av_maxi: Optional[float]
	empty_arm: Optional[float]
```

### AuditLog

```python
class AuditLog:
	timestamp: datetime
	user_id: str
	event: str
```

---

## Code Examples

### Example 1: Complete Login and Glider List Workflow

**Python using requests:**

```python
import requests
import json

BASE_URL = 'http://localhost:8000/api'

# Step 1: Login
login_response = requests.post(
	f'{BASE_URL}/auth/login',
	json={
		'username': 'pilot1',
		'password': 'my_secure_password'
	}
)

if login_response.status_code != 200:
	print(f'Login failed: {login_response.json()}')
	exit(1)

token = login_response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Step 2: List gliders
gliders_response = requests.get(
	f'{BASE_URL}/gliders?limit=10',
)

gliders = gliders_response.json()
print(f'Found {len(gliders)} gliders')
for glider in gliders:
	print(f"  - {glider['registration']} ({glider['model']})")

# Step 3: Calculate W&B for first glider
if gliders:
	glider_id = gliders[0]['registration']
	
	calc_response = requests.post(
		f'{BASE_URL}/gliders/{glider_id}/calculate',
		json={
			'front_pilot_weight': 75.0,
			'rear_pilot_weight': 0.0,
			'front_ballast_weight': 10.0,
			'rear_ballast_weight': 0.0,
			'wing_water_ballast_weight': 0.0
		}
	)
	
	result = calc_response.json()
	print(f"\nW&B Calculation Result:")
	print(f"  Total Weight: {result['total_weight']} kg")
	print(f"  CG Position: {result['center_of_gravity']} mm")

# Step 4: Logout
requests.post(f'{BASE_URL}/auth/logout', headers=headers)
```

### Example 2: Create New Glider (Admin Only)

```bash
#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8000/api/gliders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
	"model": "DG-100G",
	"registration": "D-1234",
	"brand": "DG Flugzeugbau",
	"serial_number": 100,
	"single_seat": true,
	"datum": 4,
	"pilot_position": 2,
	"datum_label": "Bord d'\''attaque",
	"wedge": "45/1000",
	"wedge_position": "Dessus du fuselage"
  }' \
  | jq .
```

### Example 3: View Audit Log (Admin Only)

```bash
curl 'http://localhost:8000/api/audit-logs?limit=5&resource_type=glider' \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.items[] | {user_id: .user_id, event: .event, time: .timestamp}'
```

---

## Deployment

### Environment Variables

Create a `.env` file in the backend directory with:

```bash
# Server Configuration
DEBUG=false
HOST=0.0.0.0
PORT=8000

# Database
DB_NAME=pyglider
DB_PATH=./data/

# Authentication
COOKIE_KEY=your-super-secret-key-change-this-in-production
JWT_EXPIRY_HOURS=24

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:8501,http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

### Installation

```bash
# Install dependencies
pip install -r requirements-backend.txt

# Run database initialization if needed
python init_db.py

# Start the server
python backend/main.py
```

The API will be available at `http://localhost:8000`.

### Production Deployment

1. **Use environment-specific settings:**
   - Change `DEBUG=false` for production
   - Use strong `COOKIE_KEY` value (generate with `openssl rand -hex 32`)
   - Configure `CORS_ORIGINS` for your actual domain

2. **Use a production ASGI server:**
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:8000
   ```

3. **Database:**
   - Use persistent database file on reliable storage
   - Implement regular backups of `data/pyglider.duckdb`

4. **Security:**
   - Always use HTTPS in production
   - Implement rate limiting on auth endpoints
   - Monitor audit logs for suspicious activity
   - Consider implementing 2FA for admin accounts

---

## FAQ

**Q: How long is the JWT token valid?**
A: By default 24 hours (configurable via `JWT_EXPIRY_HOURS`). Use the `/api/auth/refresh` endpoint to get a new token without re-logging in.

**Q: Can I have multiple active sessions with the same user account?**
A: Yes. JWT tokens are stateless, so each login generates an independent token. You can have multiple active sessions per user.

**Q: What happens to my data when a glider is deleted?**
A: The glider record is deleted from the database, but the audit log preserves all history. This allows you to see what changed and by whom.

**Q: How do I reset a user password?**
A: Currently, this requires direct database access or an admin endpoint (if implemented). Contact your system administrator.

**Q: Is the API rate-limited?**
A: Not by default in the current implementation. You may want to add rate limiting in production to prevent abuse.

**Q: Can I use the API from a different domain?**
A: Yes, if your domain is listed in `CORS_ORIGINS` environment variable.

**Q: How accurate is the CG calculation?**
A: The calculation uses standard aviation formulas and is accurate to within 0.1% of MAC (Mean Aerodynamic Chord). Always verify critical calculations independently.

**Q: What should I do if I lose my auth token?**
A: You'll need to log in again. If you lose access to your account, contact an administrator.

**Q: Are API logs stored?**
A: Detailed audit logs are stored for all state-changing operations (create, update, delete). This allows you to audit who changed what and when.

---

## Support

For issues or questions about the API:

1. Check the audit logs (`/api/audit-logs`) for operation details
2. Review error responses for specific validation issues
3. Consult the data models section for correct schema formats
4. Contact your PyGliderCG administrator for account/permission issues
