import { useAppContext } from '../context/AppContext';
import { Expense } from '../types';

interface MemoryCardProps {
  expense: Expense;
}

const MemoryCard = ({ expense }: MemoryCardProps) => {
  const { openImageModal } = useAppContext();

  const handleImageClick = () => {
    openImageModal(expense.image_url);
  };

  // Format amount as currency
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(parseFloat(expense.amount));

  return (
    <div className="memory-card bg-secondary-bg rounded-xl mx-5 mb-5 overflow-hidden shadow-card">
      <div className="memory-image-wrapper relative pb-[100%] overflow-hidden">
        <img
          src={expense.image_url}
          alt={expense.title}
          className="memory-image absolute top-0 left-0 w-full h-full object-cover cursor-pointer"
          onClick={handleImageClick}
        />
      </div>
      <div className="memory-details py-4 px-5">
        <div className="memory-title-row flex justify-between items-center">
          <div className="memory-title text-[16px] font-semibold text-text-primary">
            {expense.title}
          </div>
          <div className="memory-amount text-[16px] font-bold text-accent">
            {formattedAmount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;
