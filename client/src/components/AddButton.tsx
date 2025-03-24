import { Camera } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const AddButton = () => {
  const { openAddExpenseModal } = useAppContext();

  return (
    <div
      className="add-log-button fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-accent to-accent-light rounded-full shadow-lg flex items-center justify-center cursor-pointer z-20"
      onClick={openAddExpenseModal}
    >
      <Camera className="text-white" size={22} />
    </div>
  );
};

export default AddButton;
