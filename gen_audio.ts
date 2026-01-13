#!/usr/bin/env npx tsx
/**
 * Spelling Bee TTS Audio Generator
 * 
 * Generates 3 audio files for each word in Words.csv:
 * 1. Whole word pronunciation
 * 2. Definition reading
 * 3. Character-by-character spelling
 * 
 * Uses TTS API at http://10.0.1.42:5345/
 * 
 * Run: npx tsx gen_audio.ts
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // ttsHost: '10.0.1.42',
  ttsHost: '127.0.0.1',
  ttsPort: 5345,
  ttsPath: '/v1beta/models/gemini-2.5-pro-preview-tts:streamGenerateContent?alt=sse',
  apiKey: 'aistudio-proxy-key-2024',
  voiceName: 'Charon', // Informative voice for educational content
  audioDir: './audio',
  csvPath: './data/Words.csv',
  requestTimeoutMs: 600000, // 2 minutes per request
  delayBetweenRequestsMs: 1000, // 1 second delay between API calls
};

// ============================================================================
// Types
// ============================================================================

interface WordEntry {
  no: string;
  word: string;
  ipa: string;
  meaning: string;
  unit: string;
  definition: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse CSV file and return array of WordEntry
 */
function parseCSV(csvPath: string): WordEntry[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const entries: WordEntry[] = [];
  
  for (const line of dataLines) {
    // Parse CSV with proper handling of commas in fields
    const parts = parseCSVLine(line);
    if (parts.length >= 6) {
      entries.push({
        no: parts[0],
        word: parts[1],
        ipa: parts[2],
        meaning: parts[3],
        unit: parts[4],
        definition: parts[5],
      });
    }
  }
  
  return entries;
}

/**
 * Parse a single CSV line handling quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
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

/**
 * Convert word to letter sequence for spelling
 * Example: "cousin" -> "C - O - U - S - I - N"
 */
function wordToLetterSequence(word: string): string {
  const result: string[] = [];
  
  for (const char of word) {
    if (char === ' ') {
      result.push('space');
    } else if (char === '-') {
      result.push('hyphen');
    } else if (char === '.') {
      result.push('dot');
    } else {
      result.push(char.toUpperCase());
    }
  }
  
  return result.join(' - ');
}

/**
 * Sanitize word for filename
 */
function sanitizeFilename(word: string): string {
  return word
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/\./g, '')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Generate TTS prompt for whole word pronunciation
 */
function generateWholeWordPrompt(word: string): string {
  return `# AUDIO PROFILE: Spelling Bee Pronouncer
## "The Clear Articulator"

## THE SCENE: Educational Contest
A quiet, professional spelling bee contest environment. The pronouncer stands
at the podium, ready to clearly articulate each word for contestants.

### DIRECTOR'S NOTES
Style:
* Clear and authoritative pronunciation
* Neutral, professional tone suitable for educational contexts
* Each word should be pronounced distinctly with proper emphasis

Pacing:
* Moderate, deliberate pace
* Brief pause before and after the word
* Allow the word to resonate clearly

Accent: Standard British English (Received Pronunciation) with clear articulation

### TRANSCRIPT
${word}`;
}

/**
 * Generate TTS prompt for definition reading
 */
function generateDefinitionPrompt(definition: string): string {
  return `# AUDIO PROFILE: Spelling Bee Pronouncer
## "The Educator"

## THE SCENE: Educational Contest
A calm, focused spelling bee environment. The pronouncer provides the
definition to help contestants understand the word's meaning.

### DIRECTOR'S NOTES
Style:
* Informative and clear delivery
* Helpful, educational tone
* Natural reading pace suitable for comprehension

Pacing:
* Steady, measured pace
* Brief pauses at natural break points
* Clear enunciation of each word in the definition

Accent: Standard British English (Received Pronunciation)

### TRANSCRIPT
The definition is: ${definition}`;
}

/**
 * Generate TTS prompt for character-by-character spelling
 */
function generateSpellingPrompt(word: string): string {
  const letterSequence = wordToLetterSequence(word);
  
  return `# AUDIO PROFILE: Spelling Bee Pronouncer
## "The Letter Caller"

## THE SCENE: Educational Contest
A focused spelling bee environment. The pronouncer carefully spells out
each letter of the word, providing a model for correct spelling.

### DIRECTOR'S NOTES
Style:
* Clear, distinct pronunciation of each letter
* Authoritative and precise
* Each letter spoken as its phonetic name (e.g., "A" as "ay", "B" as "bee")

Pacing:
* Slow, deliberate pace with equal spacing between letters
* Clear pause after each letter (approximately 0.5 seconds)
* Consistent rhythm throughout the spelling

Accent: Standard British English (Received Pronunciation)

### TRANSCRIPT
${word} is spelled: ${letterSequence}`;
}

/**
 * Convert raw PCM audio data to MP3 format using ffmpeg
 */
function pcmToMp3(pcmBuffer: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
  // Write PCM data to a temporary file
  const tempPcmFile = `/tmp/temp_${Date.now()}.pcm`;
  const tempMp3File = `/tmp/temp_${Date.now()}.mp3`;
  
  try {
    fs.writeFileSync(tempPcmFile, pcmBuffer);
    
    // Use ffmpeg to convert PCM to MP3
    execSync(
      `ffmpeg -f s16le -ar ${sampleRate} -ac ${numChannels} -i "${tempPcmFile}" ` +
      `-codec:a libmp3lame -qscale:a 2 "${tempMp3File}" -y`,
      { stdio: 'pipe' } // Suppress ffmpeg output
    );
    
    // Read the MP3 file
    const mp3Buffer = fs.readFileSync(tempMp3File);
    
    // Clean up temporary files
    fs.unlinkSync(tempPcmFile);
    fs.unlinkSync(tempMp3File);
    
    return mp3Buffer;
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempPcmFile)) fs.unlinkSync(tempPcmFile);
    if (fs.existsSync(tempMp3File)) fs.unlinkSync(tempMp3File);
    throw error;
  }
}

/**
 * Call TTS API and return audio buffer
 */
async function callTTSApi(prompt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 1,
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: CONFIG.voiceName,
            },
          },
        },
      },
    });

    const requestOptions: http.RequestOptions = {
      hostname: CONFIG.ttsHost,
      port: CONFIG.ttsPort,
      path: CONFIG.ttsPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'x-goog-api-key': CONFIG.apiKey,
      },
    };

    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, CONFIG.requestTimeoutMs);

    const req = http.request(requestOptions, (res) => {
      let responseData = '';
      const audioChunks: string[] = [];

      res.on('data', (chunk: Buffer) => {
        responseData += chunk.toString();
      });

      res.on('end', () => {
        clearTimeout(timeout);

        if (res.statusCode === 503) {
          reject(new Error('Service unavailable - no browser client connected'));
          return;
        }

        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData.substring(0, 200)}`));
          return;
        }

        // Parse SSE stream to extract audio data
        const sseLines = responseData.split('\n');
        let mimeType = 'audio/wav';

        for (const line of sseLines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line.substring(6));
              const parts = jsonData?.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  audioChunks.push(part.inlineData.data);
                  if (part.inlineData.mimeType) {
                    mimeType = part.inlineData.mimeType;
                  }
                }
              }
            } catch {
              // Ignore parse errors for malformed lines
            }
          }
        }

        if (audioChunks.length > 0) {
          const combinedBase64 = audioChunks.join('');
          let audioBuffer = Buffer.from(combinedBase64, 'base64');

          // Extract sample rate from mimeType
          let sampleRate = 24000;
          const rateMatch = mimeType.match(/rate=(\d+)/);
          if (rateMatch) {
            sampleRate = parseInt(rateMatch[1], 10);
          }

          // Convert PCM to MP3 format
          if (mimeType.includes('L16') || mimeType.includes('pcm')) {
            audioBuffer = pcmToMp3(audioBuffer, sampleRate);
          }

          resolve(audioBuffer);
        } else {
          reject(new Error('No audio data in response'));
        }
      });

      res.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Generate audio for a single word entry
 */
async function generateAudioForWord(entry: WordEntry): Promise<{ success: boolean; skipped: number; errors: string[] }> {
  const sanitizedWord = sanitizeFilename(entry.word);
  const errors: string[] = [];
  let skipped = 0;

  const audioFiles = [
    {
      name: `${sanitizedWord}_1_whole_word.mp3`,
      prompt: generateWholeWordPrompt(entry.word),
      type: 'whole word',
    },
    {
      name: `${sanitizedWord}_2_definition.mp3`,
      prompt: generateDefinitionPrompt(entry.definition),
      type: 'definition',
    },
    {
      name: `${sanitizedWord}_3_each_chars.mp3`,
      prompt: generateSpellingPrompt(entry.word),
      type: 'spelling',
    },
  ];

  for (const audioFile of audioFiles) {
    const filePath = path.join(CONFIG.audioDir, audioFile.name);

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`   ⏭️  Skipping ${audioFile.type} (exists): ${audioFile.name}`);
      skipped++;
      continue;
    }

    try {
      console.log(`   🎙️  Generating ${audioFile.type}: ${audioFile.name}`);
      const audioBuffer = await callTTSApi(audioFile.prompt);
      
      fs.writeFileSync(filePath, audioBuffer);
      console.log(`   ✅ Saved: ${audioFile.name} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequestsMs));
    } catch (err) {
      const errorMsg = `Failed to generate ${audioFile.type}: ${(err as Error).message}`;
      console.log(`   ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  return {
    success: errors.length === 0,
    skipped,
    errors,
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('║ Spelling Bee TTS Audio Generator                                    ║');
  console.log('═'.repeat(70));
  console.log();

  // Ensure audio directory exists
  if (!fs.existsSync(CONFIG.audioDir)) {
    fs.mkdirSync(CONFIG.audioDir, { recursive: true });
    console.log(`📁 Created audio directory: ${CONFIG.audioDir}`);
  }

  // Parse CSV
  console.log(`📄 Reading words from: ${CONFIG.csvPath}`);
  const entries = parseCSV(CONFIG.csvPath);
  console.log(`📝 Found ${entries.length} words to process\n`);

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(`\n[${i + 1}/${entries.length}] Processing: "${entry.word}" (Unit ${entry.unit})`);
    console.log('─'.repeat(50));

    const result = await generateAudioForWord(entry);
    
    totalSkipped += result.skipped;
    if (!result.success) {
      totalErrors += result.errors.length;
    }
    totalProcessed++;

    // Add delay between words to avoid rate limiting
    if (i < entries.length - 1) {
      await sleep(500);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('║ SUMMARY                                                              ║');
  console.log('═'.repeat(70));
  console.log(`\n✅ Words processed: ${totalProcessed}`);
  console.log(`⏭️  Audio files skipped (already exist): ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  
  // Count actual files
  const audioFiles = fs.readdirSync(CONFIG.audioDir).filter(f => f.endsWith('.wav'));
  console.log(`📁 Total audio files in ${CONFIG.audioDir}: ${audioFiles.length}`);
  
  console.log('\n🎉 Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
