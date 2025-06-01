# Random Acts of Santa 2025 🎅

A modern holiday platform built to spread Christmas cheer through community-driven acts of kindness. This application helps organize and coordinate holiday giving within communities.

Built with RAoSanta architecture for a full-stack TypeScript experience.

## Features

### 🎁 Community Gift Organization
- Create and participate in holiday exchanges
- Simple gift coordination system
- Community-based giving initiatives

### 🔐 Secure Authentication
- Multiple OAuth providers (Discord, Twitch, Google)
- Secure user profiles and preferences
- Privacy-focused design

### 🎯 Random Acts of Kindness
- Community-driven kindness initiatives
- Holiday spirit coordination
- Seasonal giving activities

## Getting Started

### Development Setup

First, install dependencies:

```bash
npm install
```

Copy the environment variables:

```bash
cp .env.example .env
```

Configure your `.env` file with the required OAuth credentials and database settings. Then, initialize the database:

```bash
npm run db:push
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Required Environment Variables

```env
# Database
DATABASE_URL="your-database-connection-string"

# NextAuth.js
AUTH_SECRET="generate-with-npx-auth-secret"

# OAuth Providers
AUTH_DISCORD_ID="your-discord-app-id"
AUTH_DISCORD_SECRET="your-discord-app-secret"
AUTH_TWITCH_ID="your-twitch-app-id"
AUTH_TWITCH_SECRET="your-twitch-app-secret"
AUTH_GOOGLE_ID="your-google-app-id"
AUTH_GOOGLE_SECRET="your-google-app-secret"
```

## Deployment

### Docker Deployment

This project is optimized for Docker deployment following RAoSanta best practices.

#### Quick Start with Docker:

```bash
# Build the image
docker build -t random-acts-santa .

# Run the container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e AUTH_SECRET="your-auth-secret" \
  random-acts-santa
```

#### Using Docker Compose:

```bash
# Development
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

#### Production Environment Setup:

For production deployment, ensure these environment variables are configured:

- `DATABASE_URL` - Production database connection (MySQL/PostgreSQL recommended)
- `AUTH_SECRET` - Secure random string for session encryption
- OAuth provider credentials for each enabled provider
- `NEXTAUTH_URL` - Your application's public URL

#### Database Migration:

After deploying, run the database migration:

```bash
npx prisma db push
```

## Technology Stack

This application leverages the RAoSanta architecture and modern web technologies for optimal performance and developer experience:

- **[Next.js 14+](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://typescriptlang.org)** - Type-safe development
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Prisma](https://prisma.io)** - Database ORM and migrations
- **[NextAuth.js](https://next-auth.js.org)** - Authentication with multiple providers
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **[Docker](https://docker.com)** - Containerized deployment

## Contributing

We welcome contributions to make Random Acts of Santa even better! Whether it's bug fixes, new features, or improvements to the community experience.

### Development Guidelines

- Follow TypeScript best practices
- Use tRPC for API endpoints
- Implement proper error handling
- Write tests for new features
- Follow the existing code style

## Support & Community

Join our community to get help, share ideas, or contribute to the project:

- [RAoSanta Community](https://github.com/your-repo/random-acts-santa/discussions) for technical questions and community support
- [GitHub Issues](https://github.com/your-repo/random-acts-santa/issues) for bug reports
- [Discussions](https://github.com/your-repo/random-acts-santa/discussions) for feature requests

## Deployment Guides

Detailed deployment instructions for various platforms:

- [Vercel Deployment](https://vercel.com/docs/deploying-and-hosting)
- [Docker Deployment](https://docs.docker.com/get-started/)
- [Traditional VPS Setup](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-app-for-production-on-ubuntu-22-04)

---

**Spread the holiday cheer! 🎄✨**

*Version: 0.1.5*
