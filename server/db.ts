import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a postgres client
const client = postgres(process.env.DATABASE_URL);

// Create a drizzle instance
export const db = drizzle(client, { schema });
