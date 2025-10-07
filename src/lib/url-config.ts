// Configuration for share URL generation
// This ensures consistent URL generation across the app

export const getBaseUrl = () => {
  // In development, use current window location
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  
  // In production, use environment variable or fallback
  return import.meta.env.VITE_APP_URL || window.location.origin;
};

export const generateShareUrl = (token: string) => {
  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/share/${token}`;
  console.log('Generated share URL:', shareUrl, 'from base:', baseUrl);
  return shareUrl;
};