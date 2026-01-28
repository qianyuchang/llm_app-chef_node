
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
