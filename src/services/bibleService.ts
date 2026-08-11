export interface Verse {
  number: number;
  text: string;
}

export interface Chapter {
  number: number;
  verses: Verse[];
}

export interface Book {
  name: string;
  number: number;
  chapters: Chapter[];
}

export interface BibleVersion {
  id: string; // e.g., 'KJV'
  name: string;
  books: Book[];
}

// Simple IndexedDB Wrapper
const DB_NAME = 'BibleSongProDB';
const DB_VERSION = 3;
const STORE_NAME = 'bibles';
const SONG_STORE = 'songs';
const MEDIA_STORE = 'media';

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SONG_STORE)) {
        db.createObjectStore(SONG_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDIA_STORE)) {
        db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
      }
    };
  });
}

export const bibleService = {
  async saveBible(bible: BibleVersion): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(bible);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getAllBibles(): Promise<BibleVersion[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBible(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Parses Zefania XML format
  async parseZefaniaXML(xmlString: string, id: string, name: string): Promise<BibleVersion> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error("Invalid XML format");
    }

    const booksElement = xmlDoc.getElementsByTagName('BIBLEBOOK');
    const parsedBooks: Book[] = [];

    for (let i = 0; i < booksElement.length; i++) {
      const bookNode = booksElement[i];
      const bNumber = parseInt(bookNode.getAttribute('bnumber') || `${i + 1}`);
      const bName = bookNode.getAttribute('bname') || `Book ${bNumber}`;
      
      const chaptersElement = bookNode.getElementsByTagName('CHAPTER');
      const parsedChapters: Chapter[] = [];

      for (let j = 0; j < chaptersElement.length; j++) {
        const chapterNode = chaptersElement[j];
        const cNumber = parseInt(chapterNode.getAttribute('cnumber') || `${j + 1}`);
        
        const versesElement = chapterNode.getElementsByTagName('VERS');
        const parsedVerses: Verse[] = [];

        for (let k = 0; k < versesElement.length; k++) {
          const verseNode = versesElement[k];
          const vNumber = parseInt(verseNode.getAttribute('vnumber') || `${k + 1}`);
          const vText = verseNode.textContent || '';
          
          parsedVerses.push({
            number: vNumber,
            text: vText.trim()
          });
        }

        parsedChapters.push({
          number: cNumber,
          verses: parsedVerses
        });
      }

      parsedBooks.push({
        name: bName,
        number: bNumber,
        chapters: parsedChapters
      });
    }

    const bibleVersion: BibleVersion = {
      id,
      name,
      books: parsedBooks
    };

    await this.saveBible(bibleVersion);
    return bibleVersion;
  }
};
