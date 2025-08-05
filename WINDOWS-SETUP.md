# 🚀 SPX-GC SaaS Platform - Windows 11 Quick Start

This repository is now configured to run seamlessly on Windows 11 with Docker.

## 🎯 One-Click Setup Options

### Option 1: PowerShell (Recommended)
```powershell
.\start-windows.ps1
```

### Option 2: Command Prompt
```cmd
start-windows.bat
```

### Option 3: Manual Docker Compose
```powershell
docker-compose -f docker-compose.windows.yml up --build -d
```

## 📋 What Gets Started

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Frontend | 3000 | http://localhost:3000 | React Admin Dashboard |
| Backend API | 3001 | http://localhost:3001 | Node.js REST API |
| PostgreSQL | 5432 | localhost:5432 | Database Server |
| Redis | 6379 | localhost:6379 | Session Store |

## ✅ Prerequisites

- ✅ Windows 11
- ✅ Docker Desktop (already installed)
- ✅ Git (for repository access)

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.windows.yml` | Windows-optimized Docker services |
| `backend/Dockerfile.windows` | Backend container configuration |
| `frontend/Dockerfile.windows` | Frontend container configuration |
| `.env` | Environment variables (auto-created) |

## 🚨 Troubleshooting

### Port Conflicts
If ports 3000, 3001, 5432, or 6379 are in use:
```powershell
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# Stop conflicting services or use different ports
```

### Clean Restart
```powershell
docker-compose -f docker-compose.windows.yml down --volumes
docker system prune -f
docker-compose -f docker-compose.windows.yml up --build --force-recreate
```

### View Logs
```powershell
# All services
docker-compose -f docker-compose.windows.yml logs -f

# Specific service
docker-compose -f docker-compose.windows.yml logs -f backend
```

## 📱 Application Features

Once running, you'll have access to:
- **Multi-tenant SaaS dashboard**
- **SPX Graphics Control functionality**
- **Subscription management**
- **User administration**
- **Billing integration (Stripe)**
- **Analytics and reporting**

## 🛑 Stop Services

```powershell
docker-compose -f docker-compose.windows.yml down
```

## 📚 Additional Documentation

- `README-WINDOWS.md` - Detailed Windows setup guide
- `README.md` - Original project documentation
- `DEPLOYMENT.md` - Production deployment guide

---

**🎉 Ready to go! Run one of the startup scripts above to begin.**