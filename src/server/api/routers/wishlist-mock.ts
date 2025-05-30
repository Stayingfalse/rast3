import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

// Mock data types
interface MockWishlistAssignment {
  id: string;
  assignedAt: Date;
  isActive: boolean;
  wishlistOwner: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    amazonWishlistUrl: string | null;
  };
  purchases: Array<{
    id: string;
    purchasedAt: Date;
    notes: string | null;
  }>;
  reports: Array<{
    id: string;
    reportType: string;
    description: string | null;
    reportedAt: Date;
  }>;
}

// Mock data store (in production this would be the database)
const mockAssignments: MockWishlistAssignment[] = [];
const mockPurchases: Array<{ id: string; assignmentId: string; userId: string; notes?: string; purchasedAt: Date }> = [];
const mockReports: Array<{ id: string; assignmentId: string; userId: string; type: string; description?: string; reportedAt: Date }> = [];

// Mock users for demonstration
const mockUsers = [
  {
    id: "user-1",
    name: "Alice Johnson",
    firstName: "Alice",
    lastName: "Johnson",
    amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/1234567890",
  },
  {
    id: "user-2", 
    name: "Bob Smith",
    firstName: "Bob",
    lastName: "Smith",
    amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/2345678901",
  },
  {
    id: "user-3",
    name: "Carol Williams",
    firstName: "Carol", 
    lastName: "Williams",
    amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/3456789012",
  },
  {
    id: "user-4",
    name: "David Brown",
    firstName: "David",
    lastName: "Brown", 
    amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/4567890123",
  },
  {
    id: "user-5",
    name: "Emma Davis",
    firstName: "Emma",
    lastName: "Davis",
    amazonWishlistUrl: "https://www.amazon.com/hz/wishlist/ls/5678901234",
  },
];

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export const wishlistRouter = createTRPCRouter({
  // Get the current user's assigned wishlists (links they can shop from)
  getMyAssignments: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Find assignments for this user
    const userAssignments = mockAssignments.filter(
      assignment => assignment.id.includes(userId) && assignment.isActive
    );
    
    // Add purchases and reports
    const assignmentsWithDetails = userAssignments.map(assignment => ({
      ...assignment,
      purchases: mockPurchases.filter(p => p.assignmentId === assignment.id),
      reports: mockReports.filter(r => r.assignmentId === assignment.id),
    }));

    return assignmentsWithDetails;
  }),

  // Get statistics about assignments
  getAssignmentStats: protectedProcedure.query(async ({ ctx }) => {
    const totalUsers = mockUsers.length;
    const totalAssignments = mockAssignments.filter(a => a.isActive).length;
    const usersWithAssignments = new Set(mockAssignments.map(a => a.id.split('-')[0])).size;
    const averageAssignments = totalUsers > 0 ? totalAssignments / totalUsers : 0;

    return {
      totalUsers,
      totalAssignments,
      usersWithAssignments,
      averageAssignments,
    };
  }),

  // Distribute initial 3 wishlists to current user
  requestInitialAssignments: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Check if user already has assignments
    const existingAssignments = mockAssignments.filter(
      assignment => assignment.id.includes(userId) && assignment.isActive
    );

    if (existingAssignments.length >= 3) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You already have your initial 3 assignments",
      });
    }

    // Get available users (excluding current user)
    const availableUsers = mockUsers.filter(user => user.id !== userId);
    
    // Shuffle and take up to 3
    const shuffled = availableUsers.sort(() => Math.random() - 0.5);
    const selectedUsers = shuffled.slice(0, Math.min(3, availableUsers.length));

    // Create assignments
    const newAssignments = selectedUsers.map(user => ({
      id: `${userId}-${user.id}-${generateId()}`,
      assignedAt: new Date(),
      isActive: true,
      wishlistOwner: user,
      purchases: [],
      reports: [],
    }));

    // Add to mock store
    mockAssignments.push(...newAssignments);

    return newAssignments;
  }),

  // Request additional assignments beyond the initial 3
  requestAdditionalAssignments: protectedProcedure
    .input(z.object({
      count: z.number().min(1).max(5).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check current assignment count
      const currentAssignments = mockAssignments.filter(
        assignment => assignment.id.includes(userId) && assignment.isActive
      );

      if (currentAssignments.length < 3) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Please request your initial 3 assignments first",
        });
      }

      // Get users already assigned to this user
      const assignedUserIds = currentAssignments.map(a => a.wishlistOwner.id);
      
      // Get available users (excluding current user and already assigned)
      const availableUsers = mockUsers.filter(
        user => user.id !== userId && !assignedUserIds.includes(user.id)
      );

      if (availableUsers.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No additional wishlists available for assignment",
        });
      }

      // Shuffle and take requested count
      const shuffled = availableUsers.sort(() => Math.random() - 0.5);
      const selectedUsers = shuffled.slice(0, Math.min(input.count, availableUsers.length));

      // Create assignments
      const newAssignments = selectedUsers.map(user => ({
        id: `${userId}-${user.id}-${generateId()}`,
        assignedAt: new Date(),
        isActive: true,
        wishlistOwner: user,
        purchases: [],
        reports: [],
      }));

      // Add to mock store
      mockAssignments.push(...newAssignments);

      return newAssignments;
    }),

  // Mark a purchase as completed
  markPurchase: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the assignment belongs to the current user
      const assignment = mockAssignments.find(
        a => a.id === input.assignmentId && a.id.includes(userId) && a.isActive
      );

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or not accessible",
        });
      }

      // Check if purchase already exists
      const existingPurchase = mockPurchases.find(
        p => p.assignmentId === input.assignmentId
      );

      if (existingPurchase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Purchase already marked for this assignment",
        });
      }

      // Create the purchase record
      const purchase = {
        id: generateId(),
        userId,
        assignmentId: input.assignmentId,
        notes: input.notes,
        purchasedAt: new Date(),
      };

      mockPurchases.push(purchase);

      return {
        ...purchase,
        wishlistAssignment: {
          ...assignment,
          wishlistOwner: assignment.wishlistOwner,
        },
      };
    }),

  // Report an issue with a wishlist
  reportIssue: protectedProcedure
    .input(z.object({
      assignmentId: z.string(),
      reportType: z.enum(["NO_ITEMS", "DOESNT_EXIST", "NO_ADDRESS", "OTHER"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify the assignment belongs to the current user
      const assignment = mockAssignments.find(
        a => a.id === input.assignmentId && a.id.includes(userId) && a.isActive
      );

      if (!assignment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assignment not found or not accessible",
        });
      }

      // Create the report
      const report = {
        id: generateId(),
        userId,
        assignmentId: input.assignmentId,
        type: input.reportType,
        description: input.description,
        reportedAt: new Date(),
      };

      mockReports.push(report);

      return {
        ...report,
        wishlistAssignment: {
          ...assignment,
          wishlistOwner: assignment.wishlistOwner,
        },
      };
    }),

  // Get reports for admin/debugging
  getAllReports: protectedProcedure.query(async ({ ctx }) => {
    return mockReports.map(report => {
      const assignment = mockAssignments.find(a => a.id === report.assignmentId);
      return {
        ...report,
        user: { name: "Anonymous User" }, // In production this would come from database
        wishlistAssignment: assignment || null,
      };
    });
  }),
});
