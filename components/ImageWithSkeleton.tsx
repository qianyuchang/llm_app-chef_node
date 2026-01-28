
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
  lowResSrc?: string;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({ 
  className, 
  onLoad, 
  onError, 
  wrapperClassName, 
  lowResSrc,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Sync state if image is already cached
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className={`overflow-hidden select-none bg-gray-100 ${wrapperClassName || 'relative w-full h-full'}`}>
      {/* 1. Loading Pulse (Only shown if no lowResSrc is provided) */}
      {!isLoaded && !hasError && !lowResSrc && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-0 flex items-center justify-center">
            <ImageIcon className="text-gray-300 w-8 h-8 opacity-40" />
        </div>
      )}

      {/* 2. Blurry Placeholder Layer (Immediate visual feedback) */}
      {lowResSrc && !hasError && (
        <div 
          className="absolute inset-0 z-0 transition-opacity duration-700 pointer-events-none overflow-hidden"
          style={{ opacity: isLoaded ? 0 : 1 }}
        >
          <img 
            src={lowResSrc} 
            className="w-full h-full object-cover filter blur-md scale-110"
            aria-hidden="true"
            alt=""
          />
        </div>
      )}

      {/* 3. Main Image Layer */}
      <img
        {...props}
        ref={imgRef}
        className={`${className || ''} w-full h-full object-cover transition-opacity duration-700 relative z-10 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={(e) => {
            setIsLoaded(true);
            onLoad?.(e);
        }}
        onError={(e) => {
            setHasError(true);
            setIsLoaded(true);
            onError?.(e);
        }}
      />

      {/* 4. Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
          <ImageIcon className="text-gray-300 w-6 h-6" />
        </div>
      )}
    </div>
  );
};
