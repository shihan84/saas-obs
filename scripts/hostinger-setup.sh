#!/bin/bash

# SPX-GC SaaS Platform - Hostinger Setup Script
# This script automates the initial setup for Hostinger deployment

set -e

echo "🚀 Starting SPX-GC SaaS Platform setup for Hostinger..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the project directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Install Node.js dependencies
print_status "Installing backend dependencies..."
cd backend
npm install

print_status "Installing frontend dependencies..."
cd ../frontend
npm install

# Step 2: Set up environment files
print_status "Setting up environment files..."

# Backend environment
cd ../backend
if [ ! -f ".env" ]; then
    cp ../env.example .env
    print_status "Created backend .env file"
else
    print_warning "Backend .env file already exists"
fi

# Frontend environment
cd ../frontend
if [ ! -f ".env" ]; then
    echo "REACT_APP_API_URL=https://yourdomain.com/api" > .env
    echo "REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key" >> .env
    print_status "Created frontend .env file"
else
    print_warning "Frontend .env file already exists"
fi

# Step 3: Update Prisma schema for MySQL
print_status "Updating Prisma schema for MySQL..."
cd ../backend
if [ -f "prisma/schema-mysql.prisma" ]; then
    cp prisma/schema-mysql.prisma prisma/schema.prisma
    print_status "Updated Prisma schema for MySQL"
else
    print_warning "MySQL schema file not found, using default PostgreSQL schema"
fi

# Step 4: Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Step 5: Build applications
print_status "Building frontend for production..."
cd ../frontend
npm run build

print_status "Building backend..."
cd ../backend
npm run build

# Step 6: Create PM2 ecosystem file
print_status "Creating PM2 ecosystem configuration..."
cd ..
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'saas-obs-backend',
      script: './backend/src/server.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    }
  ]
};
EOF

# Step 7: Create logs directory
mkdir -p logs

# Step 8: Create Nginx configuration
print_status "Creating Nginx configuration..."
mkdir -p nginx/conf.d
cat > nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Frontend static files
    location / {
        root /public_html/saas-obs/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }

    # SPX-GC instances
    location /spx/ {
        proxy_pass http://localhost:5656;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
EOF

# Step 9: Create deployment checklist
print_status "Creating deployment checklist..."
cat > HOSTINGER_CHECKLIST.md << 'EOF'
# Hostinger Deployment Checklist

## Pre-Deployment
- [ ] Hostinger account with Premium/Business plan
- [ ] Domain name configured
- [ ] SSL certificate enabled
- [ ] SSH access enabled
- [ ] MySQL database created
- [ ] Node.js support enabled

## Environment Configuration
- [ ] Update backend/.env with your database credentials
- [ ] Update frontend/.env with your domain
- [ ] Configure Stripe live keys
- [ ] Set up SMTP email credentials
- [ ] Generate strong JWT secret

## Database Setup
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed the database: `npm run db:seed`
- [ ] Test database connection

## Application Deployment
- [ ] Install PM2: `npm install -g pm2`
- [ ] Start application: `pm2 start ecosystem.config.js`
- [ ] Save PM2 configuration: `pm2 save`
- [ ] Set up auto-start: `pm2 startup`

## SSL and Security
- [ ] Enable SSL certificate in Hostinger
- [ ] Force HTTPS redirect
- [ ] Update all URLs to use HTTPS
- [ ] Test SSL configuration

## Stripe Configuration
- [ ] Set up Stripe webhooks
- [ ] Configure live Stripe keys
- [ ] Test payment processing

## Testing
- [ ] Test user registration
- [ ] Test user login
- [ ] Test subscription management
- [ ] Test SPX-GC instance creation
- [ ] Test email notifications

## Monitoring
- [ ] Set up application monitoring
- [ ] Configure error logging
- [ ] Set up backup procedures
- [ ] Test performance

## Post-Deployment
- [ ] Update DNS settings
- [ ] Test all functionality
- [ ] Monitor application logs
- [ ] Set up regular backups
EOF

# Step 10: Create quick start script
print_status "Creating quick start script..."
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting SPX-GC SaaS Platform..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "✅ Application started successfully!"
echo "📊 Monitor with: pm2 monit"
echo "📝 View logs with: pm2 logs"
echo "🛑 Stop with: pm2 stop saas-obs-backend"
EOF

chmod +x start.sh

# Step 11: Create stop script
print_status "Creating stop script..."
cat > stop.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping SPX-GC SaaS Platform..."

# Stop the application
pm2 stop saas-obs-backend

echo "✅ Application stopped successfully!"
EOF

chmod +x stop.sh

# Step 12: Create restart script
print_status "Creating restart script..."
cat > restart.sh << 'EOF'
#!/bin/bash

echo "🔄 Restarting SPX-GC SaaS Platform..."

# Restart the application
pm2 restart saas-obs-backend

echo "✅ Application restarted successfully!"
EOF

chmod +x restart.sh

# Step 13: Create logs script
print_status "Creating logs script..."
cat > logs.sh << 'EOF'
#!/bin/bash

echo "📝 SPX-GC SaaS Platform Logs"
echo "================================"

# Show PM2 logs
pm2 logs saas-obs-backend --lines 50
EOF

chmod +x logs.sh

print_status "Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update environment variables in backend/.env and frontend/.env"
echo "2. Run database migrations: cd backend && npx prisma migrate deploy"
echo "3. Seed the database: npm run db:seed"
echo "4. Start the application: ./start.sh"
echo "5. Follow the checklist: HOSTINGER_CHECKLIST.md"
echo ""
echo "📚 For detailed instructions, see: docs/HOSTINGER_DEPLOYMENT.md"
echo ""
print_warning "Remember to update your domain name in the configuration files!" 