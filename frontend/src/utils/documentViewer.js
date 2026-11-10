/**
 * Helper to get a safe, authorized viewing URL for documents (PDFs & Images)
 * If the asset is a Cloudinary PDF, it routes through the backend authorized viewer
 * to prevent Cloudinary's default "401 deny or ACL failure" on raw PDF delivery.
 */
export function getDocumentViewUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('cloudinary.com') && url.toLowerCase().endsWith('.pdf')) {
    return `/api/delivery/view-doc?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Returns a high-res image preview URL for a document (converting Cloudinary PDF to JPG)
 */
export function getDocumentImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('cloudinary.com') && url.toLowerCase().endsWith('.pdf')) {
    return url.replace(/\.pdf$/i, '.jpg');
  }
  return url;
}
