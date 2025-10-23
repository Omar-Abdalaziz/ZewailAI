import React, { useState, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { usePersonalization } from '../contexts/PersonalizationContext';
import { Toast, ToastType } from './Toast';
import { 
    UserCircleIcon, PaintBrushIcon, SunIcon, MoonIcon, ComputerDesktopIcon, 
    XIcon, ChevronDownIcon, CheckIcon, CpuChipIcon, ShieldExclamationIcon,
    BookOpenIcon, TrashIcon
} from './icons';
import { Language, Personalization, Theme, UserMemory } from '../types';

// --- Reusable Components ---

const ConfirmationModal = ({ title, children, onCancel, onConfirm, loading, t }: { title: string, children?: React.ReactNode, onCancel: () => void, onConfirm: () => void | Promise<void>, loading: boolean, t: (key: string) => string }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" aria-modal="true" role="dialog">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4 transform transition-all animate-pop-in">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400">{title}</h3>
            <div className="text-neutral-600 dark:text-neutral-300 mt-2">{children}</div>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-md bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500 text-neutral-800 dark:text-white font-semibold transition-colors disabled:opacity-50">{t('settings.account.cancel')}</button>
                <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:bg-neutral-600 disabled:cursor-not-allowed">{loading ? t('auth.processing') : t('settings.account.confirm')}</button>
            </div>
        </div>
    </div>
);

const SectionCard = ({ icon: Icon, title, description, children, footer }: { icon: React.FC<any>, title: string, description: string, children?: React.ReactNode, footer?: React.ReactNode }) => (
  <div className="bg-white dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
    <div className="p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg flex-shrink-0">
          <Icon className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
    {footer && (
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800 rounded-b-xl border-t border-neutral-200 dark:border-neutral-700/50 flex items-center justify-end">
            {footer}
        </div>
    )}
  </div>
);

// --- Settings Sections ---

const AccountSettings: React.FC<{ session: Session, showToast: (message: string, type: ToastType) => void }> = ({ session, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({ full_name: '' });
    const { t } = useLocalization();

    useEffect(() => {
        const fetchProfile = async () => {
          setLoading(true);
          const { data, error } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).single();
          if (error && error.code !== 'PGRST116') showToast(t('settings.account.updateError'), 'error');
          else if (data) setProfile({ full_name: data.full_name || '' });
          setLoading(false);
        };
        fetchProfile();
      }, [session.user.id, t, showToast]);
    
      const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('profiles').upsert({ id: session.user.id, full_name: profile.full_name, updated_at: new Date().toISOString() });
        if (error) showToast(error.message, 'error');
        else showToast(t('settings.account.updateSuccess'), 'success');
        setLoading(false);
      }
    
    return (
        <form onSubmit={handleUpdateProfile}>
            <SectionCard 
                icon={UserCircleIcon} 
                title={t('settings.account.sectionTitle')}
                description={t('settings.account.sectionSubtitle')}
                footer={
                    <button type="submit" disabled={loading} className="py-2 px-5 bg-brand-600 hover:bg-brand-700 rounded-md text-white font-semibold transition-colors text-sm disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed">
                        {loading ? t('settings.account.saving') : t('settings.account.saveChanges')}
                    </button>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">{t('settings.account.emailLabel')}</label>
                        <input type="email" value={session.user.email} disabled className="w-full max-w-sm px-3 py-2 bg-neutral-100 dark:bg-neutral-700/50 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-500 dark:text-neutral-400 cursor-not-allowed" />
                    </div>
                    <div>
                        <label htmlFor="fullName" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">{t('settings.account.fullName')}</label>
                        <input id="fullName" type="text" value={profile.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                            className="w-full max-w-sm px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder={t('settings.account.fullNamePlaceholder')} disabled={loading}
                        />
                    </div>
                </div>
            </SectionCard>
        </form>
    );
}

const AppearanceSettings: React.FC<{}> = () => {
    const { theme, setTheme } = useTheme();
    const { language, setLanguage, t } = useLocalization();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    
    const themeOptions: { id: Theme, label: string, icon: React.FC<any> }[] = [
        { id: 'light', label: t('settings.appearance.light'), icon: SunIcon },
        { id: 'dark', label: t('settings.appearance.dark'), icon: MoonIcon },
        { id: 'system', label: t('settings.appearance.system'), icon: ComputerDesktopIcon }
    ];

    const languages: { id: Language, label: string }[] = [
        { id: 'en', label: t('settings.language.english') },
        { id: 'ar', label: t('settings.language.arabic') }
    ];
    const currentLanguage = languages.find(l => l.id === language);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) setIsLangOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <SectionCard
            icon={PaintBrushIcon}
            title={t('settings.appearance.sectionTitle')}
            description={t('settings.appearance.sectionSubtitle')}
        >
            <div className="space-y-8">
                <div>
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{t('settings.appearance.theme')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      {themeOptions.map(option => {
                        const isActive = theme === option.id;
                        return (
                            <button key={option.id} onClick={() => setTheme(option.id)}
                                className={`p-5 rounded-lg border-2 text-center transition-all ${ isActive ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50' : 'border-neutral-200 dark:border-neutral-700 bg-transparent hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                            >
                                <option.icon className={`w-7 h-7 mx-auto mb-2 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-500'}`} />
                                <span className={`font-semibold text-sm ${isActive ? 'text-brand-800 dark:text-brand-300' : 'text-neutral-700 dark:text-neutral-300'}`}>{option.label}</span>
                            </button>
                        )
                      })}
                    </div>
                </div>
                 <div>
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{t('settings.language.title')}</h3>
                    <div className="relative w-full max-w-sm mt-3" ref={langDropdownRef}>
                        <button onClick={() => setIsLangOpen(!isLangOpen)} className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-800 dark:text-neutral-200 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500">
                            <span>{currentLanguage?.label}</span>
                            <ChevronDownIcon className={`w-5 h-5 text-neutral-500 dark:text-neutral-400 transition-transform ${isLangOpen ? 'transform rotate-180' : ''}`} />
                        </button>
                        {isLangOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-10 animate-pop-in">
                                <ul className="py-1">
                                    {languages.map(lang => (
                                        <li key={lang.id}><button onClick={() => { setLanguage(lang.id); setIsLangOpen(false); }} className="w-full text-left rtl:text-right px-4 py-2 flex items-center justify-between text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">{lang.label}{language === lang.id && <CheckIcon className="w-5 h-5 text-brand-500" />}</button></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SectionCard>
    );
};

const PersonalizationSettings: React.FC<{ showToast: (message: string, type: ToastType) => void }> = ({ showToast }) => {
    const { personalization, setPersonalization, loading: contextLoading } = usePersonalization();
    const [localState, setLocalState] = useState<Personalization>(personalization);
    const [saving, setSaving] = useState(false);
    const { t } = useLocalization();
    const styleOptions: Personalization['communication_style'][] = ['default', 'formal', 'casual', 'concise', 'detailed'];

    useEffect(() => { setLocalState(personalization); }, [personalization]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocalState(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleStyleChange = (style: Personalization['communication_style']) => setLocalState(prev => ({ ...prev, communication_style: style }));
    
    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 
        setSaving(true);
        await setPersonalization(localState);
        setSaving(false);
        showToast(t('settings.personalization.saveSuccess'), 'success');
    };

    if (contextLoading) return <div className="p-6 text-center">{t('auth.processing')}</div>

    return (
        <form onSubmit={handleSave}>
            <SectionCard
                icon={CpuChipIcon}
                title={t('settings.personalization.sectionTitle')}
                description={t('settings.personalization.sectionSubtitle')}
                footer={
                    <button type="submit" disabled={saving} className="py-2 px-5 bg-brand-600 hover:bg-brand-700 rounded-md text-white font-semibold transition-colors text-sm disabled:bg-neutral-400 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed">
                        {saving ? t('settings.personalization.saving') : t('settings.personalization.saveButton')}
                    </button>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label htmlFor="profession" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">{t('settings.personalization.professionLabel')}</label>
                        <input id="profession" name="profession" type="text" value={localState.profession} onChange={handleChange} disabled={saving}
                            className="w-full max-w-sm px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder={t('settings.personalization.professionPlaceholder')}
                        />
                    </div>
                     <div>
                        <label htmlFor="interests" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">{t('settings.personalization.interestsLabel')}</label>
                        <textarea id="interests" name="interests" value={localState.interests} onChange={handleChange} rows={3} disabled={saving}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            placeholder={t('settings.personalization.interestsPlaceholder')}
                        />
                    </div>
                    <div>
                         <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block mb-2">{t('settings.personalization.styleLabel')}</label>
                         <div className="flex flex-wrap gap-3 mt-2">
                            {styleOptions.map(style => (
                                <button type="button" key={style} onClick={() => handleStyleChange(style)}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors ${localState.communication_style === style ? 'bg-brand-500 border-brand-500 text-white' : 'bg-transparent border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
                                    {t(`settings.personalization.styleOptions.${style}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </SectionCard>
        </form>
    );
};

const MemorySettings: React.FC<{ session: Session, showToast: (message: string, type: ToastType) => void }> = ({ session, showToast }) => {
    const [memories, setMemories] = useState<UserMemory[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLocalization();

    useEffect(() => {
        const fetchMemories = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_memories')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                showToast(t('settings.memory.fetchError'), 'error');
            } else if (data) {
                setMemories(data);
            }
            setLoading(false);
        };
        fetchMemories();
    }, [session.user.id, showToast, t]);

    const handleDeleteMemory = async (id: string) => {
        const originalMemories = [...memories];
        setMemories(memories.filter(m => m.id !== id));

        const { error } = await supabase.from('user_memories').delete().eq('id', id);

        if (error) {
            setMemories(originalMemories);
            showToast(t('settings.memory.deleteError'), 'error');
        } else {
            showToast(t('settings.memory.deleteSuccess'), 'success');
        }
    };

    return (
        <SectionCard
            icon={BookOpenIcon}
            title={t('settings.memory.sectionTitle')}
            description={t('settings.memory.sectionSubtitle')}
        >
            <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg animate-pulse"></div>
                        ))}
                    </div>
                ) : memories.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="font-semibold text-neutral-700 dark:text-neutral-300">{t('settings.memory.noMemories')}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('settings.memory.noMemoriesSubtitle')}</p>
                    </div>
                ) : (
                    memories.map(memory => (
                        <div key={memory.id} className="flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg animate-fade-in">
                            <p className="text-sm text-neutral-800 dark:text-neutral-200 flex-grow">{memory.content}</p>
                            <button
                                onClick={() => handleDeleteMemory(memory.id)}
                                title={t('settings.memory.deleteTooltip')}
                                className="ml-4 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 flex-shrink-0"
                            >
                                <TrashIcon className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </SectionCard>
    );
}

const DangerZone: React.FC<{ session: Session, showToast: (message: string, type: ToastType) => void }> = ({ session, showToast }) => {
    const [loading, setLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'deleteHistory' | 'deleteAccount' | null>(null);
    const { t } = useLocalization();

    const handleDeleteAllChats = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('search_history').delete().eq('user_id', session.user.id);
            if (error) throw error;
            window.location.reload();
        } catch (error: any) { showToast(`${t('search.error.failedToDeleteHistory')}: ${error.message}`, 'error');
        } finally { setLoading(false); setConfirmAction(null); }
    }
      
    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            const { error: rpcError } = await supabase.rpc('delete_user_account');
            if (rpcError) throw rpcError;
            await supabase.auth.signOut();
        } catch (error: any) {
            showToast(`An error occurred during account deletion.`, 'error');
            setLoading(false); setConfirmAction(null);
        }
    }

    const renderConfirmModal = () => {
        if (!confirmAction) return null;
        const isDeletingHistory = confirmAction === 'deleteHistory';
        const title = isDeletingHistory ? t('settings.account.confirmDeleteHistoryTitle') : t('settings.account.confirmDeleteAccountTitle');
        const content = isDeletingHistory ? t('settings.account.confirmDeleteHistoryMessage') : t('settings.account.confirmDeleteAccountMessage');
        const onConfirmAction = isDeletingHistory ? handleDeleteAllChats : handleDeleteAccount;
        return <ConfirmationModal title={title} onCancel={() => setConfirmAction(null)} onConfirm={onConfirmAction} loading={loading} t={t}><p>{content}</p></ConfirmationModal>
    }

    return (
        <>
            {renderConfirmModal()}
            <SectionCard
                icon={ShieldExclamationIcon}
                title={t('settings.account.dangerZoneTitle')}
                description={t('settings.account.dangerZoneSubtitle')}
            >
                <div className="space-y-5">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg">
                        <div>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">{t('settings.account.deleteAllChats')}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('settings.account.deleteAllChatsSubtitle')}</p>
                        </div>
                        <button onClick={() => setConfirmAction('deleteHistory')} disabled={loading} className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 py-2 px-4 border border-red-600 text-red-600 dark:border-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md font-semibold transition-colors text-sm disabled:opacity-50">
                            {loading && confirmAction === 'deleteHistory' ? t('settings.account.deletingChats') : t('settings.account.deleteAllChatsButton')}
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg">
                         <div>
                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">{t('settings.account.deleteAccount')}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('settings.account.deleteAccountSubtitle')}</p>
                        </div>
                        <button onClick={() => setConfirmAction('deleteAccount')} disabled={loading} className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0 py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors text-sm disabled:opacity-50">
                             {loading && confirmAction === 'deleteAccount' ? t('settings.account.deletingAccount') : t('settings.account.deleteAccountButton')}
                        </button>
                    </div>
                </div>
            </SectionCard>
        </>
    );
};


// --- Main Page Component ---

export const ProfilePage: React.FC<{ session: Session }> = ({ session }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { t } = useLocalization();

  const showToast = (message: string, type: ToastType) => {
    setToast(null);
    setTimeout(() => setToast({ message, type }), 50);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100 dark:bg-neutral-900 pt-16 lg:pt-0">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <header className="px-4 md:px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 bg-white dark:bg-neutral-800/50">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{t('settings.title')}</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">{t('settings.subtitle')}</p>
        </header>
        <div className="flex-grow overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
                <AccountSettings session={session} showToast={showToast} />
                <AppearanceSettings />
                <PersonalizationSettings showToast={showToast} />
                <MemorySettings session={session} showToast={showToast} />
                <DangerZone session={session} showToast={showToast} />
            </div>
        </div>
    </div>
  );
};
