# PyGliderCG API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
   - [Authentication Routes](#authentication-routes)
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
│  ┌──────────────┬──────────────┬───────────────┐               │
│  │  Auth       │  Gliders     │  Audit Logs   │               │
│  │  Router     │  Router      │  Router       │               │
│  └──────────────┴──────────────┴───────────────┘               │
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
| **admin** | Full CRUD on all resources, audit log access, user management | System administrators |
| **editor** | Create/update/delete gliders, view audit logs | Flight test engineers, maintenance staff |
| **viewer** | List gliders, view details, calculate W&B, view own audit entries | Pilots, flight instructors |

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
  "user_id": "u123",
  "username": "pilot1",
  "role": "viewer",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**cURL Example:**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

### Gliders Routes

All glider endpoints are at `/api/gliders` prefix. Requires authentication.

#### List Gliders

```
GET /api/gliders
```

List all gliders with pagination support.

**Query Parameters:**
- `skip` (optional, default: 0): Number of records to skip
- `limit` (optional, default: 100): Maximum records to return

**Response (200 OK):**
```json
{
  "gliders": [
    {
      "glider_id": "g001",
      "name": "ASW-28",
      "type": "Single-seat",
      "manufacturer": "Alexander Schleicher",
      "wing_area": 10.4,
      "mass_empty": 230,
      "max_mass": 525,
      "cg_forward": 23.5,
      "cg_aft": 26.2,
      "created_at": "2024-01-10T08:00:00Z",
      "updated_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 42,
  "skip": 0,
  "limit": 100
}
```

**cURL Example:**
```bash
curl 'http://localhost:8000/api/gliders?skip=0&limit=10' \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Get Single Glider

```
GET /api/gliders/{glider_id}
```

Retrieve details for a specific glider.

**Path Parameters:**
- `glider_id`: Unique glider identifier

**Response (200 OK):**
```json
{
  "glider_id": "g001",
  "name": "ASW-28",
  "type": "Single-seat",
  "manufacturer": "Alexander Schleicher",
  "wing_area": 10.4,
  "mass_empty": 230,
  "max_mass": 525,
  "cg_forward": 23.5,
  "cg_aft": 26.2,
  "created_at": "2024-01-10T08:00:00Z",
  "updated_at": "2024-01-10T08:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Glider does not exist

**cURL Example:**
```bash
curl http://localhost:8000/api/gliders/g001 \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Create Glider

```
POST /api/gliders
```

Create a new glider record. **Requires admin role.**

**Request Body:**
```json
{
  "name": "ASW-27",
  "type": "Single-seat",
  "manufacturer": "Alexander Schleicher",
  "wing_area": 10.3,
  "mass_empty": 245,
  "max_mass": 525,
  "cg_forward": 24.0,
  "cg_aft": 26.5
}
```

**Response (201 Created):**
```json
{
  "glider_id": "g042",
  "name": "ASW-27",
  "type": "Single-seat",
  "manufacturer": "Alexander Schleicher",
  "wing_area": 10.3,
  "mass_empty": 245,
  "max_mass": 525,
  "cg_forward": 24.0,
  "cg_aft": 26.5,
  "created_at": "2024-01-20T14:00:00Z",
  "updated_at": "2024-01-20T14:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: User does not have admin role
- `422 Unprocessable Entity`: Invalid request data

**cURL Example:**
```bash
curl -X POST http://localhost:8000/api/gliders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ASW-27",
    "type": "Single-seat",
    "manufacturer": "Alexander Schleicher",
    "wing_area": 10.3,
    "mass_empty": 245,
    "max_mass": 525,
    "cg_forward": 24.0,
    "cg_aft": 26.5
  }'
```

---

#### Update Glider

```
PUT /api/gliders/{glider_id}
```

Update glider information. **Requires admin role.**

**Path Parameters:**
- `glider_id`: Glider to update

**Request Body:**
```json
{
  "name": "ASW-27-B",
  "cg_forward": 24.2,
  "cg_aft": 26.8
}
```

**Response (200 OK):**
```json
{
  "glider_id": "g001",
  "name": "ASW-27-B",
  "type": "Single-seat",
  "manufacturer": "Alexander Schleicher",
  "wing_area": 10.3,
  "mass_empty": 245,
  "max_mass": 525,
  "cg_forward": 24.2,
  "cg_aft": 26.8,
  "created_at": "2024-01-10T08:00:00Z",
  "updated_at": "2024-01-20T14:05:00Z"
}
```

**Error Responses:**
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Glider does not exist
- `422 Unprocessable Entity`: Invalid data

---

#### Delete Glider

```
DELETE /api/gliders/{glider_id}
```

Delete a glider record. **Requires admin role.**

**Path Parameters:**
- `glider_id`: Glider to delete

**Response (200 OK):**
```json
{
  "message": "Glider deleted successfully"
}
```

**Error Responses:**
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Glider does not exist

---

#### Get CG Limits

```
GET /api/gliders/{glider_id}/limits
```

Retrieve center of gravity envelope and limits. Requires authentication.

**Path Parameters:**
- `glider_id`: Glider identifier

**Response (200 OK):**
```json
{
  "glider_id": "g001",
  "glider_name": "ASW-28",
  "cg_forward": 23.5,
  "cg_aft": 26.2,
  "cg_range": 2.7,
  "forward_limit_datum": 0.235,
  "aft_limit_datum": 0.262,
  "envelope_type": "linear",
  "notes": "Certified per FAI standards"
}
```

---

#### Calculate Weight & Balance

```
POST /api/gliders/{glider_id}/calculate
```

Calculate weight and balance for given glider configuration. Requires authentication.

**Path Parameters:**
- `glider_id`: Glider identifier

**Request Body:**
```json
{
  "pilot_mass": 75,
  "ballast_mass": 20,
  "fuel_mass": 0,
  "equipment_mass": 5,
  "configuration": "cruise"
}
```

**Response (200 OK):**
```json
{
  "glider_id": "g001",
  "total_mass": 530,
  "calculated_cg": 24.8,
  "cg_percent_mac": 45.5,
  "within_envelope": true,
  "margin_forward": 1.3,
  "margin_aft": 1.4,
  "moment": 13104,
  "status": "SAFE",
  "warnings": []
}
```

**Error Responses:**
- `400 Bad Request`: Invalid mass values
- `422 Unprocessable Entity`: Calculation error

---

### Audit Routes

All audit endpoints are at `/api/audit-logs` prefix.

#### List Audit Logs

```
GET /api/audit-logs
```

List audit logs. **Requires admin role.**

**Query Parameters:**
- `skip` (optional, default: 0): Records to skip
- `limit` (optional, default: 100): Maximum records
- `user_id` (optional): Filter by user
- `action_type` (optional): Filter by action (create, update, delete)
- `date_from` (optional): Filter from date (ISO format)
- `date_to` (optional): Filter to date (ISO format)

**Response (200 OK):**
```json
{
  "logs": [
    {
      "log_id": "l001",
      "user_id": "u123",
      "username": "admin1",
      "action": "CREATE",
      "resource_type": "glider",
      "resource_id": "g001",
      "timestamp": "2024-01-15T10:30:00Z",
      "changes": {
        "name": "ASW-28",
        "wing_area": 10.4
      },
      "ip_address": "192.168.1.100"
    }
  ],
  "total": 245
}
```

---

#### Get Resource History

```
GET /api/audit-logs/resource/{resource_type}/{resource_id}
```

Get change history for a specific resource.

**Path Parameters:**
- `resource_type`: Type of resource (glider, user, etc.)
- `resource_id`: Resource identifier

**Response (200 OK):**
```json
{
  "resource_id": "g001",
  "resource_type": "glider",
  "history": [
    {
      "version": 1,
      "timestamp": "2024-01-10T08:00:00Z",
      "action": "CREATE",
      "user_id": "u001",
      "changes": {
        "name": "ASW-28",
        "wing_area": 10.4
      }
    },
    {
      "version": 2,
      "timestamp": "2024-01-15T10:30:00Z",
      "action": "UPDATE",
      "user_id": "u123",
      "changes": {
        "cg_forward": 23.5
      }
    }
  ]
}
```

---

#### Get User Actions

```
GET /api/audit-logs/user/{user_id}
```

Get all actions performed by a user. Users can view own actions; admins can view any user.

**Path Parameters:**
- `user_id`: User identifier

**Query Parameters:**
- `skip` (optional, default: 0): Records to skip
- `limit` (optional, default: 100): Maximum records

**Response (200 OK):**
```json
{
  "user_id": "u123",
  "username": "pilot1",
  "actions": [
    {
      "log_id": "l042",
      "action": "READ",
      "resource_type": "glider",
      "resource_id": "g001",
      "timestamp": "2024-01-20T14:05:00Z"
    }
  ],
  "total": 127
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
      "loc": ["body", "wing_area"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
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
    user_id: str
    username: str
    password_hash: str  # Never returned in API responses
    role: Literal["admin", "editor", "viewer"]
    created_at: datetime
    is_active: bool
```

### LoginRequest

```python
class LoginRequest:
    username: str  # Required, 3-50 characters
    password: str  # Required, 8+ characters
```

### UserResponse

```python
class UserResponse:
    user_id: str
    username: str
    role: str
    created_at: datetime
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
    name: str              # Aircraft model name
    type: str              # "Single-seat", "Two-seat", etc.
    manufacturer: str      # Aircraft manufacturer
    wing_area: float       # m² (must be > 0)
    mass_empty: float      # kg
    max_mass: float        # kg
    cg_forward: float      # % MAC (must be < cg_aft)
    cg_aft: float          # % MAC (must be > cg_forward)
```

### GliderResponse

```python
class GliderResponse:
    glider_id: str
    name: str
    type: str
    manufacturer: str
    wing_area: float
    mass_empty: float
    max_mass: float
    cg_forward: float
    cg_aft: float
    created_at: datetime
    updated_at: datetime
```

### WeightBalanceCalculation

```python
class WeightBalanceCalculation:
    glider_id: str
    total_mass: float           # kg
    calculated_cg: float        # % MAC
    cg_percent_mac: float       # Position as percentage
    within_envelope: bool       # True if CG is within limits
    margin_forward: float       # Distance to forward limit
    margin_aft: float           # Distance to aft limit
    moment: float               # Total moment
    status: str                 # "SAFE", "CAUTION", "OUT_OF_LIMITS"
    warnings: List[str]         # Safety warnings
```

### AuditLog

```python
class AuditLog:
    log_id: str
    user_id: str
    username: str
    action: str                 # CREATE, READ, UPDATE, DELETE
    resource_type: str          # glider, user, config
    resource_id: str
    timestamp: datetime
    changes: dict               # Fields that changed
    ip_address: str
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
    headers=headers
)

print(f'Found {gliders_response.json()["total"]} gliders')
for glider in gliders_response.json()['gliders']:
    print(f"  - {glider['name']} ({glider['glider_id']})")

# Step 3: Calculate W&B for first glider
if gliders_response.json()['gliders']:
    glider_id = gliders_response.json()['gliders'][0]['glider_id']
    
    calc_response = requests.post(
        f'{BASE_URL}/gliders/{glider_id}/calculate',
        headers=headers,
        json={
            'pilot_mass': 75,
            'ballast_mass': 10,
            'fuel_mass': 0,
            'equipment_mass': 5,
            'configuration': 'cruise'
        }
    )
    
    result = calc_response.json()
    print(f"\nW&B Calculation Result:")
    print(f"  Total Mass: {result['total_mass']} kg")
    print(f"  CG Position: {result['calculated_cg']}% MAC")
    print(f"  Status: {result['status']}")
    if not result['within_envelope']:
        print(f"  WARNING: CG outside envelope!")

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
    "name": "DG-100G",
    "type": "Single-seat",
    "manufacturer": "Deutschman",
    "wing_area": 9.3,
    "mass_empty": 240,
    "max_mass": 525,
    "cg_forward": 23.8,
    "cg_aft": 27.5
  }' \
  | jq .
```

### Example 3: View Audit Log (Admin Only)

```bash
curl 'http://localhost:8000/api/audit-logs?limit=5&action_type=UPDATE' \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.logs[] | {user: .username, action: .action, resource: .resource_id, time: .timestamp}'
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
