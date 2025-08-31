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
            transportPlay: document.getElementById('transport-play'),
            bypassToggle: document.getElementById('bypass-toggle'),
            parameterLabel: document.getElementById('parameter-label'),
            parameterSlider: document.getElementById('parameter-slider'),
            parameterValue: document.getElementById('parameter-value'),
            parameterUnit: document.getElementById('parameter-unit'),
            auditionButton: document.getElementById('audition-button'),
            livesDisplay: document.getElementById('lives-display'),
            submitGuess: document.getElementById('submit-guess'),
            results: document.getElementById('results'),
            scoreDisplay: document.getElementById('score-display'),
            correctAnswer: document.getElementById('correct-answer'),
            explanation: document.getElementById('explanation'),
            fixedParams: document.getElementById('fixed-parameter-knobs')
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

        // Transport: Play/Pause
        if (this.elements.transportPlay) {
            this.elements.transportPlay.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                this.togglePlayPause();
            });
        }

        // Bypass toggle
        if (this.elements.bypassToggle) {
            this.elements.bypassToggle.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                const isBypassed = this.audioManager.toggleBypass();
                this.updateBypassUI(isBypassed);
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
        
        // Initialize transport UI
        this.updatePlayButton(false);
        this.updateBypassUI(false);

        // Render fixed parameter knobs for non-guessable params
        this.renderFixedParameterKnobs();
        
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
        // Update audio engine main parameter in real-time for FX preview
        this.audioManager.updateMainParameter(value);
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
     * Toggle transport play/pause
     */
    async togglePlayPause() {
        if (this.audioManager.getIsPlaying()) {
            this.audioManager.stopAllAudio();
            this.updatePlayButton(false);
            return;
        }

        // Decide between dry or effected based on bypass
        const isBypassed = this.audioManager.getBypassState();
        const success = isBypassed
            ? await this.audioManager.playDrySample()
            : await this.audioManager.playCurrentSettings();
        if (success) {
            this.updatePlayButton(true);
        }
    }

    updatePlayButton(isPlaying) {
        if (!this.elements.transportPlay) return;
        this.elements.transportPlay.textContent = isPlaying ? '❚❚ Pause' : '▶︎ Play';
    }

    updateBypassUI(isBypassed) {
        if (!this.elements.bypassToggle) return;
        this.elements.bypassToggle.setAttribute('aria-pressed', String(isBypassed));
        this.elements.bypassToggle.textContent = isBypassed ? 'Bypass On' : 'Bypass Off';
        this.elements.bypassToggle.classList.toggle('active', isBypassed);
    }

    renderFixedParameterKnobs() {
        if (!this.elements.fixedParams) return;
        const effectType = this.currentPuzzle.effectType;
        const mainParam = this.currentPuzzle.parameter;
        const presets = this.currentPuzzle.effectPresets?.[effectType] || {};
        const ranges = this.audioManager.getEffectParameterRanges();
        const container = this.elements.fixedParams;
        container.innerHTML = '';

        // Build knobs for each preset param except the main guessable param
        Object.entries(presets).forEach(([param, value]) => {
            if (param === mainParam) return;
            const range = ranges[param] || [0, 1];

            const wrapper = document.createElement('div');
            wrapper.className = 'fixed-knob';
            wrapper.innerHTML = `
                <div class="knob-group">
                    <div class="knob" id="fixed-${param}-knob" aria-label="${param}" tabindex="-1"></div>
                    <div class="knob-caption">${param}</div>
                </div>
                <input class="visually-hidden" type="range" id="fixed-${param}-slider" min="0" max="100" step="1" disabled>
            `;
            container.appendChild(wrapper);

            // Initialize knob visual using the existing knob helper (read-only)
            try {
                this.initKnobVisual(`fixed-${param}-knob`, `fixed-${param}-slider`, value, range);
            } catch (e) {
                console.warn('Failed to init fixed knob', param, e);
            }
        });
    }

    initKnobVisual(knobId, sliderId, value, [min, max]) {
        const slider = document.getElementById(sliderId);
        if (!slider) return;
        // Map value to 0..100
        const percent = ((value - min) / (max - min)) * 100;
        slider.value = String(Math.max(0, Math.min(100, percent)));
        // Let knob.js sync render via input listener
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        const knob = document.getElementById(knobId);
        if (knob) {
            knob.classList.add('disabled');
            knob.setAttribute('aria-disabled', 'true');
        }
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
