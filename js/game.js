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
        this.knobDragging = false;
        
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
            dryAudio: document.getElementById('dry-audio'),
            effectedAudio: document.getElementById('effected-audio'),
            parameterLabel: document.getElementById('parameter-label'),
            parameterSlider: document.getElementById('parameter-slider'),
            parameterValue: document.getElementById('parameter-value'),
            parameterUnit: document.getElementById('parameter-unit'),
            parameterKnob: document.getElementById('parameter-knob'),
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
            this.updateKnobFromSlider();
        });

        // Knob interactions
        if (this.elements.parameterKnob) {
            this.elements.parameterKnob.addEventListener('pointerdown', (e) => this.onKnobPointerDown(e));
            this.elements.parameterKnob.addEventListener('keydown', (e) => this.onKnobKeyDown(e));
        }

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

        // Audio controls - these will trigger audio initialization
        if (this.elements.dryAudio) {
            this.elements.dryAudio.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                this.playDrySample();
            });
        }

        if (this.elements.effectedAudio) {
            this.elements.effectedAudio.addEventListener('click', async () => {
                await this.initializeAudioIfNeeded();
                this.playEffectedAudio();
            });
        }

        // LED pilot light state from audio layer
        document.addEventListener('audio:playstart', (e) => {
            if (e.detail?.kind === 'dry' && this.elements.dryAudio) {
                this.elements.dryAudio.classList.add('is-playing');
            }
            if (e.detail?.kind === 'fx' && this.elements.effectedAudio) {
                this.elements.effectedAudio.classList.add('is-playing');
            }
        });
        document.addEventListener('audio:playend', (e) => {
            if (e.detail?.kind === 'dry' && this.elements.dryAudio) {
                this.elements.dryAudio.classList.remove('is-playing');
            }
            if (e.detail?.kind === 'fx' && this.elements.effectedAudio) {
                this.elements.effectedAudio.classList.remove('is-playing');
            }
        });

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
        
        // Set min/max scale labels under knob
        const minLabelEl = document.querySelector('.min-label');
        const maxLabelEl = document.querySelector('.max-label');
        if (minLabelEl && maxLabelEl) {
            // Use formatted values matching units
            const minFormatted = this.puzzleSystem.formatParameterValue(effect.minValue, effect.unit);
            const maxFormatted = this.puzzleSystem.formatParameterValue(effect.maxValue, effect.unit);
            minLabelEl.textContent = minFormatted;
            maxLabelEl.textContent = maxFormatted;
        }

        // Set initial parameter value display
        const initialValue = this.puzzleSystem.sliderPositionToValue(this.currentPuzzle.effectType, 50);
        this.updateParameterDisplay(initialValue);
        this.updateKnobFromSlider();
        if (this.elements.parameterKnob) {
            this.elements.parameterKnob.setAttribute('aria-label', `${effect.parameter}`);
            this.elements.parameterKnob.setAttribute('aria-valuenow', this.elements.parameterSlider.value);
        }
        
        // Update audio button labels
        if (this.elements.dryAudio) {
            this.elements.dryAudio.textContent = '▶︎ Dry';
        }
        if (this.elements.effectedAudio) {
            this.elements.effectedAudio.textContent = '▶︎ FX';
        }
        
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
        if (this.elements.parameterKnob) {
            this.elements.parameterKnob.setAttribute('aria-valuenow', String(Math.round(parseFloat(sliderValue))));
        }
    }

    /**
     * Sync knob visual with slider percent (0-100)
     */
    updateKnobFromSlider() {
        if (!this.elements.parameterKnob || !this.elements.parameterSlider) return;
        const percent = parseFloat(this.elements.parameterSlider.value);
        const angle = this.percentToAngle(percent);
        this.elements.parameterKnob.style.setProperty('--knob-rotation', `${angle}deg`);
    }

    /**
     * Map percent [0..100] to rotation angle [-135..135]
     */
    percentToAngle(percent) {
        const min = -135;
        const max = 135;
        return min + (max - min) * (percent / 100);
    }

    /**
     * Map angle [-135..135] to percent [0..100]
     */
    angleToPercent(angle) {
        const min = -135;
        const max = 135;
        const clamped = Math.max(min, Math.min(max, angle));
        return ((clamped - min) / (max - min)) * 100;
    }

    onKnobPointerDown(e) {
        if (!this.elements.parameterKnob) return;
        e.preventDefault();
        this.knobDragging = true;
        this.elements.parameterKnob.setPointerCapture(e.pointerId);
        const move = (ev) => this.onKnobPointerMove(ev);
        const up = (ev) => this.onKnobPointerUp(ev, move, up);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up, { once: true });
        this.onKnobPointerMove(e);
    }

    onKnobPointerMove(e) {
        if (!this.knobDragging || !this.elements.parameterKnob) return;
        const rect = this.elements.parameterKnob.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // 0 at top
        // Normalize to [-180,180]
        if (angle > 180) angle -= 360;
        // Clamp to sweep
        const percent = this.angleToPercent(angle);
        this.setSliderFromPercent(percent);
    }

    onKnobPointerUp(e, move, up) {
        this.knobDragging = false;
        window.removeEventListener('pointermove', move);
        // pointerup listener is once:true
    }

    onKnobKeyDown(e) {
        if (!this.elements.parameterSlider) return;
        const step = e.shiftKey ? 10 : 1;
        let value = parseFloat(this.elements.parameterSlider.value);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            value = Math.min(100, value + step);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            value = Math.max(0, value - step);
        } else {
            return;
        }
        e.preventDefault();
        this.elements.parameterSlider.value = String(Math.round(value));
        this.handleParameterChange(this.elements.parameterSlider.value);
        this.updateKnobFromSlider();
        if (this.elements.parameterKnob) {
            this.elements.parameterKnob.setAttribute('aria-valuenow', this.elements.parameterSlider.value);
        }
    }

    setSliderFromPercent(percent) {
        const clamped = Math.max(0, Math.min(100, percent));
        const rounded = Math.round(clamped);
        this.elements.parameterSlider.value = String(rounded);
        this.handleParameterChange(this.elements.parameterSlider.value);
        this.updateKnobFromSlider();
        if (this.elements.parameterKnob) {
            this.elements.parameterKnob.setAttribute('aria-valuenow', String(rounded));
        }
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
