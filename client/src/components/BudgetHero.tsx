import { useTranslation } from 'react-i18next';
import { Budget } from '../types';
import { Pencil } from 'lucide-react';

interface BudgetHeroProps {
  budget: Budget;
  onOpenSettings: () => void;
}

const BudgetHero = ({ budget, onOpenSettings }: BudgetHeroProps) => {
  const { t } = useTranslation();
  
  // Format amounts as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const remainingBudget = formatCurrency(budget.remaining);
  const totalBudget = formatCurrency(budget.total);
  const spentAmount = formatCurrency(budget.spent);
  
  return (
    <div className="budget-hero px-5 py-6 text-center bg-white rounded-xl shadow-lg mx-5 mb-6 mt-8">
      <div className="budget-value text-[72px] font-bold text-[#4a5d44] leading-none my-2">
        {remainingBudget}
      </div>
      <div className="budget-caption text-[16px] text-black/70 mb-5">
        {t('availableThisMonth')}
      </div>
      
      <div className="budget-bar-container bg-black/5 h-2.5 rounded my-2.5 mx-4 overflow-hidden">
        <div 
          className="budget-bar-fill h-full bg-accent rounded"
          style={{ width: `${budget.percentage}%` }}
        ></div>
      </div>
      
      <div className="budget-details text-[16px] text-text-secondary mb-5 flex items-center justify-center">
        {spentAmount} {t('spentBullet')} {totalBudget} {t('budget')}
        <button
          className="ml-1 text-accent"
          onClick={onOpenSettings}
        >
          <Pencil size={16} />
        </button>
      </div>
    </div>
  );
};

export default BudgetHero;
