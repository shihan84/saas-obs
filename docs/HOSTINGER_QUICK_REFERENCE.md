# Hostinger Web GUI Deployment - Quick Reference

## 🚀 Quick Start Checklist

### ✅ Pre-Deployment
- [ ] Hostinger Premium/Business plan
- [ ] Domain name configured
- [ ] SSL certificate enabled
- [ ] MySQL database created
- [ ] Node.js support enabled (if available)

### 📁 File Upload Steps
1. **Download**: GitHub → Code → Download ZIP
2. **Upload**: hPanel → Files → File Manager → Upload ZIP
3. **Extract**: Right-click ZIP → Extract to `public_html/saas-obs`
4. **Delete**: Remove ZIP file after extraction

### ⚙️ Configuration Steps
1. **Database**: Create MySQL database in hPanel
2. **Environment**: Create `.env` files in backend and frontend folders
3. **Schema**: Replace `schema.prisma` with MySQL version
4. **Dependencies**: Install via terminal or upload `node_modules`
5. **Build**: Build frontend locally and upload `build` folder

### 🔧 Environment Variables

**Backend `.env` (in `saas-obs/backend/.env`):**
```env
DATABASE_URL=mysql://username:password@localhost:3306/database_name
JWT_SECRET=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
PORT=3001
```

**Frontend `.env` (in `saas-obs/frontend/.env`):**
```env
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
```

### 🗄️ Database Setup
1. **Create Database**: hPanel → Databases → MySQL Databases
2. **Database Name**: `saas_obs_db`
3. **Username**: `saas_obs_user`
4. **Password**: Generate strong password
5. **Host**: `localhost`
6. **Port**: `3306`

### 🌐 Web Server Configuration

**Frontend `.htaccess` (in `saas-obs/frontend/build/.htaccess`):**
```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [QSA,L]
```

**Backend `.htaccess` (in `saas-obs/backend/.htaccess`):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ src/server.js [QSA,L]
```

### 🚀 Node.js Application Setup
1. **hPanel**: Advanced → Node.js
2. **Create App**: 
   - Name: `saas-obs-backend`
   - Path: `/public_html/saas-obs/backend`
   - Entry: `src/server.js`
   - Port: `3001`
3. **Start App**: Click "Start" or "Deploy"

### 🔒 SSL Configuration
1. **hPanel**: SSL section
2. **Enable SSL**: For your domain
3. **Force HTTPS**: Enable redirect
4. **Update URLs**: All environment variables use HTTPS

### 💳 Stripe Setup
1. **Webhook URL**: `https://yourdomain.com/api/webhooks/stripe`
2. **Events**: `customer.subscription.*`, `invoice.payment_*`
3. **Keys**: Use live keys, not test keys

### 🧪 Testing Checklist
- [ ] Visit `https://yourdomain.com` (frontend loads)
- [ ] Visit `https://yourdomain.com/api/health` (backend responds)
- [ ] Test user registration
- [ ] Test user login
- [ ] Test subscription management
- [ ] Check database in phpMyAdmin

### 🔧 Troubleshooting

**Application Not Starting:**
- Check Node.js configuration in hPanel
- Verify environment variables
- Check application logs

**Database Issues:**
- Verify credentials in `.env`
- Check database exists in phpMyAdmin
- Test connection

**Frontend Not Loading:**
- Check `build` folder is uploaded
- Verify `.htaccess` file exists
- Check SSL certificate

**API Not Working:**
- Verify backend is running
- Check CORS configuration
- Test endpoints directly

### 📊 Monitoring
- **hPanel**: Advanced → Node.js (app status)
- **Logs**: Check application logs
- **Analytics**: hPanel analytics section
- **Database**: phpMyAdmin for data verification

### 🔄 Maintenance
- **Weekly**: Check logs and performance
- **Monthly**: Update dependencies
- **Quarterly**: Database optimization
- **Annually**: Security audit

### 📞 Support Resources
- **Hostinger Support**: For hosting issues
- **GitHub Issues**: For application problems
- **Documentation**: `docs/HOSTINGER_WEBGUI_DEPLOYMENT.md`

---

## 🎯 Key Points to Remember

1. **Use MySQL** instead of PostgreSQL for Hostinger
2. **Build frontend locally** and upload `build` folder
3. **Use live Stripe keys** for production
4. **Enable SSL** and force HTTPS
5. **Test everything** before going live
6. **Monitor logs** regularly
7. **Backup database** regularly

## 🚨 Important Notes

- **Node.js**: May not be available on all Hostinger plans
- **Terminal Access**: Limited or not available in web GUI
- **File Upload**: Use File Manager for all file operations
- **Database**: Use phpMyAdmin for database management
- **SSL**: Essential for production deployment
- **Backups**: Set up automatic backups in hPanel 