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
          console.warn('Supabase not configured for table:', table);
          throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
        }
        console.log(`Fetching data for table: ${table}...`);
        const { data: result, error: err } = await supabase
          .from(table)
          .select('*')
          .order('order_index', { ascending: true });

        if (err) {
          console.error(`Supabase error fetching ${table}:`, err);
          throw err;
        }
        console.log(`Successfully fetched ${result?.length || 0} items for ${table}`);
        setData(result || []);
      } catch (err: any) {
        console.error(`Catch error in useContent (${table}):`, err.message);
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
