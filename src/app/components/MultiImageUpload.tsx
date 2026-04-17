import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Trash2, Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { compressImage, validateImage, fileToDataUrl, batchProcessImages } from '../lib/imageUtils';
import { toast } from 'sonner';

export interface UploadedImage {
  id: string;
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize?: number;
  compressed?: boolean;
}

interface MultiImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesSelected: (images: UploadedImage[]) => void;
  maxImages?: number;
  compressionOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  };
}

export function MultiImageUpload({
  isOpen,
  onClose,
  onImagesSelected,
  maxImages = 10,
  compressionOptions = { maxWidth: 2000, maxHeight: 2000, quality: 0.85 },
}: MultiImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
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

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const filesToProcess = fileArray.slice(0, maxImages - uploadedImages.length);

    setProcessing(true);
    setProgress(0);

    const newImages: UploadedImage[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];

      // Validate file
      const validation = validateImage(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        // Convert to Data URL
        const dataUrl = await fileToDataUrl(file);

        // Compress image
        const { dataUrl: compressedDataUrl, size: compressedSize } = await compressImage(dataUrl, {
          ...compressionOptions,
          format: 'jpeg',
        });

        newImages.push({
          id: `upload-${Date.now()}-${i}`,
          file,
          dataUrl: compressedDataUrl,
          originalSize: file.size,
          compressedSize,
          compressed: true,
        });

        setProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
      } catch (error) {
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setUploadedImages((prev) => [...prev, ...newImages]);
    setProcessing(false);
    setProgress(0);

    if (newImages.length > 0) {
      toast.success(`${newImages.length} image(s) uploaded successfully`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveImage = (id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSelectAll = () => {
    onImagesSelected(uploadedImages);
    toast.success(`${uploadedImages.length} image(s) selected`);
    handleClose();
  };

  const handleClose = () => {
    setUploadedImages([]);
    setProgress(0);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const totalOriginalSize = uploadedImages.reduce((acc, img) => acc + img.originalSize, 0);
  const totalCompressedSize = uploadedImages.reduce((acc, img) => acc + (img.compressedSize || 0), 0);
  const spaceSaved = totalOriginalSize - totalCompressedSize;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Upload Multiple Images
          </DialogTitle>
          <DialogDescription>
            Select up to {maxImages} images. They will be automatically compressed for optimal storage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          {uploadedImages.length < maxImages && (
            <Card
              className={`cursor-pointer transition-all ${
                dragActive ? 'border-primary border-2 bg-primary/5' : 'border-border/50 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div
                    className={`p-4 rounded-xl transition-colors ${
                      dragActive ? 'bg-primary/20 text-primary' : 'bg-muted'
                    }`}
                  >
                    <Upload className="size-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      {dragActive ? 'Drop images here' : 'Drag and drop images or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {maxImages - uploadedImages.length} slot(s) remaining • JPG, PNG, WebP, GIF • Max 50MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                  >
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={processing}
          />

          {/* Processing Progress */}
          {processing && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 text-primary animate-spin" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Processing images...</p>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uploaded Images Grid */}
          {uploadedImages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-sm">
                  Uploaded Images ({uploadedImages.length}/{maxImages})
                </h3>
                {uploadedImages.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Original: {formatFileSize(totalOriginalSize)}</p>
                    <p>Compressed: {formatFileSize(totalCompressedSize)}</p>
                    {spaceSaved > 0 && (
                      <p className="text-emerald-600 dark:text-emerald-400">
                        Saved: {formatFileSize(spaceSaved)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                {uploadedImages.map((img) => (
                  <Card key={img.id} className="overflow-hidden">
                    <div className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.file.name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-white hover:bg-red-500"
                          onClick={() => handleRemoveImage(img.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="absolute top-1 right-1">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle2 className="size-3" />
                          {formatFileSize(img.compressedSize || 0)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs truncate font-medium">{img.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(img.originalSize)} → {formatFileSize(img.compressedSize || 0)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-border/50 pt-4">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSelectAll}
              disabled={uploadedImages.length === 0 || processing}
            >
              <CheckCircle2 className="size-4" />
              Use {uploadedImages.length} Image{uploadedImages.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
