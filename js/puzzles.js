/**
 * Freq - Puzzle Data System
 * Handles puzzle data structure, daily selection, and parameter validation
 */

class PuzzleSystem {
    constructor() {
        this.effects = {
            eq: {
                name: 'EQ',
                description: 'Equalizer - Listen for frequency boosts or cuts',
                parameter: 'frequency',
                unit: 'Hz',
                minValue: 20,
                maxValue: 20000,
                logarithmic: true
            },
            reverb: {
                name: 'Reverb',
                description: 'Reverb - Listen for room size and wet/dry mix',
                parameter: 'wetMix',
                unit: '%',
                minValue: 0,
                maxValue: 100,
                logarithmic: false
            },
            compression: {
                name: 'Compression',
                description: 'Compression - Listen for dynamic range reduction',
                parameter: 'threshold',
                unit: 'dB',
                minValue: -60,
                maxValue: 0,
                logarithmic: false
            },
            delay: {
                name: 'Delay',
                description: 'Delay - Listen for echo timing',
                parameter: 'time',
                unit: 'ms',
                minValue: 10,
                maxValue: 1000,
                logarithmic: true
            },
            phaser: {
                name: 'Phaser',
                description: 'Phaser - Listen for modulation rate',
                parameter: 'rate',
                unit: 'Hz',
                minValue: 0.1,
                maxValue: 2.0,
                logarithmic: true
            },
            flanger: {
                name: 'Flanger',
                description: 'Flanger - Listen for modulation rate',
                parameter: 'rate',
                unit: 'Hz',
                minValue: 0.1,
                maxValue: 2.0,
                logarithmic: true
            },
            chorus: {
                name: 'Chorus',
                description: 'Chorus - Listen for modulation rate',
                parameter: 'rate',
                unit: 'Hz',
                minValue: 0.1,
                maxValue: 2.0,
                logarithmic: true
            },
            distortion: {
                name: 'Distortion',
                description: 'Distortion - Listen for drive amount',
                parameter: 'drive',
                unit: '',
                minValue: 1,
                maxValue: 10,
                logarithmic: false
            },
            filter: {
                name: 'Filter',
                description: 'Filter - Listen for cutoff frequency',
                parameter: 'cutoff',
                unit: 'Hz',
                minValue: 20,
                maxValue: 20000,
                logarithmic: true
            }
        };

        // Sample puzzle data for development
        this.samplePuzzles = this.generateSamplePuzzles();
    }

    /**
     * Generate sample puzzles for development
     */
    generateSamplePuzzles() {
        const puzzles = {};
        const effectTypes = Object.keys(this.effects);
        const sampleTypes = ['strings', 'drums', 'vocals', 'guitar', 'synth', 'bass'];
        
        // Generate puzzles for the next 30 days
        for (let i = 0; i < 30; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateKey = this.formatDate(date);
            
            const effectType = effectTypes[i % effectTypes.length];
            const effect = this.effects[effectType];
            
            // Generate realistic parameter values
            let correctValue;
            if (effect.logarithmic) {
                // Logarithmic scale for frequency-based parameters
                const logMin = Math.log(effect.minValue);
                const logMax = Math.log(effect.maxValue);
                const randomLog = logMin + Math.random() * (logMax - logMin);
                correctValue = Math.exp(randomLog);
            } else {
                // Linear scale for percentage/level parameters
                correctValue = effect.minValue + Math.random() * (effect.maxValue - effect.minValue);
            }
            
            // Round to appropriate decimal places
            if (effect.unit === 'Hz' && effect.logarithmic) {
                correctValue = Math.round(correctValue);
            } else if (effect.unit === '%') {
                correctValue = Math.round(correctValue);
            } else if (effect.unit === 'ms') {
                correctValue = Math.round(correctValue / 10) * 10;
            } else {
                correctValue = Math.round(correctValue * 100) / 100;
            }

            puzzles[dateKey] = {
                date: dateKey,
                effectType: effectType,
                effectName: effect.name,
                description: effect.description,
                parameter: effect.parameter,
                parameterName: effect.parameter,
                correctValue: correctValue,
                minValue: effect.minValue,
                maxValue: effect.maxValue,
                unit: effect.unit,
                sampleType: sampleTypes[i % sampleTypes.length],
                drySample: `https://cdn.example.com/audio/${dateKey}/dry.mp3`,
                effectedVersions: [
                    `https://cdn.example.com/audio/${dateKey}/version1.mp3`,
                    `https://cdn.example.com/audio/${dateKey}/version2.mp3`,
                    `https://cdn.example.com/audio/${dateKey}/version3.mp3`,
                    `https://cdn.example.com/audio/${dateKey}/version4.mp3`,
                    `https://cdn.example.com/audio/${dateKey}/version5.mp3`,
                    `https://cdn.example.com/audio/${dateKey}/version6.mp3`
                ]
            };
        }
        
        return puzzles;
    }

    /**
     * Get puzzle for a specific date
     */
    getPuzzleForDate(date) {
        const dateKey = this.formatDate(date);
        return this.samplePuzzles[dateKey] || null;
    }

    /**
     * Get today's puzzle
     */
    getTodaysPuzzle() {
        return this.getPuzzleForDate(new Date());
    }

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get effect metadata
     */
    getEffectMetadata(effectType) {
        return this.effects[effectType] || null;
    }

    /**
     * Validate parameter range
     */
    validateParameterRange(effectType, value) {
        const effect = this.effects[effectType];
        if (!effect) return false;
        
        return value >= effect.minValue && value <= effect.maxValue;
    }

    /**
     * Convert parameter value to slider position (0-100)
     */
    valueToSliderPosition(effectType, value) {
        const effect = this.effects[effectType];
        if (!effect) return 0;
        
        if (effect.logarithmic) {
            const logMin = Math.log(effect.minValue);
            const logMax = Math.log(effect.maxValue);
            const logValue = Math.log(value);
            return ((logValue - logMin) / (logMax - logMin)) * 100;
        } else {
            return ((value - effect.minValue) / (effect.maxValue - effect.minValue)) * 100;
        }
    }

    /**
     * Convert slider position (0-100) to parameter value
     */
    sliderPositionToValue(effectType, sliderPosition) {
        const effect = this.effects[effectType];
        if (!effect) return 0;
        
        const normalized = sliderPosition / 100;
        
        if (effect.logarithmic) {
            const logMin = Math.log(effect.minValue);
            const logMax = Math.log(effect.maxValue);
            const logValue = logMin + normalized * (logMax - logMin);
            return Math.exp(logValue);
        } else {
            return effect.minValue + normalized * (effect.maxValue - effect.minValue);
        }
    }

    /**
     * Format parameter value for display
     */
    formatParameterValue(value, unit) {
        if (unit === 'Hz') {
            if (value >= 1000) {
                return `${(value / 1000).toFixed(1)}k`;
            }
            return Math.round(value).toString();
        } else if (unit === 'ms') {
            return Math.round(value).toString();
        } else if (unit === '%') {
            return Math.round(value).toString();
        } else {
            return value.toFixed(2);
        }
    }
}

// Export for use in other modules
window.PuzzleSystem = PuzzleSystem;
