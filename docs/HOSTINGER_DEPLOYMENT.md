# SPX-GC SaaS Platform - Hostinger Deployment Guide

This guide provides step-by-step instructions for deploying the SPX-GC SaaS platform on Hostinger hosting panel.

## Prerequisites

Before starting the deployment, ensure you have:

1. **Hostinger Account**: Premium or Business hosting plan (recommended for better performance)
2. **Domain Name**: A domain name pointing to your Hostinger hosting
3. **Stripe Account**: For payment processing
4. **Email Service**: Gmail or other SMTP provider
5. **GitHub Account**: To clone the repository

## Step 1: Prepare Your Hostinger Environment

### 1.1 Access Hostinger Control Panel
1. Log in to your Hostinger account
2. Navigate to your hosting control panel
3. Note down your hosting details:
   - **Server IP**: Your hosting server IP address
   - **SSH Access**: Enable SSH access if available
   - **Database Credentials**: MySQL/PostgreSQL credentials

### 1.2 Enable Required Services
In your Hostinger control panel:
1. **Enable SSH Access** (if not already enabled)
2. **Create MySQL Database** (we'll use MySQL instead of PostgreSQL for Hostinger compatibility)
3. **Enable Node.js** (if available in your plan)
4. **Enable SSL Certificate** for your domain

## Step 2: Database Setup

### 2.1 Create MySQL Database
1. In Hostinger control panel, go to **Databases** → **MySQL Databases**
2. Create a new database:
   - **Database Name**: `saas_obs_db`
   - **Username**: `saas_obs_user`
   - **Password**: Generate a strong password
3. Note down the database credentials

### 2.2 Database Schema Setup
Since Hostinger doesn't support PostgreSQL, we'll use MySQL. You'll need to:

1. **Install MySQL Client** on your local machine
2. **Convert Prisma Schema** from PostgreSQL to MySQL
3. **Update Database URL** in environment variables

## Step 3: Repository Setup

### 3.1 Clone Repository
```bash
# SSH into your Hostinger server
ssh username@your-server-ip

# Navigate to your hosting directory
cd public_html

# Clone the repository
git clone https://github.com/shihan84/saas-obs.git

# Navigate to project directory
cd saas-obs
```

### 3.2 Install Dependencies
```bash
# Install Node.js dependencies for backend
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 4: Environment Configuration

### 4.1 Create Environment Files
```bash
# Create .env file for backend
cd backend
cp ../env.example .env
```

### 4.2 Configure Environment Variables
Edit the `backend/.env` file with your Hostinger-specific settings:

```env
# Database Configuration (MySQL for Hostinger)
DATABASE_URL=mysql://saas_obs_user:your_password@localhost:3306/saas_obs_db

# Redis Configuration (Use Redis Cloud or skip if not available)
REDIS_URL=redis://your-redis-url:6379
# OR comment out if Redis is not available
# REDIS_URL=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL (Your domain)
FRONTEND_URL=https://yourdomain.com

# Node Environment
NODE_ENV=production

# Port Configuration
PORT=3001
```

### 4.3 Configure Frontend Environment
```bash
# Create .env file for frontend
cd ../frontend
cp ../env.example .env
```

Edit `frontend/.env`:
```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

## Step 5: Database Migration

### 5.1 Update Prisma Schema for MySQL
Since Hostinger uses MySQL, update `backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### 5.2 Run Database Migrations
```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npm run db:seed
```

## Step 6: Build Applications

### 6.1 Build Frontend
```bash
cd frontend

# Build for production
npm run build
```

### 6.2 Build Backend
```bash
cd ../backend

# Build for production (if using TypeScript)
npm run build
```

## Step 7: Configure Hostinger Web Server

### 7.1 Set Up Node.js Application
If your Hostinger plan supports Node.js:

1. **Create Node.js App** in Hostinger control panel
2. **Set Application Path** to `/public_html/saas-obs/backend`
3. **Set Entry Point** to `src/server.js`
4. **Set Node.js Version** to 18.x or higher

### 7.2 Configure Nginx (if available)
Create a custom Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend static files
    location / {
        root /public_html/saas-obs/frontend/build;
        try_files $uri $uri/ /index.html;
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
}
```

## Step 8: Process Management

### 8.1 Install PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Navigate to backend directory
cd /public_html/saas-obs/backend

# Start the backend application
pm2 start src/server.js --name "saas-obs-backend"

# Save PM2 configuration
pm2 save

# Set PM2 to start on server reboot
pm2 startup
```

### 8.2 Configure PM2 Ecosystem
Create `ecosystem.config.js` in the root directory:

```javascript
module.exports = {
  apps: [
    {
      name: 'saas-obs-backend',
      script: './backend/src/server.js',
      cwd: '/public_html/saas-obs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

## Step 9: SSL Certificate Setup

### 9.1 Enable SSL in Hostinger
1. Go to **SSL** section in Hostinger control panel
2. **Enable SSL Certificate** for your domain
3. **Force HTTPS** redirect

### 9.2 Update Environment Variables
Update your environment variables to use HTTPS:
```env
FRONTEND_URL=https://yourdomain.com
```

## Step 10: Stripe Configuration

### 10.1 Set Up Stripe Webhooks
1. Go to your Stripe Dashboard
2. Navigate to **Webhooks**
3. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 10.2 Update Stripe Keys
Replace test keys with live keys in your environment variables.

## Step 11: Email Configuration

### 11.1 Configure SMTP
Update your SMTP settings in the environment variables:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 11.2 Test Email Configuration
```bash
cd backend
node -e "
const { sendWelcomeEmail } = require('./src/services/email');
sendWelcomeEmail('test@example.com', 'Test User');
"
```

## Step 12: Testing and Verification

### 12.1 Test Backend API
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Test authentication
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

### 12.2 Test Frontend
1. Visit `https://yourdomain.com`
2. Test user registration and login
3. Test subscription management
4. Test SPX-GC instance creation

## Step 13: Monitoring and Maintenance

### 13.1 Set Up Monitoring
```bash
# Monitor PM2 processes
pm2 monit

# View logs
pm2 logs saas-obs-backend

# Monitor system resources
pm2 status
```

### 13.2 Set Up Backups
1. **Database Backups**: Use Hostinger's database backup feature
2. **File Backups**: Use Hostinger's file backup feature
3. **Automated Backups**: Set up cron jobs for regular backups

### 13.3 Performance Optimization
1. **Enable Gzip Compression** in Nginx
2. **Set up CDN** for static assets
3. **Optimize Images** and static files
4. **Enable Browser Caching**

## Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Test database connection
mysql -u saas_obs_user -p saas_obs_db

# Check database status
pm2 logs saas-obs-backend | grep "database"
```

#### 2. Port Conflicts
```bash
# Check if port 3001 is in use
netstat -tulpn | grep :3001

# Kill process if needed
kill -9 <PID>
```

#### 3. Memory Issues
```bash
# Monitor memory usage
pm2 monit

# Restart application if needed
pm2 restart saas-obs-backend
```

#### 4. SSL Certificate Issues
1. Check SSL certificate status in Hostinger control panel
2. Ensure all URLs use HTTPS
3. Clear browser cache and cookies

## Security Checklist

- [ ] **SSL Certificate** enabled and working
- [ ] **Strong JWT Secret** configured
- [ ] **Database Passwords** are strong and unique
- [ ] **Stripe Keys** are live and secure
- [ ] **SMTP Credentials** are secure
- [ ] **File Permissions** are properly set
- [ ] **Firewall Rules** are configured
- [ ] **Regular Backups** are scheduled
- [ ] **Monitoring** is set up
- [ ] **Error Logging** is configured

## Performance Optimization

### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_instances_user_id ON instances(user_id);
```

### 2. Application Optimization
```bash
# Enable compression
npm install compression

# Set up caching headers
npm install helmet
```

### 3. CDN Setup
1. **Cloudflare**: Set up Cloudflare CDN
2. **Static Assets**: Serve static files through CDN
3. **Image Optimization**: Use WebP format

## Support and Maintenance

### Regular Maintenance Tasks
1. **Weekly**: Check application logs and performance
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize database queries
4. **Annually**: Security audit and performance review

### Monitoring Tools
- **PM2**: Process monitoring
- **Hostinger Analytics**: Traffic and performance
- **Stripe Dashboard**: Payment monitoring
- **Email Logs**: Communication monitoring

## Conclusion

Your SPX-GC SaaS platform is now deployed on Hostinger! The platform includes:

✅ **Multi-tenant SaaS architecture**
✅ **Subscription management with Stripe**
✅ **User authentication and authorization**
✅ **SPX-GC instance management**
✅ **Analytics and monitoring**
✅ **Email notifications**
✅ **SSL security**
✅ **Performance optimization**

For ongoing support and updates, refer to the main `README.md` and `DEPLOYMENT.md` files in the repository.

---

**Need Help?**
- Check the troubleshooting section above
- Review Hostinger's documentation
- Contact Hostinger support for hosting-specific issues
- Open issues on the GitHub repository for application-specific problems 