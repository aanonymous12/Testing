import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

export const useContent = (table: string) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!isConfigured) {
          throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
        }
        const { data: result, error: err } = await supabase
          .from(table)
          .select('*')
          .order('order_index', { ascending: true });

        if (err) throw err;
        setData(result);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table]);

  return { data, loading, error };
};

export const useSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    // Exclude sensitive keys like passwords from being fetched to the frontend
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .not('key', 'in', '("cv_password", "notepad_password", "admin_password")');
    
    if (!error && data) {
      const settingsMap = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSettings(settingsMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Record<string, string>) => {
    const updates = Object.entries(newSettings).map(([key, value]) => 
      supabase.from('site_settings').upsert({ key, value }, { onConflict: 'key' })
    );
    await Promise.all(updates);
    await fetchSettings();
  };

  return { settings, loading, updateSettings };
};

export const useDevLogs = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });
      
      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  return { posts, loading };
};

export const useSocialLinks = () => {
  const [socialLinks, setSocialLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSocialLinks = async () => {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (!error && data) {
        setSocialLinks(data);
      }
      setLoading(false);
    };

    fetchSocialLinks();
  }, []);

  return { socialLinks, loading };
};
