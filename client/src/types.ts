export interface User {
  id: number;
  name: string;
  email: string | null;
  monthly_budget: string;
}

export interface Expense {
  id: number;
  user_id: number;
  amount: string;
  title: string;
  image_url: string;
  image_thumbnail_url: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface DailyExpenseGroup {
  date: string;
  expenses: Expense[];
  isToday: boolean;
}

export interface MonthlyExpenseGroup {
  month: number;
  year: number;
  dayGroups: {
    day: number;
    totalAmount: number;
    expenses: Expense[];
  }[];
}

export interface Budget {
  total: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetHistoryItem {
  month: number;
  year: number;
  spent: number;
}

export type ViewType = 'daily' | 'monthly';
export type TabType = 'journal' | 'budget';
export type Language = 'en' | 'zh-TW' | 'id';
