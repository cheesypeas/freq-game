/**
 * Freq - Audio Management System
 * Handles audio file loading, playback, and caching
 */

class AudioManager {
    constructor() {
        this.audioCache = new Map();
        this.currentAudio = null;
        this.isLoading = false;
        this.volume = 0.7;
        
        // Initialize audio context for better control
        this.audioContext = null;
        this.initAudioContext();
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
                }
                return this.audioContext;
            };
        } catch (error) {
            console.warn('Web Audio API not supported, falling back to HTML5 audio');
        }
    }

    /**
     * Load audio file with caching
     */
    async loadAudio(url, preload = true) {
        // Check cache first
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url);
        }

        try {
            this.isLoading = true;
            
            const audio = new Audio();
            audio.preload = preload ? 'auto' : 'metadata';
            audio.volume = this.volume;
            
            // Set up event listeners
            audio.addEventListener('loadstart', () => {
                console.log(`Loading audio: ${url}`);
            });
            
            audio.addEventListener('canplaythrough', () => {
                console.log(`Audio loaded: ${url}`);
                this.isLoading = false;
            });
            
            audio.addEventListener('error', (e) => {
                console.error(`Error loading audio: ${url}`, e);
                this.isLoading = false;
            });

            // Set source and load
            audio.src = url;
            
            if (preload) {
                await audio.load();
            }

            // Cache the audio element
            this.audioCache.set(url, audio);
            return audio;

        } catch (error) {
            console.error(`Failed to load audio: ${url}`, error);
            this.isLoading = false;
            throw error;
        }
    }

    /**
     * Preload multiple audio files
     */
    async preloadAudioFiles(puzzleData) {
        const audioUrls = [
            puzzleData.drySample,
            ...puzzleData.effectedVersions
        ];

        const loadPromises = audioUrls.map(url => 
            this.loadAudio(url, true).catch(error => {
                console.warn(`Failed to preload: ${url}`, error);
                return null;
            })
        );

        try {
            await Promise.all(loadPromises);
            console.log('All audio files preloaded');
        } catch (error) {
            console.error('Some audio files failed to preload:', error);
        }
    }

    /**
     * Play audio with controls
     */
    playAudio(audioElement) {
        if (!audioElement) return;

        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Stop any currently playing audio
        this.stopAllAudio();

        try {
            // Reset to beginning if already played
            if (audioElement.currentTime > 0) {
                audioElement.currentTime = 0;
            }

            audioElement.volume = this.volume;
            const playPromise = audioElement.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.currentAudio = audioElement;
                        console.log('Audio started playing');
                    })
                    .catch(error => {
                        console.error('Error playing audio:', error);
                        // Fallback for autoplay restrictions
                        this.handleAutoplayRestriction(audioElement);
                    });
            }
        } catch (error) {
            console.error('Failed to play audio:', error);
        }
    }

    /**
     * Handle autoplay restrictions
     */
    handleAutoplayRestriction(audioElement) {
        // Show user interaction required message
        const message = document.createElement('div');
        message.className = 'autoplay-message';
        message.innerHTML = `
            <p>Click here to enable audio playback</p>
            <button onclick="this.parentElement.remove(); audioManager.playAudio(audioElement);">
                Enable Audio
            </button>
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
            text-align: center;
        `;
        document.body.appendChild(message);
    }

    /**
     * Pause audio
     */
    pauseAudio(audioElement) {
        if (audioElement && !audioElement.paused) {
            audioElement.pause();
            if (this.currentAudio === audioElement) {
                this.currentAudio = null;
            }
        }
    }

    /**
     * Stop all audio
     */
    stopAllAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // Stop all cached audio
        this.audioCache.forEach(audio => {
            if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    /**
     * Set volume for all audio
     */
    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        
        // Update volume for all cached audio
        this.audioCache.forEach(audio => {
            audio.volume = this.volume;
        });
    }

    /**
     * Get current volume
     */
    getVolume() {
        return this.volume;
    }

    /**
     * Check if audio is currently playing
     */
    isPlaying() {
        return this.currentAudio && !this.currentAudio.paused;
    }

    /**
     * Get current audio element
     */
    getCurrentAudio() {
        return this.currentAudio;
    }

    /**
     * Clean up audio resources
     */
    cleanup() {
        this.stopAllAudio();
        this.audioCache.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * Get loading status
     */
    getLoadingStatus() {
        return this.isLoading;
    }

    /**
     * Get cache status for a URL
     */
    isCached(url) {
        return this.audioCache.has(url);
    }

    /**
     * Get cache size
     */
    getCacheSize() {
        return this.audioCache.size;
    }
}

// Export for use in other modules
window.AudioManager = AudioManager;
