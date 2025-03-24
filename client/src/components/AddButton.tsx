import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddButtonProps {
  onAddClick: () => void;
}

const AddButton = ({ onAddClick }: AddButtonProps) => {
  const { t } = useTranslation();

  return (
    <button
      className="add-log-button fixed bottom-8 left-1/2 transform -translate-x-1/2 w-auto h-12 bg-[#4a5d44] rounded-full shadow-lg flex items-center justify-center cursor-pointer z-20 px-6 border-0 hover:shadow-xl active:scale-95 transition-all"
      onClick={onAddClick}
      type="button"
      aria-label={t('addExpense')}
    >
      <Camera className="text-white mr-2" size={20} />
      <span className="text-white font-medium">{t('snapExpense', 'Snap an Expense')}</span>
    </button>
  );
};

export default AddButton;
