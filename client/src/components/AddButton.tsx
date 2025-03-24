import { Camera } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const AddButton = () => {
  const { t } = useTranslation();
  const { openAddExpenseModal } = useAppContext();

  return (
    <div
      className="add-log-button fixed bottom-8 left-1/2 transform -translate-x-1/2 w-auto h-12 bg-gradient-to-r from-accent to-accent-light rounded-full shadow-lg flex items-center justify-center cursor-pointer z-20 px-6"
      onClick={openAddExpenseModal}
    >
      <Camera className="text-white mr-2" size={20} />
      <span className="text-white font-medium">Snap an Expense</span>
    </div>
  );
};

export default AddButton;
