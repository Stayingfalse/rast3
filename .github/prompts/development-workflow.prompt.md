# Development Workflow Complete

Execute the complete development workflow for this RAoSanta Next.js project:

## 1. **Lint & Fix** 
Run ESLint and fix any linting issues found in the codebase:
- Check TypeScript files in `src/` directory
- Fix any import/export issues
- Resolve React/JSX formatting problems
- Ensure consistent code style

## 2. **Build Verification**
Execute a production build to ensure no build errors exist:
- Run `npm run build` to verify TypeScript compilation
- Check for any missing dependencies
- Validate Next.js app router functionality
- Ensure all tRPC routes compile correctly

## 3. **Stage & Commit**
Add all changes to staging and commit with an appropriate message:
- Stage modified files including:
- Create descriptive commit message following project conventions
- Ensure commit includes all related changes

## 4. **Cleanup**
Save all open files and close unused terminals:
- Save any unsaved editor files
- Close background terminal processes that are no longer needed
- Keep only essential development servers running
- Organize workspace for next development session

## 5. **Sync Check**
Check current Git branch status:
- If on `dev` branch: sync directly to remote
- If on feature branch or uncertain: ask which branch to use
- Verify branch is up to date with remote before pushing
- Handle any merge conflicts if they exist

## 6. **Push Changes**
Sync all committed changes to the remote repository:
- Push to appropriate branch (default: dev)
- Verify successful push to GitHub
- Confirm all changes are reflected in remote repository

## Quality Gates
- ✅ No ESLint errors or warnings
- ✅ Successful TypeScript compilation  
- ✅ Clean production build
- ✅ All changes committed with meaningful message
- ✅ Workspace cleaned and organized
- ✅ Changes synced to remote repository

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
- [Package.json](../package.json) - Project dependencies and scripts
- [Next Config](../next.config.js) - Next.js configuration
- [ESLint Config](../eslint.config.js) - Linting rules
- [TypeScript Config](../tsconfig.json) - TypeScript settings
- [Workflow Documentation](../DEVELOPMENT_WORKFLOW.md) - Detailed workflow guide

---

**Execute these steps in order and report the status of each step. If any step fails, fix the issues before proceeding to the next step.**
