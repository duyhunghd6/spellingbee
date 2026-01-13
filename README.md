# Spelling Bee Contest Preparation App

## Overview

This application is designed to help Grade 3 students (Stage 4) prepare for their Spelling Bee contest. It features a child-friendly, mobile-responsive interface that gamifies the learning process, focusing on pronunciation, definition understanding, and spelling accuracy.

The app uses a curated list of words (`Words.csv`) and generated audio assets to provide an immersive practice experience. Use cases focus on "Global English Unit 1-5" vocabulary.

## Features

### 1. Data Preparation

- **Audio Generation**: Automated script (`gen_audio.ts`) utilizes Google's Gemini TTS API to generate three types of high-quality audio assets for each word:
  - **Whole Word**: Clear pronunciation in Standard British English.
  - **Definition**: Reading of the definition (for Medium/Hard levels).
  - **Spelling**: Character-by-character spelling (e.g., "C - O - U - S - I - N").
- **Asset Management**: Checks existing files to avoid redundant API calls.

### 2. Contest App (Web UI)

A mobile-friendly web application built with Node.js and modern frontend technologies (React/Vite).

#### Game Modes

**Game 1: Prepare (Core Practice)**
_Study and practice mode with adjustable difficulty._

- **Levels**:

  - **Easy**: Input boxes match the exact word length.
  - **Medium**: Standardized input area; "Read Definition" button available.
  - **Hard**: Standardized input area; "Read Definition" button available; shorter answer display time.
  - **Default Question Count**: 30 words per session.

- **Gameplay Mechanics**:

  - **Audio Controls**:
    - Auto-plays word pronunciation on load.
    - **"READ WORD AGAIN"**: Replays pronunciation.
    - **"READ DEFINITION"**: Plays definition audio (Medium/Hard only).
    - **"READ SPELLING"**: Plays character-by-character spelling (All levels).
    - _Action_: Playing a new audio track stops any currently playing audio.
  - **input Interface**:
    - Centered, segmented input boxes.
    - **Easy Mode**: Number of boxes equals the word length.
    - **Medium/Hard Mode**: Fixed number of boxes (equal to the longest word in the database) to prevent guessing by length.
    - **Navigation**: Auto-advance to next box upon typing. Backspace clears current box.
    - **Clear All**: Dedicated `(<- Code)` button to clear the entire input.
  - **Timer**: 60 seconds maximum per word.
  - **Feedback & Scoring**:
    - **Instant Feedback**: Upon submitting (Enter), visual highlighting (Green/Red) indicates correct/wrong characters for 300ms.
    - **Answer Reveal**: Correct answer displayed for:
      - _Easy_: 8 seconds
      - _Medium_: 4 seconds
      - _Hard_: 3 seconds
    - **Countdown**: Shows time until the next question starts.
  - **Scoring**: Tracks main score and "total time solving" as a tie-breaker/sub-score.

- **Adaptive Learning Algorithm**:

  - Uses a **Shuffle Weight Random** algorithm.
  - Words missed or answered incorrectly in previous sessions are weighted to appear more frequently.
  - Mistakes are tracked locally per user session.

- **Session & Ranking**:
  - Prompts for player name if not entered at the start.
  - Displays session summary: Main Score, Total Time, Date (GMT+7).
  - Persists rankings and history via JSON DB.

**Game 2: Contest (AI Examiner - Next Version)**
_Interactive oral spelling simulation._

- **Format**: ~10 questions per round, 120 seconds per question.
- **Technology**: Integrates **Gemini Live API** for real-time speech interaction.
- **Flow**:
  1.  Gemini "Examiner" reads a word.
  2.  Student can ask via microphone: "Definition?" or "Repeat?".
  3.  Student spells the word aloud character by character.
  4.  Gemini listens and returns the transcribed letter sequence.
- **Scoring**: Fuzzy matching (% accuracy) between the spoken letters and the correct spelling (Longest Common Subsequence).

## Technical Architecture

- **Stack**: Node.js, React/Vite (Frontend), TypeScript.
- **Storage**:
  - **Local**: Browser LocalStorage for session progress and adaptive weights.
  - **Remote**: JSON DB for Global Rankings (deployed via Netlify functions or compatible N8N workflow).
- **Deployment**: Netlify (supporting mobile-friendly responsive design).

## Setup & Usage

### Prerequisites

- Node.js (LTS version)
- NPM or Yarn
- Google Cloud API Key (for Gemini TTS)

### 1. Data Generation

Run the audio generation script to populate the `./audio` directory:

```bash
# Install dependencies
npm install

# Generate Audio Files
npx tsx gen_audio.ts
```

This reads `./data/Words.csv` and creates:

- `./audio/{word}_1_whole_word.wav`
- `./audio/{word}_2_definition.wav`
- `./audio/{word}_3_each_chars.wav`

### 2. Running the App

_(Instructions to be added upon completion of UI development)_

## Data Structure (`Words.csv`)

Columns derived from Stage 4 Global English curriculum:

- `No`, `Word`, `IPA`, `Meaning`, `Unit`, `Definition`
