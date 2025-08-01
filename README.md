# SPX-GC SaaS Platform

A multi-tenant SaaS solution for SPX Graphics Control (SPX-GC) with subscription-based access management.

## Features

### Core SPX-GC Features
- **Live Graphics Control**: Full SPX-GC functionality for live video productions
- **Template Management**: HTML templates for graphics overlays
- **Rundown Management**: Create and manage show rundowns
- **Real-time Rendering**: Browser-based graphics rendering
- **Multi-format Support**: OBS, vMix, CasparCG, Wirecast integration
- **API Integration**: RESTful API for external control

### SaaS Platform Features
- **Multi-tenant Architecture**: Isolated client environments
- **Subscription Management**: Tiered pricing plans
- **User Management**: Role-based access control
- **Billing Integration**: Stripe payment processing
- **Usage Analytics**: Client usage tracking and reporting
- **White-label Support**: Custom branding per client
- **API Rate Limiting**: Plan-based API usage limits
- **Backup & Recovery**: Automated data protection

## Architecture

```
saas-obs/
├── frontend/                 # React-based admin dashboard
├── backend/                  # Node.js API server
├── spx-core/                # SPX-GC core application
├── database/                 # PostgreSQL schemas
├── docker/                   # Docker configurations
├── nginx/                    # Reverse proxy configuration
└── docs/                     # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- Redis (for session management)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd saas-obs
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start with Docker**
```bash
docker-compose up -d
```

4. **Initialize Database**
```bash
npm run db:migrate
npm run db:seed
```

5. **Access the Application**
- Admin Dashboard: http://localhost:3000
- SPX-GC Instances: http://localhost:5656 (per tenant)

## Subscription Plans

### Starter Plan ($29/month)
- 1 SPX-GC instance
- 10 templates
- 5GB storage
- Basic support
- API access (1000 requests/month)

### Professional Plan ($99/month)
- 5 SPX-GC instances
- 50 templates
- 25GB storage
- Priority support
- API access (10000 requests/month)
- Custom branding

### Enterprise Plan ($299/month)
- Unlimited SPX-GC instances
- Unlimited templates
- 100GB storage
- 24/7 support
- Unlimited API access
- White-label solution
- Custom integrations

## API Documentation

### Authentication
```bash
curl -X POST https://api.saas-obs.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

### SPX-GC Instance Management
```bash
# Create new instance
curl -X POST https://api.saas-obs.com/instances \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Graphics Instance", "plan": "professional"}'
```

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
npm run db:migrate:create --name=add_user_subscriptions
npm run db:migrate
```

## Deployment

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/saas_obs

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# JWT
JWT_SECRET=your-jwt-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: [docs.saas-obs.com](https://docs.saas-obs.com)
- Issues: [GitHub Issues](https://github.com/your-org/saas-obs/issues)
- Email: support@saas-obs.com 