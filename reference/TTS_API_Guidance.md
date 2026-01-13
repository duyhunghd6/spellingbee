# Spelling Bee TTS Prompt Templates

This document provides prompt templates for generating 3 types of audio files for each word in the Spelling Bee contest preparation using Gemini 2.5 TTS models.

---

## Voice Configuration

```json
{
  "voiceName": "Charon",
  "description": "Informative voice, ideal for educational content"
}
```

**Alternative voices for variety:**

- **Kore** - Firm, authoritative
- **Iapetus** - Clear pronunciation
- **Rasalgethi** - Informative and steady

---

## Template 1: Word Pronunciation Audio

**Purpose:** The student hears the word pronounced clearly and naturally.

### Prompt Template

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
{WORD}
```

### Variable Substitution

| Variable | Source                  | Example  |
| -------- | ----------------------- | -------- |
| `{WORD}` | Words.csv → Word column | "cousin" |

### Example Prompt (for word "cousin")

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
cousin
```

---

## Template 2: Definition Audio

**Purpose:** The student hears the definition of the word read aloud.

### Prompt Template

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
The definition is: {DEFINITION}
```

### Variable Substitution

| Variable       | Source                        | Example                                                              |
| -------------- | ----------------------------- | -------------------------------------------------------------------- |
| `{DEFINITION}` | Words.csv → Definition column | "A child of your aunt or uncle who is part of your extended family." |

### Example Prompt (for word "cousin")

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
The definition is: A child of your aunt or uncle who is part of your extended family.
```

---

## Template 3: Character-by-Character Spelling Audio

**Purpose:** The student hears the word spelled out letter by letter.

### Prompt Template

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
{WORD} is spelled: {LETTER_SEQUENCE}
```

### Variable Substitution

| Variable            | Source                  | Transformation                        | Example                 |
| ------------------- | ----------------------- | ------------------------------------- | ----------------------- |
| `{WORD}`            | Words.csv → Word column | As-is                                 | "cousin"                |
| `{LETTER_SEQUENCE}` | Words.csv → Word column | Split into letters, joined with " - " | "C - O - U - S - I - N" |

### Letter Sequence Generation Rules

1. Convert word to uppercase for letter calling
2. Split word into individual characters
3. Join with " - " (space-dash-space) for clear separation
4. For compound words with spaces (e.g., "long jump"), include "space" between words

**Examples:**
| Word | Letter Sequence |
|------|-----------------|
| cousin | C - O - U - S - I - N |
| brother | B - R - O - T - H - E - R |
| long jump | L - O - N - G - space - J - U - M - P |
| P.E. teacher | P - dot - E - dot - space - T - E - A - C - H - E - R |
| eco-house | E - C - O - hyphen - H - O - U - S - E |

### Example Prompt (for word "cousin")

```
# AUDIO PROFILE: Spelling Bee Pronouncer
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
cousin is spelled: C - O - U - S - I - N
```

---

## API Configuration

### Endpoint

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent
```

### Request Body Template

```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "<PROMPT_FROM_TEMPLATES_ABOVE>"
        }
      ]
    }
  ],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {
      "voiceConfig": {
        "prebuiltVoiceConfig": {
          "voiceName": "Charon"
        }
      }
    }
  },
  "model": "gemini-2.5-flash-preview-tts"
}
```

### Response Processing

```bash
# Extract audio data and save as PCM
jq -r '.candidates[0].content.parts[0].inlineData.data' response.json | base64 --decode > output.pcm

# Convert PCM to WAV
ffmpeg -f s16le -ar 24000 -ac 1 -i output.pcm output.wav
```

---

## File Naming Convention

| Audio Type         | Filename Pattern           | Example                    |
| ------------------ | -------------------------- | -------------------------- |
| Word Pronunciation | `{word}_pronunciation.wav` | `cousin_pronunciation.wav` |
| Definition         | `{word}_definition.wav`    | `cousin_definition.wav`    |
| Spelling           | `{word}_spelling.wav`      | `cousin_spelling.wav`      |

**Notes:**

- Replace spaces with underscores in compound words
- Use lowercase for all filenames
- Remove special characters (periods, hyphens become underscores)

Examples:
| Word | Pronunciation File | Definition File | Spelling File |
|------|-------------------|-----------------|---------------|
| cousin | `cousin_pronunciation.wav` | `cousin_definition.wav` | `cousin_spelling.wav` |
| long jump | `long_jump_pronunciation.wav` | `long_jump_definition.wav` | `long_jump_spelling.wav` |
| P.E. teacher | `pe_teacher_pronunciation.wav` | `pe_teacher_definition.wav` | `pe_teacher_spelling.wav` |

---

## Quick Reference: Sample Prompts for First 5 Words

### Word 1: cousin

**Pronunciation:**

```
cousin
```

**Definition:**

```
The definition is: A child of your aunt or uncle who is part of your extended family.
```

**Spelling:**

```
cousin is spelled: C - O - U - S - I - N
```

---

### Word 2: brother

**Pronunciation:**

```
brother
```

**Definition:**

```
The definition is: A male sibling who shares the same parents as you.
```

**Spelling:**

```
brother is spelled: B - R - O - T - H - E - R
```

---

### Word 3: mum

**Pronunciation:**

```
mum
```

**Definition:**

```
The definition is: An informal word for your mother or female parent.
```

**Spelling:**

```
mum is spelled: M - U - M
```

---

### Word 4: granddaughter

**Pronunciation:**

```
granddaughter
```

**Definition:**

```
The definition is: A female child of your son or daughter.
```

**Spelling:**

```
granddaughter is spelled: G - R - A - N - D - D - A - U - G - H - T - E - R
```

---

### Word 5: aunt

**Pronunciation:**

```
aunt
```

**Definition:**

```
The definition is: The sister of your mother or father or the wife of your uncle.
```

**Spelling:**

```
aunt is spelled: A - U - N - T
```

---

## Implementation Notes

1. **Batch Processing:** Process words in batches to respect API rate limits
2. **Error Handling:** Implement retry logic for failed API calls
3. **Quality Check:** Verify audio files are generated correctly before proceeding
4. **Storage:** Organize audio files by Unit folder for easy access

### Suggested Directory Structure

```
audio/
├── unit_1/
│   ├── cousin_pronunciation.wav
│   ├── cousin_definition.wav
│   ├── cousin_spelling.wav
│   ├── brother_pronunciation.wav
│   └── ...
├── unit_2/
│   └── ...
├── unit_3/
│   └── ...
├── unit_4/
│   └── ...
└── unit_5/
    └── ...
```
