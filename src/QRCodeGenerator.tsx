import React, { useState, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Download, Copy, Share2, Check, Loader2, Link as LinkIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const QRCodeGenerator = () => {
  const [url, setUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'black' | 'white' | 'transparent' | 'transparent-white'>('black');
  const qrRef = useRef<HTMLDivElement>(null);

  const generateQRCode = async (selectedTheme = theme) => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      let dark = '#000000';
      let light = '#FFFFFF';

      if (selectedTheme === 'white') {
        dark = '#FFFFFF';
        light = '#000000';
      } else if (selectedTheme === 'transparent') {
        dark = '#000000';
        light = '#00000000'; // Transparent
      } else if (selectedTheme === 'transparent-white') {
        dark = '#FFFFFF';
        light = '#00000000'; // Transparent
      }

      const dataUrl = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        color: {
          dark,
          light,
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'black' | 'white' | 'transparent' | 'transparent-white') => {
    setTheme(newTheme);
    if (qrDataUrl) {
      generateQRCode(newTheme);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQR = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying QR code:', err);
    }
  };

  const shareQR = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'qrcode.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'QR Code',
          text: 'Generated QR Code from Janak Panthi Portfolio',
        });
      } else {
        alert('Sharing is not supported on this browser. You can download the image instead.');
      }
    } catch (err) {
      console.error('Error sharing QR code:', err);
    }
  };

  return (
    <div className="min-h-screen bg-page pt-32 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-card border border-muted rounded-2xl mb-6">
            <QrCode className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-secondary mb-4 tracking-tight">
            QR Code Generator
          </h1>
          <p className="text-secondary/60 max-w-xl mx-auto font-body leading-relaxed">
            Generate high-quality black and white QR codes for any URL. 
            Download, copy, or share them instantly.
          </p>
        </motion.div>

        <div className="bg-card border border-muted rounded-3xl p-6 md:p-12 shadow-sm">
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-accent">
                  Enter URL or Text
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-4 md:left-6 flex items-center pointer-events-none">
                      <LinkIcon className="w-4 h-4 md:w-5 md:h-5 text-secondary/30 group-focus-within:text-accent transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && generateQRCode()}
                      placeholder="https://example.com"
                      className="w-full bg-alt border-2 border-muted pl-12 md:pl-16 pr-4 py-4 md:py-5 rounded-2xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/20 font-body text-base md:text-lg"
                    />
                  </div>
                  <button
                    onClick={() => generateQRCode()}
                    disabled={!url.trim() || loading}
                    className="bg-primary text-page px-8 py-4 md:py-5 rounded-2xl font-headline font-bold text-sm md:text-base hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-accent">
                  Select Theme
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { id: 'black', label: 'Black', colors: 'bg-white border-black' },
                    { id: 'white', label: 'White', colors: 'bg-black border-white' },
                    { id: 'transparent', label: 'Trans. Black', colors: 'bg-transparent border-accent border-dashed' },
                    { id: 'transparent-white', label: 'Trans. White', colors: 'bg-transparent border-white border-dashed' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 md:px-5 py-3 md:py-4 rounded-xl border-2 transition-all font-headline font-medium text-xs md:text-sm whitespace-nowrap",
                        theme === t.id 
                          ? "border-accent bg-accent/5 text-accent" 
                          : "border-muted hover:border-accent/50 text-secondary/60"
                      )}
                    >
                      <div className={cn("w-3 h-3 md:w-4 md:h-4 rounded-sm border shrink-0", t.colors)} />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {qrDataUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center space-y-8 pt-8 border-t border-muted"
                >
                  <div className="relative group">
                    <div className={cn(
                      "p-4 rounded-2xl shadow-lg border transition-all",
                      theme === 'black' ? "bg-white border-muted" : 
                      theme === 'white' ? "bg-black border-white/20" : 
                      "bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-repeat border-accent/20"
                    )}>
                      <img
                        src={qrDataUrl}
                        alt="Generated QR Code"
                        className="w-64 h-64 md:w-80 md:h-80"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      onClick={copyQR}
                      className="flex items-center gap-3 bg-card border-2 border-muted px-6 py-3 rounded-xl font-headline font-medium text-sm hover:border-accent transition-all group"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-secondary/60 group-hover:text-accent transition-colors" />
                          <span>Copy Image</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={downloadQR}
                      className="flex items-center gap-3 bg-card border-2 border-muted px-6 py-3 rounded-xl font-headline font-medium text-sm hover:border-accent transition-all group"
                    >
                      <Download className="w-4 h-4 text-secondary/60 group-hover:text-accent transition-colors" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={shareQR}
                      className="flex items-center gap-3 bg-card border-2 border-muted px-6 py-3 rounded-xl font-headline font-medium text-sm hover:border-accent transition-all group"
                    >
                      <Share2 className="w-4 h-4 text-secondary/60 group-hover:text-accent transition-colors" />
                      <span>Share</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
