/**
 * Utility to download a file from a URL.
 */
import { Logger } from './logger';

export const downloadFile = async (url: string, fileName?: string) => {
  if (!url) return;

  // For external links that aren't direct files (e.g. Google Drive, YouTube), 
  // just open in a new tab if they are not specifically handled.
  const isDirectFile = url.match(/\.(pdf|mp4|mov|avi|jpg|jpeg|png|webp|docx|xlsx|pptx|txt|csv|zip)$/i);
  
  if (!isDirectFile) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || url.split('/').pop() || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    Logger.warn('Failed to download file', error);
    // Fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
