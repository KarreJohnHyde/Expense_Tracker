import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Crop, RotateCw, ZoomIn, ZoomOut, Check, X } from 'lucide-react';
import { cropImage, rotateImage } from '../lib/imageUtils';
import { toast } from 'sonner';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
  isOpen: boolean;
  aspectRatio?: number;
}

export function ImageCropper({ imageSrc, onCrop, onCancel, isOpen, aspectRatio }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 300, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Redraw canvas when image, zoom, or rotation changes
  useEffect(() => {
    if (!canvasRef.current || !imageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = 500;
      canvas.height = 500;

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(zoom, zoom);
      ctx.rotate((rotation * Math.PI) / 180);

      const displayWidth = img.width * zoom;
      const displayHeight = img.height * zoom;

      ctx.drawImage(img, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight);
      ctx.restore();

      // Draw crop box
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
      ctx.setLineDash([]);

      // Draw corner handles
      const handleSize = 8;
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(cropBox.x - handleSize / 2, cropBox.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropBox.x + cropBox.width - handleSize / 2, cropBox.y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropBox.x - handleSize / 2, cropBox.y + cropBox.height - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(cropBox.x + cropBox.width - handleSize / 2, cropBox.y + cropBox.height - handleSize / 2, handleSize, handleSize);

      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc, zoom, rotation, cropBox]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on crop box
    if (
      x >= cropBox.x &&
      x <= cropBox.x + cropBox.width &&
      y >= cropBox.y &&
      y <= cropBox.y + cropBox.height
    ) {
      setIsDragging(true);
      setDragStart({ x: x - cropBox.x, y: y - cropBox.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newX = Math.max(0, Math.min(x - dragStart.x, 500 - cropBox.width));
    const newY = Math.max(0, Math.min(y - dragStart.y, 500 - cropBox.height));

    setCropBox({ ...cropBox, x: newX, y: newY });
  };

  const handleApplyCrop = async () => {
    setProcessing(true);
    try {
      const croppedImage = await cropImage(imageSrc, cropBox);
      onCrop(croppedImage);
      toast.success('Image cropped successfully');
    } catch (error) {
      toast.error('Failed to crop image');
    } finally {
      setProcessing(false);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="size-5" />
            Crop Image
          </DialogTitle>
          <DialogDescription>
            Adjust the crop area and zoom. Use the handles to resize the crop region.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas Preview */}
          <Card className="overflow-auto bg-muted/20">
            <canvas
              ref={canvasRef}
              className="mx-auto cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            />
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* Zoom */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ZoomIn className="size-4" />
                Zoom: {Math.round(zoom * 100)}%
              </Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Crop Box Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Width: {Math.round(cropBox.width)}px
                </Label>
                <Slider
                  value={[cropBox.width]}
                  onValueChange={(value) => setCropBox({ ...cropBox, width: value[0] })}
                  min={50}
                  max={450}
                  step={10}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Height: {Math.round(cropBox.height)}px
                </Label>
                <Slider
                  value={[cropBox.height]}
                  onValueChange={(value) => setCropBox({ ...cropBox, height: value[0] })}
                  min={50}
                  max={450}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-border/50 pt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleRotate}
              >
                <RotateCw className="size-4" />
                Rotate 90°
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleApplyCrop}
                disabled={processing}
              >
                <Check className="size-4" />
                {processing ? 'Processing...' : 'Apply Crop'}
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={onCancel}>
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
