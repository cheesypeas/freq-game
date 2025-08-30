# Freq - Daily Audio Production Puzzle Game

## Project Overview
Freq is a daily puzzle game where users listen to audio samples and guess the parameters of audio effects applied to them. Similar to Wordle/Heardle, each day presents the same puzzle to all users worldwide.

## Core Game Mechanics
- **Daily Puzzle**: Same puzzle for all users globally
- **Audio Sample**: One dry recording (strings, drums, vocals, etc.)
- **Real-time Effects**: Audio effects generated in real-time using Web Audio API
- **Single Parameter**: One effect parameter to guess per day
- **Interactive Guessing**: Users can audition different parameter values as they guess
- **Lives System**: Limited attempts to audition parameters (3-5 lives per day)
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
- **Audio Storage**: Only dry sample files needed (much smaller footprint)
- **No backend**: Everything client-side

### File Structure
```
freq-game/
├── index.html          # Main game interface
├── css/
│   └── style.css      # Styling
├── js/
│   ├── game.js        # Core game logic
│   ├── audio.js       # Web Audio API & real-time effects
│   ├── effects.js     # Audio effect implementations
│   └── puzzles.js     # Puzzle data & logic
├── audio/
│   └── samples/       # Dry audio samples only
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
- Lives/clues system management

**Key Functions:**
- `initializeGame()`
- `loadDailyPuzzle(date)`
- `handleUserGuess(value)`
- `calculateScore(guess, correct)`
- `updateGameState()`
- `useLifeForAudition()`
- `getRemainingLives()`

**Dependencies:**
- `puzzles.js` for puzzle data
- `audio.js` for real-time audio generation

### 2. Real-time Audio Management (`audio.js`)
**Responsibilities:**
- Web Audio API context management
- Dry sample loading and caching
- Real-time effect processing
- Parameter auditioning
- Audio buffer management
- Effect chain routing

**Key Functions:**
- `initAudioContext()`
- `loadDrySample(url)`
- `applyEffectInRealTime(effectType, parameters)`
- `auditionParameter(value)`
- `playProcessedAudio()`
- `stopAudio()`
- `setEffectParameters(effectType, params)`

**Dependencies:**
- Web Audio API
- `effects.js` for effect implementations
- Browser audio compatibility

### 3. Audio Effects Engine (`effects.js`) - NEW
**Responsibilities:**
- Individual effect implementations
- Web Audio API node creation
- Parameter validation
- Effect chain management
- Real-time parameter updates

**Key Functions:**
- `createEQNode(frequency, gain, q)`
- `createReverbNode(wetMix, roomSize)`
- `createCompressionNode(threshold, ratio, attack, release)`
- `createDelayNode(time, feedback)`
- `createPhaserNode(rate, depth, feedback)`
- `createFlangerNode(rate, depth, feedback)`
- `createChorusNode(rate, depth, feedback)`
- `createDistortionNode(drive, curve)`
- `createFilterNode(type, frequency, q)`

**Dependencies:**
- Web Audio API
- Audio context and buffer management

### 4. Puzzle Data System (`puzzles.js`)
**Responsibilities:**
- Puzzle data structure
- Daily puzzle selection
- Parameter validation
- Effect type definitions
- Dry sample management

**Key Functions:**
- `getPuzzleForDate(date)`
- `validateParameterRange(effectType, value)`
- `getEffectMetadata(effectType)`
- `generatePuzzleSeed(date)`
- `getDrySampleUrl(date)`

**Dependencies:**
- `puzzles.json` data file
- Date handling utilities

### 5. User Interface (`index.html` + `style.css`)
**Responsibilities:**
- Game layout and styling
- Responsive design
- Visual feedback
- Accessibility features
- Lives/clues display
- Parameter audition controls

**Key Components:**
- Audio player controls
- Parameter input interface with audition button
- Lives/clues counter
- Score display
- Progress indicators
- Mobile-friendly design

**Dependencies:**
- Game logic for state updates
- Real-time audio controls

### 6. Data Management (`puzzles.json`)
**Responsibilities:**
- Daily puzzle definitions
- Dry sample file URLs
- Correct parameter values
- Effect metadata
- Lives allocation per puzzle

**Data Structure:**
```json
{
  "2024-01-15": {
    "drySample": "audio/samples/strings_day001.wav",
    "effectType": "phaser",
    "parameter": "rate",
    "correctValue": 0.5,
    "minValue": 0.1,
    "maxValue": 2.0,
    "unit": "Hz",
    "sampleType": "strings",
    "livesAllocated": 5,
    "effectPresets": {
      "phaser": {
        "depth": 0.8,
        "feedback": 0.2,
        "stages": 4
      }
    }
  }
}
```

## Real-time Audio Generation System

### Web Audio API Architecture
1. **Audio Context**: Single context for all audio processing
2. **Source Node**: Dry sample loaded as AudioBuffer
3. **Effect Chain**: Series of Web Audio API nodes for effects
4. **Destination**: Speakers/headphones output
5. **Parameter Control**: Real-time parameter updates via AudioParam

### Effect Implementation Strategy
- **EQ**: BiquadFilterNode with frequency, Q, and gain controls
- **Reverb**: ConvolverNode with impulse response + GainNode for wet/dry
- **Compression**: DynamicsCompressorNode with threshold, ratio, attack, release
- **Delay**: DelayNode with time and feedback controls
- **Modulation Effects**: OscillatorNode + GainNode for LFO modulation
- **Distortion**: WaveShaperNode with custom curve
- **Filter**: BiquadFilterNode with type, frequency, and Q controls

### Parameter Auditioning System
- **Lives Management**: 3-5 lives per puzzle
- **Real-time Preview**: Hear current parameter setting
- **Cost System**: Each audition costs 1 life
- **Strategic Element**: Balance between auditioning and final guess
- **Educational Value**: Users learn by hearing parameter changes

## Development Priorities

### Phase 1: Core Functionality
1. Basic game logic and puzzle selection
2. Web Audio API integration
3. Simple effect implementations (EQ, Filter)
4. Basic UI with parameter input and audition
5. Lives system implementation

### Phase 2: Advanced Effects
1. Complex effect implementations (Reverb, Modulation)
2. Effect chain management
3. Parameter auditioning system
4. Enhanced UI/UX
5. Mobile responsiveness

### Phase 3: Polish & Deployment
1. Complete effect library
2. Audio optimization and performance
3. GitHub Pages deployment
4. Sample audio library creation

## Technical Requirements

### Browser Support
- Chrome 66+ (Web Audio API support)
- Firefox 60+ (Web Audio API support)
- Safari 11+ (Web Audio API support)
- Edge 79+ (Web Audio API support)
- Mobile Safari, Chrome, Firefox

### Audio Requirements
- WAV format for dry samples
- 5-10 second sample length
- Consistent volume levels
- High-quality source material
- Web Audio API compatibility

### Performance Targets
- Audio loading < 1 second (dry samples only)
- Real-time effect processing < 50ms latency
- Smooth parameter changes
- Responsive UI interactions
- Offline capability for loaded content

### Audio Sample Management
- Host dry samples on GitHub Pages or CDN
- Much smaller storage footprint (no effected versions)
- Easier content management
- Faster loading times

## Success Metrics
- Daily active users
- Completion rate
- Average score
- User retention
- Lives usage patterns
- Learning effectiveness

## Future Enhancements (Post-MVP)
- User accounts and leaderboards
- Social features
- Advanced effect combinations
- Community challenges
- Mobile app versions
- Effect parameter presets
- User-created effect chains
- Export/import effect settings

## Implementation Benefits of New Approach

### Technical Advantages
- **No Pre-processing**: Eliminates need for DAW/audio software
- **Real-time Generation**: Immediate feedback for users
- **Smaller Footprint**: Only dry samples need storage
- **Scalable**: Easy to add new effects and parameters
- **Interactive**: Users can experiment and learn

### User Experience Improvements
- **Educational**: Users hear parameter changes in real-time
- **Engaging**: Strategic use of lives adds game element
- **Immediate Feedback**: No waiting for audio to load
- **Exploration**: Users can discover effect behaviors
- **Accessibility**: Better for users with different hearing abilities

### Development Benefits
- **Faster Iteration**: No audio file generation needed
- **Easier Testing**: Parameter changes are immediate
- **More Flexible**: Easy to adjust effect ranges
- **Better Debugging**: Real-time parameter monitoring
- **Cross-platform**: Works on any Web Audio API compatible browser
