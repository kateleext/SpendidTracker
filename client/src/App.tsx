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
import InstallBanner from "./components/InstallBanner";
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
        {/* Install banner for Android devices */}
        <InstallBanner />
        
        <header className="app-header flex items-center justify-between bg-accent text-white px-5 py-3">
          <h1 className="text-xl font-bold">Spendid</h1>
          <button 
            onClick={openSettingsModal}
            className="p-1 rounded-full hover:bg-accent-light transition-colors"
            aria-label="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </header>
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
