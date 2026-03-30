import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Sun, Moon, Share2, Mail, Link as LinkIcon, 
  ArrowRight, Download, Box, Palette, CreditCard, 
  User, MapPin, Send, Github, Linkedin, Twitter, Instagram,
  Eye, EyeOff, Phone, ArrowLeft, Calendar, Settings, LogIn
} from 'lucide-react';
import GalleryPage from './GalleryPage';
import Connect_with_Me from './Connect_with_Me';
import ArticlePage from './ArticlePage';
import BlogPage from './BlogPage';
import Admin from './Admin';
import { PROJECTS_DATA, BLOG_DATA } from './data';
import { useContent, useSettings, useSocialLinks, useBlogPosts } from './hooks/useContent';
import * as LucideIcons from 'lucide-react';
import { supabase } from './lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ isDark, toggleDarkMode }: { isDark: boolean; toggleDarkMode: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const id = href.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (href.startsWith('/#')) {
      // If we are navigating to a hash on the home page from another page
      // The useEffect in App component will handle the scroll
    }
  };

  const navLinks = [
    { name: 'Home', href: isHomePage ? '#home' : '/' },
    { name: 'About', href: isHomePage ? '#about' : '/#about' },
    { name: 'Projects', href: isHomePage ? '#projects' : '/#projects' },
    { name: 'Skills', href: isHomePage ? '#skills' : '/#skills' },
    { name: 'Awards', href: isHomePage ? '#awards' : '/#awards' },
    { name: 'Teams', href: isHomePage ? '#teams' : '/#teams' },
    { name: 'Gallery', href: isHomePage ? '#gallery' : '/#gallery' },
    { name: 'Dev Logs', href: isHomePage ? '#devlogs' : '/#devlogs' },
    { name: 'Contact', href: isHomePage ? '#contact' : '/#contact' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[64px] flex items-center px-8",
      "bg-nav backdrop-blur-[20px] border-b border-muted",
      isScrolled ? "opacity-100" : "opacity-100"
    )}>
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold font-headline">
          Janak<span className="text-accent">.</span>
        </Link>
        
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((link) => (
            link.href.startsWith('/#') || (link.href === '/' && !isHomePage) ? (
              <Link
                key={link.name}
                to={link.href}
                className="text-[13px] font-normal tracking-[0.03em] text-secondary hover:text-accent transition-colors"
              >
                {link.name}
              </Link>
            ) : (
              <a 
                key={link.name}
                href={link.href}
                onClick={(e) => handleNav(e, link.href)}
                className="text-[13px] font-normal tracking-[0.03em] text-secondary hover:text-accent transition-colors"
              >
                {link.name}
              </a>
            )
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <motion.button
            onClick={toggleDarkMode}
            animate={{ rotate: isDark ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="p-2 text-accent"
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" strokeWidth={2} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={2} />}
          </motion.button>
          <button 
            className="md:hidden p-2 text-primary"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[64px] left-0 right-0 bg-page border-b border-muted p-8 md:hidden flex flex-col gap-6 max-h-[calc(100vh-64px)] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">MENU</span>
            </div>
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (
                link.href.startsWith('/#') || (link.href === '/' && !isHomePage) ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-2xl font-headline text-secondary hover:text-accent transition-colors"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a 
                    key={link.name}
                    href={link.href}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      handleNav(e, link.href);
                    }}
                    className="text-2xl font-headline text-secondary hover:text-accent transition-colors"
                  >
                    {link.name}
                  </a>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Typewriter = ({ roles }: { roles: string[] }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % roles.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [roles.length]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={roles[index]}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5 }}
        className="terracotta-italic typewriter-cursor"
      >
        {roles[index]}
      </motion.span>
    </AnimatePresence>
  );
};

const Hero = () => {
  const { settings, loading } = useSettings();
  const { socialLinks, loading: socialLoading } = useSocialLinks();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  if (loading || socialLoading) return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

  const headline = settings.hero_name || "I'm Janak Panthi";
  const words = headline.split(' ');

  return (
    <section id="home" className="min-h-[calc(100vh-64px)] flex flex-col justify-center items-center text-center relative overflow-hidden px-8">
      <div className="absolute inset-0 z-0 diagonal-lines opacity-[0.03] dark:opacity-[0.05]"></div>
      
      <div className="absolute left-8 top-12 z-20">
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-mono text-accent tracking-[0.1em] text-xs"
        >
          {settings.hero_greeting || greeting}
        </motion.p>
      </div>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-radial from-accent/10 to-transparent blur-3xl"></div>
        <img 
          src={settings.hero_image || "https://picsum.photos/seed/janak-hero/800/1200"} 
          alt="" 
          className="w-full h-full object-cover [mask-image:linear-gradient(to_left,black,transparent)] grayscale"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 max-w-[800px]">
        <h1 className="text-[clamp(52px,8vw,96px)] leading-[0.95] mb-6 mt-24 flex flex-wrap justify-center gap-x-4 normal-case">
          {words.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={cn(word.toLowerCase() === 'panthi' ? "terracotta-italic" : "text-primary")}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <div className="mb-10">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-xl font-body text-secondary/80"
          >
            {settings.hero_subtitle || "Entrepreneur and Aspiring Developer"}
          </motion.p>
        </div>
        
        <p className="text-secondary mb-12 max-w-lg mx-auto">
          {settings.hero_description || "Making a meaningful impact from Butwal to Texas, one build at a time."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-[14px] justify-center mb-12">
          <a href="#projects" className="bg-primary text-page px-[28px] py-[13px] rounded-full font-headline font-medium text-[13px] flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            View Projects →
          </a>
          <a 
            href="#about"
            className="border border-muted text-secondary px-[28px] py-[13px] rounded-full font-headline font-medium text-[13px] hover:bg-card transition-colors flex items-center justify-center"
          >
            Learn More
          </a>
        </div>

        <div className="flex gap-8 justify-center">
          {socialLinks
            .filter(link => link.category === 'main')
            .filter((link, index, self) => 
              index === self.findIndex((t) => t.platform === link.platform)
            )
            .map((link) => {
              const Icon = (LucideIcons as any)[link.icon_name] || LucideIcons.Globe;
              return (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                  <Icon className="w-5 h-5 text-secondary hover:text-accent cursor-pointer transition-colors" />
                </a>
              );
            })}
        </div>
      </div>
    </section>
  );
};

const PasswordModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: '', company: '', email: '', reason: '' });
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const { settings } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === settings.cv_password) {
      onSuccess();
      onClose();
      setPassword('');
      setError(false);
    } else {
      setError(true);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus('submitting');
    try {
      const { error } = await supabase.from('cv_requests').insert([requestForm]);
      if (error) throw error;
      setRequestStatus('success');
      setTimeout(() => {
        setIsRequesting(false);
        setRequestStatus('idle');
        setRequestForm({ name: '', company: '', email: '', reason: '' });
      }, 2000);
    } catch (err) {
      setRequestStatus('error');
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-page w-full max-w-md p-8 rounded-2xl shadow-2xl relative border border-muted"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-secondary hover:text-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isRequesting ? (
          <>
            <h3 className="text-2xl font-bold font-headline mb-4">Protected Document</h3>
            <p className="text-secondary text-sm mb-6">Please enter the password to download the CV.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  placeholder="Enter password"
                  autoFocus
                  className={cn(
                    "w-full bg-card border-2 pl-4 pr-12 py-4 rounded-xl focus:ring-0 transition-all placeholder:text-secondary/40 font-body",
                    error ? "border-red-500 bg-red-50/10" : "border-muted focus:border-accent"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-accent transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {error && <p className="text-red-500 text-[10px] uppercase tracking-wider mt-2 font-mono">Incorrect password</p>}
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit"
                  className="w-full bg-primary text-page py-4 rounded-full font-headline font-medium text-sm hover:scale-[1.02] transition-transform"
                >
                  Verify & Download
                </button>
                <button 
                  type="button"
                  onClick={() => setIsRequesting(true)}
                  className="text-xs text-accent font-mono uppercase tracking-widest hover:underline"
                >
                  Request Access Key
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold font-headline mb-4">Request Access</h3>
            <p className="text-secondary text-sm mb-6">Fill out the form below to request the CV access key.</p>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <input 
                type="text"
                required
                placeholder="Full Name"
                value={requestForm.name}
                onChange={(e) => setRequestForm({...requestForm, name: e.target.value})}
                className="w-full bg-card border border-muted px-4 py-3 rounded-xl focus:border-accent outline-none transition-colors"
              />
              <input 
                type="text"
                required
                placeholder="Company / Organization"
                value={requestForm.company}
                onChange={(e) => setRequestForm({...requestForm, company: e.target.value})}
                className="w-full bg-card border border-muted px-4 py-3 rounded-xl focus:border-accent outline-none transition-colors"
              />
              <input 
                type="email"
                required
                placeholder="Email Address"
                value={requestForm.email}
                onChange={(e) => setRequestForm({...requestForm, email: e.target.value})}
                className="w-full bg-card border border-muted px-4 py-3 rounded-xl focus:border-accent outline-none transition-colors"
              />
              <textarea 
                required
                placeholder="Reason for access"
                value={requestForm.reason}
                onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                className="w-full bg-card border border-muted px-4 py-3 rounded-xl focus:border-accent outline-none transition-colors min-h-[100px]"
              />

              <div className="flex flex-col gap-4 pt-2">
                <button 
                  type="submit"
                  disabled={requestStatus === 'submitting' || requestStatus === 'success'}
                  className="w-full bg-primary text-page py-4 rounded-full font-headline font-medium text-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {requestStatus === 'submitting' ? 'Sending...' : requestStatus === 'success' ? 'Request Sent!' : 'Submit Request'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsRequesting(false)}
                  className="text-xs text-secondary font-mono uppercase tracking-widest hover:underline"
                >
                  Back to Login
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

const About = () => {
  const { settings, loading } = useSettings();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = settings.cv_url || '#';
    link.target = '_blank';
    link.download = 'Janak_Panthi_CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return null;

  return (
    <section id="about" className="py-24 grid md:grid-cols-2 gap-20 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative group"
      >
        <div className="absolute -inset-4 bg-accent/5 rounded-xl blur-2xl group-hover:bg-accent/10 transition-all duration-500"></div>
        <div className="relative aspect-square rounded-xl overflow-hidden bg-card border border-muted">
          <img 
            src={settings.about_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAgd4MZoIJ7G0LGQdeRBbcOaYBiiyYRpSdCzSBKA1XGnt8a33ePAVQCRpTiVzi8cpgG_new8IT15uCDn75ZoP287dczzhKpjl61vx1aW4gjqhkVviLdYrnKrED8wvOA2xbS7W-zxochrL6ymanS79SsBalgqPQI4uaTee_VFc99564VHv2wbyXq8e2Vv_czD3KQmD_pbMgjiXUVNQ65JbCjqypxB65dmc5lPustvDhpwSIGzkIhfILwnQKNpxXshoAbtVD7m-VSErvV"} 
            alt="Janak Panthi"
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">About me</p>
        <h2 className="text-5xl font-bold mb-8">Who am I <span className="terracotta-italic">Lifestyle</span></h2>
        <p className="text-secondary leading-relaxed mb-10 text-lg">
          {settings.about_description || "I am a professional from Butwal, Nepal, currently pursuing a Bachelor’s Degree in Computer Science at Texas State University. I am dedicated to continuously expanding my technical expertise and staying current with the latest industry trends. Driven by optimism and determination, I work on improving my communication and design skills to overcome challenges. Through my entrepreneurial ventures and creative work, I strive to make a meaningful impact on my community and share positive energy with those around me."}
        </p>

        <button 
          onClick={() => setIsPasswordModalOpen(true)}
          className="bg-primary text-page px-[28px] py-[13px] rounded-full font-headline font-medium text-[13px] flex items-center gap-2 hover:scale-105 transition-transform"
        >
          Download CV <Download className="w-4 h-4" />
        </button>

        <AnimatePresence>
          {isPasswordModalOpen && (
            <PasswordModal 
              isOpen={isPasswordModalOpen} 
              onClose={() => setIsPasswordModalOpen(false)} 
              onSuccess={handleDownload}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
};

const ProjectCard = ({ project, onOpen }: any) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn(
        "p-8 group transition-all duration-300 relative overflow-hidden rounded-[18px] border border-muted flex flex-col h-full",
        project.type === 'featured' ? "bg-accent text-page" : "bg-card hover:bg-page"
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-0.5 -translate-x-full group-hover:translate-x-0 transition-transform duration-500",
        project.type === 'featured' ? "bg-page" : "bg-accent"
      )} />
      
      <div className={cn(
        "w-12 h-12 mb-8 flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden",
        project.type === 'featured' ? "bg-black/20" : "bg-[#1a1a18] dark:bg-accent/10"
      )}>
        <img 
          src={project.image_url} 
          alt={project.title} 
          className="w-full h-full object-contain p-2"
          referrerPolicy="no-referrer"
        />
      </div>

      <h4 className="font-headline text-xl font-bold mb-4">{project.title}</h4>
      <p className={cn(
        "text-sm mb-8 leading-relaxed flex-grow",
        project.type === 'featured' ? "text-page/80" : "text-secondary"
      )}>
        {project.short_description}
      </p>

      <div className="flex gap-4 mt-auto">
        <button 
          onClick={() => onOpen(project)}
          className={cn(
            "text-[11px] font-mono uppercase tracking-wider border-b pb-1 transition-colors",
            project.type === 'featured' ? "text-page border-page hover:text-page/80" : "text-accent border-accent hover:text-accent/80"
          )}
        >
          Read More Visit
        </button>
      </div>
    </motion.div>
  );
};

const ProjectModal = ({ project, onClose }: any) => {
  if (!project) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-page w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-card border border-muted text-primary hover:text-accent transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-[#1a1a18] dark:bg-accent/10 flex items-center justify-center rounded-xl overflow-hidden">
              <img 
                src={project.image_url} 
                alt={project.title} 
                className="w-full h-full object-contain p-2"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              {project.type && <p className="font-mono text-accent uppercase tracking-widest text-[10px] mb-1">{project.type}</p>}
              <h3 className="text-3xl font-bold font-headline">{project.title}</h3>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-primary font-body leading-relaxed mb-6">
              {project.short_description}
            </p>
            <div className="h-px bg-muted w-full mb-8" />
            <p className="text-secondary font-body leading-relaxed whitespace-pre-wrap mb-8">
              {project.long_description}
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              {project.live_url && (
                <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline">
                  <Eye size={16} /> Live Demo
                </a>
              )}
              {project.source_url && (
                <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-accent hover:underline">
                  <Github size={16} /> Source Code
                </a>
              )}
              <button 
                onClick={onClose}
                className="text-accent hover:underline flex items-center gap-2"
              >
                Read Less Visit
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
};

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { data: projects, loading } = useContent('projects');

  if (loading) return null;

  return (
    <section id="projects" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">My project</p>
        <h2 className="text-5xl font-bold mb-8">Some majors <span className="terracotta-italic">Works</span></h2>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-stretch">
        {projects.map((project) => (
          <ProjectCard 
            key={project.id} 
            project={project} 
            onOpen={(p: any) => setSelectedProject(p)} 
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedProject && (
          <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
          />
        )}
      </AnimatePresence>
    </section>
  );
};

const Skills = () => {
  const { data: skills, loading: skillsLoading } = useContent('skills');
  const { data: tags, loading: tagsLoading } = useContent('skill_tags');

  if (skillsLoading || tagsLoading) return null;

  return (
    <section id="skills" className="py-24 bg-card -mx-8 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">My skills</p>
          <h2 className="text-5xl font-bold mb-8">What I know <span className="terracotta-italic">Craft</span></h2>
          <div className="flex flex-wrap gap-4">
            {tags.map(tag => (
              <span key={tag.id} className="bg-page px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-wider border border-muted">
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-20">
          <div className="flex flex-col justify-center">
            <p className="text-2xl font-body leading-relaxed text-secondary italic mb-8">
              Combining artistic vision with technical precision to deliver high-impact digital experiences.
            </p>
            <p className="text-secondary leading-relaxed">
              My approach to design and entrepreneurship is holistic. I believe that a great product is the intersection of clean code, emotive imagery, and a clear business strategy. Each pixel is placed with editorial intent.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-6 content-center">
            {skills.map(skill => (
              <div key={skill.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="font-headline font-medium text-primary">{skill.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Awards = () => {
  const { data: awards, loading } = useContent('awards');

  if (loading) return null;

  return (
    <section id="awards" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Recognition</p>
        <h2 className="text-5xl font-bold mb-8">Awards & <span className="terracotta-italic">Honors</span></h2>
      </div>

      <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
        {awards.map((award, index) => (
          <motion.div 
            key={award.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="flex gap-6">
              <div className="font-mono text-accent text-lg">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div>
                <h4 className="font-headline text-2xl font-bold mb-2 transition-colors">
                  {award.title}
                </h4>
                <p className="font-mono text-[11px] uppercase tracking-wider text-secondary mb-4">
                  {award.organization}
                </p>
                <p className="text-secondary leading-relaxed max-w-md">
                  {award.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Teams = () => {
  const { data: collaborators, loading } = useContent('teams');

  if (loading) return null;

  return (
    <section id="teams" className="py-24 bg-alt -mx-8 px-8">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">My teams</p>
        <h2 className="text-5xl font-bold mb-8">Who with me <span className="terracotta-italic">Collaborators</span></h2>
      </div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        {collaborators.map((person) => (
          <div key={person.id} className="bg-card border border-muted p-10 rounded-lg text-center group hover:bg-page transition-all">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-accent scale-110 group-hover:scale-125 transition-transform duration-500"></div>
              <img 
                src={person.image_url || `https://picsum.photos/seed/${person.name}/200`} 
                alt={person.name}
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <h5 className="font-headline text-xl font-bold mb-1">{person.name}</h5>
            <p className="font-mono text-[10px] uppercase tracking-tighter text-accent mb-6">{person.role}</p>
            <p className="text-secondary italic text-sm leading-relaxed">"{person.quote || "Collaborating for impact."}"</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Gallery = () => {
  const { data: images, loading } = useContent('gallery_items');

  if (loading) return null;

  const featuredImages = images.filter(img => img.is_featured);

  return (
    <section id="gallery" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Galleries</p>
        <h2 className="text-5xl font-bold mb-8">My memories <span className="terracotta-italic">Visuals</span></h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[250px] mb-12">
        {featuredImages.map((img, i) => (
          <div key={img.id} className={cn("relative overflow-hidden rounded-[16px]", img.span)}>
            <img 
              src={img.src} 
              alt={img.title}
              className="w-full h-full object-cover transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Link 
          to="/gallery"
          className="bg-primary text-page px-10 py-4 rounded-full font-headline font-medium text-[13px] hover:scale-105 transition-transform flex items-center gap-2"
        >
          See More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};

const DevLogs = () => {
  const { posts, loading } = useBlogPosts();

  if (loading) return null;

  const featuredPosts = posts.filter(post => post.is_featured);

  return (
    <section id="devlogs" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Dev Logs</p>
        <h2 className="text-5xl font-bold mb-8">Content <span className="terracotta-italic">Stories</span></h2>
      </div>

      <div className="grid md:grid-cols-3 gap-12 mb-12">
        {featuredPosts.map((post) => (
          <article key={post.id} className="group bg-card rounded-[18px] border border-muted overflow-hidden flex flex-col">
            <div className="aspect-[16/9] overflow-hidden">
              <img 
                src={post.image_url || `https://picsum.photos/seed/${post.slug}/800/450`} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-8 flex-grow">
              <p className="font-mono text-[10px] text-accent uppercase tracking-wider mb-4">
                {post.date}
              </p>
              <h4 className="font-headline text-xl font-bold mb-4">{post.title}</h4>
              <p className="text-secondary text-sm leading-relaxed mb-8">{post.excerpt}</p>
            </div>
            <Link 
              to={`/blog/${post.slug}`}
              className="w-full py-4 bg-page font-mono text-[10px] uppercase tracking-wider hover:bg-accent hover:text-page transition-colors text-center"
            >
              Read more
            </Link>
          </article>
        ))}
      </div>

      <div className="flex justify-center">
        <Link 
          to="/blog"
          className="bg-primary text-page px-10 py-4 rounded-full font-headline font-medium text-[13px] hover:scale-105 transition-transform flex items-center gap-2"
        >
          See More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};

const Contact = () => {
  const { settings, loading } = useSettings();
  const { socialLinks, loading: socialLoading } = useSocialLinks();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('loading');
    
    const formData = new FormData(form);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    try {
      const { error } = await supabase.from('messages').insert([data]);
      if (error) throw error;
      setStatus('success');
      form.reset();
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('idle');
      alert('Failed to send message. Please try again.');
    }
  };

  const mainSocialLinks = socialLinks.filter(link => link.category === 'main');

  if (loading || socialLoading) return null;

  return (
    <section id="contact" className="py-24 border-t border-muted">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Contact me</p>
        <h2 className="text-5xl font-bold mb-8">
          {settings.connect_title || "Get in touch"} <span className="terracotta-italic">Connect</span>
        </h2>
        <p className="text-secondary max-w-2xl leading-relaxed">
          {settings.connect_description || "I'm always open to new opportunities, collaborations, or just a friendly chat. Feel free to reach out through any of these platforms!"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-20">
        <div>
          <div className="space-y-12 mb-16">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 flex-shrink-0 bg-card flex items-center justify-center rounded-sm border border-muted">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h6 className="font-headline font-bold text-sm uppercase tracking-widest mb-1">Name</h6>
                <p className="text-secondary">{settings.hero_name || "Janak Panthi"}</p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 flex-shrink-0 bg-card flex items-center justify-center rounded-sm border border-muted">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h6 className="font-headline font-bold text-sm uppercase tracking-widest mb-1">Address</h6>
                <p className="text-secondary">{settings.contact_address || "Butwal, Nepal | Texas State University, USA"}</p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 flex-shrink-0 bg-card flex items-center justify-center rounded-sm border border-muted">
                <Mail className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h6 className="font-headline font-bold text-sm uppercase tracking-widest mb-1">Email</h6>
                <p className="text-secondary">{settings.contact_email || "hello@janakpanthi.com"}</p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 flex-shrink-0 bg-card flex items-center justify-center rounded-sm border border-muted">
                <Phone className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h6 className="font-headline font-bold text-sm uppercase tracking-widest mb-1">Phone</h6>
                <p className="text-secondary">{settings.contact_phone || "+977 9800000000"}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            {mainSocialLinks
              .filter((link, index, self) => 
                index === self.findIndex((t) => t.platform === link.platform)
              )
              .map((link) => {
                const Icon = (LucideIcons as any)[link.icon_name] || LucideIcons.Globe;
                return (
                  <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                    <Icon className="w-6 h-6 text-secondary hover:text-accent transition-colors cursor-pointer" />
                  </a>
                );
              })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Inquiry Type</p>
            <p className="text-secondary leading-relaxed mb-8">
              {settings.contact_message || "Excited to collaborate? Have a project in mind? Contact me via email or phone, and I'll get back to you promptly. Let's bring your ideas to life and make a positive impact together!"}
            </p>
            <div className="flex flex-wrap gap-4">
              {['Collaboration', 'Project', 'Say Hello'].map((type) => (
                <label key={type} className="relative flex items-center cursor-pointer group">
                  <input type="radio" name="inquiry" className="sr-only peer" defaultChecked={type === 'Collaboration'} />
                  <div className="px-5 py-2.5 rounded-full border-2 border-muted text-secondary text-xs font-headline font-medium transition-all peer-checked:border-accent peer-checked:bg-accent peer-checked:text-page group-hover:border-accent/50">
                    {type}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <input 
              name="name"
              className="w-full bg-card border-2 border-muted px-6 py-4 rounded-xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/40 font-body" 
              placeholder="Name" 
              type="text" 
              required
            />
            <input 
              name="email"
              className="w-full bg-card border-2 border-muted px-6 py-4 rounded-xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/40 font-body" 
              placeholder="Email" 
              type="email" 
              required
            />
          </div>
          <input 
            name="subject"
            className="w-full bg-card border-2 border-muted px-6 py-4 rounded-xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/40 font-body" 
            placeholder="Subject" 
            type="text" 
            required
          />
          <textarea 
            name="message"
            className="w-full bg-card border-2 border-muted px-6 py-4 rounded-xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/40 font-body resize-none" 
            placeholder="Message" 
            rows={4} 
            required
          />
          <div className="flex flex-col gap-4">
            <button 
              type="submit"
              disabled={status !== 'idle'}
              className="bg-primary text-page px-10 py-5 rounded-full font-headline font-medium text-[13px] flex items-center justify-center gap-4 hover:shadow-2xl hover:shadow-accent/40 transition-all hover:-translate-y-1 disabled:opacity-50 w-full sm:w-auto"
            >
              {status === 'loading' ? 'Sending...' : status === 'success' ? 'Message Sent!' : 'Send Message'}
              <Send className="w-4 h-4" />
            </button>
            {status === 'success' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-green-500 font-medium text-sm mt-2"
              >
                Thank you for sending message we will reach out to you.
              </motion.p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-alt w-full py-12 px-8 mt-24 border-t border-muted">
    <div className="max-w-7xl mx-auto flex justify-center items-center text-center">
      <p className="text-secondary/60 text-[10px] sm:text-xs font-mono flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
        <a href="https://janakpanthi.com.np" target="_blank" rel="noopener noreferrer" className="text-[#da755b] hover:underline whitespace-nowrap">Janak Panthi</a> 
        <span className="hidden sm:inline">|</span> 
        <span className="whitespace-nowrap">© {new Date().getFullYear()} All rights reserved.</span>
      </p>
    </div>
  </footer>
);

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8">
    <h1 className="text-9xl font-bold text-accent mb-4">404</h1>
    <h2 className="text-3xl font-bold mb-8">Page Not Found</h2>
    <p className="text-secondary mb-12 max-w-md">
      The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
    </p>
    <Link 
      to="/" 
      className="bg-primary text-page px-8 py-4 rounded-full font-headline font-medium text-sm hover:scale-105 transition-transform"
    >
      Back to Home
    </Link>
  </div>
);

export default function App() {
  const location = useLocation();
  const { pathname, hash } = location;
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    // Inject Google Tag Manager
    if (settings.gtm_id && !document.getElementById('gtm-script')) {
      const gtmScript = document.createElement('script');
      gtmScript.id = 'gtm-script';
      gtmScript.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${settings.gtm_id}');`;
      document.head.appendChild(gtmScript);
    }

    // Inject Google Analytics
    if (settings.ga_id && !document.getElementById('ga-script')) {
      const gaScript = document.createElement('script');
      gaScript.id = 'ga-script';
      gaScript.async = true;
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${settings.ga_id}`;
      document.head.appendChild(gaScript);

      const gaConfig = document.createElement('script');
      gaConfig.id = 'ga-config';
      gaConfig.innerHTML = `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.ga_id}');`;
      document.head.appendChild(gaConfig);
    }

    // Inject Favicon
    if (settings.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings.gtm_id, settings.ga_id, settings.favicon_url]);

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return true; // Default to dark
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

  const toggleDarkMode = () => setIsDark(!isDark);

  return (
    <div className="min-h-screen bg-page text-primary selection:bg-accent selection:text-page">
      <Navbar isDark={isDark} toggleDarkMode={toggleDarkMode} />
      <div className="pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Routes location={location}>
              <Route path="/" element={
                <main className="max-w-7xl mx-auto px-8">
                  <Hero />
                  <About />
                  <Projects />
                  <Skills />
                  <Awards />
                  <Teams />
                  <Gallery />
                  <DevLogs />
                  <Contact />
                </main>
              } />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<ArticlePage />} />
              <Route path="/Connect_with_Me" element={<Connect_with_Me />} caseSensitive />
              <Route path="/sudo.admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}
