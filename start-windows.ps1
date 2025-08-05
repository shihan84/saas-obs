# SPX-GC SaaS Platform - Windows Startup Script
# This script will set up and start the application on Windows 11

Write-Host "🚀 SPX-GC SaaS Platform - Windows Setup" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Check if Docker is running
Write-Host "📋 Checking Docker status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check if .env file exists, if not copy from example
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Stop any existing containers
Write-Host "🛑 Stopping any existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.windows.yml down 2>$null

# Check for port conflicts
Write-Host "🔍 Checking for port conflicts..." -ForegroundColor Yellow
$ports = @(3000, 3001, 5432, 6379)
$conflicts = @()

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $conflicts += $port
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host "⚠️  Warning: The following ports are in use: $($conflicts -join ', ')" -ForegroundColor Yellow
    Write-Host "   This might cause conflicts. Consider stopping other services using these ports." -ForegroundColor Yellow
    Write-Host "   Continue anyway? (y/N): " -NoNewline -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "❌ Setup cancelled by user" -ForegroundColor Red
        exit 1
    }
}

# Build and start services
Write-Host "🏗️  Building and starting services..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes on first run..." -ForegroundColor Gray

try {
    # Start database services first
    Write-Host "   🗄️  Starting database services..." -ForegroundColor Gray
    docker-compose -f docker-compose.windows.yml up -d postgres redis
    
    # Wait for databases to be ready
    Write-Host "   ⏳ Waiting for databases to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    # Start application services
    Write-Host "   🔧 Starting application services..." -ForegroundColor Gray
    docker-compose -f docker-compose.windows.yml up --build -d backend frontend
    
    Write-Host "✅ All services started successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error starting services: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 Checking service status..." -ForegroundColor Yellow
    docker-compose -f docker-compose.windows.yml ps
    exit 1
}

# Wait a moment for services to fully start
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check service health
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

# Test backend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend API is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend API not responding yet" -ForegroundColor Yellow
}

# Test frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Frontend not responding yet" -ForegroundColor Yellow
}

# Show service status
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose -f docker-compose.windows.yml ps

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host "📱 Frontend:      http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "❤️  Health Check: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Yellow
Write-Host "   View logs:     docker-compose -f docker-compose.windows.yml logs -f" -ForegroundColor Gray
Write-Host "   Stop services: docker-compose -f docker-compose.windows.yml down" -ForegroundColor Gray
Write-Host "   Restart:       docker-compose -f docker-compose.windows.yml restart" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to open the application in your browser..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "http://localhost:3000"