import { useState, useRef } from 'react';
import { UploadCloud, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './button';
import { toast } from 'sonner';

interface FileUploadProps {
  bucket: string;
  path: string;
  onUploadSuccess: (url: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  currentImageUrl?: string;
}

export function FileUpload({
  bucket,
  path,
  onUploadSuccess,
  accept = 'image/*',
  maxSizeMB = 5,
  className = '',
  currentImageUrl,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndUpload = async (file: File) => {
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`ფაილის ზომა არ უნდა აღემატებოდეს ${maxSizeMB}MB-ს`);
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      onUploadSuccess(data.publicUrl);
      toast.success('ფაილი წარმატებით აიტვირთა');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'ფაილის ატვირთვა ვერ მოხერხდა');
    } finally {
      setIsUploading(false);
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await validateAndUpload(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (currentImageUrl) {
    return (
      <div className={`relative group rounded-xl overflow-hidden border border-border bg-muted/30 flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentImageUrl} alt="Uploaded" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button type="button" variant="secondary" size="sm" onClick={onButtonClick} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            {isUploading ? 'იტვირთება...' : 'შეცვლა'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
        dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-sidebar-ring/50 hover:bg-muted/50'
      } ${className}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
      />
      
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-6 w-6" />}
        </div>
        <div>
          <p className="font-semibold text-sm">
            {isUploading ? 'ფაილი იტვირთება...' : 'ატვირთეთ ფაილი'}
          </p>
          {!isUploading && (
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop ან დააკლიკეთ ასარჩევად (Max: {maxSizeMB}MB)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
