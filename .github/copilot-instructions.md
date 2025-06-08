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

## ESLint Best Practices - CRITICAL

To avoid common lint errors, always follow these rules when generating code:

### Type Safety Rules
- **NEVER use `any` type** - Always define proper interfaces or use specific types
- **NEVER use `unknown` without type guards** - Use proper type assertions or guards
- **ALWAYS use proper TypeScript interfaces** - Define `interface` or `type` for object structures
- **EXPORT types when needed** - If a type is used across files, export it properly

### Nullish Coalescing & Optional Chaining
- **ALWAYS use `??` instead of `||`** for null/undefined checks
- **ALWAYS use `?.` for optional chaining** when accessing nested properties
- **NEVER use `||` for default values** unless dealing with falsy values intentionally

### Environment Variables & Client Safety
- **NEVER access `process.env` at module level in client-side code**
- **ALWAYS wrap `process.env` access in runtime checks** like `typeof window === "undefined"`
- **USE `getBaseUrl()` functions** instead of direct environment variable access in client code
- **SEPARATE client and server environment access** with proper guards

### Promise Handling
- **ALWAYS handle promises** - Use `await` or `.catch()` for error handling
- **USE `void` operator** for intentionally unhandled promises (e.g., `void someAsyncFunction()`)
- **NEVER leave floating promises** without proper handling

### Logger Patterns
- **SERVER-SIDE**: Use `createChildLogger('module-name')` and Pino signature: `logger.error({ data }, "message")`
- **CLIENT-SIDE**: Use `clientLogger.error(error, context, data)` pattern
- **NEVER mix server and client logger patterns** in the same file

### Safe Coding Patterns
- **ALWAYS check for null/undefined** before accessing object properties
- **USE type guards** for runtime type checking instead of type assertions
- **AVOID unsafe member access** - check if properties exist before accessing
- **SERIALIZE objects safely** using `JSON.stringify()` instead of `String()` conversion

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

## Common Code Patterns - RAoSanta Specific

### Logger Implementation
```tsx
// ✅ SERVER-SIDE (API routes, server components, server utilities)
import { createChildLogger } from "~/utils/logger";
const logger = createChildLogger('module-name');
logger.error({ error: errorData, context: additionalContext }, "Error message");

// ✅ CLIENT-SIDE (client components, browser-only code)
import { clientLogger } from "~/utils/client-logger";
clientLogger.error(new Error("message"), "Context description", { additionalData });
```

### Environment Variable Access
```tsx
// ✅ SAFE - Runtime detection
const getConfig = () => {
  if (typeof window === "undefined") {
    return process.env.SERVER_VAR ?? "default";
  }
  return "client-default";
};

// ❌ UNSAFE - Module-level access in client code
const config = process.env.SERVER_VAR; // Will cause client-side errors
```

### Type Definitions
```tsx
// ✅ PROPER - Specific interfaces
interface UserData {
  id: string;
  name: string;
  email?: string;
}

// ✅ PROPER - Export when used across files
export interface ClientErrorData {
  userAgent?: string;
  url?: string;
  timestamp?: string;
}

// ❌ AVOID - Using any
const userData: any = getUserData();
```

### Error Handling
```tsx
// ✅ PROPER - Explicit error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, "API call failed");
  throw error;
}

// ✅ PROPER - Void for intentional fire-and-forget
void sendAnalytics(data); // Intentionally not awaited

// ❌ AVOID - Floating promises
sendAnalytics(data); // ESLint error: floating promise
```
