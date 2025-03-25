import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { BudgetHistoryItem } from '../types';

interface BudgetHistoryProps {
  historyItems: BudgetHistoryItem[];
}

const BudgetHistory = ({ historyItems }: BudgetHistoryProps) => {
  const { t } = useTranslation();
  
  // Filter out months with no spending
  const itemsWithSpending = historyItems.filter(item => item.spent > 0);
  
  // Group history items by year
  const groupedByYear: Record<number, BudgetHistoryItem[]> = {};
  
  itemsWithSpending.forEach(item => {
    if (!groupedByYear[item.year]) {
      groupedByYear[item.year] = [];
    }
    groupedByYear[item.year].push(item);
  });
  
  // Sort years in descending order
  const years = Object.keys(groupedByYear).map(Number).sort((a, b) => b - a);
  
  return (
    <div className="history-container mx-5 mb-6">
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
              
              // Generate chart points based on the actual spending amount
              const generateChartPoints = () => {
                const MAX_HEIGHT = 25; // Maximum height in the SVG
                const points = [];
                const spendingAmount = item.spent;
                const normalizedHeight = Math.min(MAX_HEIGHT, (spendingAmount / 1000) * MAX_HEIGHT); // Normalize to fit within MAX_HEIGHT
                
                // Create a slope that rises to the actual spending amount
                for (let i = 0; i < 5; i++) {
                  const x = i * 20;
                  const factor = i / 4; // 0 to 1 as i goes from 0 to 4
                  const y = MAX_HEIGHT - (factor * normalizedHeight);
                  points.push(`${x},${y}`);
                }
                
                // Add the final point representing the actual spending
                points.push(`100,${Math.max(2, MAX_HEIGHT - normalizedHeight)}`);
                
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
                      <polyline points={generateChartPoints()} fill="none" stroke="#4a5d44" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      
      {itemsWithSpending.length === 0 && (
        <div className="text-center p-4 text-text-secondary">
          {t('noSpendingHistory')}
        </div>
      )}
    </div>
  );
};

export default BudgetHistory;
