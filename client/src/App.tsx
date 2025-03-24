import { useEffect, useState } from "react";
import { Route, Router } from "wouter";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/toaster";
import { useAppContext } from "./context/AppContext";
import Navigation from "./components/Navigation";
import Journal from "./pages/Journal";
import Budget from "./pages/Budget";
import AddButton from "./components/AddButton";
import ImageModal from "./components/ImageModal";
import SettingsModal from "./components/SettingsModal";
import AddExpenseModal from "./components/AddExpenseModal";
import { TabType, ViewType } from "./types";

function App() {
  // Local state for direct tab management
  const [activeTab, setActiveTab] = useState<TabType>('journal');
  const [activeView, setActiveView] = useState<ViewType>('daily');
  const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { i18n } = useTranslation();

  // Set up language based on browser settings
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      const browserLang = navigator.language;
      if (browserLang.startsWith('zh')) {
        i18n.changeLanguage('zh-TW');
      } else if (browserLang.startsWith('id')) {
        i18n.changeLanguage('id');
      } else {
        i18n.changeLanguage('en');
      }
    }
  }, [i18n]);

  // Modal handlers
  const openAddExpenseModal = () => {
    console.log('Opening add expense modal (App.tsx)');
    setAddExpenseModalOpen(true);
  };

  const closeAddExpenseModal = () => {
    console.log('Closing add expense modal (App.tsx)');
    setAddExpenseModalOpen(false);
  };

  const openSettingsModal = () => {
    console.log('Opening settings modal (App.tsx)');
    setSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    console.log('Closing settings modal (App.tsx)');
    setSettingsModalOpen(false);
  };

  const openImageModal = (imageUrl: string) => {
    console.log('Opening image modal (App.tsx)');
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    console.log('Closing image modal (App.tsx)');
    setImageModalOpen(false);
    setSelectedImage(null);
  };

  // Tab/view handlers
  const handleTabChange = (tab: TabType) => {
    console.log(`App.tsx: Changing tab to ${tab}`);
    setActiveTab(tab);
  };

  const handleViewChange = (view: ViewType) => {
    console.log(`App.tsx: Changing view to ${view}`);
    setActiveView(view);
  };

  return (
    <Router>
      <div className="app-container max-w-[440px] mx-auto bg-primary-bg min-h-screen relative">
        <Navigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
        />
        
        <Route path="/">
          {activeTab === 'journal' ? 
            <Journal 
              view={activeView}
              onViewChange={handleViewChange}
              onImageClick={openImageModal}
            /> : 
            <Budget onOpenSettings={openSettingsModal} />
          }
        </Route>
        
        <AddButton onAddClick={openAddExpenseModal} />
        
        <ImageModal 
          isOpen={isImageModalOpen}
          image={selectedImage}
          onClose={closeImageModal}
        />
        
        <SettingsModal 
          isOpen={isSettingsModalOpen}
          onClose={closeSettingsModal}
        />
        
        <AddExpenseModal 
          isOpen={isAddExpenseModalOpen}
          onClose={closeAddExpenseModal}
        />
        
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
