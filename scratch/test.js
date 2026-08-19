const { DOMParser } = require('@xmldom/xmldom');
const fs = require('fs');
const path = require('path');

let xmlString = fs.readFileSync(path.resolve('../BIBLE/BSB.xml'), 'utf8');
xmlString = xmlString.trim().replace(/^\uFEFF/, '');
// remove xml declaration if it exists
xmlString = xmlString.replace(/^<\?xml[^>]+>/, '');

const parser = new DOMParser();
const xmlDoc = parser.parseFromString(xmlString, "text/xml");

if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
  console.log("Invalid XML format");
}

let booksElement = xmlDoc.getElementsByTagName('BIBLEBOOK');
if (booksElement.length === 0) {
  booksElement = xmlDoc.getElementsByTagName('book');
}

console.log("Books found:", booksElement.length);

for (let i = 0; i < Math.min(booksElement.length, 2); i++) {
  const bookNode = booksElement[i];
  const bNumberStr = bookNode.getAttribute('bnumber') || bookNode.getAttribute('number');
  const bNumber = parseInt(bNumberStr || `${i + 1}`);
  const bName = bookNode.getAttribute('bname') || bookNode.getAttribute('name') || `Book ${bNumber}`;
  
  console.log("Book Name:", bName, "Number:", bNumber);
  
  let chaptersElement = bookNode.getElementsByTagName('CHAPTER');
  if (chaptersElement.length === 0) {
    chaptersElement = bookNode.getElementsByTagName('chapter');
  }

  console.log("Chapters found:", chaptersElement.length);

  for (let j = 0; j < Math.min(chaptersElement.length, 1); j++) {
    const chapterNode = chaptersElement[j];
    const cNumberStr = chapterNode.getAttribute('cnumber') || chapterNode.getAttribute('number');
    const cNumber = parseInt(cNumberStr || `${j + 1}`);
    
    let versesElement = chapterNode.getElementsByTagName('VERS');
    if (versesElement.length === 0) {
      versesElement = chapterNode.getElementsByTagName('verse');
    }
    
    console.log("Verses found in chapter", cNumber, ":", versesElement.length);
    if (versesElement.length > 0) {
      console.log("Verse 1 text:", versesElement[0].textContent);
    }
  }
}
