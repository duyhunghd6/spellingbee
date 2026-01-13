// Audio playback service
let currentAudio: HTMLAudioElement | null = null;

export function stopAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function playAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stopAudio();
    
    currentAudio = new Audio(url);
    
    currentAudio.onended = () => {
      currentAudio = null;
      resolve();
    };
    
    currentAudio.onerror = (e) => {
      console.error('Audio playback error:', e);
      currentAudio = null;
      reject(e);
    };
    
    currentAudio.play().catch(reject);
  });
}

// Generate audio file paths for a word
export function getAudioPaths(word: string): {
  wholeWord: string;
  definition: string;
  spelling: string;
} {
  const sanitized = word
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/\./g, '')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  
  return {
    wholeWord: `/audio/${sanitized}_1_whole_word.mp3`,
    definition: `/audio/${sanitized}_2_definition.mp3`,
    spelling: `/audio/${sanitized}_3_each_chars.mp3`,
  };
}
// Check if audio file exists
export async function checkAudioExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

export async function playWholeWord(word: string): Promise<void> {
  const paths = getAudioPaths(word);
  const exists = await checkAudioExists(paths.wholeWord);
  if (!exists) {
    throw new Error(`Audio file not found for word: ${word}`);
  }
  return playAudio(paths.wholeWord);
}

export function playDefinition(word: string): Promise<void> {
  const paths = getAudioPaths(word);
  return playAudio(paths.definition);
}

export function playSpelling(word: string): Promise<void> {
  const paths = getAudioPaths(word);
  return playAudio(paths.spelling);
}
