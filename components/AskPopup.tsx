import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { LightBulbIcon } from './icons';

interface AskPopupProps {
  top: number;
  left: number;
  onAsk: () => void;
}

export const AskPopup: React.FC<AskPopupProps> = ({ top, left, onAsk }) => {
  const { t } = useLocalization();

  return (
    <div
      className="fixed z-50 animate-pop-in ask-popup-button"
      style={{ top, left }}
    >
      <button
        onClick={onAsk}
        className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white font-semibold rounded-lg shadow-lg hover:bg-brand-700 transition-all transform hover:scale-105"
      >
        <LightBulbIcon className="w-4 h-4" />
        {t('search.ask')}
      </button>
    </div>
  );
};
