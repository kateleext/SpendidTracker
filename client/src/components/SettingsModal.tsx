import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../hooks/useI18n';
import { User, Language } from '../types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const { t } = useTranslation();
  const { changeLanguage, getCurrentLanguage } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user data
  const { data: user } = useQuery<User>({
    queryKey: ['/api/user'],
  });
  
  const [budgetValue, setBudgetValue] = useState<number>(2500);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  
  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      setBudgetValue(parseFloat(user.monthly_budget));
    }
    
    setSelectedLanguage(getCurrentLanguage());
  }, [user, getCurrentLanguage]);
  
  // Set up budget update mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (newBudget: number) => {
      console.log('Updating budget to', newBudget);
      const res = await apiRequest('PUT', '/api/user/budget', { budget: newBudget });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate budget queries to refresh data
      console.log('Budget updated successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current'] });
      
      toast({
        title: t('settingsSaved'),
        description: t('budgetUpdated'),
      });
      
      onClose();
    },
    onError: (error) => {
      console.error('Budget update failed:', error);
      toast({
        title: t('error'),
        description: error.message || t('budgetUpdateFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Handle language change
  const handleLanguageSelect = (lang: Language) => {
    console.log('Language selected:', lang);
    setSelectedLanguage(lang);
  };
  
  // Handle save button click
  const handleSave = () => {
    console.log('Save settings clicked');
    // Update language if changed
    if (selectedLanguage !== getCurrentLanguage()) {
      changeLanguage(selectedLanguage);
    }
    
    // Update budget if changed and valid
    if (user && budgetValue !== parseFloat(user.monthly_budget)) {
      updateBudgetMutation.mutate(budgetValue);
    } else {
      onClose();
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-modal fixed top-0 left-0 w-full h-full bg-black/50 z-50 flex items-center justify-center">
      <div className="settings-modal-content bg-white rounded-xl p-6 w-[85%] max-w-[320px] shadow-lg">
        <div className="settings-modal-title text-[18px] font-semibold mb-5 text-center">
          {t('settings')}
        </div>
        
        {/* Budget Setting */}
        <div className="settings-section mb-5">
          <div className="settings-section-title text-[16px] font-medium text-text-primary mb-3">
            {t('monthlyBudget')}: ${budgetValue}
          </div>
          <div className="relative">
            <span className="absolute top-2.5 left-3 text-text-secondary">$</span>
            <input
              type="number"
              className="budget-input w-full py-2 px-8 border border-gray-300 rounded-lg text-[16px]"
              value={budgetValue}
              onChange={(e) => setBudgetValue(parseFloat(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
        
        {/* Language Setting */}
        <div className="settings-section mb-5">
          <div className="settings-section-title text-[16px] font-medium text-text-primary mb-3">
            {t('language')}
          </div>
          <div className="language-options flex flex-col gap-2">
            <div
              className={`language-option flex items-center p-2.5 border rounded-lg cursor-pointer ${
                selectedLanguage === 'en' ? 'border-accent' : 'border-gray-300'
              }`}
              onClick={() => handleLanguageSelect('en')}
            >
              <div className={`language-check mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLanguage === 'en' ? 'border-accent' : 'border-gray-300'
              }`}>
                <div className={`language-check-dot w-3 h-3 rounded-full bg-accent ${
                  selectedLanguage === 'en' ? '' : 'hidden'
                }`}></div>
              </div>
              <div className="language-name">English</div>
            </div>
            
            <div
              className={`language-option flex items-center p-2.5 border rounded-lg cursor-pointer ${
                selectedLanguage === 'zh-TW' ? 'border-accent' : 'border-gray-300'
              }`}
              onClick={() => handleLanguageSelect('zh-TW')}
            >
              <div className={`language-check mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLanguage === 'zh-TW' ? 'border-accent' : 'border-gray-300'
              }`}>
                <div className={`language-check-dot w-3 h-3 rounded-full bg-accent ${
                  selectedLanguage === 'zh-TW' ? '' : 'hidden'
                }`}></div>
              </div>
              <div className="language-name">繁體中文</div>
            </div>
            
            <div
              className={`language-option flex items-center p-2.5 border rounded-lg cursor-pointer ${
                selectedLanguage === 'id' ? 'border-accent' : 'border-gray-300'
              }`}
              onClick={() => handleLanguageSelect('id')}
            >
              <div className={`language-check mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLanguage === 'id' ? 'border-accent' : 'border-gray-300'
              }`}>
                <div className={`language-check-dot w-3 h-3 rounded-full bg-accent ${
                  selectedLanguage === 'id' ? '' : 'hidden'
                }`}></div>
              </div>
              <div className="language-name">Bahasa Indonesia</div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="settings-actions flex justify-end gap-3">
          <button
            className="settings-cancel px-5 py-2 border border-gray-300 rounded-lg text-[14px] font-medium bg-white text-text-primary"
            onClick={onClose}
            type="button"
          >
            {t('cancel')}
          </button>
          <button
            className="settings-save px-5 py-2 border-0 rounded-lg text-[14px] font-medium bg-accent text-white"
            onClick={handleSave}
            disabled={updateBudgetMutation.isPending}
            type="button"
          >
            {updateBudgetMutation.isPending ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
