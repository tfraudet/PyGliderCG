# PyGliderCG Production Deployment Guide

> **Important:** the current runtime model is a **single Docker container** running both FastAPI and Streamlit.  
> Commands below in the "Quick Start with Docker Compose" section reflect this unified setup.

## Overview

This guide covers deploying the PyGliderCG application (FastAPI backend + Streamlit frontend) to production. The application uses Docker and Docker Compose for containerization and orchestration.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-deployment Checklist](#pre-deployment-checklist)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Management](#database-management)
7. [Health Checks & Monitoring](#health-checks--monitoring)
8. [Security Configuration](#security-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Scaling Considerations](#scaling-considerations)

---

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **Memory**: 2GB RAM minimum (4GB+ recommended)
- **Disk**: 10GB for OS + application + database
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+), macOS, or Windows with WSL2

### Software Requirements
- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- **Docker Compose**: 2.0+ ([Install Compose](https://docs.docker.com/compose/install/))
- **Python**: 3.10+ (only needed for local development)
- **Git**: For cloning the repository

### Recommended Production Stack
- **Container Runtime**: Docker or Kubernetes
- **Reverse Proxy**: Nginx or HAProxy
- **SSL/TLS**: Let's Encrypt certificates
- **Monitoring**: Prometheus + Grafana (optional)
- **Logging**: ELK Stack or similar (optional)

---

## Pre-deployment Checklist

Before deploying to production:

- [ ] Generate new `COOKIE_KEY` (see [Security Configuration](#security-configuration))
- [ ] Set all environment variables in `.env` or deployment platform
- [ ] Verify database backup strategy
- [ ] Test application locally with `docker compose up`
- [ ] Review CORS origins in `backend/config.py` for your domain
- [ ] Configure reverse proxy (Nginx/HAProxy)
- [ ] Set up SSL/TLS certificates
- [ ] Plan monitoring and logging
- [ ] Document deployment procedure
- [ ] Test rollback procedure
- [ ] Set up health check monitoring
- [ ] Configure database backups
- [ ] Review security headers configuration

---

## Local Development Setup

### Quick Start with Docker Compose (Unified App Container)

```bash
# 1. Clone the repository
git clone https://github.com/tfraudet/PyGliderCG.git
cd PyGliderCG

# 2. Create environment configuration
cp .env.example .env
# Edit .env and set required values, especially COOKIE_KEY

# 3. Start application service (frontend + backend)
docker compose up -d --build

# 4. Verify service is running
docker compose ps

# 5. Access services:
# - Frontend: http://localhost:8501
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### View Service Logs

```bash
# App service logs
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100 app
```

### Stop Services

```bash
# Stop all services (data persists)
docker compose down

# Remove all containers and volumes (data lost!)
docker compose down -v
```

### Development with Hot Reload

The docker compose setup includes volume mounts for development:

```yaml
volumes:
  - ./backend:/app/backend        # Backend auto-reload
  - ./frontend:/app/frontend      # Frontend auto-reload
  - ./data:/app/data              # Shared database
```

---

## Docker Deployment

### Building Images

#### Backend Image

```bash
# Build backend image
docker build -t pyglider-backend:latest -f backend/Dockerfile .

# Build with specific version tag
docker build -t pyglider-backend:v0.1.0 -f backend/Dockerfile .

# Build with buildkit for better performance
DOCKER_BUILDKIT=1 docker build -t pyglider-backend:latest -f backend/Dockerfile .
```

#### Frontend Image

```bash
# Build frontend image
docker build -t pyglider-frontend:latest .

# Build with version tag
docker build -t pyglider-frontend:v0.1.0 .
```

### Running Individual Containers

#### Backend Container

```bash
# Run backend standalone
docker run -d \
  --name pyglider-backend \
  -p 8000:8000 \
  -e DEBUG=false \
  -e DB_NAME=/app/data/gliders.db \
  -e COOKIE_KEY="your-secret-key-here" \
  -v $(pwd)/data:/app/data \
  pyglider-backend:latest

# Health check
curl http://localhost:8000/health
```

#### Unified Application Container

```bash
# Run unified app (FastAPI + Streamlit in one container)
docker run -d \
  --name pyglider-app \
  -p 8000:8000 \
  -p 8501:8501 \
  -e DEBUG=false \
  -e BACKEND_URL=http://127.0.0.1:8000 \
  -v $(pwd)/data:/app/data \
  pyglider-app:latest

# Health check
curl http://localhost:8000/health
curl http://localhost:8501/_stcore/health
```

### Multi-container with Docker Compose

```bash
# Start all services in background
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Production Deployment

### Environment Setup

Create a production `.env` file with appropriate values:

```bash
cat > /opt/pyglider/.env << EOF
DEBUG=false
DB_NAME=/var/lib/pyglider/data/gliders.db
DB_PATH=/var/lib/pyglider/data
HOST=0.0.0.0
PORT=8000
BACKEND_URL=https://api.yourdomain.com
COOKIE_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
LOG_LEVEL=WARNING
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1
EOF

chmod 600 /opt/pyglider/.env
```

### Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/pyglider`:

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:8501;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # Logging
    access_log /var/log/nginx/pyglider-api-access.log;
    error_log /var/log/nginx/pyglider-api-error.log;

    # API Proxy
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=200 nodelay;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logging
    access_log /var/log/nginx/pyglider-frontend-access.log;
    error_log /var/log/nginx/pyglider-frontend-error.log;

    # Frontend Proxy
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }

    # WebSocket support for Streamlit
    location /_stcore/stream {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test configuration:

```bash
sudo ln -s /etc/nginx/sites-available/pyglider /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL/TLS Certificate Setup

Using Let's Encrypt with Certbot:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Automatic renewal (runs via cron)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal schedule
sudo certbot renew --dry-run
```

### SystemD Service Files

#### Backend Service

Create `/etc/systemd/system/pyglider-backend.service`:

```ini
[Unit]
Description=PyGliderCG Backend (FastAPI)
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pyglider
EnvironmentFile=/opt/pyglider/.env
ExecStart=/usr/bin/docker run --rm \
    --name pyglider-backend \
    -p 8000:8000 \
    --env-file /opt/pyglider/.env \
    -v /var/lib/pyglider/data:/app/data \
    pyglider-backend:latest
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Frontend Service

Create `/etc/systemd/system/pyglider-frontend.service`:

```ini
[Unit]
Description=PyGliderCG Frontend (Streamlit)
After=docker.service pyglider-backend.service
Requires=docker.service pyglider-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pyglider
EnvironmentFile=/opt/pyglider/.env
ExecStart=/usr/bin/docker run --rm \
    --name pyglider-frontend \
    -p 8501:8501 \
    --env-file /opt/pyglider/.env \
    -v /var/lib/pyglider/data:/app/data \
    pyglider-frontend:latest
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:

```bash
sudo systemctl daemon-reload
sudo systemctl enable pyglider-backend pyglider-frontend
sudo systemctl start pyglider-backend pyglider-frontend
sudo systemctl status pyglider-backend pyglider-frontend
```

---

## Database Management

### Database Initialization

Initialize the DuckDB database:

```bash
# Using docker-compose profile
docker-compose --profile init up db-init

# Or manually run init script
docker run --rm \
    -v /var/lib/pyglider/data:/app/data \
    -e DB_NAME=/app/data/gliders.db \
    pyglider-frontend:latest \
    python init_db.py
```

### Database Backups

#### Automated Backup Script

Create `/opt/pyglider/backup-db.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/lib/pyglider/backups"
DB_FILE="/var/lib/pyglider/data/gliders.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gliders_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

# Create backup
cp "$DB_FILE" "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "gliders_*.db.gz" -mtime +30 -delete

echo "Database backup completed: ${BACKUP_FILE}.gz"
```

Make executable and create cron job:

```bash
chmod +x /opt/pyglider/backup-db.sh

# Add to crontab (backup daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/pyglider/backup-db.sh") | crontab -
```

#### Manual Backup

```bash
# Backup database
cp /var/lib/pyglider/data/gliders.db /var/lib/pyglider/backups/gliders_$(date +%Y%m%d_%H%M%S).db

# Restore from backup
cp /var/lib/pyglider/backups/gliders_YYYYMMDD_HHMMSS.db /var/lib/pyglider/data/gliders.db
```

### Database Verification

```bash
# Check database integrity
docker run --rm \
    -v /var/lib/pyglider/data:/app/data \
    pyglider-backend:latest \
    python -c "import duckdb; conn = duckdb.connect('/app/data/gliders.db'); print('Database OK')"

# Query database size
du -h /var/lib/pyglider/data/gliders.db
```

---

## Health Checks & Monitoring

### Backend Health Check

```bash
# Basic health check
curl -s http://localhost:8000/health | jq .

# Continuous monitoring
watch -n 5 'curl -s http://localhost:8000/health | jq .'

# Include HTTP status code
curl -w "\nHTTP Status: %{http_code}\n" -s http://localhost:8000/health
```

### Frontend Health Check

```bash
# Streamlit health endpoint
curl -s http://localhost:8501/_stcore/health

# Full status check
curl -w "\nHTTP Status: %{http_code}\n" -s http://localhost:8501/_stcore/health
```

### Docker Container Health

```bash
# Check container status
docker-compose ps

# View detailed container logs
docker-compose logs backend frontend

# Monitor in real-time
docker stats

# Check container health status
docker inspect pyglider-backend | jq '.[0].State.Health'
```

### Prometheus Monitoring (Optional)

Create `/opt/pyglider/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'pyglider-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
```

---

## Security Configuration

### Environment Variables

**CRITICAL**: Never commit sensitive data to version control.

```bash
# Generate secure COOKIE_KEY
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Store in .env (not committed)
COOKIE_KEY="your-generated-secret-here"
```

### FastAPI Security Headers

The backend includes:
- CORS configuration
- JWT authentication
- Password hashing with bcrypt
- Secure cookie handling

Configure CORS origins in `backend/config.py`:

```python
CORS_ORIGINS: list[str] = [
    "https://yourdomain.com",
    "https://api.yourdomain.com",
]
```

### Network Security

```bash
# UFW Firewall (Ubuntu)
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status

# Monitor open ports
sudo netstat -tulpn | grep LISTEN
```

### Secrets Management

For production, use a secrets manager:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Kubernetes Secrets**

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Common issues:
# 1. Port already in use
sudo lsof -i :8000

# 2. Database permission denied
ls -la /var/lib/pyglider/data/

# 3. Invalid environment variables
docker run -it pyglider-backend:latest env | grep COOKIE_KEY
```

### Connection Refused

```bash
# Verify service is running
docker-compose ps

# Check network
docker network inspect pyglider-network

# Test from host
telnet localhost 8000
curl -v http://localhost:8000/health
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Limit memory (add to docker-compose.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Database Corruption

```bash
# Verify database
duckdb /var/lib/pyglider/data/gliders.db ".tables"

# Restore from backup
cp /var/lib/pyglider/backups/gliders_YYYYMMDD_HHMMSS.db \
   /var/lib/pyglider/data/gliders.db

# Restart services
docker-compose restart
```

### Nginx 502 Bad Gateway

```bash
# Check backend is running
curl http://localhost:8000/health

# Check nginx logs
tail -f /var/log/nginx/pyglider-api-error.log

# Verify proxy configuration
sudo nginx -t
```

---

## Scaling Considerations

### Horizontal Scaling (Multiple Servers)

Use a load balancer to distribute traffic:

```nginx
upstream backend {
    server server1:8000 weight=1;
    server server2:8000 weight=1;
    server server3:8000 weight=1;
    keepalive 64;
}
```

### Vertical Scaling (Larger Servers)

Adjust resource allocation:

```bash
# Increase memory/CPU in docker-compose.yml
resources:
  limits:
    cpus: '4'
    memory: 2G
  reservations:
    cpus: '2'
    memory: 1G
```

### Database Optimization

```bash
# Check database statistics
duckdb /var/lib/pyglider/data/gliders.db "PRAGMA table_info(gliders);"

# Analyze performance
duckdb /var/lib/pyglider/data/gliders.db "EXPLAIN SELECT * FROM gliders;"
```

### Container Orchestration

For production at scale, consider:
- **Kubernetes**: Full orchestration platform
- **Docker Swarm**: Simpler alternative
- **AWS ECS**: AWS-managed containers
- **Google Cloud Run**: Serverless containers

---

## Maintenance

### Regular Tasks

**Daily**
- Monitor health checks
- Check error logs
- Verify services running

**Weekly**
- Review database size
- Check disk space
- Monitor performance metrics

**Monthly**
- Test backup/restore procedure
- Update dependencies
- Review security logs
- Performance optimization

### Updates and Patching

```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose down
docker-compose up -d

# Verify health
curl http://localhost:8000/health
```

### Log Management

```bash
# View recent logs
docker-compose logs --tail=100 backend

# Export logs
docker-compose logs backend > backup/logs-$(date +%Y%m%d).txt

# Log rotation (configure in /etc/logrotate.d/)
```

---

## Support and Resources

- **GitHub Issues**: [PyGliderCG Issues](https://github.com/tfraudet/PyGliderCG/issues)
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Streamlit Documentation**: https://docs.streamlit.io/
- **Docker Documentation**: https://docs.docker.com/

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024 | Initial production deployment guide |

---

**Last Updated**: 2024
**Maintainer**: PyGliderCG Team
