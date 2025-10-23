import React from 'react';
import { useLocalization } from '../contexts/LocalizationContext';
import { LightBulbIcon, ChevronRightIcon } from './icons';

interface RelatedQueriesProps {
  queries: string[];
  onQueryClick: (query: string) => void;
}

export const RelatedQueries: React.FC<RelatedQueriesProps> = ({ queries, onQueryClick }) => {
  const { t } = useLocalization();

  if (!queries || queries.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 animate-fade-in">
      <h3 className="flex items-center gap-3 text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-5">
        <div className="p-1.5 bg-yellow-400/20 rounded-lg">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
        </div>
        <span>{t('search.relatedSearches')}</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQueryClick(query)}
            className="group w-full text-left rtl:text-right p-4 bg-neutral-100 dark:bg-neutral-800/50 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex justify-between items-start gap-3">
              <span className="font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                {query}
              </span>
              <ChevronRightIcon className="w-5 h-5 text-neutral-400 dark:text-neutral-500 flex-shrink-0 mt-0.5 opacity-50 group-hover:opacity-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const RelatedQueriesSkeleton: React.FC = () => {
    const { t } = useLocalization();
    return (
        <div className="w-full mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 animate-pulse">
            <h3 className="flex items-center gap-3 text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-5">
                 <div className="p-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-lg">
                    <div className="w-5 h-5"></div>
                </div>
                <div className="h-6 bg-neutral-300 dark:bg-neutral-700 rounded w-48"></div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="w-full h-20 p-4 bg-neutral-100 dark:bg-neutral-800/70 rounded-xl flex flex-col justify-center">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/5 mb-2"></div>
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        </div>
    )
}