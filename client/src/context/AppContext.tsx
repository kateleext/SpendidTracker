import { createContext, useContext, useState, ReactNode } from 'react';
import { TabType, ViewType } from '../types';

interface AppContextProps {
  tab: TabType;
  view: ViewType;
  isImageModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isAddExpenseModalOpen: boolean;
  selectedImage: string | null;
  setTab: (tab: TabType) => void;
  setView: (view: ViewType) => void;
  openImageModal: (imageUrl: string) => void;
  closeImageModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openAddExpenseModal: () => void;
  closeAddExpenseModal: () => void;
}

// Create a default context value to prevent the "must be used within Provider" error
const defaultContextValue: AppContextProps = {
  tab: 'journal',
  view: 'daily',
  isImageModalOpen: false,
  isSettingsModalOpen: false,
  isAddExpenseModalOpen: false,
  selectedImage: null,
  setTab: () => {},
  setView: () => {},
  openImageModal: () => {},
  closeImageModal: () => {},
  openSettingsModal: () => {},
  closeSettingsModal: () => {},
  openAddExpenseModal: () => {},
  closeAddExpenseModal: () => {}
};

const AppContext = createContext<AppContextProps>(defaultContextValue);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [tab, setTabState] = useState<TabType>('journal');
  const [view, setViewState] = useState<ViewType>('daily');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Enhanced tab setter with console logging for debugging
  const setTab = (newTab: TabType) => {
    console.log('Setting tab to:', newTab);
    setTabState(newTab);
  };
  
  // Enhanced view setter with console logging for debugging
  const setView = (newView: ViewType) => {
    console.log('Setting view to:', newView);
    setViewState(newView);
  };

  const openImageModal = (imageUrl: string) => {
    console.log('Opening image modal with:', imageUrl);
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    console.log('Closing image modal');
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  const openSettingsModal = () => {
    console.log('Opening settings modal');
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    console.log('Closing settings modal');
    setIsSettingsModalOpen(false);
  };

  const openAddExpenseModal = () => {
    console.log('Opening add expense modal');
    setIsAddExpenseModalOpen(true);
  };

  const closeAddExpenseModal = () => {
    console.log('Closing add expense modal');
    setIsAddExpenseModalOpen(false);
  };

  return (
    <AppContext.Provider
      value={{
        tab,
        view,
        isImageModalOpen,
        isSettingsModalOpen,
        isAddExpenseModalOpen,
        selectedImage,
        setTab,
        setView,
        openImageModal,
        closeImageModal,
        openSettingsModal,
        closeSettingsModal,
        openAddExpenseModal,
        closeAddExpenseModal
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  return context;
};
