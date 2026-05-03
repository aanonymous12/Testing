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
import { sanitizeText, sanitizeUrl } from './lib/security';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// SECURITY: Input validation schemas
// ============================================
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePhone = (phone: string): boolean => {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  // Must be between 10-15 digits (international format)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

const validateName = (name: string): boolean => {
  // Alphanumeric, spaces, hyphens, apostrophes only
  const nameRegex = /^[a-zA-Z\s'-]{1,100}$/;
  return nameRegex.test(name);
};

// ============================================
// SECURITY: Allowed image domains for SSRF protection
// ============================================
const ALLOWED_IMAGE_DOMAINS = [
  'supabase.co',
  'janakpanthi.com',
  'janakpanthi.com.np',
  'vercel.app',
  // Add your CDN domains here
];

const isAllowedImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    
    // Block internal/private IPs
    const forbiddenHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '192.168.',
      '10.',
      '172.16.',
    ];
    
    if (forbiddenHosts.some(host => parsed.hostname.includes(host))) {
      return false;
    }
    
    // Check if domain is allowed
    return ALLOWED_IMAGE_DOMAINS.some(domain => 
      parsed.hostname.endsWith(domain)
    );
  } catch {
    return false;
  }
};

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveContact = async () => {
    setIsGeneratingVCard(true);
    try {
      // SECURITY: Sanitize all inputs
      const name = sanitizeText(settings.connect_name || settings.hero_name || 'Janak Panthi', true);
      const phone = sanitizeText(settings.connect_phone || settings.contact_phone || '+1 234 567 890', true);
      const email = sanitizeText(settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np', true);
      const url = sanitizeUrl(settings.connect_website || settings.contact_website || 'https://janakpanthi.com.np');
      const title = sanitizeText(settings.connect_subtitle || settings.hero_subtitle || 'Undergraduate Research Assistant', true);
      const org = sanitizeText(settings.connect_address || settings.contact_address || 'Texas State University', true);

      // SECURITY: Validate email format
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      const nameParts = name.split(' ');
      const lastName = nameParts.length > 1 ? nameParts.slice(-1)[0] : '';
      const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];

      let photoBase64 = '';
      const imageUrl = settings.connect_image || settings.about_image || "https://www.janakpanthi.com.np/Resources/images/janak_panthi.jpg";
      
      // SECURITY: Validate image URL before fetching
      if (imageUrl && imageUrl.startsWith('http') && isAllowedImageUrl(imageUrl)) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch(imageUrl, { 
            mode: 'cors',
            signal: controller.signal,
            headers: {
              'User-Agent': 'JanakPanthiPortfolio/1.0'
            }
          });
          
          clearTimeout(timeout);

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          // SECURITY: Check content length
          const contentLength = response.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
            throw new Error('Image too large (max 5MB)');
          }

          const blob = await response.blob();
          
          // SECURITY: Verify it's actually an image
          if (!blob.type.startsWith('image/')) {
            throw new Error('Invalid image type');
          }

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
          console.error('Error fetching image for vCard:', error);
          // Continue without photo if fetch fails
        }
      } else if (imageUrl && imageUrl.startsWith('http')) {
        console.warn('Image URL not allowed:', imageUrl);
      }

      // Generate vCard content with sanitized data
      let vCardData = `BEGIN:VCARD
VERSION:3.0
N;CHARSET=UTF-8:${lastName};${firstName};;;
FN;CHARSET=UTF-8:${name}
TEL;TYPE=CELL,VOICE;CHARSET=UTF-8:${phone}
EMAIL;TYPE=INTERNET;CHARSET=UTF-8:${email}
URL;CHARSET=UTF-8:${url || 'https://janakpanthi.com.np'}
TITLE;CHARSET=UTF-8:${title}
ORG;CHARSET=UTF-8:${org}`;

      if (photoBase64) {
        const foldedPhoto = photoBase64.match(/.{1,75}/g)?.join('\r\n ') || photoBase64;
        vCardData += `\r\nPHOTO;TYPE=JPEG;ENCODING=b:${foldedPhoto}`;
      }

      vCardData += `\r\nEND:VCARD`;

      const vCardBlob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
      const blobURL = URL.createObjectURL(vCardBlob);

      const a = document.createElement('a');
      a.href = blobURL;
      a.setAttribute('download', `${name.replace(/\s+/g, '_')}.vcf`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobURL);
      
      showNotification('Contact card saved successfully!');
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
      showNotification('Failed to generate QR code.', 'error');
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
        title: sanitizeText(settings.hero_name || 'Janak Panthi', true),
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
    const phone = sanitizeText(settings.connect_phone || settings.contact_phone || '', true).replace(/\D/g, '');
    if (phone) {
      window.open(`https://wa.me/${phone}`, '_blank');
    }
  };

  // SECURITY: Comprehensive form validation
  const validateExchangeForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate name
    if (!exchangeName.trim()) {
      errors.name = 'Name is required';
    } else if (!validateName(exchangeName)) {
      errors.name = 'Invalid name format (letters, spaces, hyphens only)';
    }

    // Validate email
    if (!exchangeEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(exchangeEmail)) {
      errors.email = 'Invalid email format';
    }

    // Validate phone
    if (!exchangePhone.trim()) {
      errors.phone = 'Phone is required';
    } else if (!validatePhone(exchangePhone)) {
      errors.phone = 'Invalid phone format (10-15 digits)';
    }

    // Validate note length
    if (exchangeNote.length > 500) {
      errors.note = 'Note too long (max 500 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExchangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURITY: Validate before submitting
    if (!validateExchangeForm()) {
      showNotification('Please fix validation errors', 'error');
      return;
    }
    
    setIsExchanging(true);
    try {
      // SECURITY: Sanitize all inputs
      const sanitizedData = {
        name: sanitizeText(exchangeName, true),
        phone: sanitizeText(exchangePhone, true),
        email: sanitizeText(exchangeEmail, true),
        note: sanitizeText(exchangeNote, true)
      };

      // Insert into database
      const { error } = await supabase
        .from('contact_exchanges')
        .insert([sanitizedData]);
      
      if (error) throw error;
      
      // SECURITY: Send notification with error handling
      try {
        const response = await fetch('/api/v1/notify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            type: 'contact_exchange',
            data: sanitizedData
          })
        });

        if (!response.ok) {
          console.error('Notification API error:', response.status);
        }
      } catch (notifyErr) {
        console.error('Failed to notify admin:', notifyErr);
        // Don't fail the entire operation if notification fails
      }
      
      showNotification('Contact shared successfully!');
      setShowExchangeModal(false);
      setExchangeName('');
      setExchangePhone('+1 ');
      setExchangeEmail('');
      setExchangeNote('');
      setValidationErrors({});
    } catch (err: any) {
      console.error('Exchange error:', err);
      showNotification(
        err.message || 'Failed to share contact. Please try again.', 
        'error'
      );
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
    { 
      label: 'Email', 
      value: sanitizeText(settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np', true), 
      icon: Mail, 
      href: `mailto:${sanitizeText(settings.connect_email || settings.contact_email || 'contact@janakpanthi.com.np', true)}` 
    },
    ...(showPhone ? [{ 
      label: 'Phone', 
      value: sanitizeText(settings.connect_phone || settings.contact_phone || '+977 98XXXXXXXX', true), 
      icon: Phone, 
      href: `tel:${sanitizeText(settings.connect_phone || settings.contact_phone || '', true).replace(/\s+/g, '')}` 
    }] : []),
    { 
      label: 'Website', 
      value: sanitizeText(settings.connect_website || settings.contact_website || 'janakpanthi.com.np', true), 
      icon: Globe, 
      href: sanitizeUrl((settings.connect_website || settings.contact_website) ? 
        ((settings.connect_website || settings.contact_website).startsWith('http') ? 
          (settings.connect_website || settings.contact_website) : 
          `https://${settings.connect_website || settings.contact_website}`) : 
        'https://janakpanthi.com.np') || '#'
    },
    { 
      label: 'Location', 
      value: sanitizeText(settings.connect_address || settings.contact_address || 'San Marcos, Texas', true), 
      icon: MapPin, 
      href: '#' 
    },
  ];

  const connectLinks = socialLinks.filter(link => link.category === 'connect');

  return (
    <div className="min-h-screen bg-page text-primary font-body selection:bg-accent selection:text-page pb-12">
      <SEO 
        title={sanitizeText(settings.connect_name || settings.hero_name || "Janak Panthi", true)}
        description={sanitizeText(settings.connect_bio || "Connect with me via my digital business card.", true)}
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
                  alt={sanitizeText(settings.connect_name || settings.hero_name || "Janak Panthi", true)}
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
                {sanitizeText(settings.connect_name || settings.hero_name || "Janak Panthi", true)}
              </h1>
              <p className="text-accent/80 font-mono text-[10px] uppercase tracking-[0.2em] mt-3 font-semibold">
                {sanitizeText(settings.connect_subtitle || settings.hero_subtitle || "Undergraduate Research Assistant", true)}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-primary/50 font-headline font-semibold text-[10px] uppercase tracking-[0.15em]">
                  {sanitizeText(settings.connect_address || settings.contact_address || "Texas State University", true)}
                </p>
              </div>
              <p className="text-secondary text-[15px] mt-6 leading-relaxed max-w-[320px] mx-auto opacity-90 font-medium">
                {sanitizeText(settings.connect_bio || "I am currently pursuing a Bachelor's Degree in Computer Science, working as an Undergraduate Research Assistant while continuously expanding my expertise to keep pace with the latest industry trends.", true)}
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
              href={sanitizeUrl("https://janakpanthi.com.np") || '#'}
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
                const safeUrl = sanitizeUrl(link.url) || '#';
                
                return (
                  <motion.a
                    key={link.id}
                    href={safeUrl}
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
                  const phone = sanitizeText(settings.connect_phone || settings.contact_phone || '').replace(/\D/g, '');
                  if (phone) {
                    window.location.href = `tel:+${phone}`;
                  }
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
                  {shareOptions
                    .filter((option) => {
                      const name = (option.name || '').toLowerCase();
                      const isFacebook = 
                        name.includes('facebook') || 
                        name.includes('messenger') || 
                        name === 'fb' ||
                        name === 'meta' ||
                        name.includes('fb.com');
                      return !(isFacebook && showPhone);
                    })
                    .map((option) => (
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

      {/* Exchange Contact Modal - WITH VALIDATION */}
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
                onClick={() => {
                  setShowExchangeModal(false);
                  setValidationErrors({});
                }}
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
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Your Name *</label>
                  <input 
                    type="text" 
                    required
                    value={exchangeName}
                    onChange={(e) => {
                      setExchangeName(e.target.value);
                      if (validationErrors.name) {
                        setValidationErrors(prev => ({ ...prev, name: '' }));
                      }
                    }}
                    placeholder="Full Name"
                    maxLength={100}
                    className={cn(
                      "w-full bg-card border rounded-2xl px-4 py-3 text-sm outline-none transition-colors",
                      validationErrors.name 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-muted focus:border-accent"
                    )}
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-red-500 ml-2 mt-1">{validationErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={exchangeEmail}
                    onChange={(e) => {
                      setExchangeEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    placeholder="example@email.com"
                    maxLength={255}
                    className={cn(
                      "w-full bg-card border rounded-2xl px-4 py-3 text-sm outline-none transition-colors",
                      validationErrors.email 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-muted focus:border-accent"
                    )}
                  />
                  {validationErrors.email && (
                    <p className="text-xs text-red-500 ml-2 mt-1">{validationErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    value={exchangePhone}
                    onChange={(e) => {
                      setExchangePhone(e.target.value);
                      if (validationErrors.phone) {
                        setValidationErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    placeholder="+1 234 567 890"
                    maxLength={20}
                    className={cn(
                      "w-full bg-card border rounded-2xl px-4 py-3 text-sm outline-none transition-colors",
                      validationErrors.phone 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-muted focus:border-accent"
                    )}
                  />
                  {validationErrors.phone && (
                    <p className="text-xs text-red-500 ml-2 mt-1">{validationErrors.phone}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-secondary/60 ml-2">Note (Optional)</label>
                  <textarea 
                    value={exchangeNote}
                    onChange={(e) => {
                      setExchangeNote(e.target.value);
                      if (validationErrors.note) {
                        setValidationErrors(prev => ({ ...prev, note: '' }));
                      }
                    }}
                    placeholder="Add a short note..."
                    rows={3}
                    maxLength={500}
                    className={cn(
                      "w-full bg-card border rounded-2xl px-4 py-3 text-sm outline-none transition-colors resize-none",
                      validationErrors.note 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-muted focus:border-accent"
                    )}
                  />
                  {validationErrors.note && (
                    <p className="text-xs text-red-500 ml-2 mt-1">{validationErrors.note}</p>
                  )}
                  <p className="text-xs text-secondary/50 ml-2 mt-1">{exchangeNote.length}/500</p>
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
