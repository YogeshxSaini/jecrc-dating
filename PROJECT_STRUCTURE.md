# JECRC Dating App - Complete File Tree

```
jecrc_dating/
│
├── README.md                          # Main documentation
├── docker-compose.yml                 # Local development setup
├── .gitignore                         # Git ignore rules
│
├── backend/                           # Backend API (Node.js/Express/TypeScript)
│   ├── package.json                   # Backend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── jest.config.js                 # Jest test configuration
│   ├── .eslintrc.js                   # ESLint configuration
│   ├── .prettierrc.js                 # Prettier configuration
│   ├── Dockerfile                     # Backend Docker image
│   ├── .env.example                   # Environment variables template
│   │
│   ├── prisma/                        # Database schema & migrations
│   │   ├── schema.prisma              # Prisma schema (all models)
│   │   └── migrations/                # SQL migration files
│   │
│   ├── src/                           # Source code
│   │   ├── index.ts                   # Server entry point
│   │   │
│   │   ├── config/                    # Configuration
│   │   │   └── index.ts               # Config loader (env vars)
│   │   │
│   │   ├── middleware/                # Express middleware
│   │   │   ├── auth.ts                # JWT authentication
│   │   │   ├── errorHandler.ts        # Error handling
│   │   │   ├── rateLimiter.ts         # Rate limiting (Redis)
│   │   │   └── validation.ts          # Request validation
│   │   │
│   │   ├── routes/                    # API endpoints
│   │   │   ├── auth.ts                # Auth routes (OTP, login)
│   │   │   ├── profile.ts             # Profile management
│   │   │   ├── discover.ts            # Discovery feed
│   │   │   ├── likes.ts               # Like/unlike users
│   │   │   ├── matches.ts             # Match management
│   │   │   ├── chat.ts                # Chat messages (REST)
│   │   │   └── admin.ts               # Admin panel routes
│   │   │
│   │   ├── socket/                    # Socket.IO handlers
│   │   │   └── index.ts               # Real-time chat, typing, online status
│   │   │
│   │   ├── services/                  # Business logic
│   │   │   ├── moderation.ts          # Image/text moderation (stub)
│   │   │   ├── matching.ts            # Matching algorithm
│   │   │   └── notification.ts        # Push notifications
│   │   │
│   │   └── utils/                     # Utility functions
│   │       ├── email.ts               # Email service (console/SMTP adapters)
│   │       ├── otp.ts                 # OTP generation
│   │       ├── s3.ts                  # S3 file upload
│   │       └── seed.ts                # Database seed script
│   │
│   ├── tests/                         # Test files
│   │   ├── setup.ts                   # Test configuration
│   │   ├── unit/                      # Unit tests
│   │   │   ├── auth.test.ts
│   │   │   ├── otp.test.ts
│   │   │   └── moderation.test.ts
│   │   └── integration/               # Integration tests
│   │       └── api.test.ts
│   │
│   └── docs/                          # Backend documentation
│       └── openapi.yaml               # OpenAPI/Swagger spec
│
├── frontend/                          # Frontend (Next.js 14/React/TypeScript)
│   ├── package.json                   # Frontend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS configuration
│   ├── postcss.config.js              # PostCSS configuration
│   ├── Dockerfile                     # Frontend Docker image
│   ├── .env.local.example             # Environment variables template
│   │
│   ├── public/                        # Static assets
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── images/
│   │
│   └── src/                           # Source code
│       ├── app/                       # Next.js App Router
│       │   ├── layout.tsx             # Root layout
│       │   ├── page.tsx               # Home page
│       │   ├── globals.css            # Global styles
│       │   │
│       │   ├── signup/                # Signup flow
│       │   │   └── page.tsx           # Email input
│       │   │
│       │   ├── verify/                # OTP verification
│       │   │   └── page.tsx           # OTP input + account creation
│       │   │
│       │   ├── login/                 # Login page
│       │   │   └── page.tsx           # Email/password login
│       │   │
│       │   ├── onboarding/            # Profile setup
│       │   │   └── page.tsx           # Bio, photos, interests
│       │   │
│       │   ├── discover/              # Discovery feed
│       │   │   └── page.tsx           # Swipe/grid view
│       │   │
│       │   ├── matches/               # Matches list
│       │   │   └── page.tsx           # List of matches
│       │   │
│       │   ├── chat/                  # Chat interface
│       │   │   └── [matchId]/
│       │   │       └── page.tsx       # Chat with match
│       │   │
│       │   ├── profile/               # User profile
│       │   │   ├── page.tsx           # View/edit own profile
│       │   │   └── [userId]/
│       │   │       └── page.tsx       # View other user's profile
│       │   │
│       │   └── admin/                 # Admin dashboard
│       │       ├── page.tsx           # Dashboard overview
│       │       ├── verifications/
│       │       │   └── page.tsx       # Photo verification queue
│       │       └── reports/
│       │           └── page.tsx       # User reports
│       │
│       ├── components/                # React components
│       │   ├── ui/                    # UI components
│       │   │   ├── Button.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Modal.tsx
│       │   │   └── Avatar.tsx
│       │   │
│       │   ├── ProfileCard.tsx        # User profile card
│       │   ├── MatchCard.tsx          # Match list item
│       │   ├── MessageBubble.tsx      # Chat message
│       │   ├── PhotoUpload.tsx        # Photo upload component
│       │   └── Navigation.tsx         # App navigation
│       │
│       ├── lib/                       # Libraries & utilities
│       │   ├── api.ts                 # API client (axios)
│       │   ├── socket.ts              # Socket.IO client
│       │   └── utils.ts               # Helper functions
│       │
│       ├── hooks/                     # Custom React hooks
│       │   ├── useAuth.ts             # Authentication hook
│       │   ├── useSocket.ts           # Socket.IO hook
│       │   └── useChat.ts             # Chat hook
│       │
│       ├── contexts/                  # React contexts
│       │   ├── AuthContext.tsx        # Auth state
│       │   └── SocketContext.tsx      # Socket connection
│       │
│       └── types/                     # TypeScript types
│           ├── user.ts
│           ├── match.ts
│           ├── message.ts
│           └── api.ts
│
├── deploy/                            # Deployment guides
│   ├── deployment-notes.md            # Comprehensive deployment guide
│   ├── aws-ecs.md                     # AWS ECS deployment
│   ├── railway.md                     # Railway deployment
│   └── digitalocean.md                # DigitalOcean deployment
│
├── docs/                              # Documentation
│   ├── privacy-policy.md              # Privacy policy
│   ├── terms-of-service.md            # Terms of service
│   ├── community-guidelines.md        # Community guidelines
│   └── api-documentation.md           # API docs
│
└── .github/                           # GitHub configuration
    └── workflows/
        └── ci.yml                     # CI/CD pipeline
```

## Key File Descriptions

### Backend Core Files

- **`backend/src/index.ts`**: Express server setup, Socket.IO initialization, middleware mounting
- **`backend/src/routes/auth.ts`**: OTP flow, email verification, JWT auth, login/logout
- **`backend/src/routes/profile.ts`**: Profile CRUD, photo uploads, S3 signed URLs
- **`backend/src/routes/likes.ts`**: Like/unlike users, mutual match creation
- **`backend/src/routes/chat.ts`**: REST API for messages (Socket.IO for real-time)
- **`backend/src/socket/index.ts`**: Real-time chat, typing indicators, online status
- **`backend/src/utils/email.ts`**: Email adapter pattern (console/SMTP)
- **`backend/src/services/moderation.ts`**: Content moderation stub (TODO: ML integration)
- **`backend/prisma/schema.prisma`**: Complete database schema with all models

### Frontend Core Files

- **`frontend/src/app/signup/page.tsx`**: Email signup with domain validation
- **`frontend/src/app/verify/page.tsx`**: OTP verification and account creation
- **`frontend/src/app/discover/page.tsx`**: Swipe/grid UI for discovering matches
- **`frontend/src/app/matches/page.tsx`**: List of all matches
- **`frontend/src/app/chat/[matchId]/page.tsx`**: Real-time chat interface
- **`frontend/src/lib/api.ts`**: Axios-based API client with token refresh
- **`frontend/src/lib/socket.ts`**: Socket.IO client setup

### Configuration Files

- **`docker-compose.yml`**: Local development stack (PostgreSQL, Redis, MinIO, backend, frontend)
- **`.github/workflows/ci.yml`**: Automated testing and deployment pipeline
- **`backend/prisma/schema.prisma`**: Database models and relationships

### Documentation

- **`README.md`**: Complete setup and usage guide
- **`docs/privacy-policy.md`**: GDPR-compliant privacy policy template
- **`docs/terms-of-service.md`**: Legal terms and conditions
- **`deploy/deployment-notes.md`**: Production deployment strategies

## Not Included (Due to Space)

The following files are not generated but would be needed for a complete implementation:

### Frontend Pages/Components
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/onboarding/page.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/app/admin/page.tsx`
- All UI components in `frontend/src/components/`

### Additional Backend Files
- `backend/src/middleware/validation.ts`
- `backend/src/services/matching.ts`
- `backend/src/services/notification.ts`
- Additional test files

### Configuration
- `.env.example` files
- `postcss.config.js`
- Additional Docker configs

## Implementation Notes

1. **Database Migrations**: Run `npx prisma migrate dev` to create initial migration
2. **Seed Data**: Run `npm run seed` to populate test data
3. **Development**: Use `docker-compose up` to start all services
4. **Testing**: Run `npm test` in backend directory
5. **Production**: Follow `deploy/deployment-notes.md` for deployment

## Next Steps for Full Implementation

1. Complete all frontend pages listed above
2. Implement remaining UI components
3. Add E2E tests with Playwright
4. Integrate actual ML-based image moderation
5. Set up production monitoring (Sentry, DataDog)
6. Configure university SSO integration
7. Add push notifications (FCM/APNS)
8. Implement advanced matching algorithm
9. Add analytics tracking
10. Set up CDN for static assets

## Code Quality

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Jest for unit/integration testing
- Prisma for type-safe database access
- Zod for runtime validation
- React Hook Form for form management

## Security Features

- Email domain restriction (@jecrc.ac.in only)
- OTP hashing with bcrypt
- JWT access + refresh tokens
- Rate limiting on all endpoints
- CSRF protection
- SQL injection prevention (Prisma)
- XSS protection (React auto-escaping)
- Photo moderation pipeline
