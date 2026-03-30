import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center p-6 text-primary font-body">
          <div className="max-w-md w-full text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8 inline-block p-6 rounded-full bg-red-500/10 text-red-500"
            >
              <AlertTriangle size={64} strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-3xl font-bold font-headline mb-4">Something went wrong</h1>
            <p className="text-secondary mb-10 leading-relaxed">
              An unexpected error occurred. We've been notified and are working to fix it.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-page rounded-2xl font-headline font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
              >
                <RefreshCw size={18} />
                Reload Page
              </button>
              <Link
                to="/"
                onClick={() => this.setState({ hasError: false })}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-card border border-muted rounded-2xl font-headline font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Home size={18} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
