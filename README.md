# Random Acts of Santa 2025

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Getting Started

### Development

First, install dependencies:

```bash
npm install
```

Copy the environment variables:

```bash
cp .env.example .env
```

Fill in your `.env` file with the necessary values. Then, push the database schema:

```bash
npm run db:push
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Docker Deployment

This project is configured for Docker deployment following the [T3 Docker guide](https://create.t3.gg/en/deployment/docker).

#### Build and run with Docker:

```bash
# Build the image
docker build -t t3-app --build-arg NEXT_PUBLIC_CLIENTVAR=clientvar .

# Run the container
docker run -p 3000:3000 -e DATABASE_URL="file:./db.sqlite" t3-app
```

#### Using Docker Compose:

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d --build
```

#### Environment Variables for Docker:

Make sure to set these environment variables when running in production:

- `DATABASE_URL` - Your database connection string (format: `mysql://username:password@host:port/database`)
- `AUTH_SECRET` - Generate with `npx auth secret`
- `AUTH_DISCORD_ID` - Your Discord OAuth app ID
- `AUTH_DISCORD_SECRET` - Your Discord OAuth app secret

#### Database Setup:

After configuring your database URL, push the schema:

```bash
npx prisma db push
```

**Troubleshooting Database Connection:**
- Ensure your database server is running and accessible
- Verify the correct port (MySQL/MariaDB typically uses port 3306)
- Check firewall settings and network connectivity
- Confirm database credentials and database name

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

**Version:** 0.1.5
