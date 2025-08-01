# SPX-GC SaaS Platform Deployment Guide

This guide will help you deploy the SPX-GC SaaS platform to production.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL 14+ (or use the provided Docker setup)
- Redis (or use the provided Docker setup)
- Domain name and SSL certificate (for production)
- Stripe account for payment processing

## Quick Start (Development)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd saas-obs
cp env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Database
DATABASE_URL=postgresql://saas_obs_user:saas_obs_password@localhost:5432/saas_obs

# Redis
REDIS_URL=redis://localhost:6379

# JWT (Generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Stripe (Get from your Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Email (Configure your SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

### 3. Start the Platform

```bash
# Build and start all services
docker-compose up -d

# Initialize database
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# Check logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **SPX-GC Instance**: http://localhost:5656

## Production Deployment

### 1. Server Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB+ 
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

### 2. Production Environment Setup

```bash
# Create production environment file
cp env.example .env.production

# Configure production settings
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
DATABASE_URL=postgresql://user:pass@your-db-host:5432/saas_obs
```

### 3. SSL Certificate Setup

```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to nginx
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

### 4. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: saas-obs-postgres-prod
    environment:
      POSTGRES_DB: saas_obs
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - saas-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: saas-obs-redis-prod
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - saas-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: saas-obs-backend-prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
    networks:
      - saas-network
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: saas-obs-frontend-prod
    environment:
      - REACT_APP_API_URL=https://your-domain.com/api
      - REACT_APP_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
    networks:
      - saas-network
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    container_name: saas-obs-nginx-prod
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    ports:
      - "80:80"
      - "443:443"
    networks:
      - saas-network
    restart: unless-stopped
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:

networks:
  saas-network:
    driver: bridge
```

### 5. Deploy to Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed
```

## Stripe Configuration

### 1. Create Stripe Products and Prices

```bash
# Install Stripe CLI
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update
sudo apt install stripe

# Login to Stripe
stripe login

# Create products and prices
stripe products create --name="Starter Plan" --description="Perfect for small productions"
stripe prices create --product=prod_xxx --unit-amount=2900 --currency=usd --recurring-interval=month

stripe products create --name="Professional Plan" --description="Ideal for growing production companies"
stripe prices create --product=prod_yyy --unit-amount=9900 --currency=usd --recurring-interval=month

stripe products create --name="Enterprise Plan" --description="For large organizations"
stripe prices create --product=prod_zzz --unit-amount=29900 --currency=usd --recurring-interval=month
```

### 2. Update Database with Stripe Price IDs

```sql
UPDATE plans SET stripe_price_id = 'price_xxx' WHERE slug = 'starter';
UPDATE plans SET stripe_price_id = 'price_yyy' WHERE slug = 'professional';
UPDATE plans SET stripe_price_id = 'price_zzz' WHERE slug = 'enterprise';
```

### 3. Configure Webhooks

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Set up production webhook
stripe webhook create --url=https://your-domain.com/api/webhooks/stripe --events=customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Check service health
curl https://your-domain.com/health

# Check database connection
docker-compose exec backend npm run db:check

# Monitor logs
docker-compose logs -f backend
```

### 2. Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U saas_obs_user saas_obs > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U saas_obs_user saas_obs > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### 3. Scaling Considerations

- **Database**: Consider using managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Redis**: Use managed Redis (AWS ElastiCache, Google Cloud Memorystore)
- **Load Balancing**: Use AWS ALB or Google Cloud Load Balancer
- **CDN**: Use Cloudflare or AWS CloudFront for static assets
- **Monitoring**: Set up Prometheus + Grafana or use managed monitoring

## Security Checklist

- [ ] Change default database passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable CORS properly
- [ ] Use environment variables for secrets
- [ ] Regular security updates
- [ ] Monitor for suspicious activity
- [ ] Backup strategy in place

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   docker-compose logs postgres
   docker-compose exec backend npm run db:migrate
   ```

2. **Stripe Webhook Issues**
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

3. **Instance Not Starting**
   ```bash
   docker-compose logs spx-core
   docker-compose exec backend npm run instance:health-check
   ```

4. **Email Not Sending**
   ```bash
   # Check SMTP configuration
   docker-compose exec backend node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransporter({
     host: process.env.SMTP_HOST,
     port: process.env.SMTP_PORT,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   });
   transporter.verify().then(console.log).catch(console.error);
   "
   ```

## Support

For issues and questions:
- Check the logs: `docker-compose logs -f`
- Review the documentation
- Create an issue in the repository
- Contact support at support@your-domain.com 