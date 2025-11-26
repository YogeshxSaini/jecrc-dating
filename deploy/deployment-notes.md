# Production Deployment Guide

## Overview

This guide covers deploying the JECRC Dating App to production environments with proper security, scaling, and monitoring.

## Architecture

```
┌─────────────┐
│   CDN       │
│  (CloudFront)│
└──────┬──────┘
       │
┌──────▼──────────────────────────────────┐
│  Load Balancer (ALB/NLB)               │
└──────┬──────────────────────────────────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌──▼──┐
│ App │  │ App │  (Auto-scaling)
│ EC2 │  │ EC2 │
└──┬──┘  └──┬──┘
   │        │
   └────┬───┘
        │
┌───────▼────────┐
│  RDS Postgres  │
│  (Multi-AZ)    │
└────────────────┘
```

## Prerequisites

- AWS Account (or preferred cloud provider)
- Domain name
- SSL Certificate
- Email service (SendGrid, AWS SES, etc.)

## 1. Database Setup

### Option A: AWS RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier jecrc-dating-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --multi-az \
  --backup-retention-period 7 \
  --storage-encrypted
```

### Option B: Supabase (Managed Postgres)

1. Create project at https://supabase.com
2. Get connection string
3. Enable Row Level Security (RLS) if needed

## 2. Redis Setup

### AWS ElastiCache

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id jecrc-dating-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0
```

### Alternative: Upstash Redis

- Serverless Redis
- Free tier available
- https://upstash.com

## 3. S3 Bucket Setup

```bash
# Create bucket
aws s3api create-bucket \
  --bucket jecrc-dating-photos \
  --region us-east-1

# Enable CORS
aws s3api put-bucket-cors \
  --bucket jecrc-dating-photos \
  --cors-configuration file://cors.json

# Set lifecycle policy (optional)
aws s3api put-bucket-lifecycle-configuration \
  --bucket jecrc-dating-photos \
  --lifecycle-configuration file://lifecycle.json
```

**cors.json:**
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://yourdomain.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

## 4. Email Service Setup

### SendGrid

```bash
# Install SendGrid
npm install @sendgrid/mail

# Set environment variables
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-sendgrid-api-key>
```

### AWS SES

```bash
# Verify domain
aws ses verify-domain-identity --domain jecrc.ac.in

# Set up DKIM
aws ses set-identity-dkim-enabled \
  --identity jecrc.ac.in \
  --dkim-enabled
```

## 5. Application Deployment

### Option A: AWS ECS (Elastic Container Service)

1. **Build and push Docker images:**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -t jecrc-dating-backend ./backend
docker build -t jecrc-dating-frontend ./frontend

# Tag images
docker tag jecrc-dating-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/jecrc-dating-backend:latest
docker tag jecrc-dating-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/jecrc-dating-frontend:latest

# Push images
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/jecrc-dating-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/jecrc-dating-frontend:latest
```

2. **Create ECS Task Definition:**

```json
{
  "family": "jecrc-dating",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/jecrc-dating-backend:latest",
      "portMappings": [
        {
          "containerPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "postgresql://..."},
        {"name": "REDIS_URL", "value": "redis://..."}
      ],
      "secrets": [
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."},
        {"name": "SMTP_PASS", "valueFrom": "arn:aws:secretsmanager:..."}
      ]
    }
  ]
}
```

### Option B: Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

**Backend (Railway):**
1. Visit https://railway.app
2. Connect GitHub repository
3. Add PostgreSQL addon
4. Set environment variables
5. Deploy

### Option C: DigitalOcean App Platform

1. Create new app from GitHub repo
2. Add PostgreSQL database
3. Add Redis database
4. Configure environment variables
5. Deploy

## 6. Socket.IO Scaling

For multiple backend instances, use Redis adapter:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

## 7. SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com
```

### Using AWS Certificate Manager

```bash
aws acm request-certificate \
  --domain-name *.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

## 8. Environment Variables (Production)

**Backend:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/jecrc_dating
REDIS_URL=redis://host:6379
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
ALLOWED_EMAIL_DOMAIN=jecrc.ac.in
S3_BUCKET=jecrc-dating-photos
S3_ACCESS_KEY=<aws-access-key>
S3_SECRET_KEY=<aws-secret-key>
S3_REGION=us-east-1
FRONTEND_URL=https://yourdomain.com
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## 9. Monitoring & Logging

### Application Monitoring

- **Sentry** for error tracking
- **DataDog** or **New Relic** for APM
- **LogRocket** for session replay

```typescript
// Install Sentry
npm install @sentry/node

// Initialize in index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### Database Monitoring

- Enable slow query logs
- Set up CloudWatch alarms for CPU/memory
- Monitor connection pool usage

### Log Aggregation

- **CloudWatch Logs** (AWS)
- **Papertrail**
- **Loggly**

## 10. Backup Strategy

### Database Backups

```bash
# Automated daily backups with RDS
aws rds modify-db-instance \
  --db-instance-identifier jecrc-dating-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"
```

### S3 Backups

- Enable versioning
- Cross-region replication
- Lifecycle policies

## 11. Security Checklist

- [ ] Enable HTTPS/SSL everywhere
- [ ] Use environment variables for secrets
- [ ] Enable WAF (Web Application Firewall)
- [ ] Set up DDoS protection
- [ ] Enable rate limiting
- [ ] Use security headers (helmet)
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Enable MFA for admin accounts
- [ ] Implement CSRF protection
- [ ] Sanitize user inputs
- [ ] Use prepared statements (Prisma does this)

## 12. Performance Optimization

### CDN Setup

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name yourdomain.com \
  --default-root-object index.html
```

### Image Optimization

- Use Next.js Image component
- Serve WebP format
- Implement lazy loading
- Use CDN for static assets

### Database Optimization

- Add indexes (already in Prisma schema)
- Enable connection pooling
- Use read replicas for read-heavy operations
- Implement caching with Redis

## 13. CI/CD Pipeline

The included `.github/workflows/ci.yml` handles:
- Running tests
- Building Docker images
- Deploying to production

Update with your deployment targets.

## 14. Cost Estimation

### Low Traffic (MVP)

- **AWS**: ~$50-100/month
  - RDS t3.micro: $15
  - ElastiCache t3.micro: $13
  - ECS Fargate: $20-40
  - S3: $5
  - Data transfer: $10

- **Alternative (Budget)**: ~$20-30/month
  - Railway: $20 (includes Postgres)
  - Vercel: Free tier
  - Upstash Redis: Free tier

### Medium Traffic (1000+ users)

- **AWS**: $200-500/month
- Upgrade to t3.small/medium instances
- Enable auto-scaling

## 15. University SSO Integration

To integrate with JECRC's authentication:

1. **Contact university IT department** for:
   - SSO endpoint URLs
   - SAML metadata
   - LDAP server access

2. **Implement SAML strategy**:
```typescript
import { Strategy as SAMLStrategy } from 'passport-saml';

passport.use(new SAMLStrategy({
  entryPoint: 'https://sso.jecrc.ac.in/idp',
  issuer: 'jecrc-dating-app',
  callbackUrl: 'https://yourdomain.com/auth/saml/callback',
  cert: fs.readFileSync('jecrc-idp-cert.pem', 'utf-8'),
}, (profile, done) => {
  // Map SAML profile to user
  return done(null, profile);
}));
```

## Support

For deployment issues:
- Email: devops@jecrc.ac.in
- Documentation: https://docs.yourdomain.com
- Status page: https://status.yourdomain.com
