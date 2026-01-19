import React, { useState, useCallback } from 'react';
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

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel, aspect = 1 }) => {
  const [currentImage, setCurrentImage] = useState(imageSrc);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  
  // AI Optimization State
  const [isOptimizing, setIsOptimizing] = useState(false);

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
        // Optimization is done on the SOURCE image so we don't lose resolution or quality before cropping
        const optimized = await api.optimizeImage(currentImage);
        setCurrentImage(optimized);
        // Reset zoom to ensure user sees the new image correctly, though keeping it is also fine
        setZoom(1); 
    } catch (err) {
        console.error(err);
        alert('图片优化失败，请重试');
    } finally {
        setIsOptimizing(false);
    }
  };

  const stopPropagation = (e: React.TouchEvent | React.MouseEvent) => {
      e.stopPropagation();
  };

  return (
    <div 
        className="fixed inset-0 z-50 bg-black flex flex-col"
        onTouchStart={stopPropagation}
        onTouchMove={stopPropagation}
        onTouchEnd={stopPropagation}
        onClick={stopPropagation}
    >
      <div className="flex justify-between items-center p-4 z-10 bg-black/50 backdrop-blur-sm text-white absolute top-0 left-0 right-0">
          <button onClick={onCancel} className="p-2">
            <X size={24} />
          </button>
          <span className="font-bold text-sm">调整封面</span>
          <button onClick={handleSave} className="p-2 text-[#4ade80]">
            <Check size={24} />
          </button>
      </div>
      
      {/* 
         ADDED: 'touch-none' class is crucial here. 
         It prevents the browser from handling touch actions (like scrolling/zooming the page),
         allowing react-easy-crop to capture the gestures fully.
      */}
      <div className="relative flex-1 bg-black w-full h-full touch-none">
        <Cropper
          image={currentImage}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropAreaChange}
        />
        
        {isOptimizing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <Loader2 className="animate-spin text-white mb-2" size={32} />
                <span className="text-white font-medium text-sm">AI 正在修图...</span>
            </div>
        )}
      </div>

      <div className="p-6 bg-black text-white pb-10 flex flex-col gap-4">
         {/* AI Optimize Button moved here */}
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