import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { RotateCcw, Wand2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export interface ImageFilterOptions {
  brightness: number; // 0-200
  contrast: number; // 0-200
  saturation: number; // 0-200
  sharpness: number; // 0-100
  grayscale: number; // 0-100
  sepia: number; // 0-100
}

interface ImageFilterProps {
  imageSrc: string;
  onApply: (filtered: string, options: ImageFilterOptions) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function ImageFilter({ imageSrc, onApply, onCancel, isOpen }: ImageFilterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [options, setOptions] = useState<ImageFilterOptions>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    grayscale: 0,
    sepia: 0,
  });
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !imageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = 500;
      canvas.height = Math.round((500 * img.height) / img.width);

      // Apply filters using canvas filters
      const filters = [];

      // Brightness
      if (options.brightness !== 100) {
        filters.push(`brightness(${options.brightness}%)`);
      }

      // Contrast
      if (options.contrast !== 100) {
        filters.push(`contrast(${options.contrast}%)`);
      }

      // Saturation
      if (options.saturation !== 100) {
        filters.push(`saturate(${options.saturation}%)`);
      }

      // Grayscale
      if (options.grayscale > 0) {
        filters.push(`grayscale(${options.grayscale}%)`);
      }

      // Sepia
      if (options.sepia > 0) {
        filters.push(`sepia(${options.sepia}%)`);
      }

      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Apply sharpness if needed
      if (options.sharpness > 0) {
        applySharpness(ctx, canvas, options.sharpness);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, options]);

  const applySharpness = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amount: number) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Simple sharpening kernel
    const kernel = [0, -1, 0, -1, 5 + amount * 0.1, -1, 0, -1, 0];
    const divisor = 1;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        let r = 0, g = 0, b = 0;
        let k = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
            r += data[pixelIdx] * kernel[k];
            g += data[pixelIdx + 1] * kernel[k];
            b += data[pixelIdx + 2] * kernel[k];
            k++;
          }
        }

        data[idx] = Math.min(255, Math.max(0, r / divisor));
        data[idx + 1] = Math.min(255, Math.max(0, g / divisor));
        data[idx + 2] = Math.min(255, Math.max(0, b / divisor));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const handleReset = () => {
    setOptions({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 0,
      grayscale: 0,
      sepia: 0,
    });
  };

  const handleApply = async () => {
    if (!canvasRef.current) {
      toast.error('Failed to apply filters');
      return;
    }

    setIsApplying(true);
    try {
      const filtered = canvasRef.current.toDataURL('image/jpeg', 0.9);
      onApply(filtered, options);
      toast.success('Filters applied successfully!');
    } catch (error) {
      toast.error('Failed to apply filters');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5" />
            Adjust Image
          </DialogTitle>
          <DialogDescription>
            Fine-tune brightness, contrast, and other image properties
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Canvas Preview */}
          <Card className="bg-muted/20">
            <CardContent className="flex justify-center p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-lg border border-border/50"
              />
            </CardContent>
          </Card>

          {/* Filter Controls */}
          <div className="space-y-4">
            {/* Brightness */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Brightness</span>
                <span className="text-sm font-mono text-muted-foreground">{options.brightness}%</span>
              </Label>
              <Slider
                value={[options.brightness]}
                onValueChange={(value) =>
                  setOptions({ ...options, brightness: value[0] })
                }
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Contrast</span>
                <span className="text-sm font-mono text-muted-foreground">{options.contrast}%</span>
              </Label>
              <Slider
                value={[options.contrast]}
                onValueChange={(value) =>
                  setOptions({ ...options, contrast: value[0] })
                }
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Saturation</span>
                <span className="text-sm font-mono text-muted-foreground">{options.saturation}%</span>
              </Label>
              <Slider
                value={[options.saturation]}
                onValueChange={(value) =>
                  setOptions({ ...options, saturation: value[0] })
                }
                min={0}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Sharpness</span>
                <span className="text-sm font-mono text-muted-foreground">{options.sharpness}</span>
              </Label>
              <Slider
                value={[options.sharpness]}
                onValueChange={(value) =>
                  setOptions({ ...options, sharpness: value[0] })
                }
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Grayscale */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Grayscale</span>
                <span className="text-sm font-mono text-muted-foreground">{options.grayscale}%</span>
              </Label>
              <Slider
                value={[options.grayscale]}
                onValueChange={(value) =>
                  setOptions({ ...options, grayscale: value[0] })
                }
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sepia */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>Sepia</span>
                <span className="text-sm font-mono text-muted-foreground">{options.sepia}%</span>
              </Label>
              <Slider
                value={[options.sepia]}
                onValueChange={(value) =>
                  setOptions({ ...options, sepia: value[0] })
                }
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 border-t border-border/50 pt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReset}
              disabled={isApplying}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleApply}
              disabled={isApplying}
            >
              <Check className="size-4" />
              {isApplying ? 'Applying...' : 'Apply Filters'}
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={onCancel}>
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
