import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { useSettingsContext } from '../context/SettingsContext';

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
  return useSettingsContext();
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
  const { socialLinks, loading: settingsLoading } = useSettings();
  return { socialLinks, loading: settingsLoading };
};
