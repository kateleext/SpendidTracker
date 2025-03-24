import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, isToday, parseISO } from "date-fns";
import ViewToggle from "../components/ViewToggle";
import MemoryCard from "../components/MemoryCard";
import MonthCard from "../components/MonthCard";
import { Expense, DailyExpenseGroup, MonthlyExpenseGroup, ViewType } from "../types";

interface JournalProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onImageClick: (imageUrl: string) => void;
}

const Journal = ({ view, onViewChange, onImageClick }: JournalProps) => {
  const { t } = useTranslation();
  
  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });

  // Group expenses by date for daily view
  const dailyGroups = expenses.reduce<DailyExpenseGroup[]>((groups, expense) => {
    const expenseDate = parseISO(expense.expense_date);
    const dateStr = format(expenseDate, 'yyyy-MM-dd');
    
    const existingGroup = groups.find(group => group.date === dateStr);
    if (existingGroup) {
      existingGroup.expenses.push(expense);
    } else {
      groups.push({
        date: dateStr,
        expenses: [expense],
        isToday: isToday(expenseDate)
      });
    }
    
    return groups;
  }, []);
  
  // Sort daily groups by date (newest first)
  dailyGroups.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Group expenses by month for monthly view
  const monthlyGroups = expenses.reduce<MonthlyExpenseGroup[]>((groups, expense) => {
    const expenseDate = parseISO(expense.expense_date);
    const month = expenseDate.getMonth() + 1;
    const year = expenseDate.getFullYear();
    const day = expenseDate.getDate();
    
    // Find or create month group
    let monthGroup = groups.find(g => g.month === month && g.year === year);
    if (!monthGroup) {
      monthGroup = { month, year, dayGroups: [] };
      groups.push(monthGroup);
    }
    
    // Find or create day group
    let dayGroup = monthGroup.dayGroups.find(d => d.day === day);
    if (!dayGroup) {
      dayGroup = { day, totalAmount: 0, expenses: [] };
      monthGroup.dayGroups.push(dayGroup);
    }
    
    // Add expense to day group and update total
    dayGroup.expenses.push(expense);
    dayGroup.totalAmount += parseFloat(expense.amount);
    
    return groups;
  }, []);
  
  // Sort monthly groups by date (newest first)
  monthlyGroups.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  
  // For each month, sort day groups (newest first)
  monthlyGroups.forEach(monthGroup => {
    monthGroup.dayGroups.sort((a, b) => b.day - a.day);
  });
  
  if (isLoading) {
    return (
      <div className="view-content p-8 text-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div id="diary-view" className="view-content">
      <div className="diary-header flex items-center justify-between px-5 py-2.5 z-5">
        <div className="flex-grow"></div>
        <ViewToggle activeView={view} onViewChange={onViewChange} />
      </div>

      {view === 'daily' ? (
        <div id="diary-daily-view" className="view-content">
          {dailyGroups.length === 0 ? (
            <div className="text-center p-8 text-text-secondary">
              <p>{t('noExpenses')}</p>
              <p className="mt-2 text-sm">{t('tapCameraToAdd')}</p>
            </div>
          ) : (
            dailyGroups.map(group => (
              <div className="day-group" key={group.date}>
                <div className="day-header pt-4 pb-2.5 px-5 text-[22px] font-semibold bg-primary-bg sticky top-[85px] z-5 flex items-center">
                  <div className="day-header-date">
                    {format(parseISO(group.date), 'MMMM d')}
                  </div>
                  {group.isToday && (
                    <div className="day-header-badge ml-2.5 text-[12px] font-medium bg-accent text-white px-2 py-1 rounded-full opacity-90">
                      {t('today')}
                    </div>
                  )}
                </div>

                {group.expenses.map(expense => (
                  <MemoryCard 
                    key={expense.id} 
                    expense={expense} 
                    onImageClick={onImageClick}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <div id="diary-monthly-view" className="view-content">
          {monthlyGroups.length === 0 ? (
            <div className="text-center p-8 text-text-secondary">
              <p>{t('noExpenses')}</p>
              <p className="mt-2 text-sm">{t('tapCameraToAdd')}</p>
            </div>
          ) : (
            monthlyGroups.map(group => (
              <MonthCard 
                key={`${group.year}-${group.month}`} 
                monthGroup={group} 
                onImageClick={onImageClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Journal;
