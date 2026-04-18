import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Save, Plus, Trash2, LogOut, Settings, Briefcase, Award, Users, Image as ImageIcon, FileText, CheckCircle, Upload, Loader2, MessageSquare, User as UserIcon, Menu, X, Share2, Palette, Database, Globe, Box, UserPlus, Link as LinkIcon, Activity, Send, Mail, Eye, EyeOff, Code, ListTodo, Calendar, Clock, Wrench, Search, Home, RefreshCw, Sun, Moon, Bell, Shield, Zap, Lock, Cpu, Check, RotateCcw, User } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Statistics from './components/Statistics';
import { useContent, useSettings, useSocialLinks, useDevLogs } from './hooks/useContent';
import { usePWA } from './hooks/usePWA';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AutoExpandingTextarea = ({ value, onChange, className, placeholder, ...props }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(className, "overflow-hidden resize-none")}
    />
  );
};

const IframeAutoHeight = ({ srcDoc, className }: { srcDoc: string; className?: string }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      const handleLoad = () => {
        try {
          if (iframe.contentWindow) {
            iframe.style.height = '0px';
            iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + 'px';
          }
        } catch (e) {
          // Cross-origin issues might happen if srcDoc contains scripts that navigate
          console.error('Error resizing iframe:', e);
        }
      };
      iframe.addEventListener('load', handleLoad);
      setTimeout(handleLoad, 500);
      return () => iframe.removeEventListener('load', handleLoad);
    }
  }, [srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      title="Template Preview"
      srcDoc={srcDoc}
      className={cn("w-full border-none", className)}
    />
  );
};

const Admin = () => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCVRequests, setUnreadCVRequests] = useState(0);
  const [unreadExchanges, setUnreadExchanges] = useState(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { setBadge } = usePWA();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return true;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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
    const interval = setInterval(fetchUnreadCounts, 60000); // Poll every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!session) return;

    let timeoutId: any;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        showNotification('Logged out due to inactivity', 'error');
      }, INACTIVITY_TIMEOUT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer(); // Initial timer start

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session]);

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

    const { count: exchangeCount } = await supabase
      .from('contact_exchanges')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);
    setUnreadExchanges(exchangeCount || 0);

    // Update PWA Badge
    const totalUnread = (msgCount || 0) + (cvCount || 0) + (exchangeCount || 0);
    setBadge(totalUnread);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      
      // The session will be automatically picked up by supabase.auth.onAuthStateChange
      // because the server returns the session data which includes the access token
      // However, we need to set the session manually if it doesn't auto-update
      if (result.session) {
        await supabase.auth.setSession(result.session);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xs"
          >
            <div className={cn(
              "px-4 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-3 backdrop-blur-md border",
              notification.type === 'success' 
                ? "bg-green-500/90 border-green-400 text-white" 
                : "bg-red-500/90 border-red-400 text-white"
            )}>
              {notification.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
              <p className="text-xs font-bold font-headline tracking-tight">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-alt border-r border-muted transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-muted flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center hover:scale-105 transition-transform" title="Go to Website">
                <Home className="text-page w-4 h-4" />
              </a>
              <span className="font-bold text-lg">Admin Panel</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-secondary hover:text-primary">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <TabButton active={activeTab === 'statistics'} onClick={() => { setActiveTab('statistics'); setIsSidebarOpen(false); }} icon={<Activity size={18} />} label="Statistics" />
            <TabButton active={activeTab === 'todos'} onClick={() => { setActiveTab('todos'); setIsSidebarOpen(false); }} icon={<ListTodo size={18} />} label="Todo List" />
            <TabButton active={activeTab === 'tools'} onClick={() => { setActiveTab('tools'); setIsSidebarOpen(false); }} icon={<Wrench size={18} />} label="Tools" />
            <TabButton active={activeTab === 'projects'} onClick={() => { setActiveTab('projects'); setIsSidebarOpen(false); }} icon={<Briefcase size={18} />} label="Projects" />
            <TabButton active={activeTab === 'skills'} onClick={() => { setActiveTab('skills'); setIsSidebarOpen(false); }} icon={<Box size={18} />} label="Skills" />
            <TabButton active={activeTab === 'awards'} onClick={() => { setActiveTab('awards'); setIsSidebarOpen(false); }} icon={<Award size={18} />} label="Awards" />
            <TabButton active={activeTab === 'teams'} onClick={() => { setActiveTab('teams'); setIsSidebarOpen(false); }} icon={<Users size={18} />} label="Teams" />
            <TabButton active={activeTab === 'gallery'} onClick={() => { setActiveTab('gallery'); setIsSidebarOpen(false); }} icon={<ImageIcon size={18} />} label="Gallery" />
            <TabButton active={activeTab === 'hero_about'} onClick={() => { setActiveTab('hero_about'); setIsSidebarOpen(false); }} icon={<User size={18} />} label="Hero & About" />
            <TabButton active={activeTab === 'devlogs'} onClick={() => { setActiveTab('devlogs'); setIsSidebarOpen(false); }} icon={<FileText size={18} />} label="Dev Logs" />
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
            <TabButton active={activeTab === 'email_templates'} onClick={() => { setActiveTab('email_templates'); setIsSidebarOpen(false); }} icon={<Mail size={18} />} label="Email Templates" />
            <TabButton active={activeTab === 'social'} onClick={() => { setActiveTab('social'); setIsSidebarOpen(false); }} icon={<Share2 size={18} />} label="Social Links" />
            <TabButton 
              active={activeTab === 'connect'} 
              onClick={() => { setActiveTab('connect'); setIsSidebarOpen(false); }} 
              icon={<UserPlus size={18} />} 
              label="Connect with Me" 
              badge={unreadExchanges > 0 ? unreadExchanges : undefined}
            />
            <TabButton active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} icon={<Settings size={18} />} label="Settings" />
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
        <header className="h-16 bg-alt border-b border-muted flex items-center justify-between px-4 md:px-8 shrink-0 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-secondary hover:text-accent transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-bold capitalize truncate hidden xs:block sm:block">
              {activeTab.replace(/_/g, ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-alt border border-muted text-secondary hover:text-accent transition-all hover:scale-105"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-12 bg-page/50 scroll-smooth min-w-0">
          <div className="max-w-5xl mx-auto w-full">
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
              {activeTab === 'statistics' && <Statistics />}
              {activeTab === 'todos' && <TodoManager showNotification={showNotification} />}
              {activeTab === 'settings' && (
                <div className="space-y-12">
                  <SettingsEditor showNotification={showNotification} />
                  <div className="pt-12 border-t border-muted">
                    <ProfileEditor showNotification={showNotification} />
                  </div>
                </div>
              )}
              {activeTab === 'projects' && (
                <div className="space-y-6">
                  <SectionBrandingEditor section="projects" label="Projects" showNotification={showNotification} />
                  <TableEditor table="projects" fields={['title', 'short_description', 'long_description', 'image_url', 'video_url', 'live_url', 'source_url', 'type', 'features_title', 'features']} showNotification={showNotification} label="Project" />
                </div>
              )}
              {activeTab === 'tools' && <ToolsManager showNotification={showNotification} />}
              {activeTab === 'skills' && (
                <div className="space-y-12">
                  <SectionBrandingEditor section="skills" label="Skills" showNotification={showNotification} />
                  <SkillsContentEditor showNotification={showNotification} />
                  <TableEditor table="skill_tags" fields={['name', 'order_index']} showNotification={showNotification} label="Tag" />
                  <div className="pt-12 border-t border-muted">
                    <TableEditor table="skills" fields={['name', 'icon', 'category', 'order_index']} showNotification={showNotification} label="Skill" />
                  </div>
                </div>
              )}
              {activeTab === 'awards' && (
                <div className="space-y-6">
                  <SectionBrandingEditor section="awards" label="Awards" showNotification={showNotification} />
                  <TableEditor table="awards" fields={['title', 'organization', 'year', 'description']} showNotification={showNotification} label="Award" />
                </div>
              )}
              {activeTab === 'teams' && (
                <div className="space-y-6">
                  <div className="bg-alt border border-muted rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-accent/10 text-accent rounded-xl">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Team Visibility</h3>
                        <p className="text-sm text-secondary/60">Show or hide the team section on your portfolio</p>
                      </div>
                    </div>
                    <TeamsToggle showNotification={showNotification} />
                  </div>
                  <TableEditor table="teams" fields={['name', 'role', 'image_url']} showNotification={showNotification} label="Member" />
                </div>
              )}
              {activeTab === 'gallery' && (
                <div className="space-y-6">
                  <SectionBrandingEditor section="gallery" label="Gallery" showNotification={showNotification} />
                  <GalleryManager showNotification={showNotification} />
                </div>
              )}
              {activeTab === 'hero_about' && <HeroAboutEditor showNotification={showNotification} />}
              {activeTab === 'devlogs' && (
                 <div className="space-y-6">
                   <SectionBrandingEditor section="devlogs" label="Dev Logs" showNotification={showNotification} />
                   <DevLogManager showNotification={showNotification} />
                 </div>
              )}
              {activeTab === 'cv' && <CVManager onRefresh={fetchUnreadCounts} showNotification={showNotification} />}
              {activeTab === 'social' && <SocialLinksEditor showNotification={showNotification} />}
              {activeTab === 'connect' && <ConnectWithMeEditor onRefresh={fetchUnreadCounts} showNotification={showNotification} />}
              {activeTab === 'messages' && <MessagesViewer onRefresh={fetchUnreadCounts} showNotification={showNotification} />}
              {activeTab === 'email_templates' && <EmailTemplatesEditor showNotification={showNotification} />}
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
    <div className="flex items-center gap-3 min-w-0">
      <div className="shrink-0">{icon}</div>
      <span className="font-medium truncate">{label}</span>
    </div>
    {badge !== undefined && (
      <span className="bg-accent text-page text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
        +{badge}
      </span>
    )}
  </button>
);


const TodoManager = ({ showNotification }: any) => {
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newNotify, setNewNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setTodos(data);
    }
    setLoading(false);
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setSaving(true);
    const combinedDueDate = newDate && newTime ? `${newDate}T${newTime}` : newDate ? `${newDate}T00:00` : null;

    const { data, error } = await supabase
      .from('todos')
      .insert([{
        task: newTask,
        priority: newPriority,
        due_date: combinedDueDate,
        notify_email: newNotify,
        is_completed: false
      }])
      .select();

    if (!error && data) {
      setTodos([data[0], ...todos]);
      setNewTask('');
      setNewPriority('medium');
      setNewDate('');
      setNewTime('');
      setNewNotify(false);
      setShowForm(false);
      
      if (newNotify) {
        // Send initial notification
        try {
          await fetch('/api/v1/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'todo_notification',
              data: {
                task: newTask,
                priority: newPriority,
                due_date: combinedDueDate
              }
            })
          });
          showNotification('Task added and notification sent!');
        } catch (err) {
          console.error('Error sending notification:', err);
          showNotification('Task added but failed to send notification', 'error');
        }
      } else {
        showNotification('Task added successfully');
      }
    } else if (error) {
      showNotification('Failed to add task', 'error');
    }
    setSaving(false);
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (!error) {
      setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));
    }
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (!error) {
      setTodos(todos.filter(t => t.id !== id));
      showNotification('Task deleted');
    }
  };

  const handleNotify = async (todo: any) => {
    try {
      const response = await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'todo_notification',
          data: {
            task: todo.task,
            priority: todo.priority,
            due_date: todo.due_date
          }
        })
      });
      
      if (response.ok) {
        await supabase
          .from('todos')
          .update({ notification_sent: true })
          .eq('id', todo.id);
        
        setTodos(todos.map(t => t.id === todo.id ? { ...t, notification_sent: true } : t));
        showNotification('Notification sent successfully!');
      } else {
        showNotification('Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showNotification('Error sending notification', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold text-secondary">Todo List</h2>
          <p className="text-secondary/60 text-sm">Manage your tasks and set reminders.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchTodos}
            className="p-3 bg-alt border border-muted rounded-xl transition-all text-accent hover:bg-accent hover:text-page shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50 group"
            title="Refresh"
          >
            <RefreshCw size={20} className={cn(loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500')} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-accent text-page px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            {showForm ? <X size={18} /> : <Plus size={18} className="group-hover:rotate-90 transition-transform" />}
            {showForm ? 'Cancel' : 'Add New Task'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-muted rounded-2xl p-4 md:p-6 mb-8">
              <form onSubmit={handleAddTodo} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Task Description</label>
                    <AutoExpandingTextarea
                      value={newTask}
                      onChange={(e: any) => setNewTask(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm min-h-[100px]"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Due Date</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm min-w-0 min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Time</label>
                        <input
                          type="time"
                          step="60"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm min-w-0 min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-alt rounded-xl border border-muted hover:border-accent/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={newNotify}
                      onChange={(e) => setNewNotify(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-6 h-6 border-2 border-muted rounded-lg flex items-center justify-center peer-checked:bg-accent peer-checked:border-accent transition-all">
                      <CheckCircle className="w-4 h-4 text-page opacity-0 peer-checked:opacity-100" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-secondary group-hover:text-primary transition-colors">Email Notification</span>
                      <span className="text-[10px] text-secondary/50">Send a reminder when task is created</span>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-accent text-page px-6 py-3 rounded-xl font-headline font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Task
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-12 bg-card border border-muted border-dashed rounded-xl">
            <ListTodo className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-secondary/50">No tasks found. Add one above!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {todos.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-card border border-muted rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 group transition-all overflow-hidden",
                  todo.is_completed && "opacity-60"
                )}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
                  <button
                    onClick={() => toggleTodo(todo.id, todo.is_completed)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5",
                      todo.is_completed 
                        ? "bg-green-500 border-green-500 text-page" 
                        : "border-muted hover:border-accent"
                    )}
                  >
                    {todo.is_completed && <CheckCircle className="w-4 h-4" />}
                  </button>

                  <div className="flex-grow min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                      <h3 className={cn(
                        "font-medium text-secondary break-words",
                        todo.is_completed && "line-through"
                      )}>
                        {todo.task}
                      </h3>
                      <span className={cn(
                        "text-[9px] md:text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-mono shrink-0 w-fit",
                        todo.priority === 'high' ? "bg-red-500/10 text-red-500" :
                        todo.priority === 'medium' ? "bg-yellow-500/10 text-yellow-500" :
                        "bg-blue-500/10 text-blue-500"
                      )}>
                        {todo.priority}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-secondary/40">
                      {todo.due_date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-accent" />
                          <span className="font-mono">Due:</span> {new Date(todo.due_date).toLocaleDateString()}
                          <Clock className="w-3 h-3 ml-1 text-accent" />
                          {new Date(todo.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3 h-3" />
                        <span className="font-mono">Created:</span> {new Date(todo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 sm:ml-auto md:opacity-0 md:group-hover:opacity-100 transition-opacity w-full sm:w-auto">
                  {todo.notify_email && (
                    <button
                      onClick={() => handleNotify(todo)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        todo.notification_sent 
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" 
                          : "bg-accent/10 text-accent hover:bg-accent/20"
                      )}
                      title={todo.notification_sent ? "Notification Sent" : "Send Notification"}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ToolsManager = ({ showNotification }: any) => {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [tableError, setTableError] = useState<string | null>(null);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    setTableError(null);
    try {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tools:', error);
        setTableError(error.message);
        if (error.message.includes('relation "tools" does not exist') || error.message.includes('Could not find the table')) {
          showNotification('The "tools" table is missing in your database. Please run the SQL schema.', 'error');
        }
      } else {
        setTools(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching tools:', err);
      setTableError(err.message);
    }
    setLoading(false);
  };

  const handleAddTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotification('Tool name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('tools')
        .insert([{
          name: newName,
          url: newUrl || '',
          image_url: newImageUrl || '',
          description: newDescription || ''
        }])
        .select();

      if (!error && data) {
        await fetchTools();
        setNewName('');
        setNewUrl('');
        setNewImageUrl('');
        setNewDescription('');
        setShowForm(false);
        showNotification('Tool added successfully');
      } else if (error) {
        console.error('Supabase error adding tool:', error);
        showNotification(`Failed to add tool: ${error.message}`, 'error');
      }
    } catch (err) {
      showNotification('An error occurred', 'error');
    }
    setSaving(false);
  };

  const deleteTool = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', id);

      if (!error) {
        setTools(tools.filter(t => t.id !== id));
        showNotification('Tool deleted');
      }
    } catch (err) {
      showNotification('Failed to delete tool', 'error');
    }
  };

  const filteredTools = tools.filter(tool => 
    (tool.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.url || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold text-secondary">Tools Directory</h2>
          <p className="text-secondary/60 text-sm">Manage and search your favorite tools.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchTools}
            className="p-3 bg-alt border border-muted rounded-xl transition-all text-accent hover:bg-accent hover:text-page shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50 group"
            title="Refresh"
          >
            <RefreshCw size={20} className={cn(loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500')} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-accent text-page px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            {showForm ? <X size={18} /> : <Plus size={18} className="group-hover:rotate-90 transition-transform" />}
            {showForm ? 'Cancel' : 'Add New Tool'}
          </button>
        </div>
      </div>

      {tableError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm space-y-2">
          <p className="font-bold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database Error
          </p>
          <p>{tableError}</p>
          {tableError.includes('relation "tools" does not exist') && (
            <div className="mt-4 p-3 bg-page/50 rounded-lg font-mono text-[10px] overflow-x-auto">
              <p className="mb-2 text-secondary/60 font-sans">Run this SQL in your Supabase SQL Editor:</p>
              <pre>{`CREATE TABLE tools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON tools FOR SELECT USING (true);
CREATE POLICY "Admin Write Access" ON tools FOR ALL USING (auth.role() = 'authenticated');`}</pre>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-muted rounded-2xl p-4 md:p-6 mb-8">
              <form onSubmit={handleAddTool} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Tool Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. ChatGPT"
                      className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Website URL (Optional)</label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Tool Image (Optional)</label>
                  <ImageUpload 
                    value={newImageUrl} 
                    onChange={(val) => setNewImageUrl(val)} 
                    showNotification={showNotification}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-secondary/50">Description</label>
                <AutoExpandingTextarea
                  value={newDescription}
                  onChange={(e: any) => setNewDescription(e.target.value)}
                  placeholder="Briefly describe what this tool does..."
                  className="w-full bg-alt border border-muted rounded-xl px-4 py-3 focus:border-accent outline-none transition-colors text-sm min-h-[100px]"
                />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-accent text-page px-6 py-3 rounded-xl font-headline font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Tool
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-secondary/40" />
        </div>
        <input
          type="text"
          placeholder="Search tools by name, URL or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-accent outline-none transition-colors text-sm shadow-sm"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-12 bg-card border border-muted border-dashed rounded-xl">
            <Wrench className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-secondary/50">
              {searchQuery ? 'No tools match your search.' : 'No tools added yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map((tool) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-muted rounded-2xl p-5 group hover:border-accent/30 transition-all flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {tool.image_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-alt border border-muted shrink-0">
                        <img 
                          src={tool.image_url} 
                          alt={tool.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline font-bold text-secondary truncate">{tool.name}</h3>
                      <a 
                        href={tool.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        <Globe className="w-3 h-3" />
                        {tool.url.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTool(tool.id)}
                    className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {tool.description && (
                  <p className="text-sm text-secondary/60 line-clamp-3 flex-1">
                    {tool.description}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-muted flex items-center justify-between">
                  <span className="text-[10px] font-mono text-secondary/30 uppercase tracking-wider">
                    Added {new Date(tool.created_at).toLocaleDateString()}
                  </span>
                  <a 
                    href={tool.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-alt text-secondary rounded-lg hover:bg-accent hover:text-page transition-all"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const HeroAboutEditor = ({ showNotification }: any) => {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const initial = {
        hero_greeting: settings.hero_greeting || '',
        hero_name: settings.hero_name || '',
        hero_subtitle: settings.hero_subtitle || '',
        hero_description: settings.hero_description || '',
        hero_image: settings.hero_image || '',
        about_description: settings.about_description || '',
        about_image: settings.about_image || '',
        branding_about_styled: settings.branding_about_styled || '',
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
      showNotification('Hero & About details updated successfully!');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to update details: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-12">
      <div className="bg-alt border border-muted rounded-2xl p-6 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold">Hero & About Section</h3>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-accent text-page px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          )}
        </div>

        <div className="space-y-10">
          {/* Hero Section */}
          <div className="space-y-6">
            <h4 className="text-sm font-mono uppercase tracking-widest text-accent border-b border-muted pb-2">Hero Section</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">Greeting (e.g. Hello, I am)</label>
                <input
                  type="text"
                  value={localSettings.hero_greeting || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, hero_greeting: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">Full Name</label>
                <input
                  type="text"
                  value={localSettings.hero_name || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, hero_name: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">Subtitle / Role</label>
                <input
                  type="text"
                  value={localSettings.hero_subtitle || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, hero_subtitle: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">Hero Description</label>
                <AutoExpandingTextarea
                  value={localSettings.hero_description || ''}
                  onChange={(e: any) => setLocalSettings({ ...localSettings, hero_description: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors min-h-[100px]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">Hero Image</label>
                <ImageUpload 
                  value={localSettings.hero_image || ''} 
                  onChange={(val) => setLocalSettings({ ...localSettings, hero_image: val })} 
                  showNotification={showNotification}
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-6">
            <h4 className="text-sm font-mono uppercase tracking-widest text-accent border-b border-muted pb-2">About Section</h4>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">About Description</label>
                <AutoExpandingTextarea
                  value={localSettings.about_description || ''}
                  onChange={(e: any) => setLocalSettings({ ...localSettings, about_description: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors min-h-[150px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">About Image</label>
                <ImageUpload 
                  value={localSettings.about_image || ''} 
                  onChange={(val) => setLocalSettings({ ...localSettings, about_image: val })} 
                  showNotification={showNotification}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">About Section Styled Word</label>
                <input
                  type="text"
                  value={localSettings.branding_about_styled || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, branding_about_styled: e.target.value })}
                  placeholder="e.g. Lifestyle"
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionBrandingEditor = ({ section, label = section, showNotification }: { section: string, label?: string, showNotification: any }) => {
  const { settings, updateSettings } = useSettings();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setValue(settings[`branding_${section}_styled`] || '');
    }
  }, [settings, section]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ [`branding_${section}_styled`]: value });
      showNotification(`${label} branding updated`);
    } catch (err: any) {
      showNotification('Failed to update branding: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = value !== (settings?.[`branding_${section}_styled`] || '');

  return (
    <div className="bg-alt border border-muted rounded-2xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full">
          <label className="text-xs font-mono uppercase tracking-wider text-secondary/60 block mb-2">
            {label} Section - Styled Heading Word
          </label>
          <input 
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-primary outline-none transition-colors"
            placeholder="e.g. Works, Honors, Visuals..."
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full sm:w-auto bg-primary text-page px-5 py-2.5 rounded-xl font-bold text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 shrink-0 whitespace-nowrap flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Branding</span>
        </button>
      </div>
    </div>
  );
};

const SkillsContentEditor = ({ showNotification }: any) => {
  const { settings, updateSettings } = useSettings();
  const [quote, setQuote] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setQuote(settings.skills_quote || '');
      setDescription(settings.skills_description || '');
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({ 
        skills_quote: quote,
        skills_description: description
      });
      showNotification('Skills section content updated');
    } catch (err: any) {
      showNotification('Failed to update content: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = quote !== (settings?.skills_quote || '') || description !== (settings?.skills_description || '');

  return (
    <div className="bg-alt border border-muted rounded-2xl p-6 mb-8 space-y-6">
      <h3 className="text-lg font-bold">Skills Section Content</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-secondary/60 block mb-2">
            Skills Intro Quote (Italic)
          </label>
          <AutoExpandingTextarea 
            value={quote}
            onChange={(e: any) => setQuote(e.target.value)}
            className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-primary outline-none transition-colors min-h-[80px]"
            placeholder="e.g. Combining artistic vision with technical precision..."
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-secondary/60 block mb-2">
            Skills Detailed Description
          </label>
          <AutoExpandingTextarea 
            value={description}
            onChange={(e: any) => setDescription(e.target.value)}
            className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-primary outline-none transition-colors min-h-[120px]"
            placeholder="e.g. My approach to design and entrepreneurship is holistic..."
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="w-full sm:w-auto bg-primary text-page px-5 py-2.5 rounded-xl font-bold text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Section Content</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsEditor = ({ showNotification }: any) => {
  const { settings, loading, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState('general');

  const categories = [
    {
      id: 'general',
      label: 'General',
      icon: <Globe size={18} />,
      fields: [
        { key: 'site_title', label: 'Site Title', type: 'text' },
        { key: 'site_tagline', label: 'Site Tagline', type: 'text' },
        { key: 'footer_copyright_name', label: 'Footer Copyright Name', type: 'text' },
        { key: 'default_language', label: 'Default Language', type: 'select', options: ['English', 'Nepali', 'Spanish', 'French', 'German', 'Japanese'] },
      ]
    },
    {
      id: 'navigation',
      label: 'Navigation',
      icon: <Menu size={18} />,
      fields: [
        { key: 'nav_label_home', label: 'Home Link Label', type: 'text' },
        { key: 'nav_label_about', label: 'About Link Label', type: 'text' },
        { key: 'nav_label_projects', label: 'Projects Link Label', type: 'text' },
        { key: 'nav_label_skills', label: 'Skills Link Label', type: 'text' },
        { key: 'nav_label_awards', label: 'Awards Link Label', type: 'text' },
        { key: 'nav_label_gallery', label: 'Gallery Link Label', type: 'text' },
        { key: 'nav_label_devlogs', label: 'Dev Logs Link Label', type: 'text' },
        { key: 'nav_label_contact', label: 'Contact Link Label', type: 'text' },
      ]
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <Palette size={18} />,
      fields: [
        { key: 'theme_mode', label: 'Theme Mode', type: 'select', options: ['Light', 'Dark', 'System'] },
        { key: 'primary_color', label: 'Primary Color (Brand Color)', type: 'color' },
        { key: 'font_selection', label: 'Font Selection', type: 'select', options: ['Inter', 'Space Grotesk', 'Outfit', 'Playfair Display', 'JetBrains Mono'] },
        { key: 'border_radius', label: 'UI Roundness', type: 'select', options: ['None', 'Small', 'Medium', 'Large', 'Full'] },
      ]
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: <Mail size={18} />,
      fields: [
        { key: 'enable_contact_form', label: 'Enable Contact Form', type: 'toggle' },
        { key: 'enable_captcha', label: 'Enable CAPTCHA (On/Off)', type: 'toggle' },
        { key: 'auto_reply_enabled', label: 'Auto-reply Settings', type: 'toggle' },
        { key: 'thank_you_message', label: 'Thank You Message Text', type: 'textarea' },
      ]
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={18} />,
      fields: [
        { key: 'notify_new_message', label: 'New Contact Messages', type: 'toggle' },
        { key: 'notify_cv_request', label: 'CV Access Requests', type: 'toggle' },
        { key: 'notify_contact_exchange', label: 'Contact Exchange Requests', type: 'toggle' },
        { key: 'notify_todo_reminder', label: 'Task & Todo Reminders', type: 'toggle' },
      ]
    },
    {
      id: 'skills_section',
      label: 'Skills Section',
      icon: <Cpu size={18} />,
      fields: [
        { key: 'skills_quote', label: 'Skills Quote/Intro (Italic)', type: 'textarea' },
        { key: 'skills_description', label: 'Skills Detailed Description', type: 'textarea' },
      ]
    },
    {
      id: 'seo',
      label: 'SEO',
      icon: <Search size={18} />,
      fields: [
        { key: 'meta_title', label: 'Meta Title (Default)', type: 'text' },
        { key: 'meta_description', label: 'Meta Description', type: 'textarea' },
        { key: 'meta_keywords', label: 'Keywords (Comma separated)', type: 'text' },
        { key: 'seo_wikidata_id', label: 'Wikidata ID URL', type: 'text' },
        { key: 'seo_nationality', label: 'Nationality (SEO)', type: 'text' },
        { key: 'seo_location_name', label: 'Home Location (SEO)', type: 'text' },
        { key: 'seo_job_title', label: 'Job Title (SEO)', type: 'text' },
        { key: 'seo_org_name', label: 'Main Organization (SEO)', type: 'text' },
        { key: 'seo_alumni_name', label: 'Alumni Organization (SEO)', type: 'text' },
        { key: 'og_image', label: 'Social Share Image (OG)', type: 'image' },
        { key: 'favicon_url', label: 'Favicon / Site Icon', type: 'image' },
        { key: 'apple_icon_180', label: 'Apple Touch Icon (180x180)', type: 'image' },
        { key: 'pwa_icon_512', label: 'PWA Icon (512x512)', type: 'image' },
        { key: 'allow_indexing', label: 'Search Engine Indexing', type: 'toggle' },
      ]
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: <Shield size={18} />,
      fields: [
        { key: 'anonymize_ip', label: 'Anonymize IP Tracking', type: 'toggle' },
        { key: 'enable_cookie_consent', label: 'Show Cookie Consent Banner', type: 'toggle' },
      ]
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: <Zap size={18} />,
      fields: [
        { key: 'enable_lazy_loading', label: 'Enable Lazy Loading', type: 'toggle' },
        { key: 'image_optimization', label: 'Image Optimization', type: 'toggle' },
      ]
    },
    {
      id: 'security',
      label: 'Security',
      icon: <Lock size={18} />,
      fields: [
        { key: 'session_timeout_enabled', label: 'Session Timeout', type: 'toggle' },
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: <Cpu size={18} />,
      fields: [
        { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'toggle' },
      ]
    },
    {
      id: 'sections',
      label: 'Page Sections',
      icon: <ListTodo size={18} />,
      fields: [
        { key: 'enable_teams_section', label: 'Enable Teams Section', type: 'toggle' },
      ]
    }
  ];

  useEffect(() => {
    if (settings) {
      const initial: Record<string, string> = {};
      categories.forEach(cat => {
        cat.fields.forEach(field => {
          initial[field.key] = settings[field.key] || '';
        });
      });
      setLocalSettings(initial);
      setOriginalSettings(initial);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(localSettings)));
      showNotification('Site settings updated successfully!');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to update settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    showNotification('Cache cleared successfully!');
  };

  const handleLogoutAll = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      showNotification('Logged out from all devices');
    } catch (err: any) {
      showNotification('Error logging out: ' + err.message, 'error');
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  const activeCat = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold">Site Settings</h2>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Categories Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeCategory === cat.id 
                  ? "bg-accent text-page shadow-lg shadow-accent/20" 
                  : "text-secondary/60 hover:bg-alt hover:text-secondary"
              )}
            >
              <div className="flex items-center gap-3">
                {cat.icon}
                {cat.label}
              </div>
            </button>
          ))}
        </div>

        {/* Category Content */}
        <div className="flex-1 bg-alt border border-muted rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-accent/10 text-accent rounded-lg">
              {activeCat.icon}
            </div>
            <h3 className="text-xl font-bold">{activeCat.label} Settings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeCat.fields.map((field) => (
              <div key={field.key} className={cn("space-y-2", (field.type === 'textarea' || field.type === 'image' || field.type === 'toggle') && "md:col-span-2")}>
                <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">{field.label}</label>
                
                {field.type === 'select' ? (
                  <select
                    value={localSettings[field.key] || ''}
                    onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                    className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors"
                  >
                    <option value="">Select {field.label}...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <AutoExpandingTextarea
                    value={localSettings[field.key] || ''}
                    onChange={(e: any) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                    className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors min-h-[100px]"
                  />
                ) : field.type === 'image' ? (
                  <ImageUpload 
                    value={localSettings[field.key] || ''} 
                    onChange={(val) => setLocalSettings({ ...localSettings, [field.key]: val })} 
                    showNotification={showNotification}
                  />
                ) : field.type === 'toggle' ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, [field.key]: localSettings[field.key] === 'true' ? 'false' : 'true' })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        localSettings[field.key] === 'true' ? "bg-accent" : "bg-muted"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-page transition-all",
                        localSettings[field.key] === 'true' ? "left-7" : "left-1"
                      )} />
                    </button>
                    <span className="text-sm text-secondary">
                      {localSettings[field.key] === 'true' ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ) : field.type === 'color' ? (
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={localSettings[field.key] || '#da755b'}
                      onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                      className="w-12 h-12 bg-page border border-muted rounded-xl p-1 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localSettings[field.key] || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                      className="flex-1 bg-page border border-muted rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors font-mono"
                      placeholder="#000000"
                    />
                  </div>
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

          {/* Special Actions for Performance and Security */}
          {activeCategory === 'performance' && (
            <div className="mt-10 pt-8 border-t border-muted">
              <h4 className="text-sm font-bold mb-4">Maintenance Actions</h4>
              <button
                onClick={handleClearCache}
                className="flex items-center gap-2 px-6 py-3 bg-muted/30 hover:bg-muted/50 text-secondary rounded-xl text-sm font-bold transition-all"
              >
                <RotateCcw size={16} />
                Clear System Cache
              </button>
            </div>
          )}

          {activeCategory === 'security' && (
            <div className="mt-10 pt-8 border-t border-muted">
              <h4 className="text-sm font-bold mb-4">Advanced Security</h4>
              <button
                onClick={handleLogoutAll}
                className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold transition-all"
              >
                <LogOut size={16} />
                Logout from All Devices
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FileUpload = ({ value, onChange, accept = "*/*", showNotification }: { value: string, onChange: (val: string) => void, accept?: string, showNotification: any }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Client-side validation
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo'
      ];
      
      if (!allowedMimes.includes(file.type) && accept !== "*/*") {
        // Only strict check if not allowing all types
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isDoc = file.type === 'application/pdf' || file.type.includes('word');
        if (!isImage && !isVideo && !isDoc) {
          throw new Error('Invalid file type. Only images, documents, and videos are allowed.');
        }
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File too large. Max size is 50MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      showNotification('Error uploading file: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          value={value || ''}
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

const ImageUpload = ({ value, onChange, showNotification }: { value: string, onChange: (val: string) => void, showNotification: any }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Client-side validation
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error('Invalid file type. Only images and videos are allowed.');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File too large. Max size is 50MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      onChange(publicUrl);
    } catch (error: any) {
      showNotification('Error uploading image: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text"
          value={value || ''}
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

const TeamsToggle = ({ showNotification }: any) => {
  const { settings, updateSettings } = useSettings();
  const isEnabled = settings.enable_teams_section === 'true';

  const handleToggle = async () => {
    try {
      await updateSettings({ enable_teams_section: (!isEnabled).toString() });
      showNotification(`Team section ${!isEnabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      showNotification('Failed to update team section visibility', 'error');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
        isEnabled ? "bg-accent" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-page transition-transform",
          isEnabled ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
};

const TableEditor = ({ table, fields, showNotification, label }: any) => {
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
      showNotification(`${table.replace(/_/g, ' ')} updated successfully!`);
    } catch (err) {
      console.error(err);
      showNotification('Failed to save changes.', 'error');
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            Add New {label || ''}
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
                  {f === 'features' ? (
                    <FeaturesEditor 
                      value={item[f]} 
                      onChange={(val) => handleFieldChange(item.id, f, val)} 
                      showNotification={showNotification}
                    />
                  ) : f.includes('video') ? (
                    <FileUpload 
                      value={item[f]} 
                      onChange={(val) => handleFieldChange(item.id, f, val)} 
                      accept="video/*"
                      showNotification={showNotification}
                    />
                  ) : f.includes('image') || f === 'src' || f === 'logo' || f.includes('favicon') ? (
                    <ImageUpload 
                      value={item[f]} 
                      onChange={(val) => handleFieldChange(item.id, f, val)} 
                      showNotification={showNotification}
                    />
                  ) : f === 'description' || f === 'content' || f === 'excerpt' || f === 'long_description' ? (
                    <AutoExpandingTextarea 
                      value={item[f] || ''}
                      onChange={(e: any) => handleFieldChange(item.id, f, e.target.value)}
                      className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[200px]"
                    />
                  ) : (
                    <input 
                      type={f === 'order_index' || f === 'year' || f === 'span' ? 'number' : 'text'}
                      value={item[f] || ''}
                      onChange={(e) => handleFieldChange(item.id, f, f === 'order_index' || f === 'year' || f === 'span' ? parseInt(e.target.value) || 0 : e.target.value)}
                      className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-w-0"
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

const FeaturesEditor = ({ value, onChange, showNotification }: { value: any, onChange: (val: any) => void, showNotification: any }) => {
  const features = value ? (typeof value === 'string' ? JSON.parse(value) : value) : [];

  const handleFeatureChange = (index: number, field: string, val: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { ...newFeatures[index], [field]: val };
    onChange(JSON.stringify(newFeatures));
  };

  const addFeature = () => {
    const newFeatures = [...features, { title: '', description: '', video_url: '', image_url: '' }];
    onChange(JSON.stringify(newFeatures));
  };

  const removeFeature = (index: number) => {
    const newFeatures = features.filter((_: any, i: number) => i !== index);
    onChange(JSON.stringify(newFeatures));
  };

  return (
    <div className="space-y-4 border border-muted p-4 rounded-xl bg-page/30">
      {features.map((feature: any, idx: number) => (
        <div key={idx} className="p-6 bg-alt rounded-lg border border-muted relative space-y-4">
          <button 
            type="button"
            onClick={() => removeFeature(idx)}
            className="absolute top-2 right-2 text-red-500/50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <input 
            type="text"
            placeholder="Feature Title"
            value={feature.title || ''}
            onChange={(e) => handleFeatureChange(idx, 'title', e.target.value)}
            className="w-full bg-page border border-muted rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors pr-10"
          />
          <AutoExpandingTextarea 
            placeholder="Feature Description"
            value={feature.description || ''}
            onChange={(e: any) => handleFeatureChange(idx, 'description', e.target.value)}
            className="w-full bg-page border border-muted rounded-lg px-3 py-2 text-sm outline-none focus:border-primary min-h-[100px] transition-colors"
          />
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-secondary/50 ml-1">Video URL / Upload</label>
              <FileUpload 
                value={feature.video_url || ''} 
                onChange={(val) => handleFeatureChange(idx, 'video_url', val)} 
                accept="video/*"
                showNotification={showNotification}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-secondary/50 ml-1">Image URL (fallback) / Upload</label>
              <ImageUpload 
                value={feature.image_url || ''} 
                onChange={(val) => handleFeatureChange(idx, 'image_url', val)} 
                showNotification={showNotification}
              />
            </div>
          </div>
        </div>
      ))}
      <button 
        type="button"
        onClick={addFeature}
        className="w-full py-3 border border-dashed border-muted rounded-lg text-secondary hover:text-primary hover:border-primary transition-all text-sm flex items-center justify-center gap-2 bg-page/50"
      >
        <Plus size={14} /> Add Feature
      </button>
    </div>
  );
};

const CVManager = ({ onRefresh, showNotification }: { onRefresh: () => void, showNotification: any }) => {
  const [settings, setSettings] = useState<any[]>([]);
  const [originalSettings, setOriginalSettings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const { data: sData } = await supabase.from('site_settings').select('*').in('key', ['cv_url', 'cv_password']);
      const { data: rData } = await supabase.from('cv_requests').select('*').order('created_at', { ascending: false });
      if (sData) {
        setSettings(sData);
        setOriginalSettings(JSON.parse(JSON.stringify(sData)));
      }
      if (rData) setRequests(rData);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to refresh data: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      showNotification('CV settings updated successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, value } : s));
  };

  const handleApproveRequest = async (request: any) => {
    const cvPasswordSetting = settings.find(s => s.key === 'cv_password');
    const cvPassword = cvPasswordSetting?.value;
    
    if (!cvPassword) {
      showNotification('Please set a CV password first', 'error');
      return;
    }
    
    try {
      // 1. Mark as read in DB
      await supabase.from('cv_requests').update({ is_read: true }).eq('id', request.id);
      
      // 2. Send approval email
      const response = await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'cv_approval', 
          data: { 
            name: request.name, 
            email: request.email, 
            password: cvPassword 
          } 
        }),
      });

      if (!response.ok) throw new Error('Failed to send approval email');

      // 3. Update local state
      setRequests(requests.map(r => r.id === request.id ? { ...r, is_read: true } : r));
      onRefresh();
      showNotification('Request approved and access code sent!');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to approve request: ' + err.message, 'error');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('cv_requests').update({ is_read: true }).eq('id', id);
    setRequests(requests.map(r => r.id === id ? { ...r, is_read: true } : r));
    onRefresh();
  };

  const handleDeleteRequest = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('cv_requests').delete().eq('id', id);
      if (error) throw error;
      setRequests(requests.filter(r => r.id !== id));
      onRefresh();
      showNotification('Request deleted successfully');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to delete request: ' + err.message, 'error');
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
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
                      value={s.value || ''}
                      onChange={(val) => handleValueChange(s.id, val)}
                      accept=".pdf,.doc,.docx"
                      showNotification={showNotification}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <input 
                        type={!showPassword ? "password" : "text"}
                        value={s.value || ''}
                        onChange={(e) => handleValueChange(s.id, e.target.value)}
                        className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors pr-12"
                        placeholder="Set CV Access Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-accent transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pt-12 border-t border-muted">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">CV Access Requests</h2>
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="p-3 bg-alt border border-muted rounded-xl transition-all text-accent hover:bg-accent hover:text-page shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50 group"
            title="Refresh Requests"
          >
            <RefreshCw size={20} className={cn(refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500')} />
          </button>
        </div>
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
                      onClick={() => handleApproveRequest(r)}
                      className="flex items-center gap-1 bg-accent/10 text-accent hover:bg-accent hover:text-page px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      title="Approve & Send Code"
                    >
                      <CheckCircle size={14} />
                      APPROVE & SEND CODE
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    {deletingId === r.id ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => handleDeleteRequest(r.id)}
                          disabled={saving}
                          className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors"
                        >
                          CONFIRM
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="bg-muted text-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-muted/80 transition-colors"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(r.id)}
                        className="text-secondary/40 hover:text-red-500 transition-colors p-2"
                        title="Delete Request"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
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

const ProfileEditor = ({ showNotification }: any) => {
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
            className="w-full bg-primary text-page py-2.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

const EmailTemplatesEditor = ({ showNotification }: any) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [resettingKey, setResettingKey] = useState<string | null>(null);

  const templateDefinitions = [
    { 
      key: 'email_template_message', 
      label: 'New Message Received', 
      description: 'Sent to admin when a new message is received via contact form.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #7a7570; line-height: 1.8; margin-bottom: 24px; }
    .data-card { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; margin: 28px 0; }
    .data-card-header { background-color: rgba(218, 117, 91, 0.08); border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 12px 20px; font-size: 10px; color: #da755b; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Courier New', monospace; }
    .data-row { display: flex; align-items: flex-start; padding: 15px 20px; border-bottom: 1px solid rgba(242, 240, 228, 0.08); }
    .data-key { font-size: 11px; color: #7a7570; width: 90px; flex-shrink: 0; font-family: 'Courier New', monospace; }
    .data-val { font-size: 14px; color: #f2f0e4; line-height: 1.5; }
    .message-box { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-left: 3px solid #da755b; padding: 20px 22px; font-size: 15px; color: #7a7570; font-style: italic; }
    .cta-link { display: inline-block; margin: 20px 0; padding: 13px 28px; background-color: #da755b; color: #1a1a18; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; text-transform: uppercase; border-radius: 2px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Portfolio Notification</div></div>
      <div class="status-pill">New Message</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Contact Form</div>
      <div class="headline">New Message Received</div>
      <p class="body-text">Someone reached out via the contact form on your portfolio.</p>
      <div class="data-card">
        <div class="data-card-header">Sender Details</div>
        <div class="data-row"><div class="data-key">Name</div><div class="data-val">\${data.name}</div></div>
        <div class="data-row"><div class="data-key">Email</div><div class="data-val email">\${data.email}</div></div>
        <div class="data-row"><div class="data-key">Subject</div><div class="data-val">\${data.subject || 'No Subject'}</div></div>
      </div>
      <div class="message-box">\${data.message}</div>
      <a class="cta-link" href="mailto:\${data.email}">Reply to \${data.name}</a>
    </div>
    <div class="email-footer"><div class="footer-left">Portfolio Bot</div></div>
  </div>
</body>
</html>`
    },
    { 
      key: 'email_template_cv_request', 
      label: 'New CV Request Received', 
      description: 'Sent to admin when someone requests CV access.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #7a7570; line-height: 1.8; margin-bottom: 24px; }
    .data-card { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; margin: 28px 0; }
    .data-card-header { background-color: rgba(218, 117, 91, 0.08); border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 12px 20px; font-size: 10px; color: #da755b; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Courier New', monospace; }
    .data-row { display: flex; align-items: flex-start; padding: 15px 20px; border-bottom: 1px solid rgba(242, 240, 228, 0.08); }
    .data-key { font-size: 11px; color: #7a7570; width: 90px; flex-shrink: 0; font-family: 'Courier New', monospace; }
    .data-val { font-size: 14px; color: #f2f0e4; line-height: 1.5; }
    .cta-link { display: inline-block; margin: 20px 0; padding: 13px 28px; background-color: #da755b; color: #1a1a18; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; text-transform: uppercase; border-radius: 2px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Portfolio Notification</div></div>
      <div class="status-pill">New Request</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Incoming Request</div>
      <div class="headline">New CV Request Received</div>
      <p class="body-text">Someone submitted a CV access request from your portfolio.</p>
      <div class="data-card">
        <div class="data-card-header">Request Details</div>
        <div class="data-row"><div class="data-key">Name</div><div class="data-val">\${data.name}</div></div>
        <div class="data-row"><div class="data-key">Company</div><div class="data-val">\${data.company}</div></div>
        <div class="data-row"><div class="data-key">Email</div><div class="data-val email">\${data.email}</div></div>
        <div class="data-row"><div class="data-key">Reason</div><div class="data-val">\${data.reason}</div></div>
      </div>
      <a class="cta-link" href="https://janakpanthi.com.np/admin">Approve Request</a>
    </div>
    <div class="email-footer"><div class="footer-left">Portfolio Bot</div></div>
  </div>
</body>
</html>`
    },
    { 
      key: 'email_template_cv_approval', 
      label: 'CV Access Granted', 
      description: 'Sent to user when their CV request is approved.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #7a7570; line-height: 1.8; margin-bottom: 24px; }
    .code-block { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-left: 3px solid #da755b; padding: 24px 28px; margin: 28px 0; }
    .code-label { font-size: 10px; color: #7a7570; text-transform: uppercase; font-family: 'Courier New', monospace; margin-bottom: 10px; }
    .code-value { font-family: 'Courier New', monospace; font-size: 30px; color: #da755b; letter-spacing: 0.22em; font-weight: bold; }
    .cta-link { display: inline-block; margin: 20px 0; padding: 13px 28px; background-color: #da755b; color: #1a1a18; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; text-transform: uppercase; border-radius: 2px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Portfolio and CV Access</div></div>
      <div class="status-pill">Access Granted</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Hello, \${data.name}</div>
      <div class="headline">Your CV Access Has Been Approved</div>
      <p class="body-text">Your request for CV access has been approved. You can now download the CV using the access code below.</p>
      <div class="code-block">
        <div class="code-label">Your Access Code</div>
        <div class="code-value">\${data.password}</div>
      </div>
      <a class="cta-link" href="https://janakpanthi.com.np">Janak Panthi Portfolio</a>
    </div>
    <div class="email-footer"><div class="footer-left">Automated Notice</div></div>
  </div>
</body>
</html>`
    },
    { 
      key: 'email_template_contact_exchange', 
      label: 'New Contact Exchange', 
      description: 'Sent to admin when someone shares their contact details.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #7a7570; line-height: 1.8; margin-bottom: 24px; }
    .data-card { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; margin: 28px 0; }
    .data-card-header { background-color: rgba(218, 117, 91, 0.08); border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 12px 20px; font-size: 10px; color: #da755b; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'Courier New', monospace; }
    .data-row { display: flex; align-items: flex-start; padding: 15px 20px; border-bottom: 1px solid rgba(242, 240, 228, 0.08); }
    .data-key { font-size: 11px; color: #7a7570; width: 90px; flex-shrink: 0; font-family: 'Courier New', monospace; }
    .data-val { font-size: 14px; color: #f2f0e4; line-height: 1.5; }
    .cta-link { display: inline-block; margin: 20px 0; padding: 13px 28px; background-color: #da755b; color: #1a1a18; text-decoration: none; font-size: 13px; font-family: 'Courier New', monospace; text-transform: uppercase; border-radius: 2px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Portfolio Notification</div></div>
      <div class="status-pill">New Exchange</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Incoming Contact</div>
      <div class="headline">New Contact Exchange Received</div>
      <p class="body-text">Someone shared their contact details with you from your portfolio.</p>
      <div class="data-card">
        <div class="data-card-header">Contact Details</div>
        <div class="data-row"><div class="data-key">Name</div><div class="data-val">\${data.name}</div></div>
        <div class="data-row"><div class="data-key">Phone</div><div class="data-val">\${data.phone}</div></div>
        <div class="data-row"><div class="data-key">Email</div><div class="data-val email">\${data.email}</div></div>
      </div>
      <a class="cta-link" href="https://janakpanthi.com.np/admin">View in Dashboard</a>
    </div>
    <div class="email-footer"><div class="footer-left">Portfolio Bot</div></div>
  </div>
</body>
</html>`
    },
    { 
      key: 'email_template_send_vcf', 
      label: 'Digital Business Card', 
      description: 'Sent to user with your VCF contact card attached.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .body-text { font-size: 15px; color: #7a7570; line-height: 1.8; margin-bottom: 24px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Digital Business Card</div></div>
      <div class="status-pill">Contact Card</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Hello, \${data.userName}</div>
      <div class="headline">My Digital Contact Information</div>
      <p class="body-text">It was great connecting with you! As requested, here is my digital contact card (VCF) attached to this email.</p>
      <p class="body-text">You can save this file directly to your phone or computer to keep my contact details handy.</p>
    </div>
    <div class="email-footer"><div class="footer-left">Automated Send</div></div>
  </div>
</body>
</html>`
    },
    { 
      key: 'email_template_admin_reply', 
      label: 'Admin Reply', 
      description: 'Used when replying to user messages from the dashboard.',
      default: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #242424; font-family: 'Georgia', serif; padding: 40px 16px; }
    .email-wrapper { max-width: 580px; margin: 0 auto; background-color: #1a1a18; border: 1px solid rgba(242, 240, 228, 0.08); border-radius: 2px; overflow: hidden; }
    .email-header { background-color: #2e2d2a; border-bottom: 1px solid rgba(242, 240, 228, 0.08); padding: 28px 36px; display: flex; align-items: center; justify-content: space-between; }
    .logo-name { font-size: 18px; color: #f2f0e4; letter-spacing: 0.04em; }
    .logo-sub { font-size: 11px; color: #7a7570; margin-top: 3px; letter-spacing: 0.1em; text-transform: uppercase; }
    .status-pill { background-color: rgba(218, 117, 91, 0.12); color: #da755b; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 6px 14px; border: 1px solid rgba(218, 117, 91, 0.3); border-radius: 2px; font-family: 'Courier New', monospace; }
    .divider-bar { height: 3px; background: linear-gradient(90deg, #da755b 0%, rgba(218, 117, 91, 0.3) 60%, transparent 100%); }
    .email-body { padding: 40px 36px; }
    .greeting { font-size: 13px; color: #7a7570; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; font-family: 'Courier New', monospace; }
    .headline { font-size: 26px; color: #f2f0e4; line-height: 1.3; margin-bottom: 24px; }
    .message-section { margin: 20px 0 28px; }
    .message-box { background-color: #2e2d2a; border: 1px solid rgba(242, 240, 228, 0.08); border-left: 3px solid #da755b; padding: 20px 22px; font-size: 15px; color: #f2f0e4; line-height: 1.8; }
    .sign-off { font-size: 14px; color: #7a7570; line-height: 1.8; }
    .sign-off strong { color: #f2f0e4; font-weight: normal; display: block; margin-top: 4px; font-size: 15px; }
    .email-footer { background-color: #1a1a18; border-top: 1px solid rgba(242, 240, 228, 0.08); padding: 18px 36px; display: flex; align-items: center; justify-content: space-between; }
    .footer-left { font-size: 12px; color: rgba(122, 117, 112, 0.5); font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div><div class="logo-name">Janak Panthi</div><div class="logo-sub">Official Correspondence</div></div>
      <div class="status-pill">Reply</div>
    </div>
    <div class="divider-bar"></div>
    <div class="email-body">
      <div class="greeting">Hello \${data.name},</div>
      <div class="headline">\${data.subject}</div>
      <div class="message-section">
        <div class="message-box">
          \${data.message}
        </div>
      </div>
      <div class="sign-off">Best regards,<strong>Janak Panthi</strong></div>
    </div>
    <div class="email-footer"><div class="footer-left">Portfolio Admin</div></div>
  </div>
</body>
</html>`
    },
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .in('key', templateDefinitions.map(d => d.key));
      
      if (error) throw error;

      // Ensure all templates exist in state, even if not in DB
      const existingTemplates = data || [];
      const allTemplates = templateDefinitions.map(def => {
        const existing = existingTemplates.find(t => t.key === def.key);
        return existing || { key: def.key, value: def.default, isNew: true };
      });

      setTemplates(allTemplates);
      if (allTemplates.length > 0 && !activeTemplate) {
        setActiveTemplate(allTemplates[0].key);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to fetch templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) throw error;
      showNotification('Template saved successfully');
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (key: string) => {
    const def = templateDefinitions.find(d => d.key === key);
    if (def) {
      const newTemplates = templates.map(t => 
        t.key === key ? { ...t, value: def.default } : t
      );
      setTemplates(newTemplates);
      showNotification('Template reset to default (save to persist)');
    }
    setResettingKey(null);
  };

  const currentTemplate = templates.find(t => t.key === activeTemplate);
  const currentDef = templateDefinitions.find(d => d.key === activeTemplate);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar for templates */}
        <div className="w-full lg:w-64 shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
          {templateDefinitions.map((def) => (
            <button
              key={def.key}
              onClick={() => setActiveTemplate(def.key)}
              className={cn(
                "text-left px-4 py-3 rounded-xl transition-all border text-xs sm:text-sm font-medium",
                activeTemplate === def.key 
                  ? "bg-accent border-accent text-page shadow-lg shadow-accent/10" 
                  : "bg-alt border-muted text-secondary/60 hover:border-accent/30 hover:text-secondary"
              )}
            >
              {def.label}
            </button>
          ))}
        </div>

        {/* Editor area */}
        <div className="flex-1 w-full">
          {currentTemplate && currentDef && (
            <motion.div
              key={currentTemplate.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-alt rounded-2xl border border-muted overflow-hidden flex flex-col"
            >
              {/* Editor Header */}
              <div className="p-4 md:p-6 border-b border-muted bg-page/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold">{currentDef.label}</h3>
                  <p className="text-xs text-secondary/50">{currentDef.description}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* View Mode Toggle */}
                  <div className="flex bg-page border border-muted p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('preview')}
                      className={cn(
                        "p-1.5 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                        viewMode === 'preview' ? "bg-accent text-page shadow-sm" : "text-secondary/40 hover:text-secondary"
                      )}
                    >
                      <Eye size={14} />
                      <span className="hidden lg:inline">Preview</span>
                    </button>
                    <button
                      onClick={() => setViewMode('code')}
                      className={cn(
                        "p-1.5 rounded-md transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider",
                        viewMode === 'code' ? "bg-accent text-page shadow-sm" : "text-secondary/40 hover:text-secondary"
                      )}
                    >
                      <Code size={14} />
                      <span className="hidden lg:inline">Code</span>
                    </button>
                  </div>

                  <div className="flex gap-2 ml-auto sm:ml-0">
                    {resettingKey === currentTemplate.key ? (
                      <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <button 
                          onClick={() => handleReset(currentTemplate.key)}
                          className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors"
                        >
                          CONFIRM RESET
                        </button>
                        <button 
                          onClick={() => setResettingKey(null)}
                          className="bg-muted text-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-muted/80 transition-colors"
                        >
                          CANCEL
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResettingKey(currentTemplate.key)}
                        className="bg-page border border-muted text-secondary/60 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:border-red-500/50 hover:text-red-500 transition-all"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => handleSave(currentTemplate.key, currentTemplate.value)}
                      disabled={saving}
                      className="bg-accent text-page px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 text-[10px] uppercase tracking-wider"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="p-0">
                {viewMode === 'code' ? (
                  <AutoExpandingTextarea
                    value={currentTemplate.value || ''}
                    onChange={(e: any) => {
                      const newTemplates = templates.map(t => 
                        t.key === currentTemplate.key ? { ...t, value: e.target.value } : t
                      );
                      setTemplates(newTemplates);
                    }}
                    className="w-full min-h-[300px] bg-page/50 p-6 font-mono text-sm outline-none transition-colors"
                    placeholder="Paste your HTML template here..."
                  />
                ) : (
                  <div className="w-full bg-white rounded-xl overflow-hidden border border-muted">
                    <IframeAutoHeight
                      srcDoc={currentTemplate.value || ''}
                    />
                  </div>
                )}
              </div>

              {/* Variables Footer */}
              <div className="p-4 bg-page/20 border-t border-muted">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-secondary/40 shrink-0">Variables:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTemplate.key === 'email_template_message' && ['${data.name}', '${data.email}', '${data.subject}', '${data.message}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                    {currentTemplate.key === 'email_template_cv_request' && ['${data.name}', '${data.company}', '${data.email}', '${data.reason}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                    {currentTemplate.key === 'email_template_cv_approval' && ['${data.name}', '${data.password}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                    {currentTemplate.key === 'email_template_contact_exchange' && ['${data.name}', '${data.phone}', '${data.email}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                    {currentTemplate.key === 'email_template_send_vcf' && ['${data.userName}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                    {currentTemplate.key === 'email_template_admin_reply' && ['${data.name}', '${data.subject}', '${data.message}'].map(v => (
                      <code key={v} className="px-1.5 py-0.5 bg-page border border-muted rounded text-[10px] text-accent font-mono">{v}</code>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessagesViewer = ({ onRefresh, showNotification }: { onRefresh: () => void, showNotification: any }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setMessages(data);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to fetch messages: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('messages').delete().eq('id', id);
      if (error) throw error;
      setMessages(messages.filter(m => m.id !== id));
      onRefresh();
      showNotification('Message deleted successfully');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to delete message: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Save to database
      const { error } = await supabase.from('messages').insert([formData]);
      if (error) throw error;

      // 2. Send email notification via server
      const response = await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin_reply',
          data: {
            name: formData.name,
            email: formData.email,
            subject: formData.subject,
            message: formData.message
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email. Please check server configuration.');
      }

      showNotification('Message sent successfully!');
      setFormData({ name: '', email: '', subject: '', message: '' });
      setShowCreateForm(false);
      fetchMessages();
    } catch (err: any) {
      showNotification('Error: ' + err.message, 'error');
    }
  };

  const handleReply = (m: any) => {
    setReplyTo(m);
    setFormData({
      name: 'Admin',
      email: m.email,
      subject: `Re: ${m.subject}`,
      message: ''
    });
    setShowCreateForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative">
      {/* Theme Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10 overflow-hidden">
        <img 
          src="https://i.pinimg.com/736x/14/97/b9/1497b95a9028dd6e2049363e746d68ef.jpg" 
          alt="Theme Background" 
          className="w-full h-full object-cover blur-3xl scale-110"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-accent to-accent/50 bg-clip-text text-transparent">
              INBOX
            </h2>
            <p className="text-secondary/60 text-sm mt-1 font-mono uppercase tracking-widest">
              {messages.length} Total Communications
            </p>
          </div>
          <button 
            onClick={fetchMessages}
            disabled={refreshing}
            className="p-3 bg-alt border border-muted rounded-xl transition-all text-accent hover:bg-accent hover:text-page shadow-sm hover:scale-110 active:scale-95 disabled:opacity-50 group"
            title="Refresh Transmissions"
          >
            <RefreshCw size={20} className={cn(refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500')} />
          </button>
        </div>
        <button 
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setReplyTo(null);
            if (!showCreateForm) {
              setFormData({ name: '', email: '', subject: '', message: '' });
            }
          }}
          className="w-full sm:w-auto bg-accent text-page px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
        >
          {showCreateForm ? <X size={18} /> : <Plus size={18} className="group-hover:rotate-90 transition-transform" />}
          {showCreateForm ? 'ABORT' : 'COMPOSE'}
        </button>
      </div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-20"
          >
            <div className="bg-alt/40 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] border border-accent/20 shadow-2xl mb-12 relative overflow-hidden group">
              {/* Form Background Image */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                <img 
                  src="https://wallpapercave.com/wp/wp5151124.jpg" 
                  alt="Form Theme" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="relative z-10 flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-accent text-page flex items-center justify-center shadow-lg shadow-accent/30">
                  {replyTo ? <Send size={28} /> : <Plus size={28} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{replyTo ? `REPLYING TO ${replyTo.name.toUpperCase()}` : 'NEW TRANSMISSION'}</h3>
                  {replyTo && <p className="text-xs text-accent font-mono uppercase tracking-widest mt-1">Ref: {replyTo.subject}</p>}
                </div>
              </div>

              <form onSubmit={handleCreateMessage} className="relative z-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent/70 ml-1">Recipient Identity</label>
                    <input
                      type="text"
                      placeholder="NAME"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-page/50 backdrop-blur-md border border-muted/50 rounded-2xl px-6 py-4 focus:border-accent outline-none transition-all text-sm placeholder:text-secondary/20 font-medium"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent/70 ml-1">Digital Address</label>
                    <input
                      type="email"
                      placeholder="EMAIL"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-page/50 backdrop-blur-md border border-muted/50 rounded-2xl px-6 py-4 focus:border-accent outline-none transition-all text-sm placeholder:text-secondary/20 font-medium"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent/70 ml-1">Subject Line</label>
                  <input
                    type="text"
                    placeholder="TOPIC"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full bg-page/50 backdrop-blur-md border border-muted/50 rounded-2xl px-6 py-4 focus:border-accent outline-none transition-all text-sm placeholder:text-secondary/20 font-medium"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent/70 ml-1">Message Payload</label>
                  <AutoExpandingTextarea
                    placeholder="CONTENT..."
                    value={formData.message}
                    onChange={(e: any) => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-page/50 backdrop-blur-md border border-muted/50 rounded-2xl px-6 py-5 focus:border-accent outline-none transition-all text-sm min-h-[250px] placeholder:text-secondary/20 leading-relaxed font-medium"
                    required
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-accent text-page px-12 py-5 rounded-2xl font-black hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-accent/40 uppercase tracking-widest"
                  >
                    <Send size={22} />
                    {replyTo ? 'Reply' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-8 relative z-10">
        {messages.length === 0 ? (
          <div className="bg-alt/20 backdrop-blur-sm border border-dashed border-muted rounded-[3rem] py-32 text-center">
            <MessageSquare size={60} className="mx-auto text-accent/10 mb-6 animate-pulse" />
            <p className="text-secondary/30 font-mono uppercase tracking-widest">No Active Transmissions</p>
          </div>
        ) : (
          messages.map((m) => (
            <div 
              key={m.id} 
              className={`group relative bg-alt/30 backdrop-blur-md p-6 sm:p-8 rounded-3xl border transition-all duration-300 ${m.is_read ? 'border-muted/20 opacity-80' : 'border-accent/40 shadow-lg shadow-accent/5'}`}
            >
              {/* Status Indicator Bar */}
              {!m.is_read && (
                <div className="absolute left-0 top-8 bottom-8 w-1 bg-accent rounded-r-full shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" />
              )}
              
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
                <div className="flex-1 space-y-5">
                  {/* Header Info */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-wider">
                    <div className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-md border border-accent/20">
                      <UserIcon size={12} />
                      <span className="font-bold">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary/60 hover:text-accent transition-colors">
                      <Mail size={12} />
                      <a href={`mailto:${m.email}`} className="underline underline-offset-4 decoration-muted/30">{m.email}</a>
                    </div>
                    {!m.is_read && (
                      <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[9px] font-black tracking-widest border border-red-500/20">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                        PRIORITY
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-secondary/40 ml-auto">
                      <Clock size={12} />
                      <span>{new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {!m.is_read && (
                        <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                      )}
                      <h4 className="text-xl font-bold tracking-tight text-primary group-hover:text-accent transition-colors">
                        {m.subject}
                      </h4>
                    </div>
                    <div className="bg-page/20 rounded-2xl p-5 sm:p-6 border border-muted/10 group-hover:border-accent/10 transition-colors">
                      <p className="text-secondary/90 leading-relaxed whitespace-pre-wrap text-sm sm:text-base font-medium">
                        {m.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 shrink-0">
                  <div className="flex lg:flex-col gap-2 w-full lg:w-auto">
                    <button 
                      onClick={() => handleReply(m)}
                      className="flex-1 lg:flex-none bg-accent text-page p-3 rounded-xl transition-all hover:bg-accent/90 shadow-md flex items-center justify-center"
                      title="Reply"
                    >
                      <Send size={18} />
                    </button>
                    {!m.is_read && (
                      <button 
                        onClick={() => handleMarkAsRead(m.id)}
                        className="flex-1 lg:flex-none bg-green-600/20 text-green-500 border border-green-500/30 p-3 rounded-xl transition-all hover:bg-green-600/30 flex items-center justify-center"
                        title="Mark as read"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    
                    {deletingId === m.id ? (
                      <div className="flex lg:flex-col gap-2 animate-in fade-in zoom-in duration-200 flex-1 lg:flex-none">
                        <button 
                          onClick={() => handleDelete(m.id)}
                          disabled={isDeleting}
                          className="flex-1 bg-red-600 text-white p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors"
                        >
                          {isDeleting ? '...' : 'OK'}
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="flex-1 bg-muted/50 text-secondary p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-muted transition-colors"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(m.id)}
                        className="flex-1 lg:flex-none bg-red-600/10 text-red-500 border border-red-500/20 p-3 rounded-xl transition-all hover:bg-red-600/20 flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
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

const DevLogManager = ({ showNotification }: any) => {
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
      console.error(`Error fetching dev_logs:`, err.message);
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
      showNotification('Dev logs updated successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      title: 'New Dev Log',
      excerpt: 'Short summary...',
      content: 'Full content here...',
      image_url: '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      read_time: '5 min read',
      slug: `new-log-${Date.now()}`,
      is_featured: false
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
        <h2 className="text-3xl font-bold">Dev Logs</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            Add New Log
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
                    value={item.title || ''}
                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Slug</label>
                  <input 
                    type="text"
                    value={item.slug || ''}
                    onChange={(e) => handleFieldChange(item.id, 'slug', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Date</label>
                  <input 
                    type="text"
                    value={item.date || ''}
                    onChange={(e) => handleFieldChange(item.id, 'date', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Read Time</label>
                  <input 
                    type="text"
                    value={item.read_time || ''}
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
                  showNotification={showNotification}
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Excerpt</label>
                <AutoExpandingTextarea 
                  value={item.excerpt || ''}
                  onChange={(e: any) => handleFieldChange(item.id, 'excerpt', e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Full Content (Markdown)</label>
                <AutoExpandingTextarea 
                  value={item.content || ''}
                  onChange={(e: any) => handleFieldChange(item.id, 'content', e.target.value)}
                  className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors min-h-[200px] font-mono text-sm"
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

const GalleryManager = ({ showNotification }: any) => {
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
      showNotification('Gallery updated successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to save changes.', 'error');
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
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
                  showNotification={showNotification}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Title</label>
                  <input 
                    type="text"
                    value={item.title || ''}
                    onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                    className="w-full bg-page border border-muted rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-secondary/60 mb-2">Category</label>
                  <input 
                    type="text"
                    value={item.category || ''}
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
                    value={item.order_index || 0}
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

const ConnectWithMeEditor = ({ showNotification, onRefresh }: any) => {
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
        connect_banner: settings.connect_banner || '',
        show_phone_on_connect: settings.show_phone_on_connect || 'true',
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
      showNotification('Connect with Me details updated successfully!');
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to update details: ' + err.message, 'error');
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
    { key: 'connect_banner', label: 'Banner Image URL', type: 'url' },
    { key: 'connect_bio', label: 'Short Bio', type: 'textarea' },
    { key: 'show_phone_on_connect', label: 'Show Phone & Enable Call/Save Buttons', type: 'toggle' },
  ];

  return (
    <div className="space-y-12">
      <div className="bg-alt border border-muted rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold mb-6">Connect with Me Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.key} className={cn("space-y-2", field.type === 'textarea' && "md:col-span-2", field.type === 'toggle' && "md:col-span-2")}>
              <label className="text-xs font-mono uppercase tracking-wider text-secondary/60">{field.label}</label>
              {field.type === 'textarea' ? (
                <AutoExpandingTextarea
                  value={localSettings[field.key] || ''}
                  onChange={(e: any) => setLocalSettings({ ...localSettings, [field.key]: e.target.value })}
                  className="w-full bg-page border border-muted rounded-xl p-3 text-sm focus:border-accent outline-none transition-colors min-h-[120px]"
                />
              ) : field.key === 'connect_image' || field.key === 'connect_banner' ? (
                <ImageUpload 
                  value={localSettings[field.key] || ''} 
                  onChange={(val) => setLocalSettings({ ...localSettings, [field.key]: val })} 
                  showNotification={showNotification}
                />
              ) : field.type === 'toggle' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, [field.key]: localSettings[field.key] === 'true' ? 'false' : 'true' })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      localSettings[field.key] === 'true' ? "bg-accent" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-page transition-all",
                      localSettings[field.key] === 'true' ? "left-7" : "left-1"
                    )} />
                  </button>
                  <span className="text-sm text-secondary">
                    {localSettings[field.key] === 'true' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
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
        <div className="mt-8 flex justify-end w-full sm:w-auto">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </button>
          )}
        </div>
      </div>

      <section className="pt-12 border-t border-muted">
        <SocialLinksEditor category="connect" showNotification={showNotification} />
      </section>

      <section className="pt-12 border-t border-muted">
        <ContactExchangesViewer 
          showNotification={showNotification} 
          adminPhone={localSettings.connect_phone}
          adminEmail={localSettings.connect_email}
          onRefresh={onRefresh}
        />
      </section>
    </div>
  );
};

const ContactExchangesViewer = ({ showNotification, adminPhone, adminEmail, onRefresh }: any) => {
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangingId, setExchangingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExchanges();
    markAllAsRead();
  }, []);

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('contact_exchanges')
      .update({ is_read: true })
      .eq('is_read', false);
    
    if (!error && onRefresh) {
      onRefresh();
    }
  };

  const fetchExchanges = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('contact_exchanges')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setExchanges(data);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      showNotification('Failed to fetch exchanges: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSendVCF = async (exchange: any) => {
    if (!exchange.email) {
      showNotification('User email is missing.', 'error');
      return;
    }
    
    setExchangingId(exchange.id);
    try {
      const response = await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'send_vcf',
          data: {
            userName: exchange.name,
            userEmail: exchange.email,
            adminPhone: adminPhone,
            adminEmail: adminEmail
          }
        })
      });
      
      if (!response.ok) throw new Error('Failed to send VCF');
      
      showNotification(`VCF sent to ${exchange.name}!`);
    } catch (err) {
      console.error('VCF Error:', err);
      showNotification('Failed to send VCF email.', 'error');
    } finally {
      setExchangingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contact_exchanges').delete().eq('id', id);
    if (!error) {
      setExchanges(exchanges.filter(e => e.id !== id));
      showNotification('Contact exchange deleted.');
    }
    setDeletingId(null);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Contact Exchanges</h3>
        <button 
          onClick={fetchExchanges} 
          disabled={refreshing}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-secondary/60 hover:text-accent disabled:opacity-50"
          title="Refresh Exchanges"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      
      {exchanges.length === 0 ? (
        <div className="bg-alt border border-muted border-dashed rounded-2xl p-12 text-center">
          <p className="text-secondary text-sm">No contact exchanges yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exchanges.map((exchange) => (
            <div key={exchange.id} className={cn(
              "bg-alt border rounded-2xl p-5 flex justify-between items-start group transition-all",
              exchange.is_read === false ? "border-accent/30 bg-accent/5" : "border-muted"
            )}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-primary">{exchange.name}</p>
                  {exchange.is_read === false && (
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm text-accent font-mono">{exchange.phone}</p>
                  {exchange.email && <p className="text-xs text-secondary font-mono">{exchange.email}</p>}
                  {exchange.note && (
                    <div className="mt-2 p-2 bg-page/50 rounded-lg border border-muted/50">
                      <p className="text-[11px] text-secondary leading-relaxed italic">"{exchange.note}"</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-secondary/50 uppercase tracking-wider pt-1">
                  {new Date(exchange.created_at).toLocaleDateString()} {new Date(exchange.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSendVCF(exchange)}
                  disabled={exchangingId === exchange.id}
                  title="Send my VCF to this person"
                  className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {exchangingId === exchange.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
                
                {deletingId === exchange.id ? (
                  <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <button 
                      onClick={() => handleDelete(exchange.id)}
                      className="bg-red-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-600 transition-colors"
                    >
                      OK
                    </button>
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="bg-muted text-secondary px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-muted/80 transition-colors"
                    >
                      NO
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setDeletingId(exchange.id)}
                    className="p-2 text-secondary/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Exchange"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SocialLinksEditor = ({ category = 'main', showNotification }: { category?: string, showNotification: any }) => {
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
      showNotification('Social links updated successfully!');
    } catch (err) {
      console.error(err);
      showNotification('Failed to save changes.', 'error');
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
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {hasChanges && (
            <button 
              onClick={handleSaveAll}
              disabled={saving}
              className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save All Changes
            </button>
          )}
          <button 
            onClick={handleAdd}
            className="w-full sm:w-auto bg-accent text-page px-5 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg shadow-accent/20 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
            Add New Link
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
                    value={link.platform || ''}
                    onChange={(e) => handleFieldChange(link.id, 'platform', e.target.value)}
                    className="w-full bg-page border border-muted rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-secondary/60 mb-1">URL</label>
                <input 
                  type="text"
                  value={link.url || ''}
                  onChange={(e) => handleFieldChange(link.id, 'url', e.target.value)}
                  className="w-full bg-page border border-muted rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-secondary/60 mb-1">Icon</label>
                <select 
                  value={link.icon_name || ''}
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
