import { useTranslation } from 'react-i18next';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Navigation = ({ activeTab, onTabChange }: NavigationProps) => {
  const { t } = useTranslation();

  return (
    <nav className="nav-container sticky top-0 z-50 bg-white pt-3 pb-2">
      <div className="nav-tabs flex mx-5 border-b border-gray-200">
        <button
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'journal' ? 'text-accent font-semibold border-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onTabChange('journal')}
          type="button"
          aria-pressed={activeTab === 'journal'}
        >
          {t('journal')}
        </button>
        <button
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === 'budget' ? 'text-accent font-semibold border-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => onTabChange('budget')}
          type="button"
          aria-pressed={activeTab === 'budget'}
        >
          {t('budget')}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
