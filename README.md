# superfreq - Daily Audio Production Puzzle Game

A daily puzzle game where users listen to audio samples and guess the parameters of audio effects applied to them. Similar to Wordle/Heardle, each day presents the same puzzle to all users worldwide.

## 🎵 New Real-Time Audio System

**superfreq now uses Web Audio API for real-time audio generation instead of pre-prepared audio files!**

### Key Features
- **Real-time Effects**: Audio effects are generated in real-time using Web Audio API
- **Interactive Guessing**: Users can audition different parameter values as they guess
- **Lives System**: Limited attempts to audition parameters (3-5 lives per day)
- **Educational**: Users learn by hearing parameter changes in real-time
- **No Pre-processing**: Eliminates need for DAW/audio software

### How It Works
1. **Dry Sample**: Only the original audio file is loaded
2. **Real-time Processing**: Web Audio API applies effects in real-time
3. **Parameter Auditioning**: Users can hear their current guess (costs 1 life)
4. **Immediate Feedback**: No waiting for audio to load or process

## 🎮 Game Mechanics

- **Daily Puzzle**: Same puzzle for all users globally
- **Audio Sample**: One dry recording (strings, drums, vocals, etc.)
- **Single Parameter**: One effect parameter to guess per day
- **Scoring**: 0-100 points based on accuracy
- **Lives System**: Strategic use of lives for parameter auditioning

## 🎛️ Supported Effects

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
- Chrome 66+, Firefox 60+, Safari 11+, Edge 79+

### Installation
1. Clone the repository
2. Open `index.html` in a web browser
3. Allow audio playback when prompted
4. Start playing!

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/superfreq-game.git
cd superfreq-game

# Open in your preferred code editor
code .

# Serve locally (optional)
python -m http.server 8000
# or
npx serve .
```

## 🐛 GitHub Issues Management

Manage GitHub issues directly from your local machine using the included script:

```bash
# Quick issue creation (agent-friendly)
./manage_github_issues.sh create-bug 'Audio bug' 'Audio stops' 'Click play' 'Audio plays' 'Audio stops'
./manage_github_issues.sh create-feature 'New effect' 'Add reverb' 'User wants reverb' 'More variety'
./manage_github_issues.sh create-audio 'Audio issue' 'No sound' 'sample.wav' 'Should play' 'Silent'
./manage_github_issues.sh create-puzzle 'Puzzle bug' 'Wrong answer' 'Easy' '100Hz' 'Shows 200Hz'

# Issue management
./manage_github_issues.sh list --state open
./manage_github_issues.sh view 123
./manage_github_issues.sh assign 123 --user username
./manage_github_issues.sh close 123 --reason 'completed'

# Project overview
./manage_github_issues.sh status
./manage_github_issues.sh search 'audio playback'

# Get help
./manage_github_issues.sh help
```

Perfect for use with Cursor agent chats and local development workflow!

### Branch previews & mobile testing

- Use PR Preview links (auto-generated) to test any branch on a real phone over HTTPS. Each pull request builds and deploys to a unique GitHub Pages preview URL.
- Quick local-on-phone testing:
  - Dev server: `npm run dev -- --host` then open `http://<your-computer-ip>:5173` on your phone (same Wi‑Fi).
  - Production preview locally: `npm run build && npm run preview -- --host` then open `http://<your-computer-ip>:4173`.

> Note: Mobile browsers require a user gesture to start audio. Tap a button to initialize audio before expecting sound.

## 🏗️ Architecture

### File Structure
```
superfreq-game/
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
└── README.md
```

### Core Components
- **`game.js`**: Game state, user interactions, scoring, lives system
- **`audio.js`**: Web Audio API integration, real-time effects, parameter auditioning
- **`effects.js`**: Individual effect implementations using Web Audio API nodes
- **`puzzles.js`**: Puzzle data, effect metadata, parameter validation

## 🎯 How to Play

1. **Listen to Dry Sample**: Hear the original audio
2. **Adjust Parameter**: Use the slider to set your guess
3. **Audition (Optional)**: Click "Audition" to hear your setting (costs 1 life)
4. **Submit Guess**: When confident, submit your final answer
5. **See Results**: Get your score and the correct answer

## 🔧 Technical Details

### Web Audio API Implementation
- **Audio Context**: Single context for all audio processing
- **Effect Chain**: Series of Web Audio API nodes for effects
- **Real-time Updates**: Parameter changes applied immediately via AudioParam
- **Buffer Management**: Dry samples loaded as AudioBuffer for processing

### Effect Implementation
- **EQ**: BiquadFilterNode with frequency, Q, and gain controls
- **Reverb**: ConvolverNode with impulse response + GainNode for wet/dry
- **Compression**: DynamicsCompressorNode with threshold, ratio, attack, release
- **Delay**: DelayNode with time and feedback controls
- **Modulation Effects**: OscillatorNode + GainNode for LFO modulation
- **Distortion**: WaveShaperNode with custom curve
- **Filter**: BiquadFilterNode with type, frequency, and Q controls

### Performance Features
- **Audio Loading**: < 1 second (dry samples only)
- **Real-time Processing**: < 50ms latency
- **Smooth Parameter Changes**: Immediate audio updates
- **Memory Management**: Efficient cleanup of audio resources

## 🌟 Benefits of New Approach

### For Users
- **Educational**: Learn by hearing parameter changes in real-time
- **Engaging**: Strategic use of lives adds game element
- **Immediate Feedback**: No waiting for audio to load
- **Exploration**: Discover effect behaviors through experimentation

### For Developers
- **Faster Iteration**: No audio file generation needed
- **Easier Testing**: Parameter changes are immediate
- **More Flexible**: Easy to adjust effect ranges
- **Better Debugging**: Real-time parameter monitoring

### For Deployment
- **Smaller Footprint**: Only dry samples need storage
- **Easier Content Management**: No effected audio files
- **Faster Loading**: Smaller audio files to download
- **Scalable**: Easy to add new effects and parameters

## 📱 Browser Support

- **Chrome 66+**: Full Web Audio API support
- **Firefox 60+**: Full Web Audio API support
- **Safari 11+**: Full Web Audio API support
- **Edge 79+**: Full Web Audio API support
- **Mobile**: iOS Safari, Chrome, Firefox

## 🎨 Customization

### Adding New Effects
1. Implement effect in `effects.js`
2. Add metadata to `puzzles.js`
3. Update UI as needed

### Modifying Parameters
- Adjust ranges in `puzzles.js`
- Update effect presets for consistent sound
- Modify difficulty ratings and lives allocation

### Styling
- Customize CSS in `style.css`
- Modify color scheme and layout
- Add animations and transitions

## 🚀 Future Enhancements

- **User Accounts**: Leaderboards and progress tracking
- **Social Features**: Share results and challenge friends
- **Advanced Effects**: Effect combinations and chains
- **Community Challenges**: User-created puzzles
- **Mobile App**: Native mobile applications
- **Effect Presets**: Professional audio engineer presets
- **Export/Import**: Save and share effect settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Development Guidelines
- Follow existing code style
- Add comments for complex logic
- Test in multiple browsers
- Ensure Web Audio API compatibility

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Web Audio API specification and browser implementations
- Audio effect algorithms and DSP techniques
- Game design inspiration from Wordle and Heardle
- Audio production community for effect knowledge

## 📞 Support

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join the conversation on GitHub Discussions
- **Wiki**: Check the project wiki for detailed documentation

---

**superfreq** - Where audio production meets puzzle gaming! 🎵🧩

### 🌐 Deploying to GitHub Pages

- **Prerequisites**
  - A GitHub repository with this code on the `main` branch
  - GitHub Actions enabled for the repository

- **Enable Pages**
  - Go to Settings → Pages
  - Set "Build and deployment" → "Source" to "GitHub Actions"

- **Workflow**
  - A workflow is already included at `.github/workflows/pages.yml`
  - On push to `main`, it uploads `index.html`, `css/`, `js/`, and `test-audio.html` to Pages
  - It also adds `.nojekyll` so files are served as-is

- **First Deploy**
  - Push to `main`
  - Check Actions tab for the "Deploy static site to GitHub Pages" run
  - When complete, the Pages URL appears in the job summary and under Settings → Pages

- **Custom Domain (Optional)**
  - Add your domain in Settings → Pages → Custom domain
  - Create a `CNAME` record at your DNS pointing to `<username>.github.io`
  - If you want to pin the domain in the repo, create a `CNAME` file at the site root containing your domain (e.g., `example.com`)
