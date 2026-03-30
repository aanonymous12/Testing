import React from 'react';
import { motion } from 'motion/react';
import { Home, ArrowLeft, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6 text-primary font-body">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-block p-6 rounded-full bg-accent/10 text-accent"
        >
          <AlertCircle size={64} strokeWidth={1.5} />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold font-headline text-accent mb-4"
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold font-headline mb-4"
        >
          Page Not Found
        </motion.h2>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-secondary mb-10 leading-relaxed"
        >
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-card border border-muted rounded-2xl font-headline font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-page rounded-2xl font-headline font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16"
        >
          <div className="h-px w-full bg-muted/30 mb-8"></div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-secondary/40">
            &copy; {new Date().getFullYear()} Janak Panthi
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
