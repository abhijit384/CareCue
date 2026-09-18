import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accepted?: string;
  className?: string;
}

export function UploadDropzone({ onFileSelect, accepted = '.pdf,.jpg,.jpeg,.png', className }: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const removeFile = () => setSelectedFile(null);

  if (selectedFile) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('p-6 border border-accent-teal/30 bg-accent-teal-light rounded-xl', className)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent-teal/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-accent-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{selectedFile.name}</p>
            <p className="text-xs text-text-tertiary">{(selectedFile.size / 1024).toFixed(1)} KB</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-accent-teal" />
          <button
            onClick={removeFile}
            className="p-1.5 rounded-md hover:bg-bg-secondary transition-colors"
            aria-label="Remove file"
          >
            <X className="w-4 h-4 text-text-tertiary" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
        dragOver
          ? 'border-accent-teal bg-accent-teal-light/50'
          : 'border-border-default hover:border-accent-teal/40 hover:bg-bg-secondary',
        className
      )}
    >
      <input
        type="file"
        accept={accepted}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Upload file"
      />
      <motion.div
        animate={dragOver ? { scale: 1.05 } : { scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center transition-colors',
          dragOver ? 'bg-accent-teal text-text-inverse' : 'bg-bg-secondary text-text-tertiary'
        )}>
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary mb-1">
            Drop your report here
          </p>
          <p className="text-xs text-text-tertiary">
            or click to choose a file · PDF, JPG, PNG
          </p>
        </div>
      </motion.div>
    </div>
  );
}
