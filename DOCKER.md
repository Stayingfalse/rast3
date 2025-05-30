# Docker Deployment Guide

This guide explains how to deploy your T3 Stack application using Docker.

## Quick Start

1. **Build the Docker image:**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker Compose (Recommended):**
   ```bash
   # Copy and configure environment file
   cp .env.docker .env.docker.local
   # Edit .env.docker.local with your actual values
   
   # Start the application
   npm run docker:up
   ```

3. **Or run directly with Docker:**
   ```bash
   npm run docker:run:dev
   ```

## Environment Configuration

### For Docker Compose
1. Copy `.env.docker` to `.env.docker.local`
2. Edit `.env.docker.local` with your actual values:
   - `AUTH_SECRET`: Generate a secure secret (use `npx auth secret`)
   - `AUTH_DISCORD_ID` & `AUTH_DISCORD_SECRET`: Discord OAuth credentials (optional)
   - `DATABASE_URL`: Keep as `file:./db.sqlite` for SQLite

### For Direct Docker Run
The application will use the values from `.env.docker` file.

## Available Commands

- `npm run docker:build` - Build the Docker image
- `npm run docker:run` - Run container on port 3000
- `npm run docker:run:dev` - Run container on port 3001 (development)
- `npm run docker:up` - Start with Docker Compose
- `npm run docker:up:detached` - Start with Docker Compose in background
- `npm run docker:down` - Stop Docker Compose services
- `npm run docker:logs` - View Docker Compose logs

## Troubleshooting

### Port Already in Use
If port 3000 is busy, use the development command:
```bash
npm run docker:run:dev
```
This runs the container on port 3001.

### Environment Variable Errors
The application validates environment variables on startup. Make sure to:
1. Set `AUTH_SECRET` to a secure value
2. Configure Discord OAuth if using authentication
3. Set proper `DATABASE_URL`

### Database Persistence
The Docker Compose setup includes a volume for SQLite database persistence.
Data will be preserved between container restarts.

## Production Deployment

For production:
1. Generate a secure `AUTH_SECRET`: `npx auth secret`
2. Configure proper OAuth credentials
3. Use environment variables or Docker secrets for sensitive data
4. Consider using a proper database (MySQL/PostgreSQL) instead of SQLite

## Architecture

The Docker setup uses:
- **Multi-stage build** for optimized image size
- **Node.js Alpine** base image for security and size
- **Standalone output** from Next.js for minimal runtime
- **Non-root user** for security
- **Volume mounting** for database persistence
