import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import ReactMarkdown from 'react-markdown';
import { tracking } from './lib/tracking';
import SEO from './components/SEO';
import { NewsletterForm } from './components/NewsletterForm';

const ArticlePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopyNotification(true);
    setTimeout(() => setShowCopyNotification(false), 2000);
  };

  useEffect(() => {
    tracking.trackPageView();
  }, [slug]);

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (!error) {
        setArticle(data);
      }
      setLoading(false);
    }
    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-bold mb-4">Article Not Found</h1>
        <Link to="/" className="text-accent flex items-center gap-2 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl 2xl:max-w-5xl 3xl:max-w-6xl mx-auto px-8 py-24"
    >
      <SEO 
        title={article.title}
        description={article.excerpt}
        image={article.image_url}
        url={window.location.href}
        type="article"
      />

      {/* Copy Notification */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showCopyNotification ? 1 : 0, y: showCopyNotification ? 0 : -20 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="bg-accent text-page px-6 py-3 rounded-full shadow-2xl font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
          <Share2 className="w-3 h-3" />
          Link copied to clipboard!
        </div>
      </motion.div>

      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors mb-12 font-mono text-xs uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <header className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-mono uppercase tracking-widest rounded-full">
            Dev Log
          </span>
          <div className="flex items-center gap-2 text-secondary/60 text-[10px] font-mono uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            {article.date}
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-8">
          {article.title}
        </h1>
        <div className="flex items-center justify-between py-6 border-y border-muted">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
              <img 
                src="https://picsum.photos/seed/janak-avatar/100/100" 
                alt="Janak Panthi" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <p className="text-sm font-bold">Janak Panthi</p>
              <p className="text-xs text-secondary">Founder & Developer</p>
            </div>
          </div>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: article.title,
                  text: article.excerpt,
                  url: window.location.href,
                }).catch(console.error);
              } else {
                handleCopy();
              }
            }}
            className="p-2 hover:bg-muted rounded-full transition-colors text-secondary"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="aspect-video w-full rounded-2xl overflow-hidden mb-12 bg-muted">
        <img 
          src={article.image_url} 
          alt={article.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <article className="prose prose-lg dark:prose-invert max-w-none">
        <p className="text-xl text-secondary leading-relaxed mb-8 font-medium italic">
          {article.excerpt}
        </p>
        <div className="text-primary/80 leading-loose space-y-6 markdown-body">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
      </article>
      
      {/* Newsletter Section */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-24 p-12 bg-alt border border-muted rounded-[2.5rem] relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Stay <span className="text-primary italic">notified</span>.</h2>
            <p className="text-secondary text-lg">
              Enjoyed this post? Subscribe to get future dev logs and project updates delivered to your inbox.
            </p>
          </div>

          <NewsletterForm />

          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-secondary/40">
            No spam. Unsubscribe any time with one click.
          </p>
        </div>
      </motion.div>

    </motion.div>
  );
};

export default ArticlePage;
