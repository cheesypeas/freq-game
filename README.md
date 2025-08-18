# Freq - Daily Audio Production Puzzle Game

A daily puzzle game where users listen to audio samples and guess the parameters of audio effects applied to them. Similar to Wordle/Heardle, each day presents the same puzzle to all users worldwide.

## 🎯 Game Concept

Each day, players are presented with:
- **Dry Sample**: A clean recording (strings, drums, vocals, etc.)
- **Effected Version**: The same sample with an audio effect applied
- **Challenge**: Guess the specific parameter value of the effect

## 🎵 Effect Types

- **EQ**: Frequency (20Hz-20kHz)
- **Reverb**: Wet/dry mix (0-100%)
- **Compression**: Threshold level
- **Delay**: Time in milliseconds
- **Phaser**: Rate (0.1-2.0 Hz)
- **Flanger**: Rate (0.1-2.0 Hz)
- **Chorus**: Rate (0.1-2.0 Hz)
- **Distortion**: Drive amount
- **Filter**: Cutoff frequency

## 🚀 Getting Started

### Prerequisites
- Modern web browser with Web Audio API support
- No additional software required

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/freq-game.git
   cd freq-game
   ```

2. Open `index.html` in your browser
   - Or serve locally with a simple HTTP server:
   ```bash
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

## 🏗️ Project Structure

```
freq-game/
├── index.html          # Main game interface
├── css/
│   └── style.css      # Styling and responsive design
├── js/
│   ├── game.js        # Core game logic and state management
│   ├── audio.js       # Audio handling and Web Audio API integration
│   └── puzzles.js     # Puzzle data system and effect definitions
├── audio/              # Audio files (to be added)
├── puzzles.json        # Puzzle data (to be added)
└── README.md
```

## 🧩 Architecture

### Core Components

1. **Puzzle System** (`puzzles.js`)
   - Daily puzzle selection based on date
   - Effect metadata and parameter ranges
   - Value conversion utilities

2. **Audio Manager** (`audio.js`)
   - Audio file loading and caching
   - Playback controls
   - Web Audio API integration

3. **Game Logic** (`game.js`)
   - Game state management
   - User interaction handling
   - Scoring algorithm
   - Local storage for progress

### Data Flow
1. Game loads today's puzzle based on current date
2. Audio files are preloaded from CDN
3. User listens to samples and makes a guess
4. Score is calculated and results displayed
5. Progress is saved to local storage

## 🎮 How to Play

1. **Listen to the dry sample** to understand the original sound
2. **Listen to the effected version** to hear the audio effect
3. **Use the slider** to guess the parameter value
4. **Submit your guess** to see your score
5. **Compare your answer** with the correct value
6. **Track your progress** and build your streak

## 📱 Features

- **Responsive Design**: Works on desktop and mobile
- **Audio Caching**: Fast playback after initial load
- **Progress Tracking**: Local storage for scores and streaks
- **Accessibility**: Keyboard navigation and screen reader support
- **Modern UI**: Clean, intuitive interface

## 🔧 Technical Details

### Browser Support
- Chrome 66+
- Firefox 60+
- Safari 11+
- Edge 79+

### Audio Requirements
- MP3 format for compatibility
- 5-10 second sample length
- Consistent volume levels
- High-quality source material

### Performance Targets
- Audio loading < 2 seconds
- Smooth playback on mobile
- Responsive UI interactions

## 🚀 Deployment

### GitHub Pages (Recommended)
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Set source to main branch
4. Site will be available at `https://username.github.io/repo-name`

### CDN Setup for Audio
- Host audio files on AWS S3, Cloudflare R2, or similar
- Update audio URLs in puzzle data
- Ensure CORS is properly configured

## 🎨 Customization

### Adding New Effects
1. Add effect definition to `puzzles.js`
2. Define parameter ranges and units
3. Update effect descriptions
4. Generate sample puzzles

### Modifying UI
1. Edit `css/style.css` for styling changes
2. Modify `index.html` for layout changes
3. Update game logic in `js/game.js`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🎯 Roadmap

### Phase 1: Core Functionality ✅
- [x] Basic game mechanics
- [x] Audio playback system
- [x] Scoring algorithm
- [x] Responsive UI

### Phase 2: Polish & Features
- [ ] Audio preloading optimization
- [ ] Enhanced visual feedback
- [ ] Sound visualization
- [ ] Social sharing

### Phase 3: Content & Deployment
- [ ] Generate puzzle data
- [ ] Prepare audio samples
- [ ] CDN setup
- [ ] Production deployment

## 🐛 Known Issues

- Audio autoplay restrictions in some browsers
- Mobile Safari audio context limitations
- Large audio file loading times

## 📞 Support

For questions or issues:
1. Check the [Issues](https://github.com/yourusername/freq-game/issues) page
2. Create a new issue with detailed description
3. Include browser and device information

---

**Freq** - Making audio production fun, one puzzle at a time! 🎵
