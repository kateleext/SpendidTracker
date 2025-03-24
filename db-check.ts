import { db } from "./server/db";
import { users, expenses, monthlyBudgets } from "./shared/schema";

async function checkDatabase() {
  try {
    console.log("Checking database connection...");
    
    // Check if tables exist by trying to query them
    console.log("Checking users table...");
    const usersResult = await db.select().from(users);
    console.log(`Users table exists. Found ${usersResult.length} records.`);
    
    console.log("Checking expenses table...");
    const expensesResult = await db.select().from(expenses);
    console.log(`Expenses table exists. Found ${expensesResult.length} records.`);
    
    console.log("Checking monthly_budgets table...");
    const budgetsResult = await db.select().from(monthlyBudgets);
    console.log(`Monthly budgets table exists. Found ${budgetsResult.length} records.`);
    
    console.log("Database check completed successfully!");
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();