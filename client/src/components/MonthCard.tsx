import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { MonthlyExpenseGroup } from '../types';

interface MonthCardProps {
  monthGroup: MonthlyExpenseGroup;
}

const MonthCard = ({ monthGroup }: MonthCardProps) => {
  const { t } = useTranslation();
  const { openImageModal } = useAppContext();
  
  const monthName = format(new Date(monthGroup.year, monthGroup.month - 1, 1), 'MMMM yyyy');
  
  const handleThumbnailClick = (imageUrl: string) => {
    openImageModal(imageUrl);
  };

  return (
    <div className="month-card bg-secondary-bg rounded-xl my-2 mx-5 p-4 shadow-card">
      <div className="month-title text-[18px] font-semibold mb-2.5 text-text-primary">
        {monthName}
      </div>
      <div className="month-rows flex flex-col gap-1.5">
        {monthGroup.dayGroups.map((dayGroup) => {
          // Format the amount as currency
          const formattedAmount = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(dayGroup.totalAmount);
          
          return (
            <div 
              key={dayGroup.day} 
              className="month-day-row flex items-center py-1.5 border-b border-black/5"
            >
              <div className="month-day-number w-[30px] text-[14px] font-semibold text-text-primary">
                {dayGroup.day}
              </div>
              <div className="month-day-amount w-[55px] text-[13px] font-medium text-accent text-right pr-3">
                {formattedAmount}
              </div>
              <div className="month-day-images flex flex-grow overflow-x-auto gap-2 py-1.5">
                {dayGroup.expenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className="month-thumbnail flex-none w-[50px] h-[50px] rounded-md overflow-hidden bg-gray-200 cursor-pointer"
                    onClick={() => handleThumbnailClick(expense.image_url)}
                  >
                    <img 
                      src={expense.image_thumbnail_url || expense.image_url} 
                      alt={expense.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthCard;
