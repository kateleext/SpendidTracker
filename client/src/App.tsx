import { useEffect } from "react";
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

function App() {
  const { tab } = useAppContext();
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

  return (
    <Router>
      <div className="app-container max-w-[440px] mx-auto bg-primary-bg min-h-screen relative">
        <Navigation />
        
        <Route path="/">
          {tab === 'journal' ? <Journal /> : <Budget />}
        </Route>
        
        <AddButton />
        <ImageModal />
        <SettingsModal />
        <AddExpenseModal />
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
