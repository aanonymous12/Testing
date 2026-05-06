import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

export const NewsletterForm = () => {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/v1/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      if (!response.ok) throw new Error(data.error || `Error ${response.status}: ${data.message || 'Failed to subscribe'}`);

      setStatus('success');
      setMessage(data.message || 'Check your inbox for confirmation!');
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  if (status === 'success') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl w-full"
      >
        <p className="text-green-500 font-bold">{message}</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full relative">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <input 
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
          className="flex-1 bg-page border border-muted rounded-2xl px-6 py-4 outline-none focus:border-primary transition-all disabled:opacity-50"
        />
        <button 
          type="submit"
          disabled={status === 'loading'}
          className="bg-primary text-alt px-8 py-4 rounded-2xl font-bold hover:bg-opacity-90 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' ? 'Subscribing...' : (
            <>Subscribe <ArrowRight size={18} /></>
          )}
        </button>
      </form>
      {status === 'error' && (
        <p className="absolute -bottom-8 left-0 right-0 text-red-500 text-xs font-mono text-center">{message}</p>
      )}
    </div>
  );
};
