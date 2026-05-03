import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Copy, Check, StickyNote, Download, Trash, 
  Loader2, Save, Lock, Unlock, Shield, Key, Eye, EyeOff, X,
  ArrowUpNarrowWide, ArrowDownWideNarrow
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NoteCell {
  id: string;
  content: string;
  isLocked: boolean;
  createdAt: number;
}

const Notepad = ({ showNotification }: { showNotification?: (msg: string, type?: 'success' | 'error' | 'info') => void }) => {
  const [cells, setCells] = useState<NoteCell[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [showPasswordModal, setShowPasswordModal] = useState<{ id: string; type: 'set' | 'unlock' } | null>(null);
  const [modalPassword, setModalPassword] = useState('');
  const [modalError, setModalError] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Only unlocked notes or notes the user has session for are fetched by public RLS
      const { data, error } = await supabase
        .from('notes')
        .select('id, content, is_locked, created_at, order_index')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: sortOrder === 'asc' });
      
      if (error) throw error;
      
      if (data) {
        setCells(data.map(n => ({
          id: n.id,
          content: n.content,
          isLocked: n.is_locked,
          createdAt: new Date(n.created_at).getTime()
        })));
      }
    } catch (err: any) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCell = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{ content: '', is_locked: false }])
        .select();
      
      if (error) throw error;
      if (data) {
        fetchNotes();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const updateCell = async (id: string, content: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, content } : c));
  };

  const handleBlur = async (id: string, content: string) => {
    // Only update if not locked or is unlocked
    const cell = cells.find(c => c.id === id);
    if (cell?.isLocked && !unlockedIds.has(id)) return;

    try {
      await supabase.from('notes').update({ content }).eq('id', id);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const deleteCell = async (id: string) => {
    // Only delete if not locked or is unlocked
    const cell = cells.find(c => c.id === id);
    if (cell?.isLocked && !unlockedIds.has(id)) return;

    try {
      await supabase.from('notes').delete().eq('id', id);
      setCells(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearAll = () => {
    // Not implemented for DB version for safety, or implement with cautions
    showNotification?.('Global clear is disabled for security.', 'info');
  };

  const downloadNotes = () => {
    const text = cells.map((c, i) => `Note ${i + 1}:\n${c.content}\n${'-'.repeat(20)}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes-export.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUnlock = async (id: string, password: string) => {
    try {
      const response = await fetch('/api/v1/auth/verify-notepad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setUnlockedIds(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        // Update the cell content with the one returned from server
        setCells(prev => prev.map(c => c.id === id ? { ...c, content: result.content } : c));
        setModalError(false);
        setShowPasswordModal(null);
        setModalPassword('');
      } else {
        setModalError(true);
      }
    } catch (err) {
      console.error('Error verifying notepad password:', err);
      setModalError(true);
    }
  };

  const lockCell = (id: string) => {
    setUnlockedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pt-24 pb-20 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg">
                <StickyNote className="text-page w-5 h-5" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Productivity Tool</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tight">Notepad<span className="text-accent">.</span></h1>
            <p className="text-secondary/60 max-w-md text-sm leading-relaxed">
              A minimalist, high-performance scratchpad for your daily thoughts and code snippets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="flex-1 sm:flex-none p-3 md:p-3.5 rounded-xl bg-card border border-muted text-secondary hover:text-accent hover:border-accent transition-all group flex items-center justify-center gap-2 min-w-[100px]"
                title={sortOrder === 'asc' ? "Sort Newest First" : "Sort Oldest First"}
              >
                {sortOrder === 'asc' ? (
                  <ArrowUpNarrowWide size={18} className="md:w-5 md:h-5 group-hover:-translate-y-0.5 transition-transform" />
                ) : (
                  <ArrowDownWideNarrow size={18} className="md:w-5 md:h-5 group-hover:translate-y-0.5 transition-transform" />
                )}
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                  {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </span>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadNotes();
                }}
                className="p-3 md:p-3.5 rounded-xl bg-card border border-muted text-secondary hover:text-accent hover:border-accent transition-all group flex items-center justify-center"
                title="Download Notes"
              >
                <Download size={18} className="md:w-5 md:h-5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="p-3 md:p-3.5 rounded-xl bg-card border border-muted text-secondary hover:text-red-500 hover:border-red-500 transition-all group flex items-center justify-center"
                title="Clear All"
              >
                <Trash size={18} className="md:w-5 md:h-5 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addCell();
              }}
              className="flex-1 md:flex-none w-full md:w-auto bg-primary text-page px-5 md:px-8 py-3 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 whitespace-nowrap text-sm md:text-base"
            >
              <Plus size={18} className="md:w-5 md:h-5" />
              <span>New Block</span>
            </button>
          </div>
        </div>

        {/* Notepad Interface */}
        <div className="grid gap-6">
          <AnimatePresence initial={false}>
            {[...cells]
              .sort((a, b) => sortOrder === 'asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
              .map((cell, visibleIndex) => {
                const originalIndex = cells.findIndex(c => c.id === cell.id);
                const isLocked = cell.isLocked && !unlockedIds.has(cell.id);
              
              return (
                <motion.div
                  key={cell.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: visibleIndex * 0.05 }}
                  className={cn(
                    "group relative bg-card border border-muted rounded-2xl overflow-hidden hover:border-accent/30 transition-all duration-300",
                    isLocked && "bg-alt/10"
                  )}
                >
                  <div className="flex min-h-[160px]">
                    {/* Left Gutter */}
                    <div className="w-12 md:w-16 bg-muted/30 border-r border-muted flex flex-col items-center py-6 gap-4">
                      <span className="font-mono text-[10px] text-secondary/30 font-bold">
                        {String(originalIndex + 1).padStart(2, '0')}
                      </span>
                      <div className="w-px h-full bg-muted/50" />
                      {cell.isLocked && (
                        <Lock size={12} className="text-accent/40" />
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 md:p-8 relative">
                      {isLocked ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 space-y-6 animate-in fade-in zoom-in duration-300">
                          <div className="w-16 h-16 bg-accent/5 rounded-full flex items-center justify-center">
                            <Shield className="w-8 h-8 text-accent/20" />
                          </div>
                          <div className="text-center space-y-2">
                            <h3 className="font-headline font-bold text-xl">Protected Block</h3>
                            <p className="text-secondary/40 text-xs font-mono uppercase tracking-widest">Authentication Required</p>
                          </div>
                          <button 
                            onClick={() => {
                              setShowPasswordModal({ id: cell.id, type: 'unlock' });
                              setModalError(false);
                              setModalPassword('');
                            }}
                            className="bg-primary/5 hover:bg-primary/10 text-primary px-8 py-3 rounded-xl font-bold text-sm transition-all border border-primary/10 flex items-center gap-2 group"
                          >
                            <Key size={16} className="group-hover:rotate-12 transition-transform" />
                            Unlock Content
                          </button>
                        </div>
                      ) : (
                        <>
                          <textarea
                            value={cell.content}
                            onChange={(e) => updateCell(cell.id, e.target.value)}
                            onBlur={() => handleBlur(cell.id, cell.content)}
                            placeholder="Enter your thoughts or paste code here..."
                            className="w-full h-full bg-transparent border-none outline-none resize-none font-body text-lg text-primary placeholder:text-secondary/20 leading-relaxed"
                            spellCheck={false}
                          />
                          
                          {/* Actions */}
                          <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-1.5 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-2 md:group-hover:translate-x-0">
                            {cell.isLocked && !unlockedIds.has(cell.id) ? null : cell.isLocked && (
                              <button
                                onClick={() => lockCell(cell.id)}
                                className="p-2 md:p-2.5 rounded-lg bg-page border border-muted text-secondary/40 hover:text-accent hover:border-accent transition-all"
                                title="Lock Block"
                              >
                                <Lock size={16} className="md:w-[18px] md:h-[18px]" />
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(cell.content, cell.id)}
                              className={cn(
                                "p-2 md:p-2.5 rounded-lg transition-all border",
                                copiedId === cell.id 
                                  ? "bg-green-500/10 border-green-500/30 text-green-500" 
                                  : "bg-page border-muted text-secondary/40 hover:text-accent hover:border-accent"
                              )}
                              title="Copy Content"
                            >
                              {copiedId === cell.id ? <Check size={16} className="md:w-[18px] md:h-[18px]" /> : <Copy size={16} className="md:w-[18px] md:h-[18px]" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCell(cell.id);
                              }}
                              className="p-2 md:p-2.5 rounded-lg bg-page border border-muted text-secondary/40 hover:text-red-500 hover:border-red-500 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20"
                              title="Delete Block"
                            >
                              <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowPasswordModal(null)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-page w-full max-w-sm p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl border border-muted"
              >
                <button 
                  onClick={() => setShowPasswordModal(null)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 text-secondary/40 hover:text-primary transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="space-y-5 md:space-y-6">
                  <div className="space-y-1.5 md:space-y-2">
                    <h3 className="text-xl md:text-2xl font-bold font-headline">
                      Unlock Block
                    </h3>
                    <p className="text-secondary/60 text-xs md:text-sm">
                      Enter the password to view the content of this block.
                    </p>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <div className="relative">
                      <input 
                        type={showModalPassword ? "text" : "password"}
                        value={modalPassword}
                        onChange={(e) => {
                          setModalPassword(e.target.value);
                          setModalError(false);
                        }}
                        placeholder="Enter password..."
                        autoFocus
                        className={cn(
                          "w-full bg-card border-2 px-4 py-3 md:py-4 rounded-xl md:rounded-2xl focus:ring-0 transition-all placeholder:text-secondary/20 font-body text-sm md:text-base",
                          modalError ? "border-red-500 bg-red-50/5" : "border-muted focus:border-accent"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUnlock(showPasswordModal.id, modalPassword);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(!showModalPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-accent transition-colors"
                      >
                        {showModalPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {modalError && (
                      <p className="text-red-500 text-[10px] uppercase tracking-widest font-mono font-bold animate-in fade-in slide-in-from-top-1">
                        Incorrect password. Please try again.
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      handleUnlock(showPasswordModal.id, modalPassword);
                    }}
                    className="w-full bg-primary text-page py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 text-sm md:text-base"
                  >
                    Unlock Now
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Status Indicator */}
        <div className="mt-12 flex items-center justify-between border-t border-muted pt-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", saving ? "bg-accent animate-pulse" : "bg-green-500")} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-secondary/40">
                {saving ? 'Syncing with Supabase...' : 'All changes saved'}
              </span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-secondary/20 uppercase tracking-[0.3em]">
            System Online
          </div>
        </div>
      </div>

      {/* Saving Toast (Mobile) */}
      <AnimatePresence>
        {saving && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 md:hidden bg-primary text-page px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50"
          >
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Syncing</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Notepad;
