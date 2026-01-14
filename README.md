# SpellingBee Practicing Game

An interactive spelling practice application for kids, featuring smart question rotation, automatic review rounds, and comprehensive progress tracking.

## Features

### 🎮 Game Modes

- **Game 1: Prepare** - Practice spelling words with audio hints

  - Multiple difficulty levels (Easy, Medium, Hard)
  - Customizable question count (10, 20, 30, or 50 questions)
  - Audio pronunciation for each word
  - Letter-by-letter spelling assistance

- **Game 2: Contest** _(Coming Soon)_ - Speak with AI examiner

### 🔄 Smart Question Rotation

- **Priority-based selection** ensures all questions appear before repeating
- **Adaptive learning** focuses on questions with more mistakes
- **Session persistence** tracks question history across browser sessions
- Questions prioritized by:
  1. Unseen questions (highest priority)
  2. Questions with more incorrect than correct answers
  3. Questions answered correctly (lowest priority)

### 📝 Automatic Review Round

- Wrong questions automatically appear at the end of each session
- Review round displays: "🔄 Review Round - Practice wrong answers (X/Y)"
- Final score includes both main session and review round performance
- Separate scoring for review attempts

### 🏆 Leaderboard System

- Complete game history with player names
- Filter by difficulty (All, Easy, Medium, Hard)
- Detailed stats for each game:
  - Score with percentage
  - Time spent in readable format (minutes:seconds)
  - Play timestamp (Today/Yesterday/Date at HH:MM AM/PM)
- Player name editing capability
- Color-coded scores (green ≥80%, yellow ≥60%)

### ⏱️ Timer & Progress

- 60-second timer per question
- Auto-submit when time expires
- Visual countdown for next question
- Real-time score tracking
- Session time tracking

### 🎯 Difficulty Levels

- **Easy**: Shows word length, 5-second feedback
- **Medium**: Fixed input length, 4-second feedback
- **Hard**: Fixed input length, 3-second feedback

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS with modern gradients and animations
- **Audio**: HTML5 Audio with Google Cloud Text-to-Speech fallback
- **Storage**: Browser localStorage for session persistence

## Project Structure

```
spellingbee/
├── data/
│   ├── Words.csv              # Vocabulary database
│   └── public/
│       └── audio/             # Generated audio files
├── webapp/
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── screens/           # Main screen components
│       │   ├── HomeScreen.tsx
│       │   ├── GameSetupScreen.tsx
│       │   ├── GamePlayScreen.tsx
│       │   └── LeaderboardScreen.tsx
│       ├── services/          # Business logic
│       │   ├── audioService.ts
│       │   ├── wordService.ts
│       │   ├── storageService.ts
│       │   └── questionSessionService.ts
│       └── types/             # TypeScript definitions
└── gen_audio.ts               # Audio file generator
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd spellingbee
```

2. Install dependencies:

```bash
cd webapp
npm install
```

3. Generate audio files (optional):

```bash
# From the root directory
npm run gen-audio
```

### Development

Start the development server:

```bash
cd webapp
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
cd webapp
npm run build
```

The built files will be in `webapp/dist/`

## Data Format

The vocabulary is stored in `data/Words.csv` with the following format:

```csv
Word,International Phonetic Alphabet,Meaning
beautiful,/ˈbjuː.tɪ.fəl/,đẹp
grandmother,/ˈɡræn.mʌð.ər/,bà (nội/ngoại)
```

## Features in Detail

### Question Rotation Algorithm

The app uses a sophisticated priority queue system:

```typescript
if (neverShown) {
  priority = 0; // Highest priority
} else if (incorrect > correct) {
  priority = 1000 - (netIncorrect × 100);
} else {
  priority = 10000 + timesShown; // Lowest priority
}
```

This ensures:

- All 200 questions appear before any repeats
- Questions with mistakes get more practice
- Personalized learning based on kid's performance

### Review Round Flow

1. Kid completes all main questions (e.g., 50 questions)
2. System collects which questions were answered incorrectly
3. Automatically transitions to Review Round
4. Shows only the wrong questions for retry
5. Final score combines: main round score + review round score

Example:

- Main session: 35/50 correct
- Review round: 10/15 retries correct
- **Final Score: 45/50** ✅

### Session Persistence

All data is stored in browser localStorage:

- **Question History** (`spellingbee_question_history`): Tracks shown/correct/incorrect counts
- **Player Session** (`spellingbee_player`): Player name and ID
- **Rankings** (`spellingbee_rankings`): Complete game history

## Audio Generation

Audio files can be generated using Google Cloud Text-to-Speech:

```bash
npm run gen-audio
```

This creates MP3 files for:

- Complete word pronunciation
- Letter-by-letter spelling

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Responsive design

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is for educational purposes.

## Acknowledgments

- Vocabulary: Stage 4 - Grade 3 • Global English Unit 1-5
- Audio: Google Cloud Text-to-Speech API
- Icons: Unicode Emoji

## Contact

- GitHub: [@duyhunghd6](https://github.com/duyhunghd6/spellingbee)
- Email: hungbd@gscfin.com

---

**Built with ❤️ for kids learning English**
