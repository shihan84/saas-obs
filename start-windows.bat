@echo off
echo.
echo ===================================
echo  SPX-GC SaaS Platform - Windows
echo ===================================
echo.

REM Check if Docker is available
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy env.example .env >nul
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)

REM Stop any existing containers
echo 🛑 Stopping any existing containers...
docker-compose -f docker-compose.windows.yml down >nul 2>&1

REM Start services
echo 🏗️ Building and starting services...
echo    This may take a few minutes on first run...

REM Start database services first
echo    🗄️ Starting database services...
docker-compose -f docker-compose.windows.yml up -d postgres redis

REM Wait for databases
echo    ⏳ Waiting for databases to initialize...
timeout /t 10 /nobreak >nul

REM Start application services
echo    🔧 Starting application services...
docker-compose -f docker-compose.windows.yml up --build -d backend frontend

if %errorlevel% neq 0 (
    echo ❌ Error starting services
    docker-compose -f docker-compose.windows.yml ps
    pause
    exit /b 1
)

echo ✅ All services started successfully!

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 15 /nobreak >nul

REM Show service status
echo.
echo 📊 Service Status:
docker-compose -f docker-compose.windows.yml ps

echo.
echo 🎉 Setup Complete!
echo ==================
echo 📱 Frontend:      http://localhost:3000
echo 🔧 Backend API:   http://localhost:3001
echo ❤️ Health Check: http://localhost:3001/health
echo.
echo 📋 Useful Commands:
echo    View logs:     docker-compose -f docker-compose.windows.yml logs -f
echo    Stop services: docker-compose -f docker-compose.windows.yml down
echo    Restart:       docker-compose -f docker-compose.windows.yml restart
echo.

REM Open browser
echo Opening application in browser...
start http://localhost:3000

echo Press any key to exit...
pause >nul