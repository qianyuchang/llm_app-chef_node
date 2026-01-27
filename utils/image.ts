
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
 * Compresses a base64 image string by resizing it to a max dimension and adjusting quality.
 * @param base64Str Input base64 string
 * @param maxWidth Maximum width or height (default 1080)
 * @param quality JPEG quality (0 to 1, default 0.75)
 */
export const compressImage = (base64Str: string, maxWidth = 1080, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxWidth) {
        const ratio = width / height;
        if (width > height) {
          width = maxWidth;
          height = Math.round(maxWidth / ratio);
        } else {
          height = maxWidth;
          width = Math.round(maxWidth * ratio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG format for better compression of photos
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        // Fallback if context creation fails
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      // Return original if loading fails
      resolve(base64Str);
    };
  });
};
