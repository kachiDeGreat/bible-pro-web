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

  // Parses Zefania XML format and other common formats (e.g. AMPC, BSB)
  async parseZefaniaXML(xmlString: string, id: string, name: string): Promise<BibleVersion> {
    const cleanXml = xmlString.trim().replace(/^\uFEFF/, '');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(cleanXml, "text/xml");
    
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error("Invalid XML format");
    }

    let booksElement = xmlDoc.getElementsByTagName('BIBLEBOOK');
    if (booksElement.length === 0) {
      booksElement = xmlDoc.getElementsByTagName('book');
    }
    const parsedBooks: Book[] = [];

    const standardBookNames = [
      "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
      "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
      "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
      "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
      "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
      "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
      "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
      "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
      "1 John", "2 John", "3 John", "Jude", "Revelation"
    ];

    for (let i = 0; i < booksElement.length; i++) {
      const bookNode = booksElement[i];
      const bNumberStr = bookNode.getAttribute('bnumber') || bookNode.getAttribute('number');
      const bNumber = parseInt(bNumberStr || `${i + 1}`);
      let bName = bookNode.getAttribute('bname') || bookNode.getAttribute('name');
      if (!bName) {
        bName = standardBookNames[bNumber - 1] || `Book ${bNumber}`;
      }
      
      let chaptersElement = bookNode.getElementsByTagName('CHAPTER');
      if (chaptersElement.length === 0) {
        chaptersElement = bookNode.getElementsByTagName('chapter');
      }
      const parsedChapters: Chapter[] = [];

      for (let j = 0; j < chaptersElement.length; j++) {
        const chapterNode = chaptersElement[j];
        const cNumberStr = chapterNode.getAttribute('cnumber') || chapterNode.getAttribute('number');
        const cNumber = parseInt(cNumberStr || `${j + 1}`);
        
        let versesElement = chapterNode.getElementsByTagName('VERS');
        if (versesElement.length === 0) {
          versesElement = chapterNode.getElementsByTagName('verse');
        }
        const parsedVerses: Verse[] = [];

        for (let k = 0; k < versesElement.length; k++) {
          const verseNode = versesElement[k];
          const vNumberStr = verseNode.getAttribute('vnumber') || verseNode.getAttribute('number');
          const vNumber = parseInt(vNumberStr || `${k + 1}`);
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
  },

  async getAvailableServerBibles(): Promise<string[]> {
    try {
      const res = await fetch('/api/bibles/list');
      if (res.ok) {
        return await res.json();
      }
    } catch(e) {
      console.error("Failed to fetch available bibles", e);
    }
    return [];
  },

  async loadBibleFromServer(filename: string): Promise<BibleVersion | null> {
    try {
      const res = await fetch(`/api/bibles/file?name=${filename}`);
      if (res.ok) {
        const xmlText = await res.text();
        const id = "bible_" + filename.replace('.xml', '');
        const name = filename.replace('.xml', '');
        return await this.parseZefaniaXML(xmlText, id, name);
      }
    } catch(e) {
      console.error("Failed to load bible from server", e);
    }
    return null;
  }
};
