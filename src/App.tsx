import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Menu, X, Sun, Moon, Share2, Mail, Link as LinkIcon, 
  ArrowRight, Download, Box, Palette, CreditCard, 
  User, MapPin, Send, Github, Linkedin, Twitter, Instagram,
  Eye, EyeOff, ArrowLeft, Calendar, Settings, LogIn
} from 'lucide-react';
import { tracking } from './lib/tracking';
import SEO from './components/SEO';
import GalleryPage from './GalleryPage';
import Connect_with_Me from './Connect_with_Me';
import ArticlePage from './ArticlePage';
import DevLogsPage from './DevLogsPage';
import Notepad from './Notepad';
import QRCodeGenerator from './QRCodeGenerator';
import NFCPage from './NFCPage';
import Admin from './Admin';
import ImageOptimizerPage from './pages/ImageOptimizerPage';
import NotFound from './components/NotFound';
import { PROJECTS_DATA, DEV_LOGS_DATA } from './data';
import { useContent, useSocialLinks, useDevLogs } from './hooks/useContent';
import { useSettingsContext } from './context/SettingsContext';
import { usePWA } from './hooks/usePWA';
import * as LucideIcons from 'lucide-react';
import { supabase } from './lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Navbar = ({ isDark, toggleDarkMode }: { isDark: boolean; toggleDarkMode: () => void }) => {
  const { settings } = useSettingsContext();
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

  const isTeamsEnabled = settings.enable_teams_section === 'true';

  const navLinks = [
    { name: settings.nav_label_home || 'Home', href: isHomePage ? '#home' : '/' },
    { name: settings.nav_label_about || 'About', href: isHomePage ? '#about' : '/#about' },
    { name: settings.nav_label_projects || 'Projects', href: isHomePage ? '#projects' : '/#projects' },
    { name: settings.nav_label_skills || 'Skills', href: isHomePage ? '#skills' : '/#skills' },
    { name: settings.nav_label_awards || 'Awards', href: isHomePage ? '#awards' : '/#awards' },
    ...(isTeamsEnabled ? [{ name: 'Teams', href: isHomePage ? '#teams' : '/#teams' }] : []),
    { name: settings.nav_label_gallery || 'Gallery', href: isHomePage ? '#gallery' : '/#gallery' },
    { name: settings.nav_label_devlogs || 'Dev Logs', href: isHomePage ? '#devlogs' : '/#devlogs' },
    { name: settings.nav_label_contact || 'Contact', href: isHomePage ? '#contact' : '/#contact' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[64px] xl:h-[80px] flex items-center px-4 md:px-8",
      "bg-nav backdrop-blur-[20px] border-b border-muted",
      isScrolled ? "opacity-100" : "opacity-100"
    )}>
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto w-full flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold font-headline">
          {settings.site_title || "Janak"}<span className="text-accent">{settings.site_title ? '' : '.'}</span>
        </Link>
        
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((link) => (
            link.href.startsWith('/') ? (
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
                link.href.startsWith('/') ? (
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
  const { settings, loading } = useSettingsContext();
  const { socialLinks, loading: socialLoading } = useSocialLinks();
  const showPhone = settings.show_phone_on_connect !== 'false';
  const [greeting, setGreeting] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 20]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, -10]);
  const translateZ = useTransform(scrollYProgress, [0, 1], [0, 50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.5], [0, -30]);

  useEffect(() => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
    else if (hour >= 12 && hour < 18) timeGreeting = 'Good afternoon';
    else if (hour >= 18 && hour < 22) timeGreeting = 'Good evening';
    else timeGreeting = 'Good night';
    
    setGreeting(`${timeGreeting}, I am`);
  }, []);

  const headline = settings.hero_name || "Janak Panthi";
  const words = headline.split(' ');

  return (
    <div ref={containerRef} className="relative">
      {loading || socialLoading ? (
        <section id="home" className="min-h-[calc(100vh-64px)] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </section>
      ) : (
        <section id="home" className="min-h-[calc(100vh-64px)] xl:min-h-[calc(100vh-80px)] flex flex-col justify-center items-center text-center relative overflow-hidden px-4 md:px-8 perspective-1000">
          <div className="absolute inset-0 z-0 diagonal-lines opacity-[0.03] dark:opacity-[0.05]"></div>
          
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-radial from-accent/10 to-transparent blur-3xl"></div>
            <img 
              src={settings.hero_image || "https://picsum.photos/seed/janak-hero/800/1200"} 
              alt="" 
              className="w-full h-full object-cover [mask-image:linear-gradient(to_left,black,transparent)] grayscale"
              referrerPolicy="no-referrer"
              loading="eager"
            />
          </div>

          <motion.div 
            style={{ rotateX, rotateY, translateZ, opacity, y: textY }}
            className="relative z-10 w-full max-w-[800px] xl:max-w-[1000px] 2xl:max-w-[1200px] 3xl:max-w-[1400px] transform-style-3d mt-24 xl:mt-32 2xl:mt-40 flex flex-col items-center"
          >
            <div className="relative w-fit mx-auto">
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-mono text-accent tracking-[0.1em] text-xs mb-4 md:mb-2 text-center md:text-right md:absolute md:bottom-full md:right-full md:mr-4 md:whitespace-nowrap"
              >
                {(!settings.hero_greeting || settings.hero_greeting === "Hello, I am") ? greeting : settings.hero_greeting}
              </motion.p>

              <h1 className="text-4xl sm:text-5xl md:text-[72px] lg:text-[84px] 2xl:text-[100px] 3xl:text-[120px] leading-[1.1] mb-6 flex flex-wrap justify-center gap-x-4 normal-case font-serif">
                {words.map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20, rotateX: -45 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                    className={cn(word.toLowerCase().includes('panthi') ? "text-accent italic" : "text-primary")}
                  >
                    {word}
                  </motion.span>
                ))}
              </h1>
            </div>

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
            
            <p className="text-secondary mb-12 max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto text-base lg:text-lg">
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
                .filter((link) => {
                  const platform = (link.platform || '').toLowerCase();
                  const icon = (link.icon_name || '').toLowerCase();
                  const url = (link.url || '').toLowerCase();
                  const isFacebook = 
                    platform.includes('facebook') || 
                    platform.includes('messenger') || 
                    platform === 'fb' ||
                    platform === 'meta' ||
                    icon.includes('facebook') || 
                    icon.includes('messenger') ||
                    url.includes('facebook.com') ||
                    url.includes('messenger.com') ||
                    url.includes('fb.com') ||
                    url.includes('fb.me') ||
                    url.includes('m.me');
                  
                  return !(isFacebook && showPhone);
                })
                .map((link) => {
                  const Icon = (LucideIcons as any)[link.icon_name] || LucideIcons.Globe;
                  return (
                    <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer">
                      <Icon className="w-5 h-5 text-secondary hover:text-accent cursor-pointer transition-colors" />
                    </a>
                  );
                })}
            </div>
          </motion.div>
        </section>
      )}
    </div>
  );
};

const PasswordModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (url: string) => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: '', company: '', email: '', reason: '' });
  const [requestStatus, setRequestStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const { settings } = useSettingsContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/v1/cv/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });
      
      const result = await response.json();
      
      if (response.ok && result.url) {
        onSuccess(result.url);
        onClose();
        setPassword('');
        setError(false);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error verifying CV password:', err);
      setError(true);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestStatus('submitting');
    try {
      const { error } = await supabase.from('cv_requests').insert([requestForm]);
      if (error) throw error;

      // Send email notification
      fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'cv_request', data: requestForm }),
      }).catch(err => console.error('Failed to send email notification:', err));

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 flex justify-center items-start"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-page w-full max-w-md p-8 rounded-2xl shadow-2xl relative border border-muted my-auto"
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
  const { settings, loading } = useSettingsContext();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleDownload = (signedUrl?: string) => {
    const link = document.createElement('a');
    link.href = signedUrl || settings.cv_url || '#';
    link.target = '_blank';
    link.download = 'Janak_Panthi_CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return null;

  return (
    <section id="about" className="py-24 grid md:grid-cols-2 gap-12 lg:gap-20 2xl:gap-32 items-center">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="relative group w-full max-w-[450px] mx-auto"
      >
        <div className="absolute -inset-4 bg-accent/5 rounded-xl blur-2xl group-hover:bg-accent/10 transition-all duration-500"></div>
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-card border border-muted shadow-xl">
          <img 
            src={settings.about_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAgd4MZoIJ7G0LGQdeRBbcOaYBiiyYRpSdCzSBKA1XGnt8a33ePAVQCRpTiVzi8cpgG_new8IT15uCDn75ZoP287dczzhKpjl61vx1aW4gjqhkVviLdYrnKrED8wvOA2xbS7W-zxochrL6ymanS79SsBalgqPQI4uaTee_VFc99564VHv2wbyXq8e2Vv_czD3KQmD_pbMgjiXUVNQ65JbCjqypxB65dmc5lPustvDhpwSIGzkIhfILwnQKNpxXshoAbtVD7m-VSErvV"} 
            alt="Janak Panthi"
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
            loading={settings.enable_lazy_loading === 'false' ? 'eager' : 'lazy'}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
      >
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">About me</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Who am I <span className="terracotta-italic">{settings.branding_about_styled || "Lifestyle"}</span></h2>
        <p className="text-secondary leading-relaxed mb-10 text-lg 2xl:text-xl">
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
  const isFeatured = project.type === 'featured';
  
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn(
        "p-8 group transition-all duration-300 relative overflow-hidden rounded-[18px] border border-muted flex flex-col h-full",
        isFeatured ? "bg-accent text-page" : "bg-card hover:bg-page"
      )}
    >
      <div className={cn(
        "absolute top-0 left-0 w-full h-0.5 -translate-x-full group-hover:translate-x-0 transition-transform duration-500",
        isFeatured ? "bg-page" : "bg-accent"
      )} />
      
      <div className={cn(
        "w-12 h-12 mb-8 flex items-center justify-center rounded-lg flex-shrink-0 overflow-hidden",
        isFeatured ? "bg-black/20" : "bg-[#1a1a18] dark:bg-accent/10"
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
        isFeatured ? "text-page/80" : "text-secondary"
      )}>
        {project.short_description}
      </p>

      <div className="flex gap-4 mt-auto">
        <button 
          onClick={() => onOpen(project)}
          className={cn(
            "text-[11px] font-mono uppercase tracking-wider border-b pb-1 transition-colors",
            isFeatured ? "text-page border-page hover:text-page/80" : "text-accent border-accent hover:text-accent/80"
          )}
        >
          Read More
        </button>
      </div>
    </motion.div>
  );
};

const ProjectModal = ({ project, onClose }: any) => {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  if (!project) return null;

  const defaultFeatures = [
    {
      title: "Government Collaboration",
      description: "A revolutionary Career site made with the collaboration of Government of Nepal's Ministry of Social Development.",
      video_url: "https://cdn.pixabay.com/video/2023/10/20/185814-876356778_large.mp4"
    },
    {
      title: "Fair Pay & No Fees",
      description: "Dedicated to transforming the job search experience in Nepal by eliminating commission fees.",
      video_url: "https://cdn.pixabay.com/video/2020/09/11/49544-457850666_large.mp4"
    },
    {
      title: "Transparent Market",
      description: "Bridging the gap between employers and jobseekers for a transparent environment.",
      video_url: "https://cdn.pixabay.com/video/2021/08/05/83946-584347715_large.mp4"
    }
  ];

  const features = project.features ? (typeof project.features === 'string' ? JSON.parse(project.features) : project.features) : defaultFeatures;
  const hasFeatures = features && features.length > 0;
  const featuresTitle = project.features_title || "Productivity at its best";

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-page w-full max-w-5xl 2xl:max-w-6xl 3xl:max-w-7xl rounded-2xl shadow-2xl relative my-8 md:my-12 lg:my-16 mx-4 md:mx-8 lg:mx-12"
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

          <div className="prose prose-invert max-w-none mb-12">
            <p className="text-lg text-primary font-body leading-relaxed mb-6">
              {project.short_description}
            </p>
            <div className="h-px bg-muted w-full mb-8" />
            <p className="text-secondary font-body leading-relaxed whitespace-pre-wrap mb-8">
              {project.long_description}
            </p>
          </div>

          {hasFeatures && (
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-8 font-headline">{featuresTitle}</h3>
              
              {/* Desktop Layout */}
              <div className="hidden md:grid grid-cols-12 gap-12 items-start">
                <div className="col-span-5 space-y-4">
                  {features.map((feature: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setActiveFeatureIndex(idx)}
                      className={cn(
                        "w-full text-left p-6 rounded-2xl border transition-all duration-300 relative group",
                        activeFeatureIndex === idx 
                          ? "bg-card border-primary/20 shadow-lg shadow-primary/5" 
                          : "bg-transparent border-muted hover:border-primary/10"
                      )}
                    >
                      {activeFeatureIndex === idx && (
                        <motion.div 
                          layoutId="activeGlow"
                          className="absolute inset-0 bg-primary/5 rounded-2xl -z-10"
                        />
                      )}
                      <h4 className={cn(
                        "font-headline font-bold text-lg mb-2 transition-colors",
                        activeFeatureIndex === idx ? "text-primary" : "text-secondary group-hover:text-primary"
                      )}>
                        {feature.title}
                      </h4>
                      <p className="text-secondary text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </button>
                  ))}
                </div>
                
                <div className="col-span-7 sticky top-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeatureIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="rounded-2xl overflow-hidden border border-muted bg-card aspect-video relative group"
                    >
                      {features[activeFeatureIndex].video_url ? (
                        <video 
                          src={features[activeFeatureIndex].video_url} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src={features[activeFeatureIndex].image_url || project.image_url} 
                          alt={features[activeFeatureIndex].title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* Mobile Layout */}
              <div className="md:hidden space-y-8">
                <div className="relative">
                  <div className="flex overflow-x-auto pb-2 gap-6 scrollbar-hide snap-x scroll-smooth">
                    {features.map((feature: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveFeatureIndex(idx)}
                        className={cn(
                          "relative py-3 px-1 transition-all snap-start whitespace-nowrap font-headline font-bold text-sm flex-shrink-0",
                          activeFeatureIndex === idx ? "text-primary" : "text-secondary hover:text-primary"
                        )}
                      >
                        {activeFeatureIndex === idx && (
                          <motion.div 
                            layoutId="activeTabMobile"
                            className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                          />
                        )}
                        {feature.title}
                      </button>
                    ))}
                  </div>
                  <div className="h-[2px] bg-muted/20 w-full mt-1 relative overflow-hidden rounded-full">
                    <motion.div 
                      className="absolute h-full bg-primary top-0 transition-all duration-500 ease-out"
                      initial={false}
                      animate={{ 
                        width: `${100 / features.length}%`,
                        left: `${(activeFeatureIndex * 100) / features.length}%`
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <p className="text-secondary leading-relaxed">
                    {features[activeFeatureIndex].description}
                  </p>
                  <div className="rounded-2xl overflow-hidden border border-muted bg-card aspect-video">
                    {features[activeFeatureIndex].video_url ? (
                      <video 
                        src={features[activeFeatureIndex].video_url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={features[activeFeatureIndex].image_url || project.image_url} 
                        alt={features[activeFeatureIndex].title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasFeatures && project.video_url && (
            <div className="mb-8 rounded-xl overflow-hidden border border-muted bg-card">
              <video 
                src={project.video_url} 
                controls 
                className="w-full h-auto max-h-[400px] object-contain"
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const Projects = () => {
  const { settings } = useSettingsContext();
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const { data: projects, loading } = useContent('projects');

  if (loading) return null;

  return (
    <section id="projects" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">My project</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Some majors <span className="terracotta-italic">{settings.branding_projects_styled || "Works"}</span></h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
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
  const { settings } = useSettingsContext();
  const { data: skills, loading: skillsLoading } = useContent('skills');
  const { data: tags, loading: tagsLoading } = useContent('skill_tags');

  const coreSkills = [
    "React / Vite",
    "TypeScript",
    "Tailwind CSS",
    "Supabase",
    "Node.js"
  ];

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (skillsLoading || tagsLoading) return null;

  return (
    <section id="skills" className="py-32 bg-card px-6 md:px-12 rounded-[3rem] overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto">
        <div className="mb-24">
          <p className="font-mono text-accent uppercase tracking-[0.2em] text-[10px] mb-6">Expertise & Capabilities</p>
          <h2 className="text-5xl md:text-6xl 2xl:text-7xl font-bold mb-10 tracking-tight">What I know <span className="terracotta-italic">{settings.branding_skills_styled || "Craft"}</span></h2>
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <span key={tag.id} className="bg-page/50 backdrop-blur-sm px-5 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest border border-muted/50 text-secondary/80">
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-32 2xl:gap-48 items-start">
          <div className="flex flex-col space-y-8">
            <div className="space-y-6">
              <p className="text-3xl 2xl:text-4xl font-body leading-tight text-secondary italic">
                {settings.skills_quote || "Combining artistic vision with technical precision to deliver high-impact digital experiences."}
              </p>
              <p className="text-secondary/80 leading-relaxed text-lg max-w-xl">
                {settings.skills_description || "My approach to design and entrepreneurship is holistic. I believe that a great product is the intersection of clean code, emotive imagery, and a clear business strategy. Each pixel is placed with editorial intent."}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-x-16 gap-y-8">
              {skills
                .filter(skill => !coreSkills.includes(skill.name))
                .map(skill => (
                <div key={skill.id} className="flex items-center gap-3 group">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-150 transition-transform" />
                  <span className="font-headline font-semibold text-primary/90 tracking-tight">{skill.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[350px] sm:h-[400px] md:h-[500px] flex items-center justify-center -mt-12 sm:-mt-16 lg:-mt-40">
            {/* Rotating Orbit Container */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-full border border-accent/10 border-dashed animate-[spin_20s_linear_infinite]" />
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 md:w-60 md:h-60 rounded-full border border-accent/20 border-dashed animate-[spin_15s_linear_infinite_reverse]" />
            </div>

            {/* Core Skills Orbit */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80"
            >
              {coreSkills.map((skill, index) => {
                const angle = (index / coreSkills.length) * (2 * Math.PI);
                const radius = windowWidth < 640 ? 110 : windowWidth < 768 ? 130 : 180;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <motion.div
                    key={skill}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ x, y }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="bg-page border border-accent/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-xl shadow-accent/5 whitespace-nowrap group hover:border-accent transition-colors">
                      <span className="text-[10px] sm:text-xs md:text-sm font-headline font-bold text-primary group-hover:text-accent transition-colors">
                        {skill}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Center Logo/Icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-accent rounded-full flex items-center justify-center shadow-2xl shadow-accent/20">
              <LucideIcons.Code2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-page" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Awards = () => {
  const { settings } = useSettingsContext();
  const { data: awards, loading } = useContent('awards');

  if (loading) return null;

  if (!awards || awards.length === 0) {
    return (
      <section id="awards" className="py-24">
        <div className="mb-16">
          <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Recognition</p>
          <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Awards & <span className="terracotta-italic">{settings.branding_awards_styled || "Honors"}</span></h2>
        </div>
        <div className="bg-card border border-muted border-dashed rounded-[32px] py-20 text-center">
          <p className="text-secondary/50 font-mono text-xs uppercase tracking-widest">No awards found in transmission</p>
        </div>
      </section>
    );
  }

  return (
    <section id="awards" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Recognition</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Awards & <span className="terracotta-italic">{settings.branding_awards_styled || "Honors"}</span></h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-12">
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
              <div className="font-mono text-accent text-lg shrink-0">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                {award.image_url && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mb-6 bg-alt border border-muted group-hover:border-accent transition-colors">
                    <img 
                      src={award.image_url} 
                      alt={award.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <h4 className="font-headline text-2xl font-bold mb-2 transition-colors">
                  {award.title}
                </h4>
                <div className="flex items-center gap-3 mb-4">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-accent font-bold">
                    {award.organization}
                  </p>
                  {award.year && (
                    <>
                      <span className="text-secondary/40 font-mono text-[11px]">•</span>
                      <p className="font-mono text-[11px] text-secondary/60">
                        {award.year}
                      </p>
                    </>
                  )}
                </div>
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
  const { settings } = useSettingsContext();
  const { data: collaborators, loading } = useContent('teams');

  if (loading) return null;

  return (
    <section id="teams" className="py-24 bg-alt px-4 md:px-8 rounded-2xl">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto text-center mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">My teams</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Who with me <span className="terracotta-italic">Collaborators</span></h2>
      </div>

      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
  const { settings } = useSettingsContext();
  const { data: images, loading } = useContent('gallery_items');

  if (loading) return null;

  const featuredImages = images.filter(img => img.is_featured);

  if (images.length === 0) {
    return (
      <section id="gallery" className="py-24">
        <div className="mb-16">
          <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Galleries</p>
          <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">My memories <span className="terracotta-italic">{settings.branding_gallery_styled || "Visuals"}</span></h2>
        </div>
        <div className="bg-card border border-muted border-dashed rounded-[32px] py-20 text-center">
          <p className="text-secondary/50 font-mono text-xs uppercase tracking-widest">No visual memories found in storage</p>
        </div>
      </section>
    );
  }

  return (
    <section id="gallery" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Galleries</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">My memories <span className="terracotta-italic">{settings.branding_gallery_styled || "Visuals"}</span></h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[250px] mb-12">
        {featuredImages.map((img) => (
          <div key={img.id} className="relative overflow-hidden rounded-[16px] bg-card">
            <img 
              src={img.src} 
              alt={img.title}
              className="w-full h-full object-cover transition-all duration-700"
              referrerPolicy="no-referrer"
              loading={settings.enable_lazy_loading === 'false' ? 'eager' : 'lazy'}
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
  const { settings } = useSettingsContext();
  const { posts, loading } = useDevLogs();

  if (loading) return null;

  const featuredPosts = posts.filter(post => post.is_featured);

  return (
    <section id="devlogs" className="py-24">
      <div className="mb-16">
        <p className="font-mono text-accent uppercase tracking-[0.1em] text-xs mb-4">Dev Logs</p>
        <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">Content <span className="terracotta-italic">{settings.branding_devlogs_styled || "Stories"}</span></h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
        {featuredPosts.map((post) => (
          <article key={post.id} className="group bg-card rounded-[18px] border border-muted overflow-hidden flex flex-col">
            <div className="aspect-[16/9] overflow-hidden">
              <img 
                src={post.image_url || `https://picsum.photos/seed/${post.slug}/800/450`} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
                loading={settings.enable_lazy_loading === 'false' ? 'eager' : 'lazy'}
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
              to={`/devlogs/${post.slug}`}
              className="w-full py-4 bg-page font-mono text-[10px] uppercase tracking-wider hover:bg-accent hover:text-page transition-colors text-center"
            >
              Read more
            </Link>
          </article>
        ))}
      </div>

      <div className="flex justify-center">
        <Link 
          to="/devlogs"
          className="bg-primary text-page px-10 py-4 rounded-full font-headline font-medium text-[13px] hover:scale-105 transition-transform flex items-center gap-2"
        >
          See More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
};

const Contact = () => {
  const { settings, loading } = useSettingsContext();
  const { socialLinks, loading: socialLoading } = useSocialLinks();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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
      
      // Send email notification
      await fetch('/api/v1/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message', data }),
      }).catch(err => console.error('Failed to send email notification:', err));

      setStatus('success');
      form.reset();
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      console.error('Error sending message:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const mainSocialLinks = socialLinks.filter(link => link.category === 'main');

  if (loading || socialLoading) return null;
  const showPhone = settings.show_phone_on_connect !== 'false';

    return (
      <section id="contact" className="py-24 border-t border-muted">
        <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl 2xl:text-6xl font-bold mb-8">
              Excited to collaborate? <span className="terracotta-italic">Connect</span>
            </h2>
          <p className="text-secondary max-w-2xl leading-relaxed">
           Excited to collaborate? Have a project in mind? Contact me via email or phone, and I'll get back to you promptly. Let's bring ideas to life and make a positive impact together!
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
              <a href={`mailto:${settings.contact_email || "contact@janakpanthi.com.np"}`} className="flex gap-6 items-start group">
                <div className="w-12 h-12 flex-shrink-0 bg-card flex items-center justify-center rounded-sm border border-muted group-hover:border-accent transition-colors">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h6 className="font-headline font-bold text-sm uppercase tracking-widest mb-1">Email</h6>
                  <p className="text-secondary group-hover:text-accent transition-colors">{settings.contact_email || "contact@janakpanthi.com.np"}</p>
                </div>
              </a>
            </div>
  
            <div className="flex gap-8">
              {mainSocialLinks
                .filter((link, index, self) => 
                  index === self.findIndex((t) => t.platform === link.platform)
                )
                .filter((link) => {
                  const platform = (link.platform || '').toLowerCase();
                  const icon = (link.icon_name || '').toLowerCase();
                  const url = (link.url || '').toLowerCase();
                  const isFacebook = 
                    platform.includes('facebook') || 
                    platform.includes('messenger') || 
                    platform === 'fb' ||
                    platform === 'meta' ||
                    icon.includes('facebook') || 
                    icon.includes('messenger') ||
                    url.includes('facebook.com') ||
                    url.includes('messenger.com') ||
                    url.includes('fb.com') ||
                    url.includes('fb.me') ||
                    url.includes('m.me');
                  
                  return !(isFacebook && showPhone);
                })
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
              className="bg-primary text-page px-10 py-5 rounded-full font-headline font-medium text-[13px] flex items-center justify-center gap-4 transition-all disabled:opacity-50 w-full sm:w-auto"
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
                {settings.thank_you_message || "Thank you for sending message we will reach out to you."}
              </motion.p>
            )}
            {status === 'error' && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 font-medium text-sm mt-2"
              >
                Failed to send message. Please try again.
              </motion.p>
            )}
          </div>
        </form>
      </div>
    </div>
  </section>
  );
};

const Footer = () => {
  const { settings } = useSettingsContext();
  return (
    <footer className="bg-alt w-full py-12 px-4 md:px-8 mt-24 border-t border-muted">
      <div className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto flex justify-center items-center text-center">
        <p className="text-secondary/60 text-[10px] sm:text-xs font-mono flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
          <a href="https://janakpanthi.com.np" target="_blank" rel="noopener noreferrer" className="text-[#da755b] hover:underline whitespace-nowrap">
            {settings.footer_copyright_name || settings.site_title || "Janak Panthi"}
          </a> 
          <span className="hidden sm:inline">|</span> 
          <span className="whitespace-nowrap">© {new Date().getFullYear()} All rights reserved.</span>
        </p>
      </div>
    </footer>
  );
};

export default function App() {
  const { settings, loading: settingsLoading } = useSettingsContext();
  const { setBadge } = usePWA();
  const location = useLocation();
  const { pathname, hash } = location;
  const { data: awards } = useContent('awards');

  useEffect(() => {
    // Initial setup logic can go here
  }, []);

  useEffect(() => {
    if (settings.anonymize_ip === 'true') {
      tracking.setAnonymizeIp(true);
    } else {
      tracking.setAnonymizeIp(false);
    }
  }, [settings.anonymize_ip]);

  useEffect(() => {
    if (settings.session_timeout_enabled === 'true') {
      let timeout: NodeJS.Timeout;
      const resetTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.reload();
        }, 30 * 60 * 1000); // 30 minutes
      };

      window.addEventListener('mousemove', resetTimeout);
      window.addEventListener('keydown', resetTimeout);
      resetTimeout();

      return () => {
        window.removeEventListener('mousemove', resetTimeout);
        window.removeEventListener('keydown', resetTimeout);
        clearTimeout(timeout);
      };
    }
  }, [settings.session_timeout_enabled]);

  useEffect(() => {
    // Clean URL from platform parameters and hashes
    const url = new URL(window.location.href);
    let changed = false;
    
    if (url.searchParams.has('origin')) {
      url.searchParams.delete('origin');
      changed = true;
    }
    
    if (changed) {
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }, []);

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
    tracking.trackPageView();
  }, [pathname]);

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          // Remove hash from URL after scrolling for a cleaner look
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
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

  // Apply Theme Mode from Settings
  useEffect(() => {
    if (settings.theme_mode) {
      if (settings.theme_mode === 'Dark') {
        setIsDark(true);
      } else if (settings.theme_mode === 'Light') {
        setIsDark(false);
      } else if (settings.theme_mode === 'System') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(isSystemDark);
      }
    }
  }, [settings.theme_mode]);

  // Apply Primary Color and Font
  useEffect(() => {
    if (settings.primary_color) {
      document.documentElement.style.setProperty('--accent', settings.primary_color);
    }
    if (settings.font_selection) {
      document.documentElement.style.setProperty('--font-headline', `"${settings.font_selection}", sans-serif`);
    }
    if (settings.border_radius) {
      const radiusMap: Record<string, string> = {
        'None': '0px',
        'Small': '4px',
        'Medium': '12px',
        'Large': '24px',
        'Full': '9999px'
      };
      document.documentElement.style.setProperty('--radius', radiusMap[settings.border_radius] || '12px');
    }
  }, [settings.primary_color, settings.font_selection, settings.border_radius]);

  // Apply Favicon
  useEffect(() => {
    if (settings.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings.favicon_url]);

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

  const isAdminPage = pathname === '/sudo.admin';

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
             <div className="w-16 h-16 border-4 border-accent/20 rounded-full"></div>
             <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent animate-pulse">Initializing</p>
        </motion.div>
      </div>
    );
  }

  if (settings.maintenance_mode === 'true' && !isAdminPage) {
    return (
      <div className="min-h-screen bg-page text-primary flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6">
          <Settings className="w-10 h-10 text-accent animate-spin-slow" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Under Maintenance</h1>
        <p className="text-secondary max-w-md">
          We're currently performing some scheduled maintenance. We'll be back shortly!
        </p>
      </div>
    );
  }

  const isTeamsEnabled = settings.enable_teams_section === 'true';
  const isHomePage = pathname === '/';

  const navLinks = [
    { name: settings.nav_label_home || 'Home', href: isHomePage ? '#home' : '/', visible: settings.section_hero_visible !== 'false' },
    { name: settings.nav_label_about || 'About', href: isHomePage ? '#about' : '/#about', visible: settings.section_about_visible !== 'false' },
    { name: settings.nav_label_projects || 'Projects', href: isHomePage ? '#projects' : '/#projects', visible: settings.section_projects_visible !== 'false' },
    { name: settings.nav_label_skills || 'Skills', href: isHomePage ? '#skills' : '/#skills', visible: settings.section_skills_visible !== 'false' },
    { name: settings.nav_label_awards || 'Awards', href: isHomePage ? '#awards' : '/#awards', visible: settings.section_awards_visible !== 'false' },
    ...(isTeamsEnabled ? [{ name: 'Teams', href: isHomePage ? '#teams' : '/#teams', visible: settings.section_teams_visible !== 'false' }] : []),
    { name: settings.nav_label_gallery || 'Gallery', href: isHomePage ? '#gallery' : '/#gallery', visible: settings.section_gallery_visible !== 'false' },
    { name: settings.nav_label_devlogs || 'Dev Logs', href: isHomePage ? '#devlogs' : '/#devlogs', visible: settings.section_devlogs_visible !== 'false' },
    { name: settings.nav_label_contact || 'Contact', href: isHomePage ? '#contact' : '/#contact', visible: settings.section_contact_visible !== 'false' },
  ].filter(link => link.visible);

  return (
    <div className="min-h-screen bg-page text-primary selection:bg-accent selection:text-page overflow-x-hidden">
      {!isAdminPage && <Navbar isDark={isDark} toggleDarkMode={toggleDarkMode} />}
      <div className={cn(!isAdminPage && "pt-16")}>
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
                <main className="max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1800px] mx-auto px-4 md:px-8">
                  <SEO 
                    title={settings.meta_title || settings.site_title}
                    description={settings.meta_description}
                    keywords={settings.meta_keywords}
                    image={settings.og_image || settings.about_image}
                    appleIcon={settings.apple_icon_180}
                    pwaIcon={settings.pwa_icon_512}
                    wikidataId={settings.seo_wikidata_id}
                    nationality={settings.seo_nationality}
                    location={settings.seo_location_name}
                    jobTitle={settings.seo_job_title}
                    orgName={settings.seo_org_name}
                    alumniName={settings.seo_alumni_name}
                    awards={awards || []}
                    navLinks={navLinks}
                  />
                  <Hero />
                  {settings.section_about_visible !== 'false' && <About />}
                  {settings.section_projects_visible !== 'false' && <Projects />}
                  {settings.section_skills_visible !== 'false' && <Skills />}
                  {settings.section_awards_visible !== 'false' && <Awards />}
                  {settings.enable_teams_section === 'true' && settings.section_teams_visible !== 'false' && <Teams />}
                  {settings.section_gallery_visible !== 'false' && <Gallery />}
                  {settings.section_devlogs_visible !== 'false' && <DevLogs />}
                  {settings.enable_contact_form !== 'false' && settings.section_contact_visible !== 'false' && <Contact />}
                </main>
              } />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/devlogs" element={<DevLogsPage />} />
              <Route path="/img" element={<ImageOptimizerPage />} />
              <Route path="/devlogs/:slug" element={<ArticlePage />} />
              <Route path="/notepad" element={<Notepad />} />
              <Route path="/qr" element={<QRCodeGenerator />} />
              <Route path="/nfc" element={<NFCPage />} />
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
