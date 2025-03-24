import { pgTable, text, serial, integer, numeric, date, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  monthly_budget: numeric("monthly_budget", { precision: 10, scale: 2 }).default("2500.00").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).default(1).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  title: text("title").default("groceries").notNull(),
  image_url: text("image_url").notNull(),
  image_thumbnail_url: text("image_thumbnail_url"),
  expense_date: date("expense_date").defaultNow().notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

// Monthly budgets table
export const monthlyBudgets = pgTable("monthly_budgets", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).default(1).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  budget_amount: numeric("budget_amount", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

export const insertMonthlyBudgetSchema = createInsertSchema(monthlyBudgets).omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type InsertMonthlyBudget = z.infer<typeof insertMonthlyBudgetSchema>;
