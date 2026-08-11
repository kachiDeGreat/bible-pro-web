
import { getDB } from './bibleService';
import { v4 as uuidv4 } from 'uuid'; // Let's use crypto.randomUUID() instead of uuid to avoid dependencies if it's not installed.

const SONG_STORE = 'songs';
const MEDIA_STORE = 'media';

// Local IndexedDB: For storing songs
export const getSongs = async () => {
  const db = await getDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(SONG_STORE, 'readonly');
    const store = tx.objectStore(SONG_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMedia = async (file: File): Promise<string> => {
  const db = await getDB();
  return new Promise<string>((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readwrite');
    const store = tx.objectStore(MEDIA_STORE);
    const id = "media_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const request = store.put({ id, file, name: file.name, type: file.type, createdAt: Date.now() });
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
};

export const getMedia = async (id: string): Promise<File | null> => {
  const db = await getDB();
  return new Promise<File | null>((resolve, reject) => {
    const tx = db.transaction(MEDIA_STORE, 'readonly');
    const store = tx.objectStore(MEDIA_STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.file);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const addSong = async (title: string, artist: string, lyrics: string) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SONG_STORE, 'readwrite');
    const store = tx.objectStore(SONG_STORE);
    const id = "song_" + Date.now();
    const request = store.put({ id, title, artist, lyrics, createdAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteSong = async (id: string) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SONG_STORE, 'readwrite');
    const store = tx.objectStore(SONG_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getBibles = async () => {
  const db = await getDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction('bibles', 'readonly');
    const store = tx.objectStore('bibles');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const addBible = async (bibleData: any) => {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('bibles', 'readwrite');
    const store = tx.objectStore('bibles');
    const request = store.put({ id: bibleData.name || "bible_" + Date.now(), ...bibleData, createdAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// Local Server Sync (WebSocket / SSE)
export const updateLiveState = async (sessionId: string, state: any) => {
  try {
    if (import.meta.hot) {
      import.meta.hot.send('bible-song-pro:update', state);
      return;
    }
    await fetch('/api/state?t=' + Date.now(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(state)
    });
  } catch (err) {
    console.error('Failed to sync live state', err);
  }
};

export const subscribeToLiveState = (sessionId: string, callback: (state: any) => void) => {
  if (import.meta.hot) {
    const handler = (data: any) => callback(data);
    import.meta.hot.on('bible-song-pro:state', handler);
    import.meta.hot.send('bible-song-pro:request-state', {});
    return () => {
      // @ts-ignore
      if (import.meta.hot.off) {
        // @ts-ignore
        import.meta.hot.off('bible-song-pro:state', handler);
      }
    };
  }

  // Fallback to SSE if Vite HMR is somehow disabled
  let eventSource: EventSource;
  let heartbeatTimer: any;

  const connect = () => {
    eventSource = new EventSource('/api/state?t=' + Date.now());
    
    const resetHeartbeat = () => {
      clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        console.warn('SSE heartbeat timeout. Reconnecting...');
        eventSource.close();
        connect();
      }, 20000);
    };

    eventSource.onmessage = (event) => {
      resetHeartbeat();
      try {
        const state = JSON.parse(event.data);
        callback(state);
      } catch (e) {
        console.error('Failed to parse SSE data', e);
      }
    };

    eventSource.addEventListener('ping', () => resetHeartbeat());
    eventSource.onerror = () => {};
    resetHeartbeat();
  };

  connect();

  return () => {
    clearTimeout(heartbeatTimer);
    if (eventSource) eventSource.close();
  };
};
