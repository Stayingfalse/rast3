# Development Workflow - Streamlined

Execute the streamlined development workflow for this RAoSanta Next.js project:

## 1. **Lint & Fix** 
Run ESLint and automatically fix any issues:
- Execute `npm run lint` to check for issues
- If linting errors found, run `npm run lint -- --fix` to auto-fix
- Manually fix any remaining issues that can't be auto-fixed
- Focus on TypeScript files in `src/` directory

## 2. **Build Verification**
Execute a production build to ensure no compilation errors:
- Run `npm run build` to verify TypeScript compilation
- Ensure all components and pages compile correctly
- Check that tRPC routes and API endpoints are valid
- Verify no missing dependencies or import errors

## 3. **Commit & Push**
If lint and build are successful, commit and push changes:
- Stage all modified files with `git add .`
- Create descriptive commit message following project conventions
- Check current Git branch and push to appropriate remote
- Default to `dev` branch unless specified otherwise

## Quality Gates (Must Pass to Proceed)
- ✅ **Lint Check**: No ESLint errors or warnings
- ✅ **Build Check**: Successful TypeScript compilation and Next.js build
- ✅ **Git Push**: All changes committed and synced to remote repository

## Workflow Rules
- **Stop immediately** if any quality gate fails
- **Fix issues** before proceeding to next step
- **No cleanup steps** that could cause workflow loops
- **Focus on core tasks**: Lint → Build → Commit → Push

## Project Context
This is a **RAoSanta Next.js project** with:
- Next.js 14+ with App Router
- TypeScript for type safety
- tRPC for end-to-end typesafe APIs
- Prisma for database ORM
- NextAuth.js for authentication
- Tailwind CSS for styling
- Docker for containerized deployment

## Important Files
- **package.json** - Project dependencies and scripts
- **next.config.js** - Next.js configuration
- **eslint.config.js** - Linting rules
- **tsconfig.json** - TypeScript settings

---

**Execute these steps in order and report the status of each step. If any step fails, fix the issues before proceeding to the next step.**
