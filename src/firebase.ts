import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import defaultConfig from '../firebase-applet-config.json';

// Allow overriding via environment variables for custom deployments (Vercel, Netlify, custom domain)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultConfig.appId,
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Request Google Drive readonly access and user info
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Force account selector to ensure scopes are prompted correctly
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In a real app, since page refreshes lose in-memory token, we let the user sign in via popup to fetch a fresh token.
      // But if we already have it in memory, we can trigger success.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token is lost due to refresh or not loaded yet. Show sign-in.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In via popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Firebase Auth popup sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Google Drive API helper methods
export const searchDriveFiles = async (accessToken: string, queryText: string = ''): Promise<any[]> => {
  try {
    // List files: limit to docs, pdfs, and text files. Include folders if wanted, but mostly docs or text files.
    let q = "mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/pdf'";
    if (queryText) {
      q = `(${q}) and name contains '${queryText.replace(/'/g, "\\'")}'`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&pageSize=30`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Failed to search Google Drive files');
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Error searching Drive files:', error);
    throw error;
  }
};

export const getDriveFileContent = async (accessToken: string, fileId: string, mimeType: string): Promise<string> => {
  try {
    if (mimeType === 'application/vnd.google-apps.document') {
      // It's a Google Doc. We must export it as plain text.
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export Google Document as text');
      }

      return await response.text();
    } else if (mimeType === 'text/plain') {
      // It's a plain text file. Download it directly.
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download text file content');
      }

      return await response.text();
    } else {
      // For PDFs or other files, since we cannot easily parse binary client-side easily without extra libs,
      // we can return file metadata or instruct the user to select a Google Doc or plain text.
      return `[קובץ מסוג ${mimeType} אינו נתמך ישירות לקריאת טקסט. אנא בחר קובץ מסוג Google Doc או קובץ טקסט פשוט (.txt)]`;
    }
  } catch (error) {
    console.error('Error fetching file content:', error);
    throw error;
  }
};
