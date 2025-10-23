import React from 'react';
import { ThinkingStep } from '../types';
import { useLocalization } from '../contexts/LocalizationContext';
import { CheckIcon, SearchIcon, LightBulbIcon, DocumentTextIcon, PencilIcon } from './icons';

const Spinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-brand-500"></div>
);

const Stage: React.FC<{ step: ThinkingStep, icon: React.ReactNode, isLast: boolean }> = ({ step, icon, isLast }) => {
    const { t } = useLocalization();

    const renderStatusIcon = () => {
        switch (step.status) {
            case 'in_progress':
                return <Spinner />;
            case 'complete':
                return <CheckIcon className="w-5 h-5 text-green-500" />;
            case 'pending':
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"></div>;
        }
    };

    return (
        <div className="relative pl-10 sm:pl-12">
            {!isLast && <div className="absolute left-5 sm:left-[22px] top-7 sm:top-8 h-full w-px bg-neutral-200 dark:bg-neutral-700"></div>}
            
            <div className="absolute left-0 top-0 flex items-start gap-4">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors ${step.status !== 'pending' ? 'bg-brand-500/10 dark:bg-brand-500/20' : 'bg-neutral-100 dark:bg-neutral-700/50'}`}>
                    {icon}
                </div>
            </div>

            <div className="pt-1 sm:pt-2 pb-6 sm:pb-8">
                <p className={`font-bold text-base sm:text-lg ${step.status !== 'pending' ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {step.title}
                </p>
                {step.subtitle && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{step.subtitle}</p>
                )}
                {step.content && step.content.length > 0 && (
                     <div className="mt-3 space-y-2">
                        {step.content.map((item, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-neutral-100 dark:bg-neutral-700/50 rounded-md text-sm">
                                <SearchIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                <span className="text-neutral-600 dark:text-neutral-300">{item}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


export const StageCard: React.FC<{ steps: ThinkingStep[] }> = ({ steps }) => {
    const { t } = useLocalization();

    if (!steps || steps.length === 0) return null;

    const completedSteps = steps.filter(s => s.status === 'complete').length;
    const progress = (completedSteps / steps.length) * 100;
    
    const iconsMap: { [key: string]: React.ReactNode } = {
        [t('search.thinking.planningTitle')]: <LightBulbIcon className="w-6 h-6 text-brand-500" />,
        [t('search.thinking.searchingTitle')]: <SearchIcon className="w-6 h-6 text-brand-500" />,
        [t('search.thinking.analyzingTitle')]: <DocumentTextIcon className="w-6 h-6 text-brand-500" />,
        [t('search.thinking.synthesizingTitle')]: <PencilIcon className="w-6 h-6 text-brand-500" />,
    };

    return (
        <div className="animate-fade-in pt-6">
            <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm p-4 sm:p-6">
                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">{t('search.thinking.title')}</h2>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 mb-6">
                    <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <div>
                    {steps.map((step, index) => (
                        <Stage key={index} step={step} icon={iconsMap[step.title]} isLast={index === steps.length - 1} />
                    ))}
                </div>
            </div>
        </div>
    );
};