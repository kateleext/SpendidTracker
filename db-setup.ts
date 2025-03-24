import { db } from "./server/db";
import { users, expenses, monthlyBudgets } from "./shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// For migrations
const migrationClient = postgres(process.env.DATABASE_URL as string, { max: 1 });

async function migrateDb() {
  try {
    console.log("Creating database schema...");
    
    // Create a drizzle instance for migrations
    const migration = drizzle(migrationClient);
    
    // Push schema to the database
    console.log("Running schema migration...");
    await db.execute(/* sql */`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        monthly_budget NUMERIC(10, 2) NOT NULL DEFAULT 2500.00,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),
        amount NUMERIC(10, 2) NOT NULL,
        title TEXT NOT NULL DEFAULT 'groceries',
        image_url TEXT NOT NULL,
        image_thumbnail_url TEXT,
        expense_date DATE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS monthly_budgets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        budget_amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("Database schema created successfully!");
    
    // Create default user if it doesn't exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      console.log("Creating default user...");
      await db.insert(users).values({
        name: "Default User",
        email: "user@example.com",
        monthly_budget: "2500.00"
      });
      console.log("Default user created!");
    } else {
      console.log("Default user already exists");
    }
    
    console.log("Database setup completed successfully!");
  } catch (error) {
    console.error("Error setting up database:", error);
  } finally {
    await migrationClient.end();
    process.exit(0);
  }
}

migrateDb();