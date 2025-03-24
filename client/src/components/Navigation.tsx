import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { TabType } from '../types';

const Navigation = () => {
  const { t } = useTranslation();
  const { tab, setTab } = useAppContext();

  const handleTabChange = (selectedTab: TabType) => {
    setTab(selectedTab);
  };

  return (
    <nav className="nav-container sticky top-0 z-50 bg-primary-bg pt-3 pb-2">
      <div className="nav-tabs flex mx-5 border-b border-gray-200">
        <div
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium text-text-secondary border-b-2 transition-all cursor-pointer ${
            tab === 'journal' ? 'text-accent font-semibold border-accent' : 'border-transparent'
          }`}
          onClick={() => handleTabChange('journal')}
        >
          {t('journal')}
        </div>
        <div
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium text-text-secondary border-b-2 transition-all cursor-pointer ${
            tab === 'budget' ? 'text-accent font-semibold border-accent' : 'border-transparent'
          }`}
          onClick={() => handleTabChange('budget')}
        >
          {t('budget')}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
