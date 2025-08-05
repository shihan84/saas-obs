# SPX-GC SaaS Platform - Windows 11 Setup Guide

This guide will help you set up and run the SPX-GC SaaS Platform on Windows 11 using Docker.

## Prerequisites

✅ Windows 11  
✅ Docker Desktop for Windows (already installed)  
✅ Git (for cloning the repository)

## Quick Start

### 1. Clone and Navigate to Repository
```powershell
# If you haven't cloned yet:
# git clone <repository-url>
cd saas-obs
```

### 2. Environment Setup
```powershell
# Copy the environment template
copy env.example .env
```

The `.env` file has been pre-configured with working defaults for development.

### 3. Start the Application
```powershell
# Build and start all services
docker-compose -f docker-compose.windows.yml up --build -d

# View logs (optional)
docker-compose -f docker-compose.windows.yml logs -f
```

### 4. Access the Application
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Service Status Check

Check if all services are running:
```powershell
docker-compose -f docker-compose.windows.yml ps
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```powershell
   # Stop any conflicting services
   docker-compose -f docker-compose.windows.yml down
   
   # Check what's using the ports
   netstat -ano | findstr :3000
   netstat -ano | findstr :3001
   netstat -ano | findstr :5432
   ```

2. **Container Build Issues**
   ```powershell
   # Clean rebuild
   docker-compose -f docker-compose.windows.yml down --volumes
   docker system prune -f
   docker-compose -f docker-compose.windows.yml up --build --force-recreate
   ```

3. **Database Connection Issues**
   ```powershell
   # Reset database
   docker-compose -f docker-compose.windows.yml down -v
   docker-compose -f docker-compose.windows.yml up -d postgres redis
   # Wait 30 seconds for DB to initialize
   docker-compose -f docker-compose.windows.yml up backend frontend
   ```

## Development Commands

### View Logs
```powershell
# All services
docker-compose -f docker-compose.windows.yml logs -f

# Specific service
docker-compose -f docker-compose.windows.yml logs -f backend
docker-compose -f docker-compose.windows.yml logs -f frontend
```

### Restart Services
```powershell
# Restart all
docker-compose -f docker-compose.windows.yml restart

# Restart specific service
docker-compose -f docker-compose.windows.yml restart backend
```

### Database Operations
```powershell
# Connect to database
docker exec -it saas-obs-postgres psql -U saas_obs_user -d saas_obs

# Run migrations (if needed)
docker exec -it saas-obs-backend npm run db:migrate

# Seed database (if needed)
docker exec -it saas-obs-backend npm run db:seed
```

### Stop Everything
```powershell
# Stop services but keep data
docker-compose -f docker-compose.windows.yml down

# Stop and remove everything including volumes
docker-compose -f docker-compose.windows.yml down --volumes
```

## Configuration

### Environment Variables
Edit `.env` file to customize:
- Database credentials
- Stripe API keys (for payment processing)
- SMTP settings (for email)
- JWT secret

### Stripe Setup (Optional)
1. Create account at https://stripe.com
2. Get your test API keys
3. Update `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_your_actual_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key
   ```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   React App     │◄──►│   Node.js API   │
│   Port 3000     │    │   Port 3001     │
└─────────────────┘    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌─────────────────┐    ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │ │   (Future)      │
│   Database      │    │   Sessions      │ │   SPX-GC Core   │
│   Port 5432     │    │   Port 6379     │ │   Port 5656     │
└─────────────────┘    └─────────────────┘ └─────────────────┘
```

## Production Deployment

For production deployment, use the main `docker-compose.yml` with proper environment variables and add the nginx service for load balancing.

## Support

- Check container logs for detailed error messages
- Ensure Docker Desktop is running and has sufficient resources allocated
- Default credentials and settings are in the `.env` file