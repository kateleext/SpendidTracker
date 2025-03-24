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
  const [tab, setTab] = useState<TabType>('journal');
  const [view, setView] = useState<ViewType>('daily');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  const openSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  const openAddExpenseModal = () => {
    setIsAddExpenseModalOpen(true);
  };

  const closeAddExpenseModal = () => {
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
