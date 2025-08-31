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
     * Discover available sample files on the CDN without hardcoding.
     * Tries multiple strategies in order:
     * 1) JSON manifest: audio/samples/index.json | samples.json | catalog.json (array of strings or objects { url })
     * 2) Text index: audio/samples/index.txt (newline-separated)
     * 3) S3-style listing via XML: audio/samples/?list-type=2 (parses <Key> entries)
     * Returns an array of absolute URLs.
     */
    async discoverSampleCatalog() {
        const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.CDN_BASE_URL)
            ? window.APP_CONFIG.CDN_BASE_URL.replace(/\/$/, '') + '/'
            : '';
        const prefix = `${baseUrl}audio/samples/`;

        const coerceToAbsolute = (entry) => {
            if (!entry) return null;
            // Support { url: string } objects or raw strings
            const url = typeof entry === 'string' ? entry : (entry.url || entry.href || null);
            if (!url) return null;
            // Absolute
            if (/^https?:\/\//i.test(url)) return url;
            // Relative
            return `${prefix}${url.replace(/^\//, '')}`;
        };

        // 1) JSON manifests
        const jsonManifestCandidates = [
            `${prefix}index.json`,
            `${prefix}samples.json`,
            `${prefix}catalog.json`
        ];
        for (const manifestUrl of jsonManifestCandidates) {
            try {
                const res = await fetch(manifestUrl, { cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const list = Array.isArray(data) ? data : (Array.isArray(data.files) ? data.files : []);
                const urls = list.map(coerceToAbsolute).filter(Boolean);
                if (urls.length) {
                    console.log(`Discovered ${urls.length} samples from manifest:`, manifestUrl);
                    return urls;
                }
            } catch (_) { /* try next */ }
        }

        // 2) Plain text index (newline-separated)
        try {
            const txtUrl = `${prefix}index.txt`;
            const res = await fetch(txtUrl, { cache: 'no-store' });
            if (res.ok) {
                const body = await res.text();
                const urls = body
                    .split(/\r?\n/)
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map(coerceToAbsolute)
                    .filter(Boolean);
                if (urls.length) {
                    console.log(`Discovered ${urls.length} samples from text index:`, txtUrl);
                    return urls;
                }
            }
        } catch (_) { /* continue */ }

        // 3) S3-style listing via XML (if CDN forwards to origin)
        try {
            const listUrl = `${prefix}?list-type=2`;
            const res = await fetch(listUrl, { cache: 'no-store' });
            if (res.ok) {
                const xmlText = await res.text();
                const parser = new DOMParser();
                const xml = parser.parseFromString(xmlText, 'application/xml');
                const keyNodes = Array.from(xml.getElementsByTagName('Key'));
                const keys = keyNodes.map(n => n.textContent || '').filter(Boolean);
                const urls = keys
                    .filter(k => /\.(wav|mp3|ogg)$/i.test(k))
                    .map(k => `${baseUrl}${k.replace(/^\//, '')}`);
                if (urls.length) {
                    console.log(`Discovered ${urls.length} samples from S3 XML listing`);
                    return urls;
                }
            }
        } catch (_) { /* continue */ }

        console.warn('No catalog discovered; falling back to single known file if available.');
        return [];
    }

    /**
     * Deterministically pick a sample URL for a given UTC date.
     * Rotates daily across the discovered catalog.
     */
    pickDailySampleUrl(sampleUrls, dateUtc = new Date()) {
        if (!Array.isArray(sampleUrls) || sampleUrls.length === 0) return null;
        const y = dateUtc.getUTCFullYear();
        const m = dateUtc.getUTCMonth();
        const d = dateUtc.getUTCDate();
        const midnightUtc = Date.UTC(y, m, d);
        const dayNumber = Math.floor(midnightUtc / 86400000); // days since epoch
        const index = ((dayNumber % sampleUrls.length) + sampleUrls.length) % sampleUrls.length;
        return sampleUrls[index];
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
            
            // Discover available samples and pick one based on the day
            let success = false;
            try {
                const catalog = await this.discoverSampleCatalog();
                let selectedUrl = this.pickDailySampleUrl(catalog);

                // If selection failed or fetch fails, iterate through catalog starting from today's index
                let attempts = 0;
                while (!success && attempts < Math.max(1, catalog.length)) {
                    if (!selectedUrl && catalog.length) {
                        selectedUrl = catalog[attempts % catalog.length];
                    }
                    if (!selectedUrl) break;

                    try {
                        const response = await fetch(selectedUrl, { cache: 'no-store' });
                        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        const arrayBuffer = await response.arrayBuffer();
                        success = await this.effectsEngine.loadDrySampleFromBuffer(arrayBuffer);
                        if (success) {
                            console.log('Loaded daily sample:', selectedUrl);
                            break;
                        }
                    } catch (e) {
                        console.warn('Failed to load selected sample, trying next:', selectedUrl, e.message);
                        // Move to next item deterministically
                        const y = new Date().getUTCFullYear();
                        const m = new Date().getUTCMonth();
                        const d = new Date().getUTCDate();
                        const midnightUtc = Date.UTC(y, m, d);
                        const dayNumber = Math.floor(midnightUtc / 86400000);
                        const nextIndex = ((dayNumber + attempts + 1) % (catalog.length || 1));
                        selectedUrl = catalog[nextIndex];
                        attempts++;
                    }
                }

                if (!success) {
                    throw new Error('No samples could be loaded from catalog');
                }
            } catch (fileError) {
                console.warn('Audio sample discovery/load failed; generating test audio:', fileError.message);
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
            const initialParams = { ...effectPresets, [mainParam]: mainValue };
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
            // Update the effect parameter
            const effectType = this.currentPuzzle.effectType;
            const params = { [parameterName]: value };
            
            // Update effect parameters in real-time
            this.effectsEngine.updateEffectParameters(effectType, params);
            
            // Play the audio with new parameters
            const success = await this.playEffectedAudio();
            
            if (success) {
                // Deduct a life
                this.remainingLives--;
                console.log(`Parameter auditioned: ${parameterName} = ${value}. Lives remaining: ${this.remainingLives}`);
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
            const params = { [parameterName]: value };
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

        return await this.playEffectedAudio();
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
