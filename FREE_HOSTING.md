# Free Database Service Options for JECRC Dating App

## 1. Neon (Recommended - PostgreSQL)
- **Free tier**: 10GB storage, 100 hours compute/month
- **Compatible**: Direct PostgreSQL replacement
- **URL**: https://neon.tech
- **Setup**: 
  1. Sign up with GitHub
  2. Create database
  3. Copy connection string

## 2. Supabase (PostgreSQL + Additional Features)
- **Free tier**: 500MB database, 50,000 monthly active users
- **Compatible**: PostgreSQL + additional features
- **URL**: https://supabase.com
- **Setup**:
  1. Create project
  2. Get database URL from settings

## 3. PlanetScale (MySQL - requires schema changes)
- **Free tier**: 1 database, 1 billion row reads/month
- **Note**: MySQL, would need Prisma schema changes
- **URL**: https://planetscale.com

## 4. CockroachDB Serverless
- **Free tier**: 5GB storage, 250M RU/month
- **Compatible**: PostgreSQL-compatible
- **URL**: https://cockroachlabs.com

## Recommended Stack (100% Free):
- **Backend**: Render (free web service)
- **Database**: Neon (free PostgreSQL)
- **Redis**: Upstash (free Redis)
- **Frontend**: Cloudflare Pages (free)
- **Storage**: Cloudflare R2 (free 10GB/month)

## Connection Examples:

### Neon PostgreSQL:
```
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Upstash Redis:
```
REDIS_URL=redis://default:xxx@apn1-xxx.upstash.io:6379
```