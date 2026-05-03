import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Trash2, 
  RefreshCw, 
  ChevronLeft, 
  Download, 
  Sliders, 
  Image as ImageIcon, 
  Check, 
  AlertCircle, 
  Zap, 
  X 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { compressImage } from '../lib/imageCompression';
import { cn } from '../lib/utils';
import SEO from '../components/SEO';

interface OptimizedFile {
  id: string;
  file: File;
  customName: string;
  compressed?: File;
  loading: boolean;
  optimized: boolean;
  originalSize: number;
  compressedSize?: number;
  preview: string;
  optimizedPreview?: string;
  error?: string;
}

const ImageOptimizerPage = () => {
  const [files, setFiles] = useState<OptimizedFile[]>([]);
  const [targetSizeStr, setTargetSizeStr] = useState<string>('0.8'); // Typeable state
  const [unit, setUnit] = useState<'MB' | 'KB'>('MB');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; item: OptimizedFile } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Calculate actual target size in MB for the compression tool
  const getTargetSizeMB = () => {
    const val = parseFloat(targetSizeStr) || 0;
    return unit === 'MB' ? val : val / 1024;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const incoming: OptimizedFile[] = Array.from(newFiles)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: Math.random().toString(36).substring(7),
        file: f,
        customName: f.name,
        loading: false,
        optimized: false,
        originalSize: f.size,
        preview: URL.createObjectURL(f)
      }));

    setFiles(prev => [...prev, ...incoming]);
  };

  const optimizeFile = async (id: string) => {
    const item = files.find(f => f.id === id);
    if (!item || item.loading) return;

    setFiles(prev => prev.map(p => p.id === id ? { ...p, loading: true, error: undefined } : p));

    const currentTargetSize = getTargetSizeMB() || 0.8;

    try {
      const compressed = await compressImage(item.file, { 
        maxSizeMB: currentTargetSize, 
        maxWidthOrHeight: 1920 
      });
      
      const optimizedPreview = URL.createObjectURL(compressed);
      
      setFiles(prev => prev.map(p => p.id === id ? {
        ...p,
        compressed,
        optimizedPreview,
        loading: false,
        optimized: true,
        compressedSize: compressed.size
      } : p));
    } catch (err: any) {
      setFiles(prev => prev.map(p => p.id === id ? { 
        ...p, 
        loading: false, 
        error: err.message || 'Compression failed' 
      } : p));
    }
  };

  const optimizeAll = async () => {
    const pending = files.filter(f => !f.optimized && !f.loading);
    for (const item of pending) {
      await optimizeFile(item.id);
    }
  };

  const downloadFile = (item: OptimizedFile) => {
    if (!item.compressed) return;
    const url = URL.createObjectURL(item.compressed);
    const a = document.createElement('a');
    a.href = url;
    // Ensure we keep extension if not provided in rename
    const ext = item.file.name.split('.').pop() || 'jpg';
    const fileName = item.customName.includes('.') ? item.customName : `${item.customName}.${ext}`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove) {
      URL.revokeObjectURL(fileToRemove.preview);
      if (fileToRemove.optimizedPreview) URL.revokeObjectURL(fileToRemove.optimizedPreview);
    }
    setFiles(files.filter(f => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const updateFileName = (id: string, newName: string) => {
    setFiles(prev => prev.map(p => p.id === id ? { ...p, customName: newName } : p));
    if (previewImage && files.find(f => f.id === id)) {
      setPreviewImage(prev => prev ? { ...prev, name: newName } : null);
    }
  };

  return (
    <div className="min-h-screen bg-page text-primary p-4 md:p-8">
      <SEO 
        title="Image Optimizer | Local Precision Compression" 
        description="Compress and optimize your images locally in your browser. Fast, secure, and typeable file size targets."
      />
      
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-secondary/40 hover:text-accent transition-colors group">
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Return Home
            </Link>
            <div className="flex items-center gap-4">
              <h1 className="text-5xl font-black tracking-tighter">
                IMAGE<span className="text-accent underline decoration-accent/20">OPTIMIZER</span>
              </h1>
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black font-mono text-green-500 uppercase tracking-widest">Local Mode Active</span>
              </div>
            </div>
          </div>

          <div className="bg-alt/50 border border-muted p-4 md:p-6 rounded-3xl flex items-center gap-6 backdrop-blur-sm shadow-xl shadow-black/10">
            <div className="p-3 bg-accent/10 text-accent rounded-2xl">
              <Sliders size={20} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase tracking-widest text-secondary/40 block">Target File Size</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={targetSizeStr} 
                  onChange={(e) => setTargetSizeStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="bg-transparent border-b-2 border-accent/20 text-accent font-black font-mono text-xl focus:border-accent focus:outline-none w-20 px-1 transition-colors"
                />
                <button 
                  onClick={() => setUnit(unit === 'MB' ? 'KB' : 'MB')}
                  className="text-sm font-black font-mono text-accent bg-accent/5 hover:bg-accent/10 px-2 py-1 rounded-lg transition-all active:scale-95 border border-accent/10 flex items-center gap-1 group"
                  title="Click to toggle unit"
                >
                  {unit}
                  <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5'); }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent', 'bg-accent/5'); }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-accent', 'bg-accent/5'); handleFiles(e.dataTransfer.files); }}
          onClick={() => document.getElementById('optimizer-input')?.click()}
          className="relative group border-2 border-dashed border-muted/50 rounded-[2.5rem] p-12 md:p-24 text-center hover:border-accent hover:bg-accent/5 transition-all cursor-pointer overflow-hidden"
        >
          {/* Animated Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(var(--accent-rgb),0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-accent/10 text-accent rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl shadow-accent/20">
              <Upload size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Drop your assets here</h3>
              <p className="text-secondary/40 text-sm font-medium">Drag & drop or <span className="text-accent underline decoration-accent/30">browse files</span></p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {['JPG', 'PNG', 'WEBP'].map(ext => (
                <span key={ext} className="px-3 py-1 bg-alt border border-muted text-[10px] font-black tracking-widest text-secondary/60 rounded-lg uppercase">{ext}</span>
              ))}
            </div>
          </div>

          <input 
            id="optimizer-input"
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => handleFiles(e.target.files)} 
          />
        </div>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2 flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-secondary/40">Queue ({files.length})</h3>
                  <button 
                    onClick={optimizeAll}
                    disabled={files.every(f => f.optimized || f.loading)}
                    className="flex items-center gap-2 bg-accent text-page px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    <Zap size={12} />
                    Optimize All
                  </button>
                </div>
                <button 
                  onClick={() => {
                    files.forEach(f => {
                      URL.revokeObjectURL(f.preview);
                      if (f.optimizedPreview) URL.revokeObjectURL(f.optimizedPreview);
                    });
                    setFiles([]);
                  }}
                  className="text-[10px] font-black uppercase text-red-500/50 hover:text-red-500 hover:scale-105 transition-all"
                >
                  Clear Queue
                </button>
              </div>

              {files.map((item, i) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "bg-alt/40 backdrop-blur-sm border rounded-[2rem] p-5 flex items-center gap-6 transition-all duration-500",
                    item.loading ? "border-accent/30 animate-pulse" : "border-muted/20 hover:border-accent/20 hover:bg-alt/60"
                  )}
                >
                  <div 
                    className="relative w-20 h-20 rounded-2xl bg-page overflow-hidden border border-muted shrink-0 shadow-inner group bg-checkered cursor-zoom-in"
                    onClick={() => setPreviewImage({ url: item.optimizedPreview || item.preview, name: item.customName, item })}
                  >
                    <img 
                      key={item.optimizedPreview || item.preview}
                      src={item.optimizedPreview || item.preview} 
                      alt={item.customName} 
                      className="w-full h-full object-cover transition-transform duration-700" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-[8px] font-black uppercase text-white bg-accent px-1.5 py-0.5 rounded shadow-lg">
                        {item.optimized ? 'View Optimized' : 'View Original'}
                      </span>
                    </div>
                    {item.loading && (
                      <div className="absolute inset-0 bg-page/80 flex items-center justify-center">
                        <RefreshCw size={20} className="text-accent animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="group/name relative">
                      <input 
                        type="text"
                        value={item.customName}
                        onChange={(e) => updateFileName(item.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold truncate focus:outline-none focus:border-b border-accent/20 pr-4 transition-all"
                        placeholder="Click to rename"
                      />
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-secondary/40 line-through">{formatSize(item.originalSize)}</span>
                        {item.loading ? (
                          <span className="text-[10px] font-black text-accent flex items-center gap-1.5 uppercase tracking-widest">
                            Optimizing
                          </span>
                        ) : item.optimized && item.compressedSize ? (
                          <span className="text-[10px] font-black text-green-500 flex items-center gap-1.5 uppercase tracking-widest bg-green-500/10 px-2 py-0.5 rounded-md">
                            <Check size={10} /> {formatSize(item.compressedSize)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-secondary/40 italic">Ready</span>
                        )}
                      </div>
                    </div>

                    {!item.loading && item.compressedSize && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-muted/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent transition-all duration-1000" 
                            style={{ width: `${Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-accent">
                          -{Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {item.optimized ? (
                      <button 
                        onClick={() => downloadFile(item)}
                        className="p-3 bg-accent text-page rounded-xl shadow-lg shadow-accent/20 hover:scale-110 active:scale-95 transition-all group"
                        title="Download"
                      >
                        <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => optimizeFile(item.id)}
                        disabled={item.loading}
                        className="p-3 bg-secondary/10 text-secondary rounded-xl hover:bg-accent hover:text-page transition-all group disabled:opacity-50"
                        title="Start Conversion"
                      >
                        <Zap size={16} className={cn(item.loading && "animate-pulse")} />
                      </button>
                    )}
                    <button 
                        onClick={() => removeFile(item.id)}
                        className="p-3 text-secondary/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Image Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-page/98 backdrop-blur-3xl"
              onClick={() => setPreviewImage(null)}
            >
              <div className="absolute top-8 right-8 z-[60] flex items-center gap-4">
                {previewImage.item.optimized && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadFile(previewImage.item); }}
                    className="flex items-center gap-3 bg-accent text-page px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-accent/40 hover:scale-105 active:scale-95 transition-all"
                  >
                    <Download size={18} />
                    Download File
                  </button>
                )}
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="w-12 h-12 bg-alt border border-muted rounded-full flex items-center justify-center text-secondary hover:bg-red-500 hover:text-white transition-all shadow-xl"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-8" onClick={e => e.stopPropagation()}>
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative max-w-full max-h-full rounded-[2.5rem] overflow-hidden border border-muted/50 shadow-2xl bg-checkered flex items-center justify-center group/modalimg">
                    <img 
                      src={previewImage.url} 
                      alt={previewImage.name} 
                      className="max-w-full max-h-[85vh] object-contain shadow-2xl"
                    />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-mono text-white/60">
                      {previewImage.item.optimized ? 'PREVIEWING OPTIMIZED OUTPUT' : 'PREVIEWING ORIGINAL FILE'}
                    </div>
                  </div>
                </div>
                
                <div className="text-center space-y-4 max-w-md w-full">
                  <input 
                    type="text"
                    value={previewImage.name}
                    onChange={(e) => updateFileName(previewImage.item.id, e.target.value)}
                    className="text-2xl font-black tracking-tight text-center bg-transparent border-b border-white/10 focus:border-accent focus:outline-none w-full pb-2 transition-colors"
                    placeholder="File Name"
                  />
                  <div className="flex items-center justify-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-secondary/40">
                    <span>Original: {formatSize(previewImage.item.originalSize)}</span>
                    {previewImage.item.compressedSize && (
                      <span className="text-green-500 font-bold">Optimized: {formatSize(previewImage.item.compressedSize)}</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default ImageOptimizerPage;
