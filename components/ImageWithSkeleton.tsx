
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

  // 处理图片从缓存加载时可能不触发 onLoad 的情况
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, []);

  return (
    <div className={`overflow-hidden ${wrapperClassName || 'relative w-full h-full'}`}>
      {/* 1. 骨架屏 / 加载占位层 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse z-0 flex items-center justify-center">
            {!lowResSrc && <ImageIcon className="text-gray-200 w-8 h-8 opacity-50" />}
        </div>
      )}

      {/* 2. 低清占位层 (模糊渐进加载) */}
      {lowResSrc && !hasError && (
        <img 
          src={lowResSrc} 
          className="absolute inset-0 w-full h-full object-cover z-0 filter blur-lg scale-110 transition-opacity duration-500 pointer-events-none"
          style={{ opacity: isLoaded ? 0 : 1 }}
          aria-hidden="true"
        />
      )}

      {/* 3. 高清主图层 */}
      <img
        {...props}
        ref={imgRef}
        className={`${className || ''} w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
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

      {/* 4. 错误状态展示 */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <ImageIcon className="text-gray-300 w-6 h-6" />
        </div>
      )}
    </div>
  );
};
