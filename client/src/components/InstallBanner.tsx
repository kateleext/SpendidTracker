import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// BeforeInstallPromptEvent type definition
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const InstallBanner: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Only show banner if not in standalone mode and on Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isStandalone || !isAndroid) {
      return;
    }

    // Store the event for later use
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Store the event
      setInstallPrompt(e);
      // Show the install banner
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Reset the installPrompt so it can't be triggered again
    setInstallPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Store in local storage to prevent showing again in this session
    localStorage.setItem('installBannerDismissed', 'true');
  };

  if (!showBanner || localStorage.getItem('installBannerDismissed') === 'true') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-accent text-white p-3 z-50 flex items-center justify-between shadow-md">
      <div className="flex-1 ml-2">
        <p className="font-medium">{t('installApp')}</p>
        <p className="text-sm opacity-90">{t('installAppDescription')}</p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-accent px-3 py-1 rounded-full flex items-center gap-1 font-medium"
        >
          <Download size={16} />
          {t('install')}
        </button>
        <button 
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-white/20"
          aria-label={t('dismiss')}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;