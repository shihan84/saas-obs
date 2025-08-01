# SPX-GC SaaS Platform - Hostinger Web GUI Deployment Guide

This guide provides step-by-step instructions for deploying the SPX-GC SaaS platform using Hostinger's web GUI panel (hPanel) without requiring SSH access.

## Prerequisites

Before starting the deployment, ensure you have:

1. **Hostinger Account**: Premium or Business hosting plan (recommended)
2. **Domain Name**: A domain name pointing to your Hostinger hosting
3. **Stripe Account**: For payment processing
4. **Email Service**: Gmail or other SMTP provider
5. **GitHub Account**: To access the repository

## Step 1: Access Hostinger Control Panel

### 1.1 Login to Hostinger
1. Go to [hostinger.com](https://hostinger.com)
2. Click **"Login"** in the top right corner
3. Enter your Hostinger account credentials
4. You'll be redirected to the **hPanel** (Hostinger Control Panel)

### 1.2 Navigate to Your Hosting
1. In hPanel, find your hosting plan
2. Click **"Manage"** next to your hosting plan
3. You'll see the main hPanel dashboard

## Step 2: Database Setup

### 2.1 Create MySQL Database
1. In hPanel, scroll down to **"Databases"** section
2. Click **"MySQL Databases"**
3. Click **"Create Database"**
4. Fill in the details:
   - **Database Name**: `saas_obs_db`
   - **Username**: `saas_obs_user`
   - **Password**: Generate a strong password (save this!)
5. Click **"Create"**
6. Note down the database details for later use

### 2.2 Database Connection Details
After creating the database, note these details:
- **Database Host**: Usually `localhost`
- **Database Name**: `saas_obs_db`
- **Username**: `saas_obs_user`
- **Password**: The password you created
- **Port**: Usually `3306`

## Step 3: Enable Required Services

### 3.1 Enable SSL Certificate
1. In hPanel, go to **"SSL"** section
2. Click **"SSL"** or **"Security"**
3. Find your domain and click **"Install"** or **"Enable"**
4. Wait for the SSL certificate to be installed (usually takes a few minutes)

### 3.2 Enable Node.js (if available)
1. In hPanel, look for **"Node.js"** or **"Advanced"** section
2. If Node.js is available, enable it
3. Set Node.js version to **18.x** or higher
4. Note the Node.js application path

## Step 4: File Manager Setup

### 4.1 Access File Manager
1. In hPanel, go to **"Files"** section
2. Click **"File Manager"**
3. Navigate to `public_html` folder

### 4.2 Create Project Directory
1. In File Manager, click **"New Folder"**
2. Name it `saas-obs`
3. Click **"Create"**
4. Enter the `saas-obs` folder

## Step 5: Download Project Files

### 5.1 Download from GitHub
1. Go to [https://github.com/shihan84/saas-obs](https://github.com/shihan84/saas-obs)
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Save the ZIP file to your computer

### 5.2 Upload to Hostinger
1. In File Manager, click **"Upload"**
2. Click **"Select Files"**
3. Choose the downloaded ZIP file
4. Click **"Upload"**
5. Wait for upload to complete

### 5.3 Extract Files
1. Right-click on the uploaded ZIP file
2. Select **"Extract"**
3. Extract to the current directory (`public_html/saas-obs`)
4. Delete the ZIP file after extraction

## Step 6: Configure Environment Variables

### 6.1 Create Backend Environment File
1. In File Manager, navigate to `saas-obs/backend`
2. Right-click and select **"New File"**
3. Name it `.env`
4. Click **"Create"**
5. Right-click on `.env` and select **"Edit"**
6. Add the following content:

```env
# Database Configuration (MySQL for Hostinger)
DATABASE_URL=mysql://saas_obs_user:your_password@localhost:3306/saas_obs_db

# Redis Configuration (Optional - can be commented out)
# REDIS_URL=redis://your-redis-url:6379

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

**Important**: Replace the following values:
- `your_password` with your actual database password
- `your-super-secret-jwt-key-change-in-production` with a strong random string
- `sk_live_your_stripe_secret_key` with your Stripe live secret key
- `pk_live_your_stripe_publishable_key` with your Stripe live publishable key
- `your-email@gmail.com` with your Gmail address
- `your-app-password` with your Gmail app password
- `yourdomain.com` with your actual domain name

### 6.2 Create Frontend Environment File
1. Navigate to `saas-obs/frontend`
2. Create a new file named `.env`
3. Add the following content:

```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

## Step 7: Update Database Schema for MySQL

### 7.1 Replace Prisma Schema
1. Navigate to `saas-obs/backend/prisma`
2. Delete the existing `schema.prisma` file
3. Rename `schema-mysql.prisma` to `schema.prisma`
4. Or create a new `schema.prisma` file with MySQL configuration:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// User Management
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String
  firstName     String
  lastName      String
  role          UserRole @default(USER)
  isActive      Boolean  @default(true)
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relationships
  organization    Organization? @relation(fields: [organizationId], references: [id])
  organizationId  String?
  subscriptions   Subscription[]
  instances       Instance[]
  apiKeys         ApiKey[]
  usageLogs       UsageLog[]

  @@map("users")
}

enum UserRole {
  ADMIN
  USER
  VIEWER
}

// Organization/Tenant Management
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  domain      String?
  logo        String?
  primaryColor String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  users       User[]
  subscriptions Subscription[]
  instances   Instance[]
  apiKeys     ApiKey[]
  usageLogs   UsageLog[]

  @@map("organizations")
}

// Subscription Plans
model Plan {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  price       Float
  currency    String   @default("USD")
  interval    BillingInterval
  features    Json     // Store plan features as JSON
  limits      Json     // Store plan limits as JSON
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  subscriptions Subscription[]

  @@map("plans")
}

enum BillingInterval {
  MONTHLY
  YEARLY
}

// User Subscriptions
model Subscription {
  id            String   @id @default(cuid())
  status        SubscriptionStatus @default(ACTIVE)
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd Boolean @default(false)
  canceledAt        DateTime?
  endedAt           DateTime?
  trialStart        DateTime?
  trialEnd          DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Stripe fields
  stripeSubscriptionId String? @unique
  stripeCustomerId    String?
  stripePriceId       String?

  // Relationships
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String
  plan    Plan @relation(fields: [planId], references: [id])
  planId  String
  organization Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  @@map("subscriptions")
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  UNPAID
  TRIALING
  INCOMPLETE
  INCOMPLETE_EXPIRED
}

// SPX-GC Instances
model Instance {
  id          String   @id @default(cuid())
  name        String
  description String?
  port        Int      @unique
  status      InstanceStatus @default(STOPPED)
  config      Json     // Instance configuration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String
  organization Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  @@map("instances")
}

enum InstanceStatus {
  RUNNING
  STOPPED
  ERROR
  STARTING
  STOPPING
}

// API Keys for external integrations
model ApiKey {
  id          String   @id @default(cuid())
  name        String
  key         String   @unique
  permissions Json     // Array of allowed permissions
  lastUsed    DateTime?
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relationships
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String
  organization Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  @@map("api_keys")
}

// Usage tracking
model UsageLog {
  id          String   @id @default(cuid())
  type        UsageType
  value       Float
  metadata    Json?
  timestamp   DateTime @default(now())

  // Relationships
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String
  organization Organization @relation(fields: [organizationId], references: [id])
  organizationId String

  @@map("usage_logs")
}

enum UsageType {
  API_CALLS
  STORAGE_USED
  INSTANCE_HOURS
  TEMPLATES_CREATED
  RUNDOWNS_CREATED
}

// Billing events
model BillingEvent {
  id          String   @id @default(cuid())
  type        BillingEventType
  amount      Float
  currency    String   @default("USD")
  description String?
  metadata    Json?
  createdAt   DateTime @default(now())

  // Stripe fields
  stripeEventId String? @unique
  stripeInvoiceId String?

  // Relationships
  subscription Subscription @relation(fields: [subscriptionId], references: [id])
  subscriptionId String

  @@map("billing_events")
}

enum BillingEventType {
  INVOICE_CREATED
  INVOICE_PAID
  INVOICE_PAYMENT_FAILED
  SUBSCRIPTION_CREATED
  SUBSCRIPTION_UPDATED
  SUBSCRIPTION_DELETED
  PAYMENT_METHOD_ADDED
  PAYMENT_METHOD_REMOVED
}
```

## Step 8: Install Dependencies and Build

### 8.1 Install Backend Dependencies
1. In hPanel, go to **"Advanced"** section
2. Look for **"Terminal"** or **"SSH"** access
3. If available, use the terminal to run:
   ```bash
   cd public_html/saas-obs/backend
   npm install
   ```

**Alternative Method (if no terminal access):**
1. Download Node.js dependencies locally
2. Upload the `node_modules` folder to `public_html/saas-obs/backend/`

### 8.2 Install Frontend Dependencies
1. Navigate to `public_html/saas-obs/frontend`
2. If you have terminal access:
   ```bash
   cd public_html/saas-obs/frontend
   npm install
   npm run build
   ```

**Alternative Method:**
1. Build the frontend locally on your computer
2. Upload the `build` folder to `public_html/saas-obs/frontend/`

## Step 9: Database Migration

### 9.1 Run Database Migrations
If you have terminal access:
```bash
cd public_html/saas-obs/backend
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

**Alternative Method (Manual Database Setup):**
1. In hPanel, go to **"Databases"** → **"phpMyAdmin"**
2. Click on your database (`saas_obs_db`)
3. Go to **"SQL"** tab
4. Run the following SQL commands (you'll need to create these based on the Prisma schema)

## Step 10: Configure Web Server

### 10.1 Set Up .htaccess for Frontend
1. Navigate to `public_html/saas-obs/frontend/build`
2. Create a new file named `.htaccess`
3. Add the following content:

```apache
RewriteEngine On
RewriteBase /

# Handle React Router
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer-when-downgrade"

# Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/ico "access plus 1 year"
    ExpiresByType image/icon "access plus 1 year"
    ExpiresByType text/plain "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/zip "access plus 1 month"
</IfModule>
```

### 10.2 Configure Backend API
1. Navigate to `public_html/saas-obs/backend`
2. Create a new file named `.htaccess`
3. Add the following content:

```apache
RewriteEngine On

# Handle API requests
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ src/server.js [QSA,L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer-when-downgrade"

# CORS headers
Header always set Access-Control-Allow-Origin "*"
Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
```

## Step 11: Set Up Node.js Application

### 11.1 Configure Node.js in hPanel
1. In hPanel, go to **"Advanced"** section
2. Look for **"Node.js"** or **"Applications"**
3. Click **"Create Node.js App"**
4. Configure the application:
   - **App Name**: `saas-obs-backend`
   - **Node.js Version**: `18.x` or higher
   - **App Path**: `/public_html/saas-obs/backend`
   - **Entry Point**: `src/server.js`
   - **Port**: `3001`
5. Click **"Create"**

### 11.2 Start the Application
1. In the Node.js apps section, find your app
2. Click **"Start"** or **"Deploy"**
3. Wait for the application to start

## Step 12: Configure Domain and SSL

### 12.1 Set Up Domain
1. In hPanel, go to **"Domains"** section
2. Make sure your domain is properly configured
3. Point it to the `public_html` directory

### 12.2 Enable SSL
1. In hPanel, go to **"SSL"** section
2. Enable SSL for your domain
3. Force HTTPS redirect

### 12.3 Update URLs
1. Update your environment variables to use HTTPS
2. Make sure all URLs in `.env` files use `https://yourdomain.com`

## Step 13: Configure Stripe

### 13.1 Set Up Stripe Webhooks
1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **"Developers"** → **"Webhooks"**
3. Click **"Add endpoint"**
4. Enter: `https://yourdomain.com/api/webhooks/stripe`
5. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **"Add endpoint"**

### 13.2 Update Stripe Keys
1. In your Stripe Dashboard, go to **"Developers"** → **"API keys"**
2. Copy your **Live** secret key and publishable key
3. Update your `.env` files with these keys

## Step 14: Test the Application

### 14.1 Test Frontend
1. Visit `https://yourdomain.com`
2. You should see the SPX-GC SaaS platform
3. Test user registration and login

### 14.2 Test Backend API
1. Visit `https://yourdomain.com/api/health`
2. You should see a JSON response with status "OK"

### 14.3 Test Database Connection
1. Try to register a new user
2. Check if the user appears in your database
3. Use phpMyAdmin to verify data is being stored

## Step 15: Monitoring and Maintenance

### 15.1 Set Up Monitoring
1. In hPanel, go to **"Advanced"** → **"Node.js"**
2. Monitor your application status
3. Check logs for any errors

### 15.2 Set Up Backups
1. In hPanel, go to **"Backups"** section
2. Enable automatic backups
3. Set up regular database backups

### 15.3 Performance Optimization
1. Enable Gzip compression in hPanel
2. Set up CDN if available
3. Optimize images and static files

## Troubleshooting

### Common Issues and Solutions

#### 1. Application Not Starting
- Check Node.js configuration in hPanel
- Verify environment variables are correct
- Check application logs

#### 2. Database Connection Issues
- Verify database credentials in `.env` file
- Check if database exists in phpMyAdmin
- Test database connection

#### 3. Frontend Not Loading
- Check if `build` folder is uploaded correctly
- Verify `.htaccess` file is in place
- Check SSL certificate status

#### 4. API Endpoints Not Working
- Verify backend is running
- Check CORS configuration
- Test API endpoints directly

#### 5. SSL Certificate Issues
- Check SSL status in hPanel
- Ensure all URLs use HTTPS
- Clear browser cache

## Security Checklist

- [ ] **SSL Certificate** enabled and working
- [ ] **Strong JWT Secret** configured
- [ ] **Database Passwords** are strong and unique
- [ ] **Stripe Keys** are live and secure
- [ ] **SMTP Credentials** are secure
- [ ] **File Permissions** are properly set
- [ ] **HTTPS Redirect** is enabled
- [ ] **Security Headers** are configured
- [ ] **Regular Backups** are scheduled

## Performance Optimization

### 1. Enable Compression
- Enable Gzip compression in hPanel
- Configure caching headers

### 2. Optimize Images
- Use WebP format where possible
- Compress images before uploading

### 3. Use CDN
- Set up Cloudflare CDN
- Serve static assets through CDN

## Support and Maintenance

### Regular Tasks
1. **Weekly**: Check application logs and performance
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize database queries
4. **Annually**: Security audit and performance review

### Monitoring Tools
- **hPanel Analytics**: Traffic and performance
- **Stripe Dashboard**: Payment monitoring
- **Email Logs**: Communication monitoring
- **Node.js Logs**: Application monitoring

## Conclusion

Your SPX-GC SaaS platform is now deployed on Hostinger using the web GUI! The platform includes:

✅ **Multi-tenant SaaS architecture**
✅ **Subscription management with Stripe**
✅ **User authentication and authorization**
✅ **SPX-GC instance management**
✅ **Analytics and monitoring**
✅ **Email notifications**
✅ **SSL security**
✅ **Performance optimization**

For ongoing support and updates, refer to the main `README.md` and other deployment guides in the repository.

---

**Need Help?**
- Check the troubleshooting section above
- Review Hostinger's documentation
- Contact Hostinger support for hosting-specific issues
- Open issues on the GitHub repository for application-specific problems 