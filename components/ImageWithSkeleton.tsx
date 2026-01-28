
import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({ className, onLoad, onError, wrapperClassName, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {!isLoaded && !hasError && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse z-0 flex items-center justify-center ${wrapperClassName || ''}`}>
            <ImageIcon className="text-gray-300 w-8 h-8 opacity-50" />
        </div>
      )}
      <img
        {...props}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
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
    </>
  );
};
