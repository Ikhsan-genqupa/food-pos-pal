import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { uploadProductImage } from '@/lib/storage';
import { Upload, Link, Loader2, X, ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(value || '');
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModeChange = (newMode: 'url' | 'upload') => {
    setMode(newMode);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setUrlInput(url);
    if (url && isValidUrl(url)) {
      setPreview(url);
      onChange(url);
    } else {
      setPreview(null);
    }
  };

  const handleUrlBlur = () => {
    if (urlInput && isValidUrl(urlInput)) {
      onChange(urlInput);
    }
  };

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return str.startsWith('http://') || str.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Error',
        description: 'Format file harus JPG, PNG, WebP, atau GIF',
        variant: 'destructive',
      });
      return;
    }

    // Show preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setIsUploading(true);
    try {
      const url = await uploadProductImage(file);
      setPreview(url);
      onChange(url);
      toast({
        title: 'Berhasil',
        description: 'Gambar berhasil diupload',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setPreview(null);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengupload gambar',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileSelect({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clearImage = () => {
    setPreview(null);
    setUrlInput('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Label>Gambar Produk</Label>
      
      <RadioGroup
        value={mode}
        onValueChange={(v) => handleModeChange(v as 'url' | 'upload')}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="url" id="url" />
          <Label htmlFor="url" className="cursor-pointer flex items-center gap-1">
            <Link className="h-4 w-4" />
            URL Gambar
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="upload" id="upload" />
          <Label htmlFor="upload" className="cursor-pointer flex items-center gap-1">
            <Upload className="h-4 w-4" />
            Upload File
          </Label>
        </div>
      </RadioGroup>

      {mode === 'url' ? (
        <div className="space-y-2">
          <Input
            type="url"
            placeholder="https://example.com/gambar.jpg"
            value={urlInput}
            onChange={handleUrlChange}
            onBlur={handleUrlBlur}
          />
          <p className="text-xs text-muted-foreground">
            Masukkan URL gambar dari internet
          </p>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Mengupload...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Klik untuk pilih gambar</p>
              <p className="text-xs text-muted-foreground">
                atau drag & drop di sini
              </p>
              <p className="text-xs text-muted-foreground">
                Maks. 5MB (JPG, PNG, WebP, GIF)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative">
          <Label className="mb-2 block">Preview</Label>
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-border"
              onError={() => {
                setPreview(null);
                toast({
                  title: 'Error',
                  description: 'Gagal memuat gambar',
                  variant: 'destructive',
                });
              }}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!preview && (
        <div className="flex items-center justify-center w-32 h-32 bg-muted rounded-lg border border-border">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
