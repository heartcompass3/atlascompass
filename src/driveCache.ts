import { DriveFile } from './types';
import { getDriveFileContent } from './firebase';

export interface CachedFileData {
  id: string;
  name: string;
  mimeType: string;
  content: string;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'drive_file_cache_';
const ACTIVE_KB_KEY = 'active_knowledge_base_state';

// In-memory cache map
const memoryCache = new Map<string, CachedFileData>();

/**
 * Saves extracted file content to in-memory and localStorage cache
 */
export const cacheFileContent = (fileId: string, name: string, mimeType: string, content: string): void => {
  const data: CachedFileData = {
    id: fileId,
    name,
    mimeType,
    content,
    timestamp: Date.now(),
  };

  memoryCache.set(fileId, data);

  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${fileId}`, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save Drive file content to localStorage:', err);
  }
};

/**
 * Retrieves cached file content if present in memory or localStorage
 */
export const getCachedFileContent = (fileId: string): CachedFileData | null => {
  // Check memory first
  if (memoryCache.has(fileId)) {
    return memoryCache.get(fileId)!;
  }

  // Check localStorage
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${fileId}`);
    if (raw) {
      const data: CachedFileData = JSON.parse(raw);
      memoryCache.set(fileId, data);
      return data;
    }
  } catch (err) {
    console.warn('Failed to read Drive file content from localStorage:', err);
  }

  return null;
};

/**
 * Helper to fetch file content with automatic cache lookup.
 * If forceRefresh is false and content is cached, returns cached version immediately.
 */
export const fetchDriveFileContentCached = async (
  accessToken: string,
  file: DriveFile,
  forceRefresh = false
): Promise<{ content: string; isFromCache: boolean }> => {
  if (!forceRefresh) {
    const cached = getCachedFileContent(file.id);
    if (cached && cached.content) {
      return { content: cached.content, isFromCache: true };
    }
  }

  // Fetch from Google Drive API
  const content = await getDriveFileContent(accessToken, file.id, file.mimeType);
  cacheFileContent(file.id, file.name, file.mimeType, content);
  return { content, isFromCache: false };
};

/**
 * Persists current selected file metadata and extracted text
 */
export const saveActiveKbState = (file: DriveFile | null, text: string): void => {
  try {
    if (!file) {
      localStorage.removeItem(ACTIVE_KB_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_KB_KEY, JSON.stringify({ file, text }));
  } catch (err) {
    console.warn('Failed to save active KB state:', err);
  }
};

/**
 * Loads active KB state from storage
 */
export const loadActiveKbState = (): { file: DriveFile; text: string } | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_KB_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load active KB state:', err);
  }
  return null;
};

/**
 * Clears active KB state and all cached Drive files
 */
export const clearDriveCache = (): void => {
  memoryCache.clear();
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX) || key === ACTIVE_KB_KEY) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('Failed to clear Drive cache:', err);
  }
};
