import { useTranslation } from 'react-i18next';
import { Budget } from '../types';

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
    <div className="budget-hero px-5 py-8 text-center">
      <div className="budget-value text-[72px] font-bold text-[#4a5d44] leading-none my-2.5">
        {remainingBudget}
      </div>
      <div className="budget-caption text-[16px] text-black/70 mb-6">
        {t('availableThisMonth')}
      </div>
      
      <div className="budget-bar-container bg-black/5 h-2.5 rounded my-2.5 mx-4 overflow-hidden">
        <div 
          className="budget-bar-fill h-full bg-gradient-to-r from-accent to-accent-light rounded"
          style={{ width: `${budget.percentage}%` }}
        ></div>
      </div>
      
      <div className="budget-details text-[14px] text-text-secondary mb-1.5">
        {spentAmount} {t('spentOf')} {totalBudget} {t('budget')}
      </div>
      
      <div className="budget-limit text-[14px] text-text-secondary mb-5">
        {t('monthlyBudget')}: {totalBudget}
        <a 
          href="#" 
          className="text-accent font-medium ml-1"
          onClick={(e) => {
            e.preventDefault();
            onOpenSettings();
          }}
        >
          {t('adjust')}
        </a>
      </div>
    </div>
  );
};

export default BudgetHero;
