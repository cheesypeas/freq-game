/**
 * superfreq - Real-time Audio Management System
 * Handles Web Audio API context, sample loading, and real-time effect processing
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.effectsEngine = null;
        this.currentPuzzle = null;
        this.isLoading = false;
        this.volume = 0.7;
        this.remainingLives = 5;
        
        // Audio state
        this.isPlaying = false;
        this.currentSource = null;
        
        // Initialize audio context and effects engine
        this.initAudioContext();
    }

    /**
     * Map puzzle parameter names to engine parameter names
     */
    mapParameterName(effectType, paramName) {
        if (effectType === 'filter' && paramName === 'cutoff') return 'frequency';
        return paramName;
    }

    /**
     * Initialize Web Audio API context
     */
    initAudioContext() {
        try {
            // Create audio context on user interaction
            this.createAudioContext = () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    this.effectsEngine = new AudioEffectsEngine(this.audioContext);
                    console.log('Audio context and effects engine initialized');
                }
                return this.audioContext;
            };
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }

    /**
     * Load puzzle audio and set up effects
     */
    async loadPuzzleAudio(puzzleData) {
        try {
            this.isLoading = true;
            this.currentPuzzle = puzzleData;
            
            // Ensure audio context is created
            if (!this.audioContext) {
                this.createAudioContext();
            }
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Try to load dry sample, fallback to generated audio if file not found
            let success = false;
            try {
                // Check if the URL is accessible first (temporarily force a single test file)
                const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.CDN_BASE_URL) ? window.APP_CONFIG.CDN_BASE_URL.replace(/\/$/, '') + '/' : '';
                const forcedUrl = `${baseUrl}audio/samples/vocals_day001.wav`;
                // const response = await fetch(puzzleData.drySample);
                const response = await fetch(forcedUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const arrayBuffer = await response.arrayBuffer();
                // Pass the array buffer directly to the effects engine
                success = await this.effectsEngine.loadDrySampleFromBuffer(arrayBuffer);
            } catch (fileError) {
                console.warn('Audio file not found or inaccessible, generating test audio:', fileError.message);
                success = await this.generateTestAudio();
            }
            
            if (!success) {
                throw new Error('Failed to load or generate audio');
            }
            
            // Create effect chain for the puzzle
            const effectType = puzzleData.effectType;
            const effectPresets = puzzleData.effectPresets?.[effectType] || {};
            
            // Set up the main parameter to guess
            const mainParam = puzzleData.parameter;
            const mainValue = puzzleData.correctValue;
            
            // Create initial effect chain with correct parameters
            const mappedMainParam = this.mapParameterName(effectType, mainParam);
            const initialParams = { ...effectPresets, [mappedMainParam]: mainValue };
            this.effectsEngine.createEffectChain(effectType, initialParams);
            
            this.isLoading = false;
            console.log(`Puzzle audio loaded: ${effectType} effect`);
            return true;
            
        } catch (error) {
            console.error('Failed to load puzzle audio:', error);
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Generate test audio for development/testing
     */
    async generateTestAudio() {
        try {
            // Create pink noise (equal energy per octave) for 5 seconds
            const sampleRate = this.audioContext.sampleRate;
            const duration = 5; // 5 seconds
            const length = sampleRate * duration;
            
            // Create audio buffer
            const buffer = this.audioContext.createBuffer(1, length, sampleRate);
            const channelData = buffer.getChannelData(0);
            
            // Generate pink noise using a simplified approach
            // Create white noise first, then apply a simple low-pass filter to achieve pink characteristics
            const whiteNoise = new Float32Array(length);
            
            // Generate white noise
            for (let i = 0; i < length; i++) {
                whiteNoise[i] = (Math.random() * 2 - 1) * 0.3;
            }
            
            // Apply simple low-pass filtering to create pink noise characteristics
            // This creates a -6dB/octave slope which is close to pink noise
            let filteredSample = 0;
            const filterCoeff = 0.95; // Low-pass filter coefficient
            
            for (let i = 0; i < length; i++) {
                // Simple first-order low-pass filter
                filteredSample = filterCoeff * filteredSample + (1 - filterCoeff) * whiteNoise[i];
                channelData[i] = filteredSample;
            }
            
            // Apply fade in/out to prevent clicks
            const fadeLength = sampleRate * 0.1; // 100ms fade
            for (let i = 0; i < fadeLength; i++) {
                const fadeIn = i / fadeLength;
                channelData[i] *= fadeIn;
                
                const fadeOut = (length - 1 - i) / fadeLength;
                channelData[length - 1 - i] *= fadeOut;
            }
            
            // Store the generated buffer in the effects engine
            this.effectsEngine.drySampleBuffer = buffer;
            
            console.log('Pink noise test audio generated successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to generate test audio:', error);
            return false;
        }
    }

    /**
     * Play dry sample (original audio)
     */
    async playDrySample() {
        if (!this.effectsEngine || !this.effectsEngine.drySampleBuffer) {
            console.warn('No dry sample loaded');
            return false;
        }

        try {
            // Resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Stop any currently playing audio
            this.stopAllAudio();

            // Create source from dry sample buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = this.effectsEngine.drySampleBuffer;
            
            // Connect directly to destination (no effects)
            source.connect(this.audioContext.destination);
            
            // Start playback
            source.start(0);
            this.currentSource = source;
            this.isPlaying = true;

            // Set up end callback
            source.onended = () => {
                this.isPlaying = false;
                this.currentSource = null;
                window.dispatchEvent(new CustomEvent('audio-playback-ended'));
            };

            console.log('Playing dry sample');
            return true;

        } catch (error) {
            console.error('Failed to play dry sample:', error);
            return false;
        }
    }

    /**
     * Play audio with current effect settings
     */
    async playEffectedAudio() {
        if (!this.effectsEngine || !this.effectsEngine.currentEffectChain) {
            console.warn('No effect chain created');
            return false;
        }

        try {
            // Resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Stop any currently playing audio
            this.stopAllAudio();

            // Play through effects engine
            const success = this.effectsEngine.playAudio();
            if (success) {
                this.isPlaying = true;
                console.log('Playing effected audio');
            }
            return success;

        } catch (error) {
            console.error('Failed to play effected audio:', error);
            return false;
        }
    }

    /**
     * Audition a specific parameter value (costs 1 life)
     */
    async auditionParameter(parameterName, value) {
        if (this.remainingLives <= 0) {
            console.warn('No lives remaining for audition');
            return false;
        }

        if (!this.effectsEngine || !this.currentPuzzle) {
            console.warn('No puzzle loaded');
            return false;
        }

        try {
            const effectType = this.currentPuzzle.effectType;

            // Temporarily apply user's value
            const mapped = this.mapParameterName(effectType, parameterName);
            this.effectsEngine.updateEffectParameters(effectType, { [mapped]: value });

            // Play with the temporary value
            const success = await this.playEffectedAudio();
            
            if (success) {
                // Deduct a life
                this.remainingLives--;
                console.log(`Parameter auditioned: ${parameterName} = ${value}. Lives remaining: ${this.remainingLives}`);

                try {
                    // Restore hidden correct value after playback ends
                    const correctValue = this.currentPuzzle.correctValue;
                    this.effectsEngine.updateEffectParameters(effectType, { [mapped]: correctValue });
                } catch (restoreError) {
                    console.warn('Failed to restore hidden value after audition:', restoreError);
                }
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Failed to audition parameter:', error);
            return false;
        }
    }

    /**
     * Update the main parameter being guessed
     */
    updateMainParameter(value) {
        if (!this.effectsEngine || !this.currentPuzzle) {
            return false;
        }

        try {
            const effectType = this.currentPuzzle.effectType;
            const parameterName = this.currentPuzzle.parameter;
            
            // Update the main parameter
            const mapped = this.mapParameterName(effectType, parameterName);
            const params = { [mapped]: value };
            this.effectsEngine.updateEffectParameters(effectType, params);
            
            console.log(`Main parameter updated: ${parameterName} = ${value}`);
            return true;

        } catch (error) {
            console.error('Failed to update main parameter:', error);
            return false;
        }
    }

    /**
     * Play audio with current parameter settings
     */
    async playCurrentSettings() {
        if (!this.effectsEngine || !this.effectsEngine.currentEffectChain) {
            console.warn('No effect chain created');
            return false;
        }

        try {
            // Always enforce hidden correct value for effected playback
            if (this.currentPuzzle) {
                const effectType = this.currentPuzzle.effectType;
                const parameterName = this.currentPuzzle.parameter;
                const correctValue = this.currentPuzzle.correctValue;
                const mapped = this.mapParameterName(effectType, parameterName);
                this.effectsEngine.updateEffectParameters(effectType, { [mapped]: correctValue });
            }

            return await this.playEffectedAudio();
        } catch (error) {
            console.error('Failed to play with hidden value:', error);
            return false;
        }
    }

    /**
     * Stop all audio playback
     */
    stopAllAudio() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
        
        if (this.effectsEngine) {
            this.effectsEngine.stopAudio();
        }
        
        this.isPlaying = false;
    }

    /**
     * Set volume for all audio
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        
        // Update master gain if we have one
        if (this.audioContext) {
            // Create a master gain node if it doesn't exist
            if (!this.masterGain) {
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
            }
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Get remaining lives
     */
    getRemainingLives() {
        return this.remainingLives;
    }

    /**
     * Check if audio is currently playing
     */
    isPlaying() {
        return this.isPlaying;
    }

    /**
     * Get current puzzle data
     */
    getCurrentPuzzle() {
        return this.currentPuzzle;
    }

    /**
     * Get effect parameter ranges for current puzzle
     */
    getEffectParameterRanges() {
        if (!this.currentPuzzle || !this.effectsEngine) {
            return {};
        }
        
        return this.effectsEngine.getEffectParameterRanges(this.currentPuzzle.effectType);
    }

    /**
     * Check if Web Audio API is supported
     */
    isWebAudioSupported() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }

    /**
     * Get audio context state
     */
    getAudioContextState() {
        return this.audioContext ? this.audioContext.state : 'not-created';
    }

    /**
     * Resume audio context (for autoplay restrictions)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('Audio context resumed');
                return true;
            } catch (error) {
                console.error('Failed to resume audio context:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * Handle autoplay restrictions
     */
    handleAutoplayRestriction() {
        const message = document.createElement('div');
        message.className = 'autoplay-message';
        message.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3>Audio Playback Disabled</h3>
                <p>Click the button below to enable audio playback for this game.</p>
                <button onclick="this.parentElement.parentElement.remove(); audioManager.resumeAudioContext();" 
                        style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    Enable Audio
                </button>
            </div>
        `;
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1000;
            max-width: 400px;
        `;
        document.body.appendChild(message);
    }

    /**
     * Clean up audio resources
     */
    cleanup() {
        this.stopAllAudio();
        
        if (this.effectsEngine) {
            this.effectsEngine.cleanup();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.effectsEngine = null;
        this.currentPuzzle = null;
    }

    /**
     * Get loading status
     */
    getLoadingStatus() {
        return this.isLoading;
    }

    /**
     * Get current effect type
     */
    getCurrentEffectType() {
        return this.currentPuzzle ? this.currentPuzzle.effectType : null;
    }

    /**
     * Get current parameter name
     */
    getCurrentParameterName() {
        return this.currentPuzzle ? this.currentPuzzle.parameter : null;
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;
