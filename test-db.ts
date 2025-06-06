// Quick test to see what's available on the db client
import { db } from "~/server/db";

console.log("Available properties on db:", Object.getOwnPropertyNames(db));
console.log("Checking for authProvider:", 'authProvider' in db);

// Check the actual Prisma schema again
export {};
