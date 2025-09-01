/**
 * superfreq - Audio Effects Engine
 * Implements individual audio effects using Web Audio API nodes
 */

class AudioEffectsEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.effects = new Map();
        this.currentEffectChain = null;
        this.drySampleBuffer = null;
        this.isPlaying = false;
        
        this.initEffects();
    }

    /**
     * Initialize all available effects
     */
    initEffects() {
        // Store effect creation functions
        this.effects.set('eq', this.createEQNode.bind(this));
        this.effects.set('reverb', this.createReverbNode.bind(this));
        this.effects.set('compression', this.createCompressionNode.bind(this));
        this.effects.set('delay', this.createDelayNode.bind(this));
        this.effects.set('phaser', this.createPhaserNode.bind(this));
        this.effects.set('flanger', this.createFlangerNode.bind(this));
        this.effects.set('chorus', this.createChorusNode.bind(this));
        this.effects.set('distortion', this.createDistortionNode.bind(this));
        this.effects.set('filter', this.createFilterNode.bind(this));
    }

    

    /**
     * Load dry sample into buffer from array buffer
     */
    async loadDrySampleFromBuffer(arrayBuffer) {
        try {
            this.drySampleBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Dry sample loaded from buffer successfully');
            return true;
        } catch (error) {
            console.error('Failed to load dry sample from buffer:', error);
            return false;
        }
    }

    /**
     * Create effect chain for a specific effect type
     */
    createEffectChain(effectType, parameters = {}) {
        if (!this.effects.has(effectType)) {
            throw new Error(`Unknown effect type: ${effectType}`);
        }

        console.log(`Creating effect chain for ${effectType} with parameters:`, parameters);

        // Clean up existing chain
        if (this.currentEffectChain) {
            this.disconnectEffectChain();
        }

        try {
            // Create new effect chain
            this.currentEffectChain = this.effects.get(effectType)(parameters);
            console.log(`Effect chain created successfully:`, this.currentEffectChain);
            return this.currentEffectChain;
        } catch (error) {
            console.error(`Failed to create effect chain for ${effectType}:`, error);
            throw error;
        }
    }

    /**
     * Update effect parameters in real-time
     */
    updateEffectParameters(effectType, parameters) {
        if (!this.currentEffectChain || !this.currentEffectChain.params) {
            return;
        }

        // Update AudioParam values with smooth transitions
        Object.entries(parameters).forEach(([param, value]) => {
            if (this.currentEffectChain.params[param]) {
                this.currentEffectChain.params[param].setValueAtTime(
                    value, 
                    this.audioContext.currentTime
                );
            }
        });
    }

    /**
     * Play audio with current effect chain
     */
    playAudio() {
        console.log('PlayAudio called:', {
            hasDrySample: !!this.drySampleBuffer,
            hasEffectChain: !!this.currentEffectChain,
            isPlaying: this.isPlaying
        });

        if (!this.drySampleBuffer || !this.currentEffectChain) {
            console.warn('Cannot play audio: missing dry sample or effect chain');
            return false;
        }

        try {
            // Stop any currently playing audio
            this.stopAudio();

            // Create source from buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = this.drySampleBuffer;

            console.log('Audio source created:', {
                bufferLength: this.drySampleBuffer.length,
                sampleRate: this.drySampleBuffer.sampleRate,
                numberOfChannels: this.drySampleBuffer.numberOfChannels
            });

            // Connect through effect chain
            source.connect(this.currentEffectChain.input);
            this.currentEffectChain.output.connect(this.audioContext.destination);

            console.log('Audio nodes connected successfully');

            // Start playback
            source.start(0);
            this.isPlaying = true;

            // Store reference for stopping
            this.currentSource = source;

            // Set up end callback
            source.onended = () => {
                console.log('Audio playback ended');
                this.isPlaying = false;
                this.currentSource = null;
                try { window.dispatchEvent(new CustomEvent('audio-playback-ended')); } catch (e) {}
            };

            console.log('Audio playback started successfully');
            return true;
        } catch (error) {
            console.error('Failed to play audio:', error);
            return false;
        }
    }

    /**
     * Stop currently playing audio
     */
    stopAudio() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
        }
        this.isPlaying = false;
    }

    /**
     * Disconnect and clean up effect chain
     */
    disconnectEffectChain() {
        if (this.currentEffectChain) {
            if (this.currentEffectChain.output) {
                this.currentEffectChain.output.disconnect();
            }
            this.currentEffectChain = null;
        }
    }

    /**
     * Create EQ effect node
     */
    createEQNode({ frequency = 1000, gain = 0, q = 1 } = {}) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        filter.gain.setValueAtTime(gain, this.audioContext.currentTime);
        filter.Q.setValueAtTime(q, this.audioContext.currentTime);

        return {
            input: filter,
            output: filter,
            params: {
                frequency: filter.frequency,
                gain: filter.gain,
                q: filter.Q
            }
        };
    }

    /**
     * Create Reverb effect node
     */
    createReverbNode({ wetMix = 50, roomSize = 0.5 } = {}) {
        // Create impulse response for reverb
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * roomSize;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        // Generate simple impulse response
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.1));
            }
        }

        const convolver = this.audioContext.createConvolver();
        convolver.buffer = impulse;

        // Create wet/dry mix
        const dryGain = this.audioContext.createGain();
        const wetGain = this.audioContext.createGain();
        
        dryGain.gain.setValueAtTime((100 - wetMix) / 100, this.audioContext.currentTime);
        wetGain.gain.setValueAtTime(wetMix / 100, this.audioContext.currentTime);

        // Create merger for stereo
        const merger = this.audioContext.createChannelMerger(2);

        return {
            input: this.audioContext.createChannelSplitter(2),
            output: merger,
            params: {
                wetMix: wetGain.gain,
                roomSize: null // Would need to recreate convolver for room size changes
            },
            nodes: { dryGain, wetGain, convolver, merger }
        };
    }

    /**
     * Create Compression effect node
     */
    createCompressionNode({ threshold = -24, ratio = 4, attack = 0.003, release = 0.25 } = {}) {
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(threshold, this.audioContext.currentTime);
        compressor.ratio.setValueAtTime(ratio, this.audioContext.currentTime);
        compressor.attack.setValueAtTime(attack, this.audioContext.currentTime);
        compressor.release.setValueAtTime(release, this.audioContext.currentTime);

        return {
            input: compressor,
            output: compressor,
            params: {
                threshold: compressor.threshold,
                ratio: compressor.ratio,
                attack: compressor.attack,
                release: compressor.release
            }
        };
    }

    /**
     * Create Delay effect node
     */
    createDelayNode({ time = 100, feedback = 0.3 } = {}) {
        const delay = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        delay.delayTime.setValueAtTime(time / 1000, this.audioContext.currentTime);
        feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);

        // Create feedback loop
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);

        return {
            input: delay,
            output: delay,
            params: {
                time: delay.delayTime,
                feedback: feedbackGain.gain
            },
            nodes: { delay, feedbackGain }
        };
    }

    /**
     * Create Phaser effect node
     */
    createPhaserNode({ rate = 0.5, depth = 0.8, feedback = 0.2, stages = 4 } = {}) {
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const feedbackGain = this.audioContext.createGain();
        
        lfo.frequency.setValueAtTime(rate, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(depth, this.audioContext.currentTime);
        feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);

        // Create phaser stages
        const filters = [];
        for (let i = 0; i < stages; i++) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'allpass';
            filter.frequency.setValueAtTime(800 + i * 200, this.audioContext.currentTime);
            filters.push(filter);
        }

        // Connect LFO to filters
        lfo.connect(lfoGain);
        lfoGain.connect(filters[0].frequency);

        // Create feedback loop
        feedbackGain.connect(filters[stages - 1]);

        // Start LFO
        lfo.start();

        return {
            input: filters[0],
            output: filters[stages - 1],
            params: {
                rate: lfo.frequency,
                depth: lfoGain.gain,
                feedback: feedbackGain.gain
            },
            nodes: { lfo, lfoGain, feedbackGain, filters }
        };
    }

    /**
     * Create Flanger effect node
     */
    createFlangerNode({ rate = 0.5, depth = 0.002, feedback = 0.3 } = {}) {
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const delay = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        lfo.frequency.setValueAtTime(rate, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(depth, this.audioContext.currentTime);
        delay.delayTime.setValueAtTime(0.003, this.audioContext.currentTime);
        feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);

        // Connect LFO to delay time
        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);

        // Create feedback loop
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);

        // Start LFO
        lfo.start();

        return {
            input: delay,
            output: delay,
            params: {
                rate: lfo.frequency,
                depth: lfoGain.gain,
                feedback: feedbackGain.gain
            },
            nodes: { lfo, lfoGain, delay, feedbackGain }
        };
    }

    /**
     * Create Chorus effect node
     */
    createChorusNode({ rate = 0.5, depth = 0.002, feedback = 0.2 } = {}) {
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        const delay = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        lfo.frequency.setValueAtTime(rate, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(depth, this.audioContext.currentTime);
        delay.delayTime.setValueAtTime(0.03, this.audioContext.currentTime);
        feedbackGain.gain.setValueAtTime(feedback, this.audioContext.currentTime);

        // Connect LFO to delay time
        lfo.connect(lfoGain);
        lfoGain.connect(delay.delayTime);

        // Create feedback loop
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);

        // Start LFO
        lfo.start();

        return {
            input: delay,
            output: delay,
            params: {
                rate: lfo.frequency,
                depth: lfoGain.gain,
                feedback: feedbackGain.gain
            },
            nodes: { lfo, lfoGain, delay, feedbackGain }
        };
    }

    /**
     * Create Distortion effect node
     */
    createDistortionNode({ drive = 1, curve = 400 } = {}) {
        const distortion = this.audioContext.createWaveShaper();
        const driveGain = this.audioContext.createGain();
        
        // Create distortion curve
        const samples = 44100;
        const curveArray = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curveArray[i] = ((3 + drive) * x * 20 * deg) / (Math.PI + drive * Math.abs(x));
        }
        
        distortion.curve = curveArray;
        driveGain.gain.setValueAtTime(drive, this.audioContext.currentTime);

        return {
            input: driveGain,
            output: distortion,
            params: {
                drive: driveGain.gain,
                curve: null // Would need to recreate waveshaper for curve changes
            },
            nodes: { driveGain, distortion }
        };
    }

    /**
     * Create Filter effect node
     */
    createFilterNode({ type = 'lowpass', frequency = 1000, q = 1 } = {}) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = type;
        filter.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        filter.Q.setValueAtTime(q, this.audioContext.currentTime);

        return {
            input: filter,
            output: filter,
            params: {
                frequency: filter.frequency,
                q: filter.Q
            }
        };
    }

    

    

    

    /**
     * Clean up resources
     */
    cleanup() {
        this.stopAudio();
        this.disconnectEffectChain();
        
        if (this.drySampleBuffer) {
            this.drySampleBuffer = null;
        }
    }
}

// Export for use in other modules
window.AudioEffectsEngine = AudioEffectsEngine;
