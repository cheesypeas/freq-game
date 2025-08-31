/**
 * superfreq - Core Game Logic
 * Manages game state, user interactions, and scoring with real-time audio
 */

class SuperfreqGame {
    constructor() {
        this.puzzleSystem = new PuzzleSystem();
        this.audioManager = new AudioManager();
        
        this.currentPuzzle = null;
        this.gameState = 'loading'; // loading, playing, results
        this.userGuess = null;
        this.score = null;
        this.streak = 0;
        this.remainingLives = 5;
        this.audioInitialized = false; // Flag to track if audio is initialized
        this.initializingAudio = false; // Flag to prevent multiple simultaneous initializations
        
        // DOM elements
        this.elements = {};
        
        this.init();
    }

    /**
     * Initialize the game
     */
    async init() {
        try {
            this.setupDOMElements();
            this.setupEventListeners();
            
            // Load today's puzzle (without audio)
            await this.loadTodaysPuzzle();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to load game. Please refresh the page.');
        }
    }

    /**
     * Set up DOM element references
     */
    setupDOMElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            game: document.getElementById('game'),
            puzzleInfo: document.getElementById('puzzle-info'),
            effectDescription: document.getElementById('effect-description'),
            effectTitle: document.getElementById('effect-title'),
            playPause: document.getElementById('play-pause'),
            bypass: document.getElementById('bypass'),
            transportMode: document.getElementById('transport-mode'),
            parameterLabel: document.getElementById('parameter-label'),
            parameterSlider: document.getElementById('parameter-slider'),
            parameterValue: document.getElementById('parameter-value'),
            parameterUnit: document.getElementById('parameter-unit'),
            fixedParams: document.getElementById('fixed-params'),
            auditionButton: document.getElementById('audition-button'),
            livesDisplay: document.getElementById('lives-display'),
            submitGuess: document.getElementById('submit-guess'),
            results: document.getElementById('results'),
            scoreDisplay: document.getElementById('score-display'),
            correctAnswer: document.getElementById('correct-answer'),
            explanation: document.getElementById('explanation')
        };
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Parameter slider
        this.elements.parameterSlider.addEventListener('input', (e) => {
            this.handleParameterChange(e.target.value);
        });

        // Audition button
        if (this.elements.auditionButton) {
            this.elements.auditionButton.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                this.auditionCurrentParameter();
            });
        }

        // Submit guess button
        this.elements.submitGuess.addEventListener('click', () => {
            this.submitGuess();
        });

        // Transport controls
        if (this.elements.playPause) {
            this.elements.playPause.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                this.togglePlayPause();
            });
        }

        if (this.elements.bypass) {
            this.elements.bypass.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                const isActive = this.elements.bypass.getAttribute('aria-pressed') === 'true';
                this.setBypass(!isActive);
            });
        }

        // Removed global click-to-initialize to avoid autoplay prompts
        // (Previously added click handler on game container)
        
    }

    /**
     * Initialize audio context and load puzzle audio if not already done
     */
    async initializeAudioIfNeeded() {
        if (this.audioInitialized) {
            return;
        }

        // Prevent multiple simultaneous initialization attempts
        if (this.initializingAudio) {
            console.log('Audio initialization already in progress, waiting...');
            return;
        }

        this.initializingAudio = true;

        try {
            console.log('Initializing audio context and loading puzzle audio...');
            
            // Load puzzle audio with real-time effects
            await this.audioManager.loadPuzzleAudio(this.currentPuzzle);
            // After engine is ready, update fixed parameter displays from engine
            this.updateFixedParamDisplays();
            
            // Update lives display
            this.remainingLives = this.currentPuzzle.livesAllocated || 5;
            this.updateLivesDisplay();
            
            this.audioInitialized = true;
            console.log('Audio initialization completed successfully');
            
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            this.showError('Failed to initialize audio. Please try clicking again.');
        } finally {
            this.initializingAudio = false;
        }
    }

    /**
     * Load today's puzzle
     */
    async loadTodaysPuzzle() {
        try {
            this.showLoading();
            
            // Get today's puzzle
            this.currentPuzzle = this.puzzleSystem.getTodaysPuzzle();
            
            if (!this.currentPuzzle) {
                throw new Error('No puzzle found for today');
            }

            // Set up the puzzle interface
            this.setupPuzzleInterface();
            
            // Show the game interface (audio will be loaded on first user interaction)
            this.showGame();
            
            // Removed audio initialization message (no autoplay prompt)
            
        } catch (error) {
            console.error('Failed to load puzzle:', error);
            this.showError('Failed to load today\'s puzzle. Please try again later.');
        }
    }

    /**
     * Show message about audio initialization
     */
    // Removed showAudioInitMessage: no longer needed

    /**
     * Set up the puzzle interface
     */
    setupPuzzleInterface() {
        const puzzle = this.currentPuzzle;
        const effect = this.puzzleSystem.getEffectMetadata(puzzle.effectType);
        
        // Update puzzle info
        this.elements.effectDescription.textContent = puzzle.description;
        if (this.elements.effectTitle) {
            this.elements.effectTitle.textContent = effect.name;
        }
        
        // Update parameter input
        this.elements.parameterLabel.textContent = `${effect.parameter}`;
        this.elements.parameterUnit.textContent = effect.unit;
        
        // Set up slider with proper range
        const minValue = effect.minValue;
        const maxValue = effect.maxValue;
        this.elements.parameterSlider.min = '0';
        this.elements.parameterSlider.max = '100';
        this.elements.parameterSlider.value = '50';
        
        // Set initial parameter value display
        const initialValue = this.puzzleSystem.sliderPositionToValue(this.currentPuzzle.effectType, 50);
        this.updateParameterDisplay(initialValue);
        
        // Set transport defaults
        if (this.elements.playPause) {
            this.elements.playPause.textContent = '▶︎ Play';
            this.elements.playPause.classList.remove('is-playing');
        }
        if (this.elements.bypass) {
            this.elements.bypass.setAttribute('aria-pressed', 'false');
            this.elements.bypass.textContent = 'Bypass Off';
        }
        if (this.elements.transportMode) {
            this.elements.transportMode.textContent = 'FX';
        }
        
        // Render fixed parameters panel
        this.renderFixedParameters();
        
        // Enable submit button
        this.elements.submitGuess.disabled = false;
    }

    /**
     * Handle parameter slider change
     */
    handleParameterChange(sliderValue) {
        const value = this.puzzleSystem.sliderPositionToValue(
            this.currentPuzzle.effectType, 
            parseFloat(sliderValue)
        );
        
        this.userGuess = value;
        this.updateParameterDisplay(value);
    }

    /**
     * Update parameter value display
     */
    updateParameterDisplay(value) {
        const formattedValue = this.puzzleSystem.formatParameterValue(
            value, 
            this.currentPuzzle.unit
        );
        this.elements.parameterValue.textContent = formattedValue;
    }

    /**
     * Audition the current parameter value (costs 1 life)
     */
    async auditionCurrentParameter() {
        if (this.remainingLives <= 0) {
            this.showError('No lives remaining for auditioning!');
            return;
        }

        if (this.userGuess === null) {
            this.showError('Please set a parameter value first.');
            return;
        }

        try {
            const parameterName = this.currentPuzzle.parameter;
            const success = await this.audioManager.auditionParameter(parameterName, this.userGuess);
            
            if (success) {
                this.remainingLives--;
                this.updateLivesDisplay();
                console.log(`Auditioned parameter: ${parameterName} = ${this.userGuess}`);
            } else {
                this.showError('Failed to audition parameter. Please try again.');
            }
        } catch (error) {
            console.error('Error during parameter audition:', error);
            this.showError('Error during parameter audition. Please try again.');
        }
    }

    /**
     * Update lives display
     */
    updateLivesDisplay() {
        if (this.elements.livesDisplay) {
            const hearts = '❤️'.repeat(Math.max(0, Math.min(5, this.remainingLives)));
            this.elements.livesDisplay.textContent = `${hearts} x${this.remainingLives}`;
        }
    }

    /**
     * Play dry sample
     */
    async playDrySample() {
        try {
            const success = await this.audioManager.playDrySample();
            if (!success) {
                this.showError('Failed to play dry sample. Please try again.');
            }
        } catch (error) {
            console.error('Error playing dry sample:', error);
            this.showError('Error playing dry sample. Please try again.');
        }
    }

    /**
     * Play effected audio with current settings
     */
    async playEffectedAudio() {
        try {
            const success = await this.audioManager.playCurrentSettings();
            if (!success) {
                this.showError('Failed to play effected audio. Please try again.');
            }
        } catch (error) {
            console.error('Error playing effected audio:', error);
            this.showError('Error playing effected audio. Please try again.');
        }
    }

    /**
     * Transport: toggle play/pause honoring bypass
     */
    async togglePlayPause() {
        try {
            if (this.audioManager.isPlaying) {
                this.audioManager.stopAllAudio();
                this.updateTransportUI(false);
                return;
            }
            // If bypass is on, play dry, else play effected (with hidden correct value)
            const success = this.audioManager.getBypass()
                ? await this.audioManager.playDrySample()
                : await this.audioManager.playCurrentSettings();
            if (success) {
                this.updateTransportUI(true);
            } else {
                this.showError('Failed to start playback.');
            }
        } catch (e) {
            console.error('togglePlayPause error', e);
            this.showError('Playback error.');
        }
    }

    /**
     * Transport: set bypass and reflect in UI
     */
    setBypass(on) {
        this.audioManager.setBypass(on);
        if (this.elements.bypass) {
            this.elements.bypass.setAttribute('aria-pressed', on ? 'true' : 'false');
            this.elements.bypass.textContent = on ? 'Bypass On' : 'Bypass Off';
        }
        if (this.elements.transportMode) {
            this.elements.transportMode.textContent = on ? 'Dry' : 'FX';
        }
        // If currently playing, restart to reflect mode change
        if (this.audioManager.isPlaying) {
            this.audioManager.stopAllAudio();
            this.togglePlayPause();
        }
    }

    updateTransportUI(isPlaying) {
        if (!this.elements.playPause) return;
        this.elements.playPause.classList.toggle('is-playing', !!isPlaying);
        this.elements.playPause.textContent = isPlaying ? '⏸ Pause' : '▶︎ Play';
    }

    /**
     * Build the fixed parameters UI (read-only knobs and value labels)
     */
    renderFixedParameters() {
        if (!this.elements.fixedParams) return;
        const fixedNames = this.getFixedParamNames();
        const container = this.elements.fixedParams;
        container.innerHTML = '';
        fixedNames.forEach((name) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'fixed-param';
            wrapper.setAttribute('data-param', name);
            // Label
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = name;
            // Knob visual (non-interactive)
            const knob = document.createElement('div');
            knob.className = 'knob';
            knob.setAttribute('aria-hidden', 'true');
            // Value
            const valueEl = document.createElement('div');
            valueEl.className = 'value';
            valueEl.id = `fixed-value-${name}`;
            valueEl.textContent = '—';
            
            wrapper.appendChild(label);
            wrapper.appendChild(knob);
            wrapper.appendChild(valueEl);
            container.appendChild(wrapper);
        });
        this.updateFixedParamDisplays();
    }

    /**
     * Determine which params are fixed (all except the main guessable param)
     */
    getFixedParamNames() {
        if (!this.currentPuzzle) return [];
        const ranges = this.audioManager.getEffectParameterRanges();
        const all = Object.keys(ranges || {});
        const main = this.currentPuzzle.parameter;
        return all.filter((n) => n !== main);
    }

    /**
     * Update the numeric displays for fixed params from the engine/presets
     */
    updateFixedParamDisplays() {
        if (!this.currentPuzzle) return;
        const effectType = this.currentPuzzle.effectType;
        const fixedNames = this.getFixedParamNames();
        const ranges = this.audioManager.getEffectParameterRanges();
        fixedNames.forEach((name) => {
            const el = document.getElementById(`fixed-value-${name}`);
            if (!el) return;
            const raw = this.getCurrentParamValue(name);
            const formatted = this.formatFixedParamValue(effectType, name, raw);
            el.textContent = formatted;
            // Update knob rotation visual
            const wrapper = el.parentElement;
            const knob = wrapper ? wrapper.querySelector('.knob') : null;
            if (knob && ranges && ranges[name]) {
                const [min, max] = ranges[name];
                const clamped = Math.max(min, Math.min(max, raw));
                const percent = (clamped - min) / (max - min || 1);
                const angle = -135 + percent * 270;
                knob.style.setProperty('--knob-rotation', angle + 'deg');
            }
        });
    }

    /**
     * Read current value for a parameter; fall back to presets if engine not ready
     */
    getCurrentParamValue(name) {
        try {
            if (this.audioManager.effectsEngine && this.audioManager.effectsEngine.currentEffectChain) {
                const params = this.audioManager.effectsEngine.currentEffectChain.params || {};
                if (params[name]) {
                    return params[name].value;
                }
            }
        } catch (_) {}
        // Fallback to preset
        const presets = this.currentPuzzle.effectPresets?.[this.currentPuzzle.effectType] || {};
        return presets[name];
    }

    /**
     * Format fixed parameter values with sensible units per effect/param
     */
    formatFixedParamValue(effectType, name, value) {
        if (value == null || Number.isNaN(value)) return '—';
        let v = value;
        let suffix = '';
        // Normalize units
        if (effectType === 'delay' && name === 'time') {
            // engine stores seconds
            v = Math.round(v * 1000);
            suffix = ' ms';
        } else if (effectType === 'reverb' && name === 'wetMix') {
            // engine uses 0..1 gain
            v = Math.round(v * 100);
            suffix = ' %';
        } else if (['compression'].includes(effectType) && (name === 'attack' || name === 'release')) {
            v = Math.round(v * 1000);
            suffix = ' ms';
        } else if (effectType === 'eq' && name === 'gain') {
            v = Math.round(v * 10) / 10;
            suffix = ' dB';
        } else if ((effectType === 'filter' && name === 'frequency') || (effectType === 'eq' && name === 'frequency')) {
            v = Math.round(v);
            suffix = ' Hz';
        } else if (name === 'ratio') {
            v = Math.round(v * 10) / 10;
            suffix = ':';
        } else if (name === 'q') {
            v = Math.round(v * 100) / 100;
        } else if (name === 'feedback') {
            v = Math.round(v * 100);
            suffix = ' %';
        } else if (name === 'rate') {
            v = Math.round(v * 100) / 100;
            suffix = ' Hz';
        }
        return `${v}${suffix}`;
    }

    /**
     * Submit user's guess
     */
    submitGuess() {
        if (this.userGuess === null) {
            this.showError('Please make a guess first.');
            return;
        }

        // Calculate score
        this.score = this.calculateScore(this.userGuess, this.currentPuzzle.correctValue);
        
        // Update streak
        if (this.score >= 75) {
            this.streak++;
        } else {
            this.streak = 0;
        }

        // Save to local storage
        this.saveGameData();
        
        // Show results
        this.showResults();
    }

    /**
     * Calculate score based on accuracy
     */
    calculateScore(guess, correct) {
        const effect = this.puzzleSystem.getEffectMetadata(this.currentPuzzle.effectType);
        const range = effect.maxValue - effect.minValue;
        const difference = Math.abs(guess - correct);
        const percentageOff = (difference / range) * 100;
        
        if (percentageOff === 0) {
            return 100; // Perfect
        } else if (percentageOff <= 5) {
            return 90; // Excellent
        } else if (percentageOff <= 15) {
            return 75; // Good
        } else if (percentageOff <= 30) {
            return 50; // Fair
        } else {
            return Math.max(25, 100 - percentageOff); // Poor
        }
    }

    /**
     * Show results
     */
    showResults() {
        const puzzle = this.currentPuzzle;
        const effect = this.puzzleSystem.getEffectMetadata(puzzle.effectType);
        
        // Update score display
        this.elements.scoreDisplay.textContent = `${this.score}/100`;
        
        // Update correct answer
        const correctFormatted = this.puzzleSystem.formatParameterValue(
            puzzle.correctValue, 
            puzzle.unit
        );
        this.elements.correctAnswer.textContent = `Correct answer: ${correctFormatted} ${puzzle.unit}`;
        
        // Update explanation
        this.elements.explanation.textContent = this.generateExplanation();
        
        // Show results
        this.elements.results.classList.remove('hidden');
        
        // Scroll to results
        this.elements.results.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Generate explanation text
     */
    generateExplanation() {
        const puzzle = this.currentPuzzle;
        const effect = this.puzzleSystem.getEffectMetadata(puzzle.effectType);
        
        let explanation = `Today's effect was ${effect.name}. `;
        
        if (this.score === 100) {
            explanation += "Perfect! You have excellent ears for audio production.";
        } else if (this.score >= 75) {
            explanation += "Great job! You're developing a good sense for audio effects.";
        } else if (this.score >= 50) {
            explanation += "Not bad! Keep practicing to improve your audio recognition skills.";
        } else {
            explanation += "Keep practicing! Audio production takes time to master.";
        }
        
        // Add lives usage info
        const livesUsed = (puzzle.livesAllocated || 5) - this.remainingLives;
        if (livesUsed > 0) {
            explanation += ` You used ${livesUsed} lives to audition parameters.`;
        } else {
            explanation += " You didn't need to use any lives for auditioning - great job!";
        }
        
        return explanation;
    }

    /**
     * Save game data to local storage
     */
    saveGameData() {
        const gameData = {
            lastPlayed: new Date().toISOString(),
            streak: this.streak,
            totalGames: this.getTotalGames() + 1,
            averageScore: this.calculateAverageScore(),
            livesUsed: (this.currentPuzzle.livesAllocated || 5) - this.remainingLives
        };
        
        localStorage.setItem('superfreq-game-data', JSON.stringify(gameData));
    }

    /**
     * Load game data from local storage
     */
    loadGameData() {
        const data = localStorage.getItem('superfreq-game-data');
        if (data) {
            try {
                const gameData = JSON.parse(data);
                this.streak = gameData.streak || 0;
                return gameData;
            } catch (error) {
                console.warn('Failed to parse game data:', error);
            }
        }
        return null;
    }

    /**
     * Get total games played
     */
    getTotalGames() {
        const data = this.loadGameData();
        return data ? data.totalGames : 0;
    }

    /**
     * Calculate average score
     */
    calculateAverageScore() {
        const data = this.loadGameData();
        if (!data || !data.averageScore) return 0;
        
        const currentTotal = data.averageScore * (data.totalGames - 1);
        const newTotal = currentTotal + this.score;
        return Math.round(newTotal / data.totalGames);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.gameState = 'loading';
        this.elements.loading.classList.remove('hidden');
        this.elements.game.classList.add('hidden');
        this.elements.results.classList.add('hidden');
    }

    /**
     * Show game state
     */
    showGame() {
        this.gameState = 'playing';
        this.elements.loading.classList.add('hidden');
        this.elements.game.classList.remove('hidden');
        this.elements.results.classList.add('hidden');
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">Dismiss</button>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b6b;
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            text-align: center;
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Get remaining lives
     */
    getRemainingLives() {
        return this.remainingLives;
    }

    /**
     * Clean up game resources
     */
    cleanup() {
        this.audioManager.cleanup();
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.superfreqGame = new SuperfreqGame();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.superfreqGame) {
        window.superfreqGame.cleanup();
    }
});
