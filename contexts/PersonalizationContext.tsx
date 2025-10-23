import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Personalization } from '../types';

interface PersonalizationContextType {
  personalization: Personalization;
  setPersonalization: (personalization: Partial<Personalization>) => Promise<void>;
  loading: boolean;
}

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

const defaultState: Personalization = {
  interests: '',
  profession: '',
  communication_style: 'default',
};

export const PersonalizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [personalization, setPersonalizationState] = useState<Personalization>(defaultState);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchProfile = useCallback(async (currentUserId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('profession, interests, communication_style')
      .eq('id', currentUserId)
      .single();

    if (profile) {
      setPersonalizationState({
        profession: profile.profession || '',
        interests: profile.interests || '',
        communication_style: ['default', 'formal', 'casual', 'concise', 'detailed'].includes(profile.communication_style as any) 
          ? profile.communication_style as Personalization['communication_style'] 
          : 'default',
      });
    }
    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      console.error("Error fetching personalization:", error);
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
       if (session?.user) {
        setUserId(session.user.id);
        await fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id || null;
      if (newUserId && newUserId !== userId) {
        setLoading(true);
        setUserId(newUserId);
        fetchProfile(newUserId);
      } else if (!newUserId) {
        setUserId(null);
        setPersonalizationState(defaultState);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchProfile]);

  const setPersonalization = useCallback(async (newPersonalization: Partial<Personalization>) => {
    if (!userId) {
        console.error("Cannot set personalization, no user logged in.");
        return;
    };

    const updatedPersonalization = { ...personalization, ...newPersonalization };
    setPersonalizationState(updatedPersonalization);

    const { error } = await supabase
      .from('profiles')
      .update({
        profession: updatedPersonalization.profession,
        interests: updatedPersonalization.interests,
        communication_style: updatedPersonalization.communication_style,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error("Failed to save personalization:", error);
      // NOTE: In a real-world app, you might want to revert the state here
      // or show a persistent error to the user.
      throw new Error(error.message);
    }
  }, [userId, personalization]);

  return (
    <PersonalizationContext.Provider value={{ personalization, setPersonalization, loading }}>
      {children}
    </PersonalizationContext.Provider>
  );
};

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (context === undefined) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};