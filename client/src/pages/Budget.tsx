import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import BudgetHero from "../components/BudgetHero";
import BudgetHistory from "../components/BudgetHistory";
import { Budget, BudgetHistoryItem } from "../types";

interface BudgetPageProps {
  onOpenSettings: () => void;
}

const BudgetPage = ({ onOpenSettings }: BudgetPageProps) => {
  const { t } = useTranslation();
  
  // Fetch current budget
  const { data: budget, isLoading: isBudgetLoading } = useQuery<Budget>({
    queryKey: ['/api/budget/current'],
  });
  
  // Fetch budget history
  const { data: historyItems = [], isLoading: isHistoryLoading } = useQuery<BudgetHistoryItem[]>({
    queryKey: ['/api/budget/history'],
  });
  
  const isLoading = isBudgetLoading || isHistoryLoading;

  return (
    <div id="budget-view" className="view-content">
      {isLoading ? (
        <div className="p-8 text-center">
          <p>{t('loading')}</p>
        </div>
      ) : budget ? (
        <>
          <BudgetHero budget={budget} onOpenSettings={onOpenSettings} />
          
          <div className="section-title mx-5 my-5 text-[18px] font-semibold text-text-primary">
            {t('spendingHistory')}
          </div>
          
          <BudgetHistory historyItems={historyItems} />
        </>
      ) : (
        <div className="p-8 text-center text-text-secondary">
          {t('errorLoadingBudget')}
        </div>
      )}
    </div>
  );
};

export default BudgetPage;
