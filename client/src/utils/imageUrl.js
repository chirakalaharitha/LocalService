/**
 * Constructs a fully qualified accessible URL for profile images or asset uploads.
 * Handles full URLs (http/https/blob/data) and relative backend paths (/uploads/...).
 *
 * @param {string} imagePath - Profile or asset image path or URL
 * @returns {string} Fully qualified URL or empty string
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';
  const trimmed = imagePath.trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const backendBase =
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
      : '') ||
    'http://localhost:5000';

  return `${backendBase.replace(/\/+$/, '')}${cleanPath}`;
};

export const getProfileImageUrl = getImageUrl;

export default getImageUrl;
