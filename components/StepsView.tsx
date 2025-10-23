import React from 'react';
import { Source } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { SearchIcon, LightBulbIcon, DocumentTextIcon, PencilIcon } from './icons';

interface StepProps {
  icon: React.ReactNode;
  title: string;
  isLast?: boolean;
  children?: React.ReactNode;
}

const Step: React.FC<StepProps> = ({ icon, title, children, isLast }) => (
  <div className="relative pl-12">
    {!isLast && <div className="absolute left-[22px] top-8 h-full w-px bg-neutral-200 dark:bg-neutral-700"></div>}
    <div className="absolute left-0 top-1 flex items-center justify-center">
      <div className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center ring-4 ring-neutral-50 dark:ring-neutral-900">
        {icon}
      </div>
    </div>
    <div className="pt-2.5 pb-8">
      <p className="font-bold text-neutral-800 dark:text-neutral-200">{title}</p>
      {children && <div className="mt-3 text-sm">{children}</div>}
    </div>
  </div>
);


interface StepsViewProps {
  query: string;
  sources: Source[];
  subQueries: string[];
}

export const StepsView: React.FC<StepsViewProps> = ({ query, sources, subQueries }) => {
  const { t } = useLocalization();
  const isDeepResearch = subQueries && subQueries.length > 0;
  const hasSources = sources && sources.length > 0;

  return (
    <div className="animate-fade-in text-base">
      <Step 
        icon={<SearchIcon className="w-5 h-5 text-neutral-500" />} 
        title={t('steps.initialQuery')}
        isLast={!isDeepResearch && !hasSources}
      >
        <p className="text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700/50 rounded-md p-3 font-medium">{query}</p>
      </Step>

      {isDeepResearch && (
        <Step 
          icon={<LightBulbIcon className="w-5 h-5 text-neutral-500" />} 
          title={t('steps.planning')}
          isLast={!hasSources}
        >
          <div className="space-y-2">
            {subQueries.map((subQuery, index) => (
              <div key={index} className="flex items-start gap-2 p-2.5 bg-neutral-100 dark:bg-neutral-700/50 rounded-md">
                <SearchIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                <span className="text-neutral-700 dark:text-neutral-300">{subQuery}</span>
              </div>
            ))}
          </div>
        </Step>
      )}

      {hasSources && (
          <Step 
            icon={<DocumentTextIcon className="w-5 h-5 text-neutral-500" />} 
            title={t('steps.reviewingSources', { count: sources.length })}
            isLast={true}
          />
      )}
    </div>
  );
};