import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

// Define types locally to avoid import issues with esm.sh
type Point = { x: number; y: number };
type Area = { width: number; height: number; x: number; y: number };

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspect?: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  canvas.width = safeArea;
  canvas.height = safeArea;

  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-safeArea / 2, -safeArea / 2);

  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );

  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.putImageData(
    data,
    0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
    0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
  );

  return new Promise((resolve) => {
      resolve(canvas.toDataURL('image/jpeg', 0.8));
  });
}

// Helper to resize image before sending to AI to avoid huge payloads
const resizeForAI = async (imageSrc: string, maxDimension = 1024): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    let width = image.width;
    let height = image.height;

    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
        } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
        }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageSrc;

    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.8); // Compress to JPEG 80%
};

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel, aspect = 1 }) => {
  const [currentImage, setCurrentImage] = useState(imageSrc);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // AI Optimization State
  const [isOptimizing, setIsOptimizing] = useState(false);

  // CRITICAL FIX FOR PWA/IOS GESTURES:
  // Prevent the default touchmove behavior on the document level while this component is mounted.
  // This stops the browser from scrolling/bouncing the page and forces it to yield touch events
  // to the Cropper component.
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
        // Only prevent if we are scaling (2 fingers) or moving crop (1 finger inside area)
        // But for a full-screen modal cropper, preventing all default moves is the safest/smoothest feel.
        e.preventDefault();
    };
    
    // { passive: false } is required to allow preventDefault
    document.addEventListener('touchmove', preventDefault, { passive: false });
    
    return () => {
        document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  const onCropChange = useCallback((crop: Point) => {
    setCrop(crop);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(currentImage, croppedAreaPixels);
        if (croppedImage) {
          onCropComplete(croppedImage);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
        const resizedImage = await resizeForAI(currentImage);
        const optimized = await api.optimizeImage(resizedImage);
        setCurrentImage(optimized);
        setZoom(1); 
    } catch (err) {
        console.error(err);
        const msg = err instanceof Error ? err.message : '未知错误';
        alert(`图片优化失败: ${msg}`);
    } finally {
        setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-[100dvh]">
      <div className="flex justify-between items-center p-4 z-10 bg-black/50 backdrop-blur-sm text-white absolute top-0 left-0 right-0 safe-top">
          <button onClick={onCancel} className="p-2">
            <X size={24} />
          </button>
          <span className="font-bold text-sm">调整封面</span>
          <button onClick={handleSave} className="p-2 text-[#4ade80]">
            <Check size={24} />
          </button>
      </div>
      
      {/* 
         'touch-none' is CSS for 'touch-action: none'.
         It tells the browser: "Do not handle panning or zooming on this element, let the JS handle it."
      */}
      <div className="relative flex-1 bg-black w-full h-full touch-none overflow-hidden">
        <Cropper
          image={currentImage}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropAreaChange}
          showGrid={true}
        />
        
        {isOptimizing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <Loader2 className="animate-spin text-white mb-2" size={32} />
                <span className="text-white font-medium text-sm">AI 正在修图 (大图可能需10秒)...</span>
            </div>
        )}
      </div>

      <div className="p-6 bg-black text-white pb-[calc(2.5rem+env(safe-area-inset-bottom))] flex flex-col gap-4 z-10">
         <button 
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
         >
             <Sparkles size={16} fill="white" />
             AI 美食滤镜优化
         </button>

         <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">缩放</span>
            <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#1a472a] h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
         </div>
      </div>
    </div>
  );
};