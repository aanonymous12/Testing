import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, Nfc, Database, Edit3, Trash2, Lock, Unlock, 
  Shield, ShieldAlert, Cpu, Loader2, Info, AlertCircle, 
  CheckCircle2, Wifi, Zap, History, Save, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NFCRecord {
  recordType: string;
  mediaType?: string;
  data?: string;
  encoding?: string;
  lang?: string;
}

interface NFCLog {
  id: string;
  timestamp: Date;
  type: 'read' | 'write' | 'error' | 'info' | 'success';
  message: string;
  details?: any;
}

const NFCPage = () => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState<NFCRecord[]>([]);
  const [logs, setLogs] = useState<NFCLog[]>([]);
  const [activeTab, setActiveTab] = useState<'read' | 'write' | 'tools'>('read');
  const [writeText, setWriteText] = useState('');
  const [writeUrl, setWriteUrl] = useState('');

  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsSupported(true);
      addLog('info', 'Web NFC is supported on this browser.');
    } else {
      setIsSupported(false);
      addLog('error', 'Web NFC is not supported on this browser. Try Chrome on Android.');
    }
  }, []);

  const addLog = (type: NFCLog['type'], message: string, details?: any) => {
    const newLog: NFCLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const startScan = async () => {
    if (!isSupported) return;
    
    try {
      setIsScanning(true);
      setStatus('scanning');
      addLog('info', 'Starting NFC scan...');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("readingerror", () => {
        addLog('error', 'Argh! Cannot read data from the NFC tag. Try another one?');
        setStatus('error');
      });

      ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
        addLog('success', `Read successful! Serial Number: ${serialNumber}`);
        setStatus('success');
        
        const newRecords: NFCRecord[] = [];
        for (const record of message.records) {
          const decoder = new TextDecoder(record.encoding || 'utf-8');
          newRecords.push({
            recordType: record.recordType,
            mediaType: record.mediaType,
            data: decoder.decode(record.data),
            encoding: record.encoding,
            lang: record.lang
          });
        }
        setRecords(newRecords);
        setTimeout(() => setStatus('idle'), 3000);
      });

    } catch (error: any) {
      addLog('error', `Scan failed: ${error.message}`);
      setStatus('error');
    } finally {
      setIsScanning(false);
    }
  };

  const writeTag = async (type: 'text' | 'url' | 'empty') => {
    if (!isSupported) return;
    
    try {
      setStatus('processing');
      addLog('info', `Preparing to write ${type}...`);
      
      const ndef = new (window as any).NDEFReader();
      let message: any = {};
      
      if (type === 'text') {
        message = { records: [{ recordType: "text", data: writeText }] };
      } else if (type === 'url') {
        message = { records: [{ recordType: "url", data: writeUrl }] };
      } else if (type === 'empty') {
        message = { records: [] };
      }
      
      await ndef.write(message);
      addLog('success', 'Write successful!');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      addLog('error', `Write failed: ${error.message}`);
      setStatus('error');
    }
  };

  const makeReadOnly = async () => {
    if (!isSupported) return;
    
    try {
      setStatus('processing');
      addLog('info', 'Preparing to lock tag (Make Read-Only)...');
      
      const ndef = new (window as any).NDEFReader();
      await ndef.makeReadOnly();
      addLog('success', 'Tag locked successfully!');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      addLog('error', `Lock failed: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-page pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-8 md:mb-12">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 flex items-center justify-center rounded-xl md:rounded-2xl">
                <Nfc className="text-accent w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-accent font-bold">NFC Tools Pro</span>
            </div>
            <h1 className="text-3xl md:text-6xl font-bold font-headline tracking-tight">NFC Commander<span className="text-accent">.</span></h1>
            <p className="text-secondary/60 max-w-xl text-xs md:text-sm leading-relaxed">
              Advanced NFC tag management. Read, write, format, and secure your tags directly from your browser.
              <span className="block mt-1 md:mt-2 text-accent/80 font-medium">Note: Requires Chrome on Android with NFC enabled.</span>
            </p>
          </div>

          {!isSupported && isSupported !== null && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-red-500">
              <ShieldAlert className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <div className="text-[10px] md:text-xs font-medium">
                Web NFC is not supported in this browser.
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Controls */}
          <div className="space-y-6 md:space-y-8">
            {/* Tabs */}
            <div className="flex p-1 bg-card border border-muted rounded-xl md:rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
              {(['read', 'write', 'tools'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === tab 
                      ? "bg-primary text-page shadow-lg" 
                      : "text-secondary/40 hover:text-primary"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-card border border-muted rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-12 shadow-sm relative overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'read' && (
                  <motion.div
                    key="read"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 md:space-y-8"
                  >
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 border-2 border-dashed border-muted rounded-[1.5rem] md:rounded-[2rem] bg-alt/30">
                      {status === 'scanning' ? (
                        <div className="flex flex-col items-center gap-4 md:gap-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-accent/20 rounded-full animate-ping" />
                            <div className="relative w-16 h-16 md:w-24 md:h-24 bg-accent/10 rounded-full flex items-center justify-center">
                              <Wifi className="w-8 h-8 md:w-10 md:h-10 text-accent animate-pulse" />
                            </div>
                          </div>
                          <div className="text-center px-4">
                            <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">Ready to Scan</h3>
                            <p className="text-secondary/40 text-xs md:text-sm">Hold your NFC tag near the back of your device</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 md:gap-6">
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-muted/30 rounded-full flex items-center justify-center">
                            <Smartphone className="w-8 h-8 md:w-10 md:h-10 text-secondary/20" />
                          </div>
                          <button
                            onClick={startScan}
                            disabled={!isSupported}
                            className="bg-primary text-page px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/10 flex items-center gap-2 md:gap-3 text-sm md:text-base"
                          >
                            <Zap size={18} className="md:w-5 md:h-5" />
                            Start Reading
                          </button>
                        </div>
                      )}
                    </div>

                    {records.length > 0 && (
                      <div className="space-y-3 md:space-y-4">
                        <h3 className="font-mono text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-accent font-bold">Tag Data</h3>
                        <div className="grid gap-3 md:gap-4">
                          {records.map((record, i) => (
                            <div key={i} className="bg-alt/50 border border-muted p-4 md:p-6 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/5 rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                                <Database className="w-4 h-4 md:w-5 md:h-5 text-primary/40" />
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-accent truncate">{record.recordType}</span>
                                    {record.mediaType && <span className="hidden sm:inline text-[9px] md:text-[10px] text-secondary/30 font-mono truncate">({record.mediaType})</span>}
                                  </div>
                                  <button 
                                    onClick={() => {
                                      if (record.recordType === 'url') setWriteUrl(record.data || '');
                                      else setWriteText(record.data || '');
                                      setActiveTab('write');
                                    }}
                                    className="text-[9px] md:text-[10px] uppercase tracking-widest text-accent hover:underline shrink-0"
                                  >
                                    Copy to Write
                                  </button>
                                </div>
                                <p className="text-primary font-body text-sm md:text-base break-all">{record.data}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'write' && (
                  <motion.div
                    key="write"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6 md:space-y-8"
                  >
                    <div className="space-y-5 md:space-y-6">
                      <div className="space-y-3 md:space-y-4">
                        <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] text-accent">Write Text</label>
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                          <input
                            type="text"
                            value={writeText}
                            onChange={(e) => setWriteText(e.target.value)}
                            placeholder="Enter text to write..."
                            className="flex-1 bg-alt border-2 border-muted px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/20 text-sm md:text-base"
                          />
                          <button
                            onClick={() => writeTag('text')}
                            className="bg-primary text-page px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                          >
                            <Edit3 size={16} className="md:w-[18px] md:h-[18px]" />
                            Write
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        <label className="block text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] text-accent">Write URL</label>
                        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                          <input
                            type="url"
                            value={writeUrl}
                            onChange={(e) => setWriteUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="flex-1 bg-alt border-2 border-muted px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl focus:ring-0 focus:border-accent transition-all placeholder:text-secondary/20 text-sm md:text-base"
                          />
                          <button
                            onClick={() => writeTag('url')}
                            className="bg-primary text-page px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                          >
                            <Wifi size={16} className="md:w-[18px] md:h-[18px]" />
                            Write
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 md:p-6 bg-accent/5 rounded-xl md:rounded-2xl border border-accent/10 flex items-start gap-3 md:gap-4">
                      <Info className="w-4 h-4 md:w-5 md:h-5 text-accent shrink-0 mt-0.5" />
                      <p className="text-[10px] md:text-xs text-secondary/60 leading-relaxed">
                        Writing will overwrite existing data on the tag. Ensure the tag is not write-protected.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'tools' && (
                  <motion.div
                    key="tools"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6"
                  >
                    <button
                      onClick={() => writeTag('empty')}
                      className="group p-6 md:p-8 bg-alt/30 border border-muted rounded-[1.5rem] md:rounded-[2rem] hover:border-red-500/30 transition-all text-left space-y-3 md:space-y-4"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500/10 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Trash2 className="text-red-500 w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg">Erase Tag</h3>
                        <p className="text-secondary/40 text-[10px] md:text-xs">Clear all NDEF records from the tag</p>
                      </div>
                    </button>

                    <button
                      onClick={makeReadOnly}
                      className="group p-6 md:p-8 bg-alt/30 border border-muted rounded-[1.5rem] md:rounded-[2rem] hover:border-accent/30 transition-all text-left space-y-3 md:space-y-4"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-accent/10 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Lock className="text-accent w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg">Lock Tag</h3>
                        <p className="text-secondary/40 text-[10px] md:text-xs">Make the tag permanently read-only</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Overlay */}
              <AnimatePresence>
                {status !== 'idle' && status !== 'scanning' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center bg-page/80 backdrop-blur-sm p-4"
                  >
                    <div className="bg-card border border-muted p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col items-center gap-3 md:gap-4 w-full max-w-xs text-center">
                      {status === 'processing' && <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-accent animate-spin" />}
                      {status === 'success' && <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-green-500" />}
                      {status === 'error' && <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-red-500" />}
                      
                      <h4 className="font-bold text-base md:text-lg">
                        {status === 'processing' ? 'Processing...' : 
                         status === 'success' ? 'Task Complete' : 'Operation Failed'}
                      </h4>
                      <p className="text-secondary/60 text-xs md:text-sm">
                        {status === 'processing' ? 'Please hold your tag near the device.' : 
                         status === 'success' ? 'The NFC operation was successful.' : 'Something went wrong. Please try again.'}
                      </p>
                      
                      {(status === 'success' || status === 'error') && (
                        <button 
                          onClick={() => setStatus('idle')}
                          className="mt-2 md:mt-4 w-full sm:w-auto px-8 py-2.5 bg-primary text-page rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFCPage;
