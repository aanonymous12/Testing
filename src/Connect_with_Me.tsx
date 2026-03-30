import React from 'react';
import { motion } from 'motion/react';
import * as LucideIcons from 'lucide-react';
import { 
  Mail, Globe, Phone, UserPlus, Share2, ArrowLeft,
  ExternalLink, MapPin, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings, useSocialLinks } from './hooks/useContent';

const Connect_with_Me = () => {
  const { settings, loading: settingsLoading } = useSettings();
  const { socialLinks, loading: socialLoading } = useSocialLinks();

  const handleSaveContact = () => {
    // In a real app, this would generate a vCard (.vcf) file
    alert(`Generating vCard for ${settings.hero_name || 'Janak Panthi'}...`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: settings.hero_name || 'Janak Panthi',
        url: window.location.href
      }).catch(console.error);
    } else {
      alert('Link copied to clipboard!');
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (settingsLoading || socialLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const contactInfo = [
    { label: 'Email', value: settings.connect_email || settings.contact_email || 'hello@janakpanthi.com', icon: Mail, href: `mailto:${settings.connect_email || settings.contact_email || 'hello@janakpanthi.com'}` },
    { label: 'Phone', value: settings.connect_phone || settings.contact_phone || '+977 98XXXXXXXX', icon: Phone, href: `tel:${settings.connect_phone || settings.contact_phone || '+97798XXXXXXXX'}` },
    { label: 'Website', value: settings.connect_website || settings.contact_website || 'janakpanthi.com.np', icon: Globe, href: (settings.connect_website || settings.contact_website) ? ((settings.connect_website || settings.contact_website).startsWith('http') ? (settings.connect_website || settings.contact_website) : `https://${settings.connect_website || settings.contact_website}`) : 'https://janakpanthi.com.np' },
    { label: 'Location', value: settings.connect_address || settings.contact_address || 'San Marcos, Texas', icon: MapPin, href: '#' },
  ];

  const connectLinks = socialLinks.filter(link => link.category === 'connect');

  return (
    <div className="min-h-screen bg-page text-primary font-body selection:bg-accent selection:text-page pb-12">
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
            <div className="absolute inset-0 diagonal-lines opacity-10"></div>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl"></div>
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
                  src={settings.connect_image || settings.about_image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAgd4MZoIJ7G0LGQdeRBbcOaYBiiyYRpSdCzSBKA1XGnt8a33ePAVQCRpTiVzi8cpgG_new8IT15uCDn75ZoP287dczzhKpjl61vx1aW4gjqhkVviLdYrnKrED8wvOA2xbS7W-zxochrL6ymanS79SsBalgqPQI4uaTee_VFc99564VHv2wbyXq8e2Vv_czD3KQmD_pbMgjiXUVNQ65JbCjqypxB65dmc5lPustvDhpwSIGzkIhfILwnQKNpxXshoAbtVD7m-VSErvV"} 
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
              <h1 className="text-2xl font-bold font-headline tracking-tight leading-none text-accent">
                {settings.connect_name || settings.hero_name || "Janak Panthi"}
              </h1>
              <p className="text-accent font-mono text-[11px] uppercase tracking-[0.15em] mt-2 leading-tight">
                {settings.connect_subtitle || settings.hero_subtitle || "Undergraduate Research Assistant"}
              </p>
              <p className="text-primary/50 font-headline font-semibold text-[10px] uppercase tracking-[0.2em] mt-1 leading-tight">
                {settings.connect_address || settings.contact_address || "Texas State University"}
              </p>
              <p className="text-secondary text-sm mt-5 leading-relaxed max-w-[300px] mx-auto opacity-90 font-medium">
                {settings.connect_bio || "I am currently pursuing a Bachelor's Degree in Computer Science, working as an Undergraduate Research Assistant while continuously expanding my expertise to keep pace with the latest industry trends."}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button 
            onClick={handleSaveContact}
            className="flex items-center justify-center gap-2 bg-primary text-page py-4 rounded-2xl font-headline font-medium text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-primary/10"
          >
            <UserPlus className="w-4 h-4" />
            Save Contact
          </button>
          <button 
            onClick={() => window.location.href = `mailto:${settings.contact_email || 'hello@janakpanthi.com'}`}
            className="flex items-center justify-center gap-2 bg-card border border-muted text-primary py-4 rounded-2xl font-headline font-medium text-sm hover:scale-[1.02] transition-transform"
          >
            <Mail className="w-4 h-4" />
            Message
          </button>
        </div>

        {/* Social Links Grid */}
        <div className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-4 px-2">Social Profiles</h2>
          <div className="grid grid-cols-4 gap-4">
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
    </div>
  );
};

export default Connect_with_Me;

