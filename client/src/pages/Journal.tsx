import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, isToday, parseISO } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { useRef, useEffect } from "react";
import ViewToggle from "../components/ViewToggle";
import MemoryCard from "../components/MemoryCard";
import MonthCard from "../components/MonthCard";
import { useIsMobile } from "../hooks/use-mobile";
import { Expense, DailyExpenseGroup, MonthlyExpenseGroup, ViewType } from "../types";

interface JournalProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onImageClick: (imageUrl: string) => void;
}

const Journal = ({ view, onViewChange, onImageClick }: JournalProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const journalRef = useRef<HTMLDivElement>(null);
  
  // Touch handling for pinch gesture
  const touchStartRef = useRef<{ touches: Touch[], time: number } | null>(null);
  const touchMoveRef = useRef<{ distance: number, direction: 'in' | 'out' | null } | null>(null);
  
  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });

  // Hong Kong timezone
  const HK_TIMEZONE = 'Asia/Hong_Kong';
  
  // Group expenses by date for daily view using Hong Kong timezone
  const dailyGroups = expenses.reduce<DailyExpenseGroup[]>((groups, expense) => {
    // Parse the date directly from expense_date (which is already in YYYY-MM-DD format)
    // This ensures we use the exact same date as stored in the database
    const expenseDate = parseISO(expense.expense_date);
    // Keep the date as-is to match the database record
    const dateStr = expense.expense_date;
    
    // Check if today using Hong Kong timezone
    const hkNow = toZonedTime(new Date(), HK_TIMEZONE);
    const isHkToday = 
      expenseDate.getDate() === hkNow.getDate() &&
      expenseDate.getMonth() === hkNow.getMonth() &&
      expenseDate.getFullYear() === hkNow.getFullYear();
    
    const existingGroup = groups.find(group => group.date === dateStr);
    if (existingGroup) {
      existingGroup.expenses.push(expense);
    } else {
      groups.push({
        date: dateStr,
        expenses: [expense],
        isToday: isHkToday
      });
    }
    
    return groups;
  }, []);
  
  // Sort daily groups by date (newest first)
  dailyGroups.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  // Sort expenses within each group by time (newest first)
  dailyGroups.forEach(group => {
    group.expenses.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  });
  
  // Pinch gesture effect for mobile devices
  useEffect(() => {
    if (!isMobile || !journalRef.current) return;
    
    // Calculate distance between two touch points
    const getDistance = (touches: Touch[]) => {
      if (touches.length !== 2) return 0;
      
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    // Handle touch start
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Store initial touch data
        touchStartRef.current = {
          touches: Array.from(e.touches),
          time: Date.now()
        };
        
        // Reset move data
        touchMoveRef.current = {
          distance: getDistance(Array.from(e.touches)),
          direction: null
        };
      }
    };
    
    // Handle touch move
    const handleTouchMove = (e: TouchEvent) => {
      // Skip if we don't have start data or there aren't 2 fingers
      if (!touchStartRef.current || e.touches.length !== 2) return;
      
      // Get current distance between fingers
      const currentDistance = getDistance(Array.from(e.touches));
      
      // Only continue if we have initial distance stored
      if (touchMoveRef.current && touchMoveRef.current.distance > 0) {
        const initialDistance = touchMoveRef.current.distance;
        const distanceDiff = currentDistance - initialDistance;
        
        // Determine pinch direction
        const direction = distanceDiff > 50 ? 'out' : (distanceDiff < -50 ? 'in' : null);
        
        // Only update if direction changed
        if (direction !== null && touchMoveRef.current.direction !== direction) {
          touchMoveRef.current.direction = direction;
        }
      }
    };
    
    // Handle touch end
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || !touchMoveRef.current) return;
      
      // Abort if touch duration was too short
      const touchDuration = Date.now() - touchStartRef.current.time;
      if (touchDuration < 100) {
        touchStartRef.current = null;
        touchMoveRef.current = null;
        return;
      }
      
      // Toggle view based on pinch direction, but only for vertical pinches
      if (touchMoveRef.current.direction === 'in') {
        // Pinch in - show monthly view
        view === 'daily' && onViewChange('monthly');
      } else if (touchMoveRef.current.direction === 'out') {
        // Pinch out - show daily view
        view === 'monthly' && onViewChange('daily');
      }
      
      // Reset touch data
      touchStartRef.current = null;
      touchMoveRef.current = null;
    };
    
    // Add event listeners
    const element = journalRef.current;
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);
    
    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, view, onViewChange]);
  
  // Group expenses by month for monthly view
  const monthlyGroups = expenses.reduce<MonthlyExpenseGroup[]>((groups, expense) => {
    // Use the same date parsing as in daily view for consistency
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
    
    // Sort expenses within each day group (newest first)
    monthGroup.dayGroups.forEach(dayGroup => {
      dayGroup.expenses.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
  });
  
  if (isLoading) {
    return (
      <div className="view-content p-8 text-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div id="diary-view" className="view-content" ref={journalRef}>
      <div className="diary-header flex items-center justify-between px-5 py-2.5 z-5">
        <ViewToggle activeView={view} onViewChange={onViewChange} />
        <div className="flex-grow"></div>
      </div>

      {view === 'daily' ? (
        <div id="diary-daily-view" className="view-content pb-6">
          {dailyGroups.length === 0 ? (
            <div className="text-center p-8 text-text-secondary">
              <p>{t('noExpenses')}</p>
              <p className="mt-2 text-sm">{t('tapCameraToAdd')}</p>
            </div>
          ) : (
            dailyGroups.map(group => (
              <div className="day-group" key={group.date}>
                <div className="day-header pt-4 pb-2.5 px-5 text-[22px] font-semibold bg-gray-50 sticky top-[50px] z-10 flex items-center">
                  <div className="day-header-date">
                    {formatInTimeZone(parseISO(group.date), HK_TIMEZONE, 'MMMM d')}
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
        <div id="diary-monthly-view" className="view-content pb-6">
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
