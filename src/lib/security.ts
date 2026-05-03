import DOMPurify from 'dompurify';

/**
 * Sanitizes a string of text to prevent XSS.
 * If stripAllTags is true, it removes all HTML tags.
 */
export const sanitizeText = (text: string, stripAllTags = false): string => {
  if (!text) return '';
  const options = stripAllTags ? { ALLOWED_TAGS: [], ALLOWED_ATTR: [] } : {};
  return DOMPurify.sanitize(text, options).trim();
};

/**
 * Sanitizes a URL to prevent javascript: or data: URL XSS attacks.
 * Replaces dangerous protocols with a safe placeholder.
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  // Basic URL validation
  try {
    const parsed = new URL(url);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
      return url;
    }
  } catch (e) {
    // If it's a relative URL, it might be safe, but let's be cautious
    if (url.startsWith('/') || url.startsWith('#')) return url;
  }
  
  // Fallback: If it's dangerous, return about:blank or empty
  if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
    return 'about:blank';
  }
  
  return url;
};

/**
 * Ensures a URL has a protocol (defaults to https://)
 */
export const ensureHttps = (url: string): string => {
  if (!url) return '';
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/') && !url.startsWith('#')) {
    return `https://${url}`;
  }
  return url;
};
