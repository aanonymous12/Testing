import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { motion } from 'motion/react';
import { LogIn, Save, Plus, Trash2, LogOut, Settings, Briefcase, Award, Users, Image as ImageIcon, FileText, CheckCircle, Upload, Loader2, MessageSquare, User as UserIcon, Menu, X, Share2, Palette, Database, Globe, Box, UserPlus, Link as LinkIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useContent, useSettings, useSocialLinks, useBlogPosts } from './hooks/useContent';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('settings');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCVRequests, setUnreadCVRequests] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialLoading(false);
    });

    fetchUnreadCounts();

    return () => subscription.unsubscribe();
  }, []);

  // Scroll to top when tab changes
  const mainContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mainContentRef.current) {
      // Use a small timeout to ensure content has rendered before scrolling
      const timer = setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const fetchUnreadCounts = async () => {
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setUnreadCount(msgCount || 0);

    const { count: cvCount } = await supabase
      .from('cv_requests')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setUnreadCVRequests(cvCount || 0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-alt p-8 rounded-2xl border border-muted w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <LogIn className="text-page w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-page py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-alt border-r border-muted transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-muted flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Settings className="text-page w-4 h-4" />
              </div>
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-secondary hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <TabButton active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} icon={<Settings size={18} />} label="Settings" />
            <TabButton active={activeTab === 'projects'} onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }} icon={<Briefcase size={18} />} label="Projects" />
            <TabButton active={activeTab === 'skills'} onClick={() => { setActiveTab('skills'); setIsSidebarOpen(false); }} icon={<Box size={18} />} label="Skills" />
            <TabButton active={activeTab === 'skill_tags'} onClick={() => { setActiveTab('skill_tags'); setIsSidebarOpen(false); }} icon={<Plus size={18} />} label="Skill Tags" />
            <TabButton active={activeTab === 'awards'} onClick={() => { setActiveTab('awards'); setIsSidebarOpen(false); }} icon={<Award size={18} />} label="Awards" />
            <TabButton active={activeTab === 'teams'} onClick={() => { setActiveTab('teams'); setIsSidebarOpen(false); }} icon={<Users size={18} />} label="Teams" />
            <TabButton active={activeTab === 'gallery'} onClick={() => { setActiveTab('gallery'); setIsSidebarOpen(false); }} icon={<ImageIcon size={18} />} label="Gallery" />
            <TabButton active={activeTab === 'blog'} onClick={() => { setActiveTab('blog'); setIsSidebarOpen(false); }} icon={<FileText size={18} />} label="Blog Posts" />
            <TabButton active={activeTab === 'social'} onClick={() => { setActiveTab('social'); setIsSidebarOpen(false); }} icon={<Share2 size={18} />} label="Social Links" />
            <TabButton active={activeTab === 'connect'} onClick={() => { setActiveTab('connect'); setIsSidebarOpen(false); }} icon={<UserPlus size={18} />} label="Connect with Me" />
            <TabButton 
              active={activeTab === 'cv'} 
              onClick={() => { setActiveTab('cv'); setIsSidebarOpen(false); }} 
              icon={<FileText size={18} />} 
              label="CV Management" 
              badge={unreadCVRequests > 0 ? unreadCVRequests : undefined}
            />
            <TabButton 
              active={activeTab === 'messages'} 
              onClick={() => { setActiveTab('messages'); setIsSidebarOpen(false); }} 
              icon={<MessageSquare size={18} />} 
              label="Messages" 
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
            <TabButton active={activeTab === 'profile'} onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }} icon={<UserIcon size={18} />} label="Profile" />
          </nav>

          <div className="p-4 border-t border-muted">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-secondary/60 hover:text-red-500 transition-colors p-3 rounded-xl hover:bg-red-500/5"
            >
              <LogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-alt border-b border-muted flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-secondary hover:text-primary transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold capitalize hidden sm:block">
              {activeTab.replace(/_/g, ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-alt border border-muted rounded-full">
              <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center shrink-0">
                <UserIcon size={12} className="text-page" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-secondary truncate max-w-[80px] sm:max-w-none">
                {session.user.email}
              </span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-page/50 scroll-smooth">
          <div className="max-w-5xl mx-auto">
            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-4">
                <span>{error}</span>
                <button onClick={() => setError('')} className="text-red-500/60 hover:text-red-500">✕</button>
              </div>
            )}
            
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'settings' && <SettingsEditor />}
              {activeTab === 'projects' && <TableEditor table="projects" fields={['title', 'short_description', 'long_description', 'image_url', 'live_url', 'source_url', 'type']} />}
              {activeTab === 'skills' && <TableEditor table="skills" fields={['name', 'icon', 'category', 'order_index']} />}
              {activeTab === 'skill_tags' && <TableEditor table="skill_tags" fields={['name', 'order_index']} />}
              {activeTab === 'awards' && <TableEditor table="awards" fields={['title', 'organization', 'year', 'description']} />}
              {activeTab === 'teams' && <TableEditor table="teams" fields={['name', 'role', 'image_url']} />}
              {activeTab === 'gallery' && <GalleryManager />}
              {activeTab === 'blog' && <BlogManager />}
              {activeTab === 'cv' && <CVManager onRefresh={fetchUnreadCounts} />}
              {activeTab === 'social' && <SocialLinksEditor />}
              {activeTab === 'connect' && <ConnectWithMeEditor />}
              {activeTab === 'messages' && <MessagesViewer onRefresh={fetchUnreadCounts} />}
              {activeTab === 'profile' && <ProfileEditor />}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${active ? 'bg-primary text-page' : 'text-secondary/60 hover:bg-page'}`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {badge !== undefined && (
      <span className="bg-accent text-page text-[10px] font-bold px-2 py-0.5 rounded-full">
        +{badge}
      </span>
    )}
  </button>
);


const SettingsEditor = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [originalSettings, setOriginalSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('*').order('key', { ascending: true });
      if (error) throw error;
      if (data) {
        setSettings(data);
        setOriginalSettings(JSON.parse(JSON.stringify(data)));
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSetting = async () => {
    if (!newKey.trim()) return;
    try {
      const { error } = await supabase.from('site_settings').insert([{ key: newKey.toLowerCase().replace(/\s+/g, '_'), value: '' }]);
      if (error) throw error;
      setNewKey('');
      setIsAdding(false);
      await fetchSettings();
    } catch (err: any) {
      alert('Error adding setting: ' + err.message);
    }
  };

  const handleDeleteSetting = async (id: string, key: string) => {
    if (!confirm(`Are you sure you want to delete the setting "${key}"?`)) return;
    try {
      const { error } = await supabase.from('site_settings').delete().eq('id', id);
      if (error) throw error;
      await fetchSettings();
    } catch (err: any) {
      alert('Error deleting setting: ' + err.message);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const toUpdate = settings.filter(s => {
        const original = originalSettings.find(os => os.id === s.id);
        return s.value !== original?.value;
      });

      for (const s of toUpdate) {
        await supabase.from('site_settings').update({ value: s.value }).eq('id', s.id);
      }

      await fetchSettings();
      alert('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, value } : s));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Site Settings</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-alt border border-muted text-primary px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-muted transition-colors"
          >
            <Plus size={18} />
            {isAdding ? 'Cancel' : 'Add Setting'}
          </button>
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-alt p-6 rounded-2xl border border-primary/30 flex gap-4 items-end animate-in fade-in slide-in-from-top-4">
          <div className="flex-1">
            <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">New Setting Key (e.g. google_tag_manager_id)</label>
            <input 
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Enter key name..."
              className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
            />
          </div>
          <button 
            onClick={handleAddSetting}
            disabled={!newKey.trim()}
            className="bg-primary text-page px-6 py-3 rounded-xl font-bold disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}

      <div className="grid gap-6">
        {settings.map((s) => (
          <div key={s.id} className="bg-alt p-4 sm:p-6 rounded-2xl border border-muted group relative">
            <div className="flex justify-between items-start mb-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60">{s.key.replace(/_/g, ' ')}</label>
              <button 
                onClick={() => handleDeleteSetting(s.id, s.key)}
                className="text-destructive/40 hover:text-destructive transition-colors p-1 opacity-0 group-hover:opacity-100"
                title="Delete Setting"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="space-y-4">
              {s.key.includes('image') || s.key.includes('favicon') ? (
                <ImageUpload 
                  value={s.value} 
                  onChange={(val) => handleValueChange(s.id, val)} 
                />
              ) : s.key.includes('description') || s.key.includes('message') || s.key.includes('content') ? (
                <textarea 
                  value={s.value}
                  onChange={(e) => handleValueChange(s.id, e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[100px]"
                />
              ) : (
                <input 
                  type="text"
                  value={s.value}
                  onChange={(e) => handleValueChange(s.id, e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ImageUpload = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL"
          className="flex-1 bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-w-0"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-alt border border-muted text-secondary px-4 py-3 rounded-xl hover:bg-page transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Upload
        </button>
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
        />
      </div>
      {value && (
        <div className="w-32 h-32 rounded-xl overflow-hidden border border-muted bg-alt">
          <img src={value} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      )}
    </div>
  );
};

const TableEditor = ({ table, fields }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [table]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(table).select('*').order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        setItems(data);
        setOriginalItems(JSON.parse(JSON.stringify(data)));
      }
    } catch (err: any) {
      console.error(`Error fetching ${table}:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Deletions
      const currentIds = items.map(i => i.id);
      const toDelete = originalItems.filter(oi => !currentIds.includes(oi.id)).map(oi => oi.id);
      if (toDelete.length > 0) {
        await supabase.from(table).delete().in('id', toDelete);
      }

      // 2. Insertions
      const toInsert = items.filter(i => String(i.id).startsWith('temp-')).map(i => {
        const { id, ...rest } = i;
        return rest;
      });
      if (toInsert.length > 0) {
        await supabase.from(table).insert(toInsert);
      }

      // 3. Updates
      const toUpdate = items.filter(i => !String(i.id).startsWith('temp-')).filter(i => {
        const original = originalItems.find(oi => oi.id === i.id);
        return JSON.stringify(i) !== JSON.stringify(original);
      });
      for (const item of toUpdate) {
        await supabase.from(table).update(item).eq('id', item.id);
      }

      await fetchItems();
      alert(`${table.replace(/_/g, ' ')} updated successfully!`);
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem = fields.reduce((acc: any, f: any) => ({ ...acc, [f]: '' }), { 
      id: `temp-${Date.now()}`,
      order_index: items.length 
    });
    setItems([...items, newItem]);
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold capitalize">{table.replace(/_/g, ' ')}</h2>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="bg-primary text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="bg-alt p-4 sm:p-6 md:p-8 rounded-2xl border border-muted relative group">
            <button 
              onClick={() => handleDelete(item.id)}
              className="absolute top-4 right-4 text-secondary/40 hover:text-red-500 transition-colors z-10"
            >
              <Trash2 size={20} />
            </button>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {fields.map((f: string) => (
                <div key={f} className={f === 'description' || f === 'content' || f === 'excerpt' || f === 'long_description' ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">{f.replace(/_/g, ' ')}</label>
                  {f.includes('image') || f === 'src' || f === 'logo' || f.includes('favicon') ? (
                    <ImageUpload 
                      value={item[f]} 
                      onChange={(val) => handleFieldChange(item.id, f, val)} 
                    />
                  ) : f === 'description' || f === 'content' || f === 'excerpt' || f === 'long_description' ? (
                    <textarea 
                      value={item[f]}
                      onChange={(e) => handleFieldChange(item.id, f, e.target.value)}
                      className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[120px]"
                    />
                  ) : (
                    <input 
                      type={f === 'order_index' || f === 'year' || f === 'span' ? 'number' : 'text'}
                      value={item[f]}
                      onChange={(e) => handleFieldChange(item.id, f, f === 'order_index' || f === 'year' || f === 'span' ? parseInt(e.target.value) || 0 : e.target.value)}
                      className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FileUpload = ({ value, onChange, accept = "*/*" }: { value: string, onChange: (val: string) => void, accept?: string }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images') // Reusing images bucket for simplicity as it's already configured
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="File URL"
          className="flex-1 bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-w-0"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-alt border border-muted text-secondary px-4 py-3 rounded-xl hover:bg-page transition-colors flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          Upload File
        </button>
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleUpload}
          accept={accept}
          className="hidden"
        />
      </div>
    </div>
  );
};

const CVManager = ({ onRefresh }: { onRefresh: () => void }) => {
  const [settings, setSettings] = useState<any[]>([]);
  const [originalSettings, setOriginalSettings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sData } = await supabase.from('site_settings').select('*').in('key', ['cv_url', 'cv_password']);
      const { data: rData } = await supabase.from('cv_requests').select('*').order('created_at', { ascending: false });
      if (sData) {
        setSettings(sData);
        setOriginalSettings(JSON.parse(JSON.stringify(sData)));
      }
      if (rData) setRequests(rData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const toUpdate = settings.filter(s => {
        const original = originalSettings.find(os => os.id === s.id);
        return s.value !== original?.value;
      });

      for (const s of toUpdate) {
        await supabase.from('site_settings').update({ value: s.value }).eq('id', s.id);
      }

      await fetchData();
      alert('CV settings updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, value } : s));
  };

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('cv_requests').update({ is_read: true }).eq('id', id);
    setRequests(requests.map(r => r.id === id ? { ...r, is_read: true } : r));
    onRefresh();
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm('Delete this request?')) {
      try {
        const { error } = await supabase.from('cv_requests').delete().eq('id', id);
        if (error) throw error;
        setRequests(requests.filter(r => r.id !== id));
        onRefresh();
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete request: ' + err.message);
      }
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-3xl font-bold">CV Configuration</h2>
          {hasChanges && (
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
        </div>
        <div className="grid gap-6">
          {settings.map((s) => (
            <div key={s.id} className="bg-alt p-6 rounded-2xl border border-muted">
              <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">{s.key.replace(/_/g, ' ')}</label>
              <div className="space-y-4">
                {s.key === 'cv_url' ? (
                  <div className="space-y-4">
                    <FileUpload 
                      value={s.value}
                      onChange={(val) => handleValueChange(s.id, val)}
                      accept=".pdf,.doc,.docx"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input 
                      type="text"
                      value={s.value}
                      onChange={(e) => handleValueChange(s.id, e.target.value)}
                      className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                      placeholder="Set CV Access Password"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-3xl font-bold">CV Access Requests</h2>
        <div className="grid gap-6">
          {requests.length === 0 ? (
            <p className="text-secondary/60 italic">No requests yet.</p>
          ) : (
            requests.map((r) => (
              <div key={r.id} className={`bg-alt p-6 rounded-2xl border transition-all relative group ${r.is_read ? 'border-muted opacity-80' : 'border-accent shadow-lg shadow-accent/5'}`}>
                {!r.is_read && (
                  <div className="absolute -top-2 -left-2 bg-accent text-page text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                    NEW
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  {!r.is_read && (
                    <button 
                      onClick={() => handleMarkAsRead(r.id)}
                      className="text-accent hover:text-accent/80 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteRequest(r.id)}
                    className="text-secondary/40 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 mb-4 text-xs font-mono uppercase tracking-widest text-accent">
                  <span>{r.name}</span>
                  <span className="text-secondary/40">•</span>
                  <span>{r.company}</span>
                  <span className="text-secondary/40">•</span>
                  <span>{r.email}</span>
                  <span className="text-secondary/40">•</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="text-lg font-bold mb-2">Reason for access:</h4>
                <p className="text-secondary leading-relaxed whitespace-pre-wrap">{r.reason}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const ProfileEditor = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">Profile Settings</h2>
      <div className="bg-alt p-8 rounded-2xl border border-muted max-w-md">
        <h3 className="text-xl font-bold mb-6">Change Password</h3>
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-page py-4 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MessagesViewer = ({ onRefresh }: { onRefresh: () => void }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this message?')) {
      try {
        const { error } = await supabase.from('messages').delete().eq('id', id);
        if (error) throw error;
        setMessages(messages.filter(m => m.id !== id));
        onRefresh();
      } catch (err: any) {
        console.error(err);
        alert('Failed to delete message: ' + err.message);
      }
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold">User Messages</h2>
      <div className="grid gap-6">
        {messages.length === 0 ? (
          <p className="text-secondary/60 italic">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bg-alt p-6 rounded-2xl border transition-all relative group ${m.is_read ? 'border-muted opacity-80' : 'border-accent shadow-lg shadow-accent/5'}`}>
              {!m.is_read && (
                <div className="absolute -top-2 -left-2 bg-accent text-page text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
                  NEW
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                {!m.is_read && (
                  <button 
                    onClick={() => handleMarkAsRead(m.id)}
                    className="text-accent hover:text-accent/80 transition-colors"
                    title="Mark as read"
                  >
                    <CheckCircle size={18} />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="text-secondary/40 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-4 mb-4 text-xs font-mono uppercase tracking-widest text-accent">
                <span>{m.name}</span>
                <span className="text-secondary/40">•</span>
                <span>{m.email}</span>
                <span className="text-secondary/40">•</span>
                <span>{new Date(m.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="text-lg font-bold mb-2">{m.subject}</h4>
              <p className="text-secondary leading-relaxed whitespace-pre-wrap">{m.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LUCIDE_ICONS = [
  'Github', 'Linkedin', 'Twitter', 'Instagram', 'Facebook', 'Youtube', 'Globe', 'Mail', 'Link', 'Send', 'MessageSquare', 'Phone', 'MapPin', 'Briefcase', 'Award', 'Users', 'Image', 'FileText', 'CheckCircle', 'Upload', 'Loader2', 'Menu', 'X', 'Share2', 'Palette', 'Database', 'Box'
];

const BlogManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setItems(data);
        setOriginalItems(JSON.parse(JSON.stringify(data)));
      }
    } catch (err: any) {
      console.error(`Error fetching blog_posts:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Deletions
      const currentIds = items.map(i => i.id);
      const toDelete = originalItems.filter(oi => !currentIds.includes(oi.id)).map(oi => oi.id);
      if (toDelete.length > 0) {
        await supabase.from('blog_posts').delete().in('id', toDelete);
      }

      // 2. Insertions
      const toInsert = items.filter(i => String(i.id).startsWith('temp-')).map(i => {
        const { id, ...rest } = i;
        return rest;
      });
      if (toInsert.length > 0) {
        await supabase.from('blog_posts').insert(toInsert);
      }

      // 3. Updates
      const toUpdate = items.filter(i => !String(i.id).startsWith('temp-')).filter(i => {
        const original = originalItems.find(oi => oi.id === i.id);
        return JSON.stringify(i) !== JSON.stringify(original);
      });
      for (const item of toUpdate) {
        await supabase.from('blog_posts').update(item).eq('id', item.id);
      }

      await fetchItems();
      alert('Blog posts updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      title: 'New Blog Post',
      excerpt: 'Short summary...',
      content: 'Full content here...',
      image_url: '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      read_time: '5 min read',
      slug: `new-post-${Date.now()}`,
      is_featured: true
    };
    setItems([newItem, ...items]);
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Blog Posts (Dev Logs)</h2>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="bg-primary text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add New Post
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="bg-alt p-6 sm:p-8 rounded-2xl border border-muted relative group">
            <button 
              onClick={() => handleDelete(item.id)}
              className="absolute top-4 right-4 text-secondary/40 hover:text-red-500 transition-colors z-10"
            >
              <Trash2 size={20} />
            </button>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Title</label>
                  <input 
                    type="text"
                    value={item.title}
                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Slug</label>
                  <input 
                    type="text"
                    value={item.slug}
                    onChange={(e) => handleFieldChange(item.id, 'slug', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Date</label>
                  <input 
                    type="text"
                    value={item.date}
                    onChange={(e) => handleFieldChange(item.id, 'date', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Read Time</label>
                  <input 
                    type="text"
                    value={item.read_time}
                    onChange={(e) => handleFieldChange(item.id, 'read_time', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Image</label>
                <ImageUpload 
                  value={item.image_url} 
                  onChange={(val) => handleFieldChange(item.id, 'image_url', val)} 
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Excerpt</label>
                <textarea 
                  value={item.excerpt}
                  onChange={(e) => handleFieldChange(item.id, 'excerpt', e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Full Content (Markdown)</label>
                <textarea 
                  value={item.content}
                  onChange={(e) => handleFieldChange(item.id, 'content', e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-3 bg-page/50 p-4 rounded-xl border border-muted">
                <input 
                  type="checkbox"
                  id={`featured-${item.id}`}
                  checked={item.is_featured}
                  onChange={(e) => handleFieldChange(item.id, 'is_featured', e.target.checked)}
                  className="w-5 h-5 rounded border-muted text-primary focus:ring-primary"
                />
                <label htmlFor={`featured-${item.id}`} className="text-sm font-medium cursor-pointer">Show on Main Site (Featured)</label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GalleryManager = () => {
  const [items, setItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gallery_items').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      if (data) {
        setItems(data);
        setOriginalItems(JSON.parse(JSON.stringify(data)));
      }
    } catch (err: any) {
      console.error(`Error fetching gallery_items:`, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Deletions
      const currentIds = items.map(i => i.id);
      const toDelete = originalItems.filter(oi => !currentIds.includes(oi.id)).map(oi => oi.id);
      if (toDelete.length > 0) {
        await supabase.from('gallery_items').delete().in('id', toDelete);
      }

      // 2. Insertions
      const toInsert = items.filter(i => String(i.id).startsWith('temp-')).map(i => {
        const { id, ...rest } = i;
        return rest;
      });
      if (toInsert.length > 0) {
        await supabase.from('gallery_items').insert(toInsert);
      }

      // 3. Updates
      const toUpdate = items.filter(i => !String(i.id).startsWith('temp-')).filter(i => {
        const original = originalItems.find(oi => oi.id === i.id);
        return JSON.stringify(i) !== JSON.stringify(original);
      });
      for (const item of toUpdate) {
        await supabase.from('gallery_items').update(item).eq('id', item.id);
      }

      await fetchItems();
      alert('Gallery updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      src: '',
      title: 'New Image',
      category: 'General',
      span: '',
      is_featured: true,
      order_index: items.length
    };
    setItems([...items, newItem]);
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const hasChanges = JSON.stringify(items) !== JSON.stringify(originalItems);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Gallery Items</h2>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="bg-primary text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add New Image
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-alt p-6 rounded-2xl border border-muted relative group">
            <button 
              onClick={() => handleDelete(item.id)}
              className="absolute top-4 right-4 text-secondary/40 hover:text-red-500 transition-colors z-10"
            >
              <Trash2 size={20} />
            </button>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Image</label>
                <ImageUpload 
                  value={item.src} 
                  onChange={(val) => handleFieldChange(item.id, 'src', val)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Title</label>
                  <input 
                    type="text"
                    value={item.title}
                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Category</label>
                  <input 
                    type="text"
                    value={item.category}
                    onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    id={`featured-gal-${item.id}`}
                    checked={item.is_featured}
                    onChange={(e) => handleFieldChange(item.id, 'is_featured', e.target.checked)}
                    className="w-5 h-5 rounded border-muted text-primary focus:ring-primary"
                  />
                  <label htmlFor={`featured-gal-${item.id}`} className="text-sm font-medium cursor-pointer">Featured</label>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-xs font-mono uppercase text-secondary/60">Order</label>
                   <input 
                    type="number"
                    value={item.order_index}
                    onChange={(e) => handleFieldChange(item.id, 'order_index', parseInt(e.target.value) || 0)}
                    className="w-16 bg-page border border-muted rounded-lg px-2 py-1 outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConnectWithMeEditor = () => {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const initial = {
        connect_name: settings.connect_name || settings.hero_name || '',
        connect_subtitle: settings.connect_subtitle || settings.hero_subtitle || '',
        connect_address: settings.connect_address || settings.contact_address || '',
        connect_email: settings.connect_email || settings.contact_email || '',
        connect_phone: settings.connect_phone || settings.contact_phone || '',
        connect_website: settings.connect_website || settings.contact_website || '',
        connect_bio: settings.connect_bio || '',
        connect_image: settings.connect_image || settings.about_image || '',
      };
      setLocalSettings(initial);
      setOriginalSettings(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(localSettings)));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  const fields = [
    { key: 'connect_name', label: 'Display Name', type: 'text' },
    { key: 'connect_subtitle', label: 'Subtitle / Role', type: 'text' },
    { key: 'connect_address', label: 'Location / Address', type: 'text' },
    { key: 'connect_email', label: 'Contact Email', type: 'email' },
    { key: 'connect_phone', label: 'Contact Phone', type: 'text' },
    { key: 'connect_website', label: 'Website URL', type: 'text' },
    { key: 'connect_image', label: 'Profile Image URL', type: 'url' },
    { key: 'connect_bio', label: 'Short Bio', type: 'textarea' },
  ];

  return (
    <div className="space-y-12">
      <div className="bg-alt border border-muted rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold mb-6">Connect with Me Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.key} className={cn("space-y-2", field.type === 'textarea' && "md:col-span-2")}>
              <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={localSettings[field.key] || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors min-h-[120px]"
                />
              ) : field.key === 'connect_image' ? (
                <ImageUpload 
                  value={localSettings[field.key] || ''} 
                  onChange={(val) => setLocalSettings({ ...localSettings, [field.key]: val })} 
                />
              ) : (
                <input
                  type={field.type}
                  value={localSettings[field.key] || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-accent text-page px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </button>
          )}
        </div>
      </div>

      <section className="pt-12 border-t border-muted">
        <SocialLinksEditor category="connect" />
      </section>
    </div>
  );
};

const SocialLinksEditor = ({ category = 'main' }: { category?: string }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [originalLinks, setOriginalLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, [category]);

  const fetchLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('social_links')
      .select('*')
      .eq('category', category)
      .order('order_index', { ascending: true });
    if (data) {
      setLinks(data);
      setOriginalLinks(JSON.parse(JSON.stringify(data)));
    }
    setLoading(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // 1. Identify items to delete
      const currentIds = links.map(l => l.id);
      const toDelete = originalLinks.filter(ol => !currentIds.includes(ol.id)).map(ol => ol.id);
      
      if (toDelete.length > 0) {
        await supabase.from('social_links').delete().in('id', toDelete);
      }

      // 2. Identify items to insert (temp IDs)
      const toInsert = links.filter(l => String(l.id).startsWith('temp-')).map(l => {
        const { id, ...rest } = l;
        return rest;
      });

      if (toInsert.length > 0) {
        await supabase.from('social_links').insert(toInsert);
      }

      // 3. Identify items to update (existing IDs that changed)
      const toUpdate = links.filter(l => !String(l.id).startsWith('temp-')).filter(l => {
        const original = originalLinks.find(ol => ol.id === l.id);
        return JSON.stringify(l) !== JSON.stringify(original);
      });

      for (const link of toUpdate) {
        await supabase.from('social_links').update(link).eq('id', link.id);
      }

      await fetchLinks();
      alert('Social links updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newLink = { 
      id: `temp-${Date.now()}`,
      platform: 'New Platform', 
      url: '', 
      icon_name: 'Globe', 
      category: category,
      is_fixed: false, 
      order_index: links.length 
    };
    setLinks([...links, newLink]);
  };

  const handleDelete = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
  };

  const handleFieldChange = (id: string, field: string, value: any) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const hasChanges = JSON.stringify(links) !== JSON.stringify(originalLinks);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold capitalize">{category} Social Links</h2>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-accent text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="bg-primary text-page px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {links.map((link) => (
          <div key={link.id} className="bg-alt p-6 rounded-2xl border border-muted relative group">
            {!link.is_fixed && (
              <button 
                onClick={() => handleDelete(link.id)}
                className="absolute top-4 right-4 text-secondary/40 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-page rounded-xl border border-muted flex items-center justify-center text-primary">
                  {React.createElement((LucideIcons as any)[link.icon_name] || LucideIcons.Link, { size: 24 })}
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-secondary/60 mb-1">Platform</label>
                  <input 
                    type="text"
                    value={link.platform}
                    onChange={(e) => handleFieldChange(link.id, 'platform', e.target.value)}
                    className="w-full bg-page border border-muted rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-secondary/60 mb-1">URL</label>
                <input 
                  type="text"
                  value={link.url}
                  onChange={(e) => handleFieldChange(link.id, 'url', e.target.value)}
                  className="w-full bg-page border border-muted rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-secondary/60 mb-1">Icon</label>
                <select 
                  value={link.icon_name}
                  onChange={(e) => handleFieldChange(link.id, 'icon_name', e.target.value)}
                  className="w-full bg-page border border-muted rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                >
                  {LUCIDE_ICONS.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Admin;
