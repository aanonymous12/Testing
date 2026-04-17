import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { 
  Mail, Globe, Phone, UserPlus, Share2, ArrowLeft,
  ExternalLink, MapPin, Loader2, X, Download, MessageCircle,
  Facebook, Twitter, Linkedin, Link as LinkIcon, MoreHorizontal,
  CheckCircle, Send
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { tracking } from './lib/tracking';
import { useSettings, useSocialLinks } from './hooks/useContent';
import { supabase } from './lib/supabase';
import SEO from './components/SEO';
import QRCode from 'qrcode';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Connect_with_Me = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const { socialLinks, loading: socialLoading } = useSocialLinks();
  
  React.useEffect(() => {
    tracking.trackPageView();
  }, []);

  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingVCard, setIsGeneratingVCard] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exchangeName, setExchangeName] = useState('');
  const [exchangePhone, setExchangePhone] = useState('+1 ');
  const [exchangeEmail, setExchangeEmail] = useState('');
  const [exchangeNote, setExchangeNote] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveContact = async () => {
    setIsGeneratingVCard(true);
    try {
      const name = settings.connect_name || settings.hero_name || 'Janak Panthi';
      const phone = settings.connect_phone || settings.contact_phone || '+1 234 567 890';
      const email = settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np';
      const url = settings.connect_website || settings.contact_website || 'janakpanthi.com.np';
      const title = settings.connect_subtitle || settings.hero_subtitle || 'Undergraduate Research Assistant';
      const org = settings.connect_address || settings.contact_address || 'Texas State University';

      const nameParts = name.split(' ');
      const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];

      let photoBase64 = '';
      const imageUrl = settings.connect_image || settings.about_image || "https://www.janakpanthi.com.np/Resources/images/janak_panthi.jpg";
      if (imageUrl && imageUrl.startsWith('http')) {
        try {
          const response = await fetch(imageUrl, { mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          photoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error fetching image for vCard (likely CORS or invalid URL):', error);
          // Continue without photo if fetch fails
        }
      }

      let vCardData = `BEGIN:VCARD
VERSION:3.0
N;CHARSET=UTF-8:${lastName};${firstName};;;
FN;CHARSET=UTF-8:${name}
TEL;TYPE=CELL,VOICE;CHARSET=UTF-8:${phone}
EMAIL;TYPE=INTERNET;CHARSET=UTF-8:${email}
URL;CHARSET=UTF-8:${url.startsWith('http') ? url : 'https://' + url}
TITLE;CHARSET=UTF-8:${title}
ORG;CHARSET=UTF-8:${org}`;

      if (photoBase64) {
        vCardData += `
PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`;
      }

      vCardData += `
END:VCARD`;

      const vCardBlob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
      const blobURL = URL.createObjectURL(vCardBlob);

      const a = document.createElement('a');
      a.href = blobURL;
      a.setAttribute('download', `${name.replace(/\s+/g, '_')}.vcf`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobURL);
    } catch (error) {
      console.error('vCard generation failed:', error);
      showNotification('Failed to generate contact card.', 'error');
    } finally {
      setIsGeneratingVCard(false);
    }
  };

  const handleShare = async () => {
    try {
      const currentURL = window.location.href;
      const dataUrl = await QRCode.toDataURL(currentURL, {
        width: 400,
        margin: 2,
        color: {
          dark: '#da755b',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  const handleDownloadQR = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Janak-Panthi-QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: settings.hero_name || 'Janak Panthi',
        url: window.location.href
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showNotification('Link copied to clipboard!');
  };

  const shareOptions = [
    { 
      name: 'WhatsApp', 
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ), 
      color: '#25D366',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(window.location.href)}`, '_blank')
    },
    { 
      name: 'Messenger', 
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.303 2.254.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.291 14.893l-3.048-3.253-5.947 3.253 6.543-6.957 3.128 3.253 5.867-3.253-6.543 6.957z"/>
        </svg>
      ), 
      color: '#0084FF',
      action: () => window.open(`fb-messenger://share/?link=${encodeURIComponent(window.location.href)}`, '_blank')
    },
    { 
      name: 'Facebook', 
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ), 
      color: '#1877F2',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')
    },
    { 
      name: 'X', 
      icon: () => (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.856 6.064-6.856zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z"/>
        </svg>
      ), 
      color: '#000000',
      action: () => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`, '_blank')
    },
    { 
      name: 'LinkedIn', 
      icon: () => <Linkedin size={24} />, 
      color: '#0A66C2',
      action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, '_blank')
    },
    { 
      name: 'Email', 
      icon: () => <Mail size={24} />, 
      color: '#EA4335',
      action: () => window.location.href = `mailto:?subject=Check out this profile&body=${encodeURIComponent(window.location.href)}`
    },
    { 
      name: 'Copy', 
      icon: () => <LinkIcon size={24} />, 
      color: '#6B7280',
      action: handleCopyLink
    },
    { 
      name: 'More', 
      icon: () => <MoreHorizontal size={24} />, 
      color: '#da755b',
      action: handleNativeShare
    },
  ];

  const handleWhatsApp = () => {
    const phone = (settings.connect_phone || settings.contact_phone || '+9779847000000').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeName || !exchangePhone) return;
    
    setIsExchanging(true);
    try {
      const { error } = await supabase
        .from('contact_exchanges')
        .insert([{ 
          name: exchangeName, 
          phone: exchangePhone, 
          email: exchangeEmail,
          note: exchangeNote
        }]);
      
      if (error) throw error;
      
      // Send email notification to admin
      try {
        await fetch('/api/v1/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contact_exchange',
            data: {
              name: exchangeName,
              phone: exchangePhone,
              email: exchangeEmail,
              note: exchangeNote
            }
          })
        });
      } catch (notifyErr) {
        console.error('Failed to notify admin:', notifyErr);
      }
      
      showNotification('Contact shared successfully!');
      setShowExchangeModal(false);
      setExchangeName('');
      setExchangePhone('');
      setExchangeEmail('');
      setExchangeNote('');
    } catch (err: any) {
      console.error('Exchange error:', err);
      showNotification('Failed to share contact: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsExchanging(false);
    }
  };

  React.useEffect(() => {
    if (showQR || showExchangeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showQR, showExchangeModal]);

  if (settingsLoading || socialLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const showPhone = settings.show_phone_on_connect !== 'false';

  const contactInfo = [
    { label: 'Email', value: settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np', icon: Mail, href: `mailto:${settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np'}` },
    ...(showPhone ? [{ label: 'Phone', value: settings.connect_phone || settings.contact_phone || '+977 98XXXXXXXX', icon: Phone, href: `tel:${(settings.connect_phone || settings.contact_phone || '+9779847000000').replace(/\s+/g, '')}` }] : []),
    { label: 'Website', value: settings.connect_website || settings.contact_website || 'janakpanthi.com.np', icon: Globe, href: (settings.connect_website || settings.contact_website) ? ((settings.connect_website || settings.contact_website).startsWith('http') ? (settings.connect_website || settings.contact_website) : `https://${settings.connect_website || settings.contact_website}`) : 'https://janakpanthi.com.np' },
    { label: 'Location', value: settings.connect_address || settings.contact_address || 'San Marcos, Texas', icon: MapPin, href: '#' },
  ];

  const connectLinks = socialLinks.filter(link => link.category === 'connect');

  return (
    <div className="min-h-screen bg-page text-primary font-body selection:bg-accent selection:text-page pb-12">
      <SEO 
        title={settings.connect_name || settings.hero_name || "Janak Panthi"}
        description={settings.connect_bio || "Connect with me via my digital business card."}
        image={settings.connect_image || settings.about_image || "https://www.janakpanthi.com.np/Resources/images/janak_panthi.jpg"}
        url={window.location.href}
      />
      
      {/* Inline Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-xs"
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

      {/* Header / Back Button */}
      <div className="max-w-md mx-auto px-6 pt-8 flex justify-between items-center">
        <Link to="/" className="p-2 rounded-full bg-card border border-muted text-secondary hover:text-accent transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <button 
          onClick={handleShare}
          className="p-2 rounded-full bg-card border border-muted text-secondary hover:text-accent transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <main className="max-w-md mx-auto px-6 mt-8">
        {/* Profile Card */}
        <div className="relative">
          {/* Banner / Background Decor */}
          <div className="h-32 w-full bg-accent/10 rounded-3xl overflow-hidden relative">
            {settings.connect_banner ? (
              <img 
                src={settings.connect_banner} 
                alt="Banner" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <>
                <div className="absolute inset-0 diagonal-lines opacity-10"></div>
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
              </>
            )}
          </div>

          {/* Profile Info */}
          <div className="px-4 -mt-16 text-center">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative inline-block"
            >
              <div className="w-32 h-32 rounded-full border-4 border-page bg-card overflow-hidden shadow-xl mx-auto">
                <img 
                  src={settings.connect_image || settings.about_image || "https://www.janakpanthi.com.np/Resources/images/janak_panthi.jpg"} 
                  alt={settings.connect_name || settings.hero_name || "Janak Panthi"}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-accent rounded-full border-4 border-page flex items-center justify-center">
                <div className="w-2 h-2 bg-page rounded-full animate-pulse"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4"
            >
              <h1 className="text-3xl font-bold font-headline tracking-tight text-accent">
                {settings.connect_name || settings.hero_name || "Janak Panthi"}
              </h1>
              <p className="text-accent/80 font-mono text-[10px] uppercase tracking-[0.2em] mt-3 font-semibold">
                {settings.connect_subtitle || settings.hero_subtitle || "Undergraduate Research Assistant"}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-primary/50 font-headline font-semibold text-[10px] uppercase tracking-[0.15em]">
                  {settings.connect_address || settings.contact_address || "Texas State University"}
                </p>
              </div>
              <p className="text-secondary text-[15px] mt-6 leading-relaxed max-w-[320px] mx-auto opacity-90 font-medium">
                {settings.connect_bio || "I am currently pursuing a Bachelor's Degree in Computer Science, working as an Undergraduate Research Assistant while continuously expanding my expertise to keep pace with the latest industry trends."}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Social Links Grid */}
        <div className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-4 px-2">Social Profiles</h2>
          <div className="grid grid-cols-4 gap-4">
            {/* WhatsApp Shortcut */}
            {showPhone && (
              <motion.button
                whileHover={{ y: -5 }}
                onClick={handleWhatsApp}
                className="aspect-square bg-card border border-muted rounded-2xl flex items-center justify-center text-secondary hover:text-[#25D366] hover:border-[#25D366] transition-all"
              >
                <MessageCircle className="w-6 h-6" />
              </motion.button>
            )}
            
            {/* Website Shortcut */}
            <motion.a
              whileHover={{ y: -5 }}
              href="https://janakpanthi.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square bg-card border border-muted rounded-2xl flex items-center justify-center text-secondary hover:text-accent hover:border-accent transition-all"
            >
              <Globe className="w-6 h-6" />
            </motion.a>

            {connectLinks
              .filter((link, index, self) => 
                index === self.findIndex((t) => t.platform === link.platform)
              )
              .map((link) => {
                const Icon = (LucideIcons as any)[link.icon_name] || LucideIcons.Globe;
                return (
                  <motion.a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ y: -5 }}
                    className="aspect-square bg-card border border-muted rounded-2xl flex items-center justify-center text-secondary hover:text-accent hover:border-accent transition-all"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.a>
                );
              })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mt-10">
          {showPhone ? (
            <>
              <button 
                onClick={handleSaveContact}
                disabled={isGeneratingVCard}
                className="flex flex-col items-center justify-center gap-2 bg-primary text-page py-5 rounded-[24px] font-headline font-bold text-[9px] uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
              >
                {isGeneratingVCard ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Save
              </button>
              <button 
                onClick={() => {
                  const phone = (settings.connect_phone || settings.contact_phone || '+9779847000000').replace(/\D/g, '');
                  window.location.href = `tel:+${phone}`;
                }}
                className="flex flex-col items-center justify-center gap-2 bg-card border border-muted text-primary py-5 rounded-[24px] font-headline font-bold text-[9px] uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Phone className="w-5 h-5" />
                Call
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowExchangeModal(true)}
              className="col-span-2 flex items-center justify-center gap-3 bg-primary text-page py-4 rounded-2xl font-headline font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/10"
            >
              <UserPlus className="w-4 h-4" />
              Exchange Contact
            </button>
          )}
          <button 
            onClick={handleShare}
            className="flex flex-col items-center justify-center gap-2 bg-card border border-muted text-primary py-5 rounded-[24px] font-headline font-bold text-[9px] uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>

        {/* Contact Info List */}
        <div className="mt-10 space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-4 px-2">Contact Details</h2>
          {contactInfo.map((info) => (
            <a
              key={info.label}
              href={info.href}
              className="flex items-center gap-4 p-4 bg-card border border-muted rounded-2xl hover:border-accent group transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-page transition-all">
                <info.icon className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <p className="text-[10px] font-mono uppercase tracking-wider text-secondary/60">{info.label}</p>
                <p className="text-sm font-medium text-primary">{info.value}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-secondary/30 group-hover:text-accent transition-colors" />
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
        </div>
      </main>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm p-6 flex justify-center items-start"
            onClick={() => setShowQR(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-page w-full max-w-sm rounded-3xl p-8 text-center relative shadow-2xl my-auto"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-4 right-4 p-2 text-secondary hover:text-accent transition-colors"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold font-headline text-accent mb-2">Share Profile</h2>
              <p className="text-secondary text-xs mb-6">Scan this code to view my digital business card.</p>
              
              <div className="bg-white p-4 rounded-2xl inline-block mb-8 shadow-inner">
                <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" />
              </div>
              
              <div className="w-full">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-secondary mb-4 text-left px-2">Share via</h3>
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide -mx-2 px-2 scroll-smooth">
                  {shareOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={option.action}
                      className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    >
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110"
                        style={{ backgroundColor: option.color }}
                      >
                        <option.icon />
                      </div>
                      <span className="text-[10px] font-medium text-secondary">{option.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-muted">
                <button 
                  onClick={handleDownloadQR}
                  className="w-full flex items-center justify-center gap-2 text-secondary hover:text-accent transition-colors text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save QR Image
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exchange Contact Modal */}
      <AnimatePresence>
        {showExchangeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-sm p-6 flex justify-center items-start"
            onClick={() => setShowExchangeModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-page w-full max-w-sm rounded-3xl p-8 relative shadow-2xl my-auto"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowExchangeModal(false)}
                className="absolute top-4 right-4 p-2 text-secondary hover:text-accent transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-4">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold font-headline text-accent mb-2">Exchange Contact</h2>
                <p className="text-secondary text-xs">Share your contact details with me.</p>
              </div>

              <form onSubmit={handleExchangeSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={exchangeName}
                    onChange={(e) => setExchangeName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-card border border-muted rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={exchangeEmail}
                    onChange={(e) => setExchangeEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full bg-card border border-muted rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    value={exchangePhone}
                    onChange={(e) => setExchangePhone(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full bg-card border border-muted rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Note (Optional)</label>
                  <textarea 
                    value={exchangeNote}
                    onChange={(e) => setExchangeNote(e.target.value)}
                    placeholder="Add a short note..."
                    rows={3}
                    className="w-full bg-card border border-muted rounded-2xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors resize-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isExchanging}
                  className="w-full bg-primary text-page py-4 rounded-2xl font-headline font-bold text-xs uppercase tracking-[0.15em] hover:bg-primary/90 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isExchanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Share Contact
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Connect_with_Me;

