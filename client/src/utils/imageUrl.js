/**
 * Resolves uploaded media URLs across local and production environments
 * In local development: preserves relative '/uploads/...' path (proxied by Vite)
 * In production: prefixes with VITE_SERVER_URL if relative path is provided
 */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }

  const serverUrl = import.meta.env.VITE_SERVER_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '');

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return serverUrl ? `${serverUrl}${normalizedPath}` : normalizedPath;
};

export default getImageUrl;
