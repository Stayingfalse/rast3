# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a RAoSanta Next.js project with the following technologies:
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **tRPC** for end-to-end typesafe APIs
- **Prisma** for database ORM
- **NextAuth.js** for authentication
- **Tailwind CSS** for styling
- **ESLint** for code quality
- **Docker** for containerized deployment

## Development Guidelines
- Use TypeScript for all new files
- Follow the RAoSanta conventions and patterns
- Use tRPC for API routes and client-side data fetching
- Use Prisma for database operations
- Use NextAuth.js for authentication flows
- Use Tailwind CSS classes for styling
- Follow the App Router file-based routing conventions
- Keep components in the `src/app` directory structure
- Use server components by default, client components when needed
- Implement proper error handling and loading states
- Consider Docker deployment when building features

## Docker Deployment
- Project is configured for Docker following T3 official guidelines
- Uses multi-stage builds for optimized images
- Includes standalone output configuration for smaller images
- Environment variables are properly handled for containerization
- Use `SKIP_ENV_VALIDATION=1` for Docker builds

## Code Style & Architecture
- Use functional components with hooks
- Prefer const assertions and proper TypeScript types
- Use descriptive variable and function names
- Follow ESLint rules configured in the project
- Use proper imports with the configured `@/*` alias

## TSX Best Practices - Separation of Concerns
- **Separate logic from presentation**: Keep business logic in custom hooks or utility functions
- **Component structure**: Components should primarily handle rendering, not complex logic
- **Custom hooks**: Extract stateful logic, API calls, and side effects into reusable custom hooks
- **Utility functions**: Move pure functions and data transformations to separate utility files
- **Type definitions**: Define interfaces and types in separate files or at the top of components
- **Event handlers**: Extract complex event handlers into separate functions outside the JSX
- **Conditional rendering**: Use early returns or separate helper functions for complex conditionals
- **Data fetching**: Use tRPC hooks and custom hooks to separate data concerns from UI
- **Form handling**: Use libraries like react-hook-form and separate validation schemas
- **Styling**: Prefer Tailwind utility classes, use component variants for reusable styles

## Component Organization Pattern
```tsx
// 1. Imports
// 2. Type definitions
// 3. Custom hooks and utilities
// 4. Main component function
// 5. Helper functions (if small and component-specific)
// 6. Default export
```

## Preferred Patterns
- Extract complex JSX into smaller sub-components
- Use composition over complex prop drilling
- Implement loading and error states consistently
- Prefer server components for data fetching when possible
- Use client components only when necessary (interactivity, browser APIs)
