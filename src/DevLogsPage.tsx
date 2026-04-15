import React from 'react';
import { motion } from 'motion/react';
import { Calendar, ArrowRight, Search, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDevLogs } from './hooks/useContent';
import { tracking } from './lib/tracking';
import SEO from './components/SEO';

const DevLogsPage = () => {
  const { posts, loading } = useDevLogs();
  
  React.useEffect(() => {
    tracking.trackPageView();
  }, []);

  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pt-32 pb-20 px-6">
      <SEO 
        title="Dev Logs"
        description="Exploring technologies, sharing experiences, and documenting the journey of building digital products."
        url={window.location.href}
      />
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-secondary hover:text-accent transition-colors mb-4 font-mono text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-bold tracking-tighter"
            >
              Dev <span className="text-primary">Logs</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-secondary text-lg max-w-xl"
            >
              Exploring technologies, sharing experiences, and documenting the journey of building digital products.
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative w-full md:w-80"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40" size={20} />
            <input 
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-alt border border-muted rounded-2xl pl-12 pr-4 py-4 outline-none focus:border-primary transition-colors"
            />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-alt border border-muted rounded-3xl overflow-hidden hover:border-primary transition-colors flex flex-col"
            >
              <Link to={`/devlogs/${post.slug}`} className="relative h-64 overflow-hidden">
                <img 
                  src={post.image_url} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-alt/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex items-center flex-nowrap gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-secondary/60 mb-4 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {post.date}
                  </span>
                  <span>•</span>
                  <span>{post.read_time}</span>
                </div>

                <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                  <Link to={`/devlogs/${post.slug}`}>{post.title}</Link>
                </h3>
                
                <p className="text-secondary leading-relaxed mb-8 line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="mt-auto">
                  <Link 
                    to={`/devlogs/${post.slug}`}
                    className="inline-flex items-center gap-2 text-primary font-bold group/btn"
                  >
                    Read More
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-secondary text-lg italic">No articles found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevLogsPage;
