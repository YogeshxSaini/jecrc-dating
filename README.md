# JECRC Campus Dating App

A secure, privacy-focused dating platform exclusively for JECRC University students with email domain verification, photo moderation, and admin controls.

## 🎯 Features

- **Email Domain Restriction**: Only `@jecrc.ac.in` emails allowed (configurable)
- **OTP Authentication**: Passwordless or password-based login with email verification
- **Profile Management**: Photo uploads with S3 storage, bio, interests
- **Photo Verification**: Manual selfie verification for verified badges
- **Smart Matching**: Like/pass system with mutual match notifications
- **Real-time Chat**: Socket.IO powered messaging with typing indicators
- **Content Moderation**: Image moderation pipeline and user reporting
- **Admin Dashboard**: Review photo verifications, handle reports, manage users

## 🏗 Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL
- Socket.IO for real-time chat
- JWT + bcrypt for auth
- Redis for rate limiting & sessions
- AWS S3 for photo storage

**Frontend:**
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- Socket.IO client
- Axios for API calls

**DevOps:**
- Docker + Docker Compose
- GitHub Actions CI/CD
- Jest + Supertest for testing
- Playwright for E2E tests

## 📁 Project Structure

```
jecrc_dating/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Auth, rate limiting, validation
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers, email, S3
│   │   ├── socket/          # Socket.IO handlers
│   │   └── index.ts         # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database models
│   │   └── migrations/      # SQL migrations
│   ├── tests/               # Unit & integration tests
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── lib/             # API client, hooks, utils
│   │   ├── contexts/        # Auth context
│   │   └── types/           # TypeScript types
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # Local development setup
├── .github/
│   └── workflows/
│       └── ci.yml           # CI/CD pipeline
├── deploy/
│   └── deployment-notes.md  # Production deployment guide
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development without Docker)
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd jecrc_dating
```

### 2. Environment Variables

Create `.env` files in backend and frontend directories:

**backend/.env:**
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/jecrc_dating?schema=public"

# Redis
REDIS_URL="redis://redis:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Email (use 'console' for local dev, 'smtp' for production)
EMAIL_PROVIDER="console"
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
EMAIL_FROM="noreply@jecrc.ac.in"

# Domain restriction
ALLOWED_EMAIL_DOMAIN="jecrc.ac.in"

# AWS S3 (use MinIO for local dev)
S3_ENDPOINT="http://minio:9000"
S3_BUCKET="jecrc-dating"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_REGION="us-east-1"
S3_USE_PATH_STYLE="true"

# App
PORT="4000"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 3. Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (S3-compatible storage, port 9000)
- Backend API (port 4000)
- Frontend (port 3000)

The database migrations run automatically on startup.

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **MinIO Console**: http://localhost:9001 (admin/adminpass)

### 5. Seed Sample Data

```bash
# Run seed script to create test users
docker-compose exec backend npm run seed

# This creates:
# - 2 regular users (student1@jecrc.ac.in, student2@jecrc.ac.in)
# - 1 admin user (admin@jecrc.ac.in)
# - Sample profiles and photos
# Password for all: "password123"
```

## 🧪 Testing

### Run All Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Run Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

## 📚 API Documentation

### Authentication Endpoints

#### Request OTP
```http
POST /api/auth/request-verification
Content-Type: application/json

{
  "email": "student@jecrc.ac.in"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to email",
  "expiresIn": 600
}
```

#### Verify OTP & Create Account
```http
POST /api/auth/verify
Content-Type: application/json

{
  "email": "student@jecrc.ac.in",
  "otp": "123456",
  "password": "optional-password",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "student@jecrc.ac.in",
    "displayName": "John Doe"
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### Login (with password)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@jecrc.ac.in",
  "password": "password123"
}
```

#### Login (passwordless OTP)
```http
POST /api/auth/request-verification
{
  "email": "student@jecrc.ac.in",
  "loginMode": true
}

# Then verify with OTP
POST /api/auth/verify
{
  "email": "student@jecrc.ac.in",
  "otp": "123456"
}
```

### Profile Endpoints

#### Get My Profile
```http
GET /api/profile/me
Authorization: Bearer <access-token>
```

#### Update Profile
```http
PUT /api/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "displayName": "John Doe",
  "bio": "CS student, loves coding",
  "interests": ["coding", "music", "sports"],
  "gender": "male",
  "lookingFor": "female"
}
```

#### Upload Photo
```http
POST /api/profile/photos
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

photo: <file>
```

#### Request Photo Upload URL (S3 Signed URL)
```http
POST /api/profile/photos/upload-url
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "filename": "photo.jpg",
  "contentType": "image/jpeg"
}
```

### Matching Endpoints

#### Get Discover Feed
```http
GET /api/discover?limit=10&offset=0
Authorization: Bearer <access-token>
```

#### Like a User
```http
POST /api/likes
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "toUserId": "user-uuid"
}
```

#### Get Matches
```http
GET /api/matches
Authorization: Bearer <access-token>
```

### Chat Endpoints

#### Get Chat Messages
```http
GET /api/chat/:matchId/messages?limit=50&offset=0
Authorization: Bearer <access-token>
```

#### Send Message (via Socket.IO)
```javascript
socket.emit('send_message', {
  matchId: 'match-uuid',
  content: 'Hello!'
});
```

### Admin Endpoints

#### Get Photo Verification Queue
```http
GET /api/admin/photo-verifications?status=pending
Authorization: Bearer <admin-access-token>
```

#### Approve/Reject Photo Verification
```http
POST /api/admin/photo-verifications/:id/review
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "status": "approved",
  "reason": "Photo verified"
}
```

#### Get Reports
```http
GET /api/admin/reports?status=pending
Authorization: Bearer <admin-access-token>
```

#### Ban/Unban User
```http
POST /api/admin/users/:id/ban
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "reason": "Inappropriate behavior"
}
```

See `backend/docs/openapi.yaml` for complete API specification.

## 🔒 Security Features

- **Email Domain Verification**: Only university emails accepted
- **OTP Hashing**: OTPs hashed with bcrypt, never stored plaintext
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Short-lived access tokens (15min) + refresh tokens (7d)
- **Rate Limiting**: Redis-based rate limiting on all endpoints
- **CSRF Protection**: Token-based CSRF for state-changing operations
- **File Validation**: MIME type and size validation for uploads
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: React auto-escaping + Content Security Policy
- **Photo Moderation**: Automatic and manual review pipeline

## 📋 User Flow Examples

### New User Signup
1. Enter `student@jecrc.ac.in` on signup page
2. Receive OTP via email
3. Enter OTP + create password (optional) + display name
4. Redirected to onboarding (add photos, bio, interests)
5. Upload selfie for verification (optional for verified badge)
6. Start discovering matches

### Matching & Chat
1. Browse discover feed (swipe/grid view)
2. Like profiles
3. Get notification when matched (mutual like)
4. Open chat from matches list
5. Real-time messaging with typing indicators

### Admin Moderation
1. Login with admin account
2. Access admin dashboard
3. Review pending photo verifications (approve/reject)
4. Handle user reports
5. Ban users if needed

## 🔧 Development

### Without Docker (Local Development)

1. Install dependencies:
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Start PostgreSQL and Redis locally

3. Run migrations:
```bash
cd backend
npx prisma migrate dev
```

4. Start backend:
```bash
cd backend
npm run dev
```

5. Start frontend:
```bash
cd frontend
npm run dev
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

## 🚀 Production Deployment

See `deploy/deployment-notes.md` for detailed production deployment guide including:

- Managed PostgreSQL (AWS RDS, Supabase, etc.)
- Redis (AWS ElastiCache, Upstash)
- S3 bucket setup
- SSL/TLS configuration
- Environment variables
- Scaling Socket.IO with Redis adapter
- CDN for static assets
- Monitoring and logging

### Quick Deploy Options

**Vercel (Frontend) + Railway (Backend):**
- Frontend: Deploy Next.js to Vercel
- Backend: Deploy to Railway with PostgreSQL addon
- See `deploy/railway.md`

**AWS ECS/Fargate:**
- Use provided Dockerfiles
- Setup Application Load Balancer
- See `deploy/aws-ecs.md`

**DigitalOcean App Platform:**
- Connect GitHub repo
- Configure build settings
- See `deploy/digitalocean.md`

## 🔮 Future Improvements

### Phase 2 Features
- [ ] University SSO integration (LDAP/SAML)
- [ ] Advanced matching algorithm (interests, compatibility scores)
- [ ] Video chat integration
- [ ] Group events and meetups
- [ ] Location-based discovery (campus zones)
- [ ] Profile prompts and icebreakers
- [ ] Story/status features
- [ ] Push notifications (FCM/APNS)

### Moderation Enhancements
- [ ] Integrate ML-based image moderation (AWS Rekognition, Google Vision)
- [ ] Automated NSFW detection
- [ ] Text moderation for messages (profanity filter)
- [ ] Trust score system
- [ ] Community guidelines enforcement

### Technical Improvements
- [ ] GraphQL API option
- [ ] WebRTC for voice/video calls
- [ ] Progressive Web App (PWA)
- [ ] Native mobile apps (React Native)
- [ ] Analytics dashboard
- [ ] A/B testing framework
- [ ] Automated backup strategy

### University SSO Integration Points

To integrate with JECRC University's authentication system:

1. **LDAP Integration** (`backend/src/services/ldap.service.ts`):
   ```typescript
   // Connect to university LDAP server
   // Verify student credentials against directory
   // Sync student info (name, department, year)
   ```

2. **SAML 2.0 Provider** (`backend/src/config/saml.ts`):
   ```typescript
   // Configure university IdP
   // Implement SSO login flow
   // Map SAML attributes to user profile
   ```

3. **OAuth 2.0 Bridge** (`backend/src/routes/auth-sso.ts`):
   ```typescript
   // If university provides OAuth
   // Implement OAuth flow
   // Exchange tokens for user data
   ```

Contact university IT department for:
- SSO endpoint URLs
- SAML metadata XML
- LDAP server details and access
- Student data access permissions

## 📄 Privacy & Legal

- `docs/privacy-policy.md` - Privacy policy template
- `docs/terms-of-service.md` - Terms of service template
- `docs/community-guidelines.md` - Community guidelines

⚠️ **Important**: Consult with legal counsel before deploying. Update privacy policy and terms with university-specific information.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Email: support@jecrc.ac.in

## ✅ Acceptance Criteria Checklist

- [x] Running `docker-compose up --build` starts all services
- [x] Migrations run automatically
- [x] Site accessible at http://localhost:3000
- [x] Signup with `student@jecrc.ac.in` flows through OTP
- [x] Profile creation works
- [x] Two seeded users can like each other
- [x] Mutual likes create match
- [x] Chat opens and persists messages
- [x] Admin can view photo verification queue
- [x] Admin can approve verified_selfie flag
- [x] Email domain restriction enforced via .env
- [x] Local dev works without paid services
- [x] Console email adapter for local development

---

Built with ❤️ for JECRC University students
