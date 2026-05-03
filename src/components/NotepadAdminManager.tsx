import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Trash2, Lock, Unlock, Save, Loader2, Key 
} from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Reuse the AutoExpandingTextarea if possible, or define it here
const AutoExpandingTextarea = ({ value, onChange, onBlur, className, placeholder }: any) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onBlur={onBlur}
      className={className}
      rows={1}
    />
  );
};

export const NotepadAdminManager = ({ showNotification }: any) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setNotes(data);
    setLoading(false);
  };

  const handleUpdateNote = async (id: string, updates: any) => {
    setSavingId(id);
    try {
      const { error } = await supabase.from('notes').update(updates).eq('id', id);
      if (error) throw error;
      setNotes(notes.map(n => n.id === id ? { ...n, ...updates } : n));
      showNotification('Note updated successfully!');
    } catch (err: any) {
      showNotification('Failed to update note: ' + err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSetPassword = async (id: string, password: string) => {
    setSavingId(id);
    try {
      const response = await fetch(`/api/v1/admin/notes/${id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!response.ok) throw new Error('Failed to update password');
      
      setNotes(notes.map(n => n.id === id ? { ...n, is_locked: !!password } : n));
      showNotification(password ? 'Password set and note locked!' : 'Password cleared and note unlocked!');
    } catch (err: any) {
      showNotification('Failed to set password: ' + err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
      setNotes(notes.filter(n => n.id !== id));
      showNotification('Note deleted!');
    } catch (err: any) {
      showNotification('Failed to delete note', 'error');
    }
  };

  const handleAddNote = async () => {
    try {
      const { data, error } = await supabase.from('notes').insert([{ content: 'New Note', is_locked: false }]).select();
      if (error) throw error;
      if (data) setNotes([data[0], ...notes]);
      showNotification('New note added!');
    } catch (err: any) {
      showNotification('Failed to add note', 'error');
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-accent" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Notepad Manager</h2>
        <button onClick={handleAddNote} className="bg-accent text-page px-4 py-2 rounded-xl font-bold flex items-center gap-2">
          <Plus size={18} />
          Add Note
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {notes.map(note => (
          <div key={note.id} className="bg-alt border border-muted rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", note.is_locked ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500")}>
                  {note.is_locked ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <div>
                  <h3 className="font-bold">{note.is_locked ? 'Locked Note' : 'Public Note'}</h3>
                  <p className="text-[10px] text-secondary font-mono tracking-widest uppercase">{new Date(note.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={() => handleDeleteNote(note.id)} className="text-secondary/40 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            <AutoExpandingTextarea 
              value={note.content}
              onChange={(e: any) => setNotes(notes.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
              onBlur={() => handleUpdateNote(note.id, { content: note.content })}
              className="w-full bg-page border border-muted rounded-xl p-4 text-sm resize-none outline-none focus:border-accent transition-colors"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 gap-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={note.is_locked} 
                    disabled={true} // Controlled by password existence
                    className="w-4 h-4 rounded border-muted text-accent focus:ring-accent disabled:opacity-50"
                  />
                  <span className="text-sm font-medium">Locked</span>
                </label>

                <div className="flex items-center gap-2">
                  <Key size={14} className="text-secondary/60" />
                  <input 
                    type="password"
                    placeholder="Set Password"
                    onBlur={(e) => {
                      if (e.target.value !== '') {
                        handleSetPassword(note.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="bg-page border border-muted rounded-lg px-3 py-1 text-xs w-32 focus:border-accent outline-none"
                  />
                  {note.is_locked && (
                    <button 
                      onClick={() => handleSetPassword(note.id, '')}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {savingId === note.id && <Loader2 size={16} className="animate-spin text-accent" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
