# Freq - Daily Audio Production Puzzle Game

## Project Overview
Freq is a daily puzzle game where users listen to audio samples and guess the parameters of audio effects applied to them. Similar to Wordle/Heardle, each day presents the same puzzle to all users worldwide.

## Core Game Mechanics
- **Daily Puzzle**: Same puzzle for all users globally
- **Audio Sample**: One dry recording (strings, drums, vocals, etc.)
- **6 Effected Versions**: Each with different parameter settings
- **Single Parameter**: One effect parameter to guess per day
- **Scoring**: 0-100 points based on accuracy

## Effect Types & Parameters
- **EQ**: Frequency (20Hz-20kHz)
- **Reverb**: Wet/dry mix (0-100%)
- **Compression**: Threshold level
- **Delay**: Time in milliseconds
- **Phaser**: Rate (0.1-2.0 Hz)
- **Flanger**: Rate (0.1-2.0 Hz)
- **Chorus**: Rate (0.1-2.0 Hz)
- **Distortion**: Drive amount
- **Filter**: Cutoff frequency

## Technical Architecture

### Hosting
- **GitHub Pages**: HTML, CSS, JS, puzzle data (free)
- **CDN**: Audio files (AWS S3 free tier or similar)
- **No backend**: Everything client-side

### File Structure
```
freq-game/
├── index.html          # Main game interface
├── css/
│   └── style.css      # Styling
├── js/
│   ├── game.js        # Core game logic
│   ├── audio.js       # Audio handling
│   └── puzzles.js     # Puzzle data & logic
├── puzzles.json        # All daily puzzles
└── README.md
```

## Separated Concerns for Parallel Development

### 1. Core Game Logic (`game.js`)
**Responsibilities:**
- Daily puzzle selection based on date
- Game state management
- User input handling
- Scoring algorithm
- Progress tracking

**Key Functions:**
- `initializeGame()`
- `loadDailyPuzzle(date)`
- `handleUserGuess(value)`
- `calculateScore(guess, correct)`
- `updateGameState()`

**Dependencies:**
- `puzzles.js` for puzzle data
- `audio.js` for audio playback

### 2. Audio Management (`audio.js`)
**Responsibilities:**
- Audio file loading and caching
- Playback controls
- Volume management
- Audio state tracking

**Key Functions:**
- `loadAudio(url)`
- `playAudio(audioElement)`
- `pauseAudio(audioElement)`
- `setVolume(level)`
- `preloadAudioFiles(puzzleData)`

**Dependencies:**
- Web Audio API
- Browser audio compatibility

### 3. Puzzle Data System (`puzzles.js`)
**Responsibilities:**
- Puzzle data structure
- Daily puzzle selection
- Parameter validation
- Effect type definitions

**Key Functions:**
- `getPuzzleForDate(date)`
- `validateParameterRange(effectType, value)`
- `getEffectMetadata(effectType)`
- `generatePuzzleSeed(date)`

**Dependencies:**
- `puzzles.json` data file
- Date handling utilities

### 4. User Interface (`index.html` + `style.css`)
**Responsibilities:**
- Game layout and styling
- Responsive design
- Visual feedback
- Accessibility features

**Key Components:**
- Audio player controls
- Parameter input interface
- Score display
- Progress indicators
- Mobile-friendly design

**Dependencies:**
- Game logic for state updates
- Audio controls for playback

### 5. Data Management (`puzzles.json`)
**Responsibilities:**
- Daily puzzle definitions
- Audio file URLs
- Correct parameter values
- Effect metadata

**Data Structure:**
```json
{
  "2024-01-15": {
    "drySample": "https://cdn.example.com/audio/day001/dry.mp3",
    "effectedVersions": [
      "https://cdn.example.com/audio/day001/version1.mp3"
    ],
    "effectType": "phaser",
    "parameter": "rate",
    "correctValue": 0.5,
    "minValue": 0.1,
    "maxValue": 2.0,
    "unit": "Hz",
    "sampleType": "strings"
  }
}
```

## Development Priorities

### Phase 1: Core Functionality
1. Basic game logic and puzzle selection
2. Simple audio playback
3. Basic UI with parameter input
4. Scoring system

### Phase 2: Polish & Features
1. Audio preloading and caching
2. Enhanced UI/UX
3. Mobile responsiveness
4. Local storage for stats

### Phase 3: Content & Deployment
1. Generate puzzle data
2. Audio file preparation
3. CDN setup
4. GitHub Pages deployment

## Technical Requirements

### Browser Support
- Modern browsers with Web Audio API support
- Mobile Safari, Chrome, Firefox
- Desktop Chrome, Firefox, Safari, Edge

### Audio Requirements
- MP3 format for compatibility
- 5-10 second sample length
- Consistent volume levels
- High-quality source material

### Performance Targets
- Audio loading < 2 seconds
- Smooth playback on mobile
- Responsive UI interactions
- Offline capability for loaded content

## Success Metrics
- Daily active users
- Completion rate
- Average score
- User retention
- Social sharing

## Future Enhancements (Post-MVP)
- User accounts and leaderboards
- Social features
- Advanced effect combinations
- Community challenges
- Mobile app versions
