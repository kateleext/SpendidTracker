import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { Language } from '../types';

export const useI18n = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = useCallback((lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  }, [i18n]);

  const getCurrentLanguage = useCallback((): Language => {
    return i18n.language as Language;
  }, [i18n.language]);

  return {
    t,
    i18n,
    changeLanguage,
    getCurrentLanguage
  };
};
