import { 
  users, expenses, monthlyBudgets,
  type User, type InsertUser,
  type Expense, type InsertExpense,
  type MonthlyBudget, type InsertMonthlyBudget
} from "@shared/schema";
import { db } from "./db";
import { eq, between, and, desc, sql } from "drizzle-orm";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  updateUserBudget(id: number, budget: number): Promise<User | undefined>;

  // Expense operations
  getExpenses(userId: number, dateRange?: DateRange): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpenseById(id: number): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<void>;
  
  // Budget operations
  getCurrentBudget(userId: number): Promise<{ total: number; spent: number; remaining: number; percentage: number; }>;
  getBudgetHistory(userId: number): Promise<{ month: number; year: number; spent: number; }[]>;
  setMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUserBudget(id: number, budget: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ monthly_budget: budget, updated_at: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Expense operations
  async getExpenses(userId: number, dateRange?: DateRange): Promise<Expense[]> {
    let query = db.select().from(expenses).where(eq(expenses.user_id, userId));
    
    if (dateRange) {
      query = query.where(
        between(expenses.expense_date, dateRange.startDate, dateRange.endDate)
      );
    }
    
    return await query.orderBy(desc(expenses.expense_date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async getExpenseById(id: number): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Budget operations
  async getCurrentBudget(userId: number): Promise<{ total: number; spent: number; remaining: number; percentage: number; }> {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Get start and end of current month
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);
    
    // Get user's budget
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const userBudget = user ? Number(user.monthly_budget) : 2500;
    
    // Check if there's a custom budget for this month
    const [monthBudget] = await db
      .select()
      .from(monthlyBudgets)
      .where(
        and(
          eq(monthlyBudgets.user_id, userId),
          eq(monthlyBudgets.month, currentMonth),
          eq(monthlyBudgets.year, currentYear)
        )
      );
    
    // Use monthly budget if available, otherwise use default user budget
    const totalBudget = monthBudget ? Number(monthBudget.budget_amount) : userBudget;
    
    // Calculate total expenses for the current month
    const result = await db
      .select({ 
        total: sql<string>`SUM(${expenses.amount})` 
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.user_id, userId),
          between(expenses.expense_date, startDate, endDate)
        )
      );
    
    const spent = result[0]?.total ? Number(result[0].total) : 0;
    const remaining = totalBudget - spent;
    const percentage = Math.min(100, (spent / totalBudget) * 100);
    
    return {
      total: totalBudget,
      spent,
      remaining,
      percentage
    };
  }

  async getBudgetHistory(userId: number): Promise<{ month: number; year: number; spent: number; }[]> {
    // Get last 12 months of data
    const now = new Date();
    const results = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      
      // Calculate start and end dates for this month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      // Get total expenses for this month
      const expenseResult = await db
        .select({ 
          total: sql<string>`SUM(${expenses.amount})` 
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.user_id, userId),
            between(expenses.expense_date, startDate, endDate)
          )
        );
      
      const spent = expenseResult[0]?.total ? Number(expenseResult[0].total) : 0;
      
      results.push({
        month,
        year,
        spent
      });
    }
    
    return results;
  }

  async setMonthlyBudget(budget: InsertMonthlyBudget): Promise<MonthlyBudget> {
    // Check if a budget already exists for this month/year
    const [existingBudget] = await db
      .select()
      .from(monthlyBudgets)
      .where(
        and(
          eq(monthlyBudgets.user_id, budget.user_id),
          eq(monthlyBudgets.month, budget.month),
          eq(monthlyBudgets.year, budget.year)
        )
      );
    
    if (existingBudget) {
      // Update existing budget
      const [updatedBudget] = await db
        .update(monthlyBudgets)
        .set({ 
          budget_amount: budget.budget_amount,
          updated_at: new Date()
        })
        .where(eq(monthlyBudgets.id, existingBudget.id))
        .returning();
      
      return updatedBudget;
    } else {
      // Create new budget
      const [newBudget] = await db
        .insert(monthlyBudgets)
        .values(budget)
        .returning();
      
      return newBudget;
    }
  }
}

export const storage = new DatabaseStorage();
