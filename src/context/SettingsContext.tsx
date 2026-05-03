import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  settings: Record<string, string>;
  loading: boolean;
  updateSettings: (newSettings: Record<string, string>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  socialLinks: any[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<any[]>([]);

  const refreshSettings = async () => {
    try {
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('key, value')
        .not('key', 'in', '("cv_password", "notepad_password", "admin_password")');
      
      if (!settingsError && settingsData) {
        const settingsMap = settingsData.reduce((acc: any, item: any) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        setSettings(settingsMap);
      }

      // Fetch social links
      const { data: socialData, error: socialError } = await supabase
        .from('social_links')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (!socialError && socialData) {
        setSocialLinks(socialData);
      }
    } catch (err) {
      console.error('Error fetching global data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const updateSettings = async (newSettings: Record<string, string>) => {
    try {
      const updates = Object.entries(newSettings).map(([key, value]) => 
        supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
      );
      await Promise.all(updates);
      await refreshSettings();
    } catch (err) {
      console.error('Error updating settings:', err);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, refreshSettings, socialLinks } as any}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
};
