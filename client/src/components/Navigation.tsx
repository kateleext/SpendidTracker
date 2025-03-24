import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { TabType } from '../types';

const Navigation = () => {
  const { t } = useTranslation();
  const { tab, setTab } = useAppContext();

  const handleTabChange = (selectedTab: TabType) => {
    console.log(`Navigation: changing tab from ${tab} to ${selectedTab}`);
    if (tab !== selectedTab) {
      setTab(selectedTab);
    }
  };

  return (
    <nav className="nav-container sticky top-0 z-50 bg-white pt-3 pb-2">
      <div className="nav-tabs flex mx-5 border-b border-gray-200">
        <button
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium border-b-2 transition-all cursor-pointer ${
            tab === 'journal' ? 'text-accent font-semibold border-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('journal')}
          type="button"
          aria-pressed={tab === 'journal'}
        >
          {t('journal')}
        </button>
        <button
          className={`nav-tab flex-1 text-center py-2.5 text-[15px] font-medium border-b-2 transition-all cursor-pointer ${
            tab === 'budget' ? 'text-accent font-semibold border-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('budget')}
          type="button"
          aria-pressed={tab === 'budget'}
        >
          {t('budget')}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
