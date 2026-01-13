// Convert Words.csv to words.json for the webapp
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../../../data/Words.csv');
const outputPath = path.join(__dirname, '../../public/data/words.json');

interface Word {
  no: number;
  word: string;
  ipa: string;
  meaning: string;
  unit: number;
  definition: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());

const words: Word[] = [];

for (let i = 1; i < lines.length; i++) {
  const parts = parseCSVLine(lines[i]);
  if (parts.length >= 6 && parts[1]) {
    words.push({
      no: parseInt(parts[0]) || i,
      word: parts[1],
      ipa: parts[2],
      meaning: parts[3],
      unit: parseInt(parts[4]) || 1,
      definition: parts[5],
    });
  }
}

// Ensure output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write JSON
fs.writeFileSync(outputPath, JSON.stringify(words, null, 2));
console.log(`Created words.json with ${words.length} words`);
