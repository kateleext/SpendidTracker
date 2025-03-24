import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { BudgetHistoryItem } from '../types';

interface BudgetHistoryProps {
  historyItems: BudgetHistoryItem[];
}

const BudgetHistory = ({ historyItems }: BudgetHistoryProps) => {
  const { t } = useTranslation();
  
  // Group history items by year
  const groupedByYear: Record<number, BudgetHistoryItem[]> = {};
  
  historyItems.forEach(item => {
    if (!groupedByYear[item.year]) {
      groupedByYear[item.year] = [];
    }
    groupedByYear[item.year].push(item);
  });
  
  // Sort years in descending order
  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);
  
  return (
    <div className="history-container mx-5">
      {years.map(year => {
        const yearItems = groupedByYear[year];
        
        return (
          <div key={year}>
            <div className="history-year text-[13px] font-semibold text-text-secondary py-1.5 mt-4 mb-2.5 border-b border-black/10">
              {year}
            </div>
            
            {yearItems.map(item => {
              // Format the month abbreviation
              const monthName = format(new Date(item.year, item.month - 1, 1), 'MMM');
              
              // Format the amount as currency
              const formattedAmount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
              }).format(item.spent);
              
              // Generate random points for chart line
              // In a real app, these would be actual daily spending points
              const generateRandomPoints = () => {
                const points = [];
                for (let i = 0; i < 6; i++) {
                  points.push(`${i * 20},${Math.floor(Math.random() * 20) + 5}`);
                }
                return points.join(' ');
              };
              
              return (
                <div 
                  key={`${item.year}-${item.month}`} 
                  className="history-item flex items-center bg-secondary-bg rounded-md mb-2.5 p-4 shadow-sm"
                >
                  <div className="history-month text-[14px] font-medium w-[35px] text-text-primary">
                    {monthName}
                  </div>
                  <div className="history-amount text-[15px] font-semibold mr-4 text-text-primary w-[70px]">
                    {formattedAmount}
                  </div>
                  <div className="history-chart flex-grow h-[28px] relative">
                    <svg className="history-chart-line absolute top-0 left-0 w-full h-full" viewBox="0 0 100 28" preserveAspectRatio="none">
                      <polyline points={generateRandomPoints()} fill="none" stroke="#5d7052" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      
      {historyItems.length === 0 && (
        <div className="text-center p-4 text-text-secondary">
          {t('noSpendingHistory')}
        </div>
      )}
    </div>
  );
};

export default BudgetHistory;
