# Authentication Fix Testing Guide

## Current Status
✅ **Authentication issues have been resolved:**
1. Fixed unauthorized tRPC API calls on homepage
2. Resolved React hooks order violations 
3. Fixed admin authentication logic using whitelist approach

## Manual Testing Steps

### 1. Access Prisma Studio
- Prisma Studio is running at: http://localhost:5555
- Navigate to the `User` table
- Manually update some users to have admin privileges:
  - Set `adminLevel` to `SITE`, `DOMAIN`, or `DEPARTMENT` for test users
  - Leave some users with `USER` level for negative testing

### 2. Test Authentication Flow
1. **Homepage Access (Unauthenticated)**
   - Visit: http://localhost:3000
   - ✅ Should not show any API errors in console
   - ✅ Should not trigger unauthorized tRPC calls

2. **Admin Route Access (No Session)**
   - Visit: http://localhost:3000/admin
   - ✅ Should redirect to homepage immediately
   - ✅ No React hooks order violations

3. **Admin Route Access (Regular User)**
   - Log in with a user that has `adminLevel: "USER"` or `null`
   - Visit: http://localhost:3000/admin
   - ✅ Should redirect to homepage
   - ✅ Should not have access to admin dashboard

4. **Admin Route Access (Admin User)**
   - Log in with a user that has `adminLevel: "SITE"`, `DOMAIN`, or `DEPARTMENT"`
   - Visit: http://localhost:3000/admin
   - ✅ Should successfully access admin dashboard
   - ✅ Should see admin sidebar and content

### 3. Test All Admin Levels
- **SITE Admin**: Should have full access to all admin routes
- **DOMAIN Admin**: Should have access to domain and department management
- **DEPARTMENT Admin**: Should have access to department management only

## Key Components Fixed

### AdminLayout Component
- **Before**: Used negative logic `user.adminLevel === "USER"` (security flaw)
- **After**: Uses whitelist approach `["DEPARTMENT", "DOMAIN", "SITE"].includes(user.adminLevel)`
- **Security**: Only explicitly authorized admin levels can access admin routes

### Homepage Components
- **AuthShowcase**: Added authentication guards to prevent unauthorized API calls
- **WishlistManager**: Added authentication guards and fixed hooks order

### Authentication Flow
- Consistent pattern: Check session first, then conditionally call APIs
- Proper loading states and error handling
- No unauthorized tRPC calls for unauthenticated users

## Expected Results
1. ✅ No console errors on homepage when not logged in
2. ✅ No React hooks order violations
3. ✅ Admin routes properly protected with whitelist approach
4. ✅ Only users with explicit admin permissions can access admin dashboard
5. ✅ Proper redirects for unauthorized access attempts

## Testing with Existing Data
The database has been seeded with test users. You can:
1. Use Prisma Studio to manually assign admin levels
2. Test different permission scenarios
3. Verify the whitelist logic works correctly

## Next Steps
1. Update some users to admin levels in Prisma Studio
2. Test login and admin access with these users
3. Verify the fix resolves all reported authentication issues
