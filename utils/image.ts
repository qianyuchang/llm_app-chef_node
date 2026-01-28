
/**
 * Cloudflare Image Resizing Utility
 * Converts a standard R2 URL into a Cloudflare resized URL.
 * 
 * Format: https://<ZONE>/cdn-cgi/image/<OPTIONS>/<SOURCE-IMAGE>
 */
export const getOptimizedImageUrl = (url: string, width: number, quality: number = 75) => {
  if (!url || typeof url !== 'string') return '';

  // Only optimize URLs served from our specific CDN domain
  // We avoid transforming local blobs, data URIs, or external links (like picsum) if not proxied
  if (url.includes('cdn.yufish.tech') && !url.includes('cdn-cgi')) {
    try {
      const urlObj = new URL(url);
      // Construct the Cloudflare Image Resizing path
      // width: target width in pixels
      // format=auto: automatically serve WebP/AVIF if browser supports it
      // fit=scale-down: matches the width, maintains aspect ratio
      return `https://${urlObj.hostname}/cdn-cgi/image/width=${width},quality=${quality},format=auto,fit=scale-down${urlObj.pathname}`;
    } catch (e) {
      console.warn('Failed to optimize image URL:', e);
      return url;
    }
  }

  // Return original URL for other sources
  return url;
};

/**
 * Compresses an image (Base64 or URL) using Canvas.
 * Useful for reducing payload size before upload.
 */
export const compressImage = async (imageSrc: string, maxWidth = 1024, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Handle raw base64 strings that might be returned by some APIs without the data URI prefix
    if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('http')) {
        img.src = `data:image/jpeg;base64,${imageSrc}`;
    } else {
        img.src = imageSrc;
    }
    
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = (err) => {
        console.warn("Image compression failed, returning original:", err);
        resolve(imageSrc); // Fallback to original
    };
  });
};
