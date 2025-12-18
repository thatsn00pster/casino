// Sound Effects Manager
class SoundManager {
    constructor() {
        this.sounds = {};
        this.soundEnabled = true;
        this.volume = 0.5;
        this.loaded = false;
        this.soundQueue = [];
        this.isPlaying = false;
        
        this.init();
    }

    init() {
        this.loadSounds();
        this.setupEventListeners();
        
        // Check localStorage for sound preference
        const savedSoundPref = localStorage.getItem('moonCasinoSoundEnabled');
        if (savedSoundPref !== null) {
            this.soundEnabled = savedSoundPref === 'true';
            this.updateToggleButton();
        }
    }

    loadSounds() {
        // Create sound objects with fallback to base64 encoded simple sounds if files don't exist
        const soundDefinitions = {
            card: { url: 'sounds/card.wav', fallback: this.createBeepSound(523.25, 0.1) }, // C5
            win: { url: 'sounds/win.wav', fallback: this.createWinSound() },
            lose: { url: 'sounds/lose.wav', fallback: this.createLoseSound() },
            mine: { url: 'sounds/explosion.wav', fallback: this.createExplosionSound() },
            gem: { url: 'sounds/win.wav', fallback: this.createBeepSound(1046.50, 0.2) }, // C6
            click: { url: 'sounds/click.wav', fallback: this.createBeepSound(261.63, 0.05) }, // C4
            hop: { url: 'sounds/click.wav', fallback: this.createBeepSound(392.00, 0.1) }, // G4
            coinflip: { url: 'sounds/click.wav', fallback: this.createCoinSound() }
        };

        Object.entries(soundDefinitions).forEach(([name, def]) => {
            const audio = new Audio();
            audio.volume = this.volume;
            audio.preload = 'auto';
            
            // Try to load from URL, fallback to generated sound
            audio.src = def.url;
            audio.onerror = () => {
                console.log(`Sound ${name} not found, using fallback`);
                // Use fallback sound
                this.sounds[name] = def.fallback;
            };
            
            audio.oncanplaythrough = () => {
                this.sounds[name] = audio;
            };
            
            // Also set the fallback initially
            this.sounds[name] = def.fallback;
        });

        this.loaded = true;
    }

    // Generate fallback sounds using Web Audio API
    createBeepSound(frequency, duration) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3 * this.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration);
            
            return {
                play: () => {
                    const newContext = new (window.AudioContext || window.webkitAudioContext)();
                    const newOscillator = newContext.createOscillator();
                    const newGain = newContext.createGain();
                    
                    newOscillator.connect(newGain);
                    newGain.connect(newContext.destination);
                    
                    newOscillator.frequency.value = frequency;
                    newOscillator.type = 'sine';
                    
                    newGain.gain.setValueAtTime(0.3 * this.volume, newContext.currentTime);
                    newGain.gain.exponentialRampToValueAtTime(0.01, newContext.currentTime + duration);
                    
                    newOscillator.start();
                    newOscillator.stop(newContext.currentTime + duration);
                },
                volume: this.volume
            };
        } catch (e) {
            console.warn("Web Audio API not supported, using dummy sound");
            return {
                play: () => {},
                volume: 0
            };
        }
    }

    createWinSound() {
        return this.createBeepSound(1046.50, 0.5); // C6
    }

    createLoseSound() {
        return this.createBeepSound(130.81, 0.5); // C3
    }

    createExplosionSound() {
        try {
            return {
                play: () => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const bufferSize = audioContext.sampleRate * 0.5;
                    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
                    const output = buffer.getChannelData(0);
                    
                    for (let i = 0; i < bufferSize; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                    
                    const whiteNoise = audioContext.createBufferSource();
                    whiteNoise.buffer = buffer;
                    
                    const gainNode = audioContext.createGain();
                    gainNode.gain.setValueAtTime(0.5 * this.volume, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    
                    whiteNoise.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    whiteNoise.start();
                    whiteNoise.stop(audioContext.currentTime + 0.5);
                },
                volume: this.volume
            };
        } catch (e) {
            return this.createBeepSound(87.31, 0.5); // F2
        }
    }

    createCoinSound() {
        try {
            return {
                play: () => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Create a metallic "ping" sound
                    const oscillator1 = audioContext.createOscillator();
                    const oscillator2 = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator1.frequency.value = 523.25; // C5
                    oscillator2.frequency.value = 659.25; // E5
                    oscillator1.type = 'sine';
                    oscillator2.type = 'sine';
                    
                    oscillator1.connect(gainNode);
                    oscillator2.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    gainNode.gain.setValueAtTime(0.3 * this.volume, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator1.start();
                    oscillator2.start();
                    
                    oscillator1.stop(audioContext.currentTime + 0.3);
                    oscillator2.stop(audioContext.currentTime + 0.3);
                },
                volume: this.volume
            };
        } catch (e) {
            return this.createBeepSound(523.25, 0.3);
        }
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('soundToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }

    toggle() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('moonCasinoSoundEnabled', this.soundEnabled.toString());
        this.updateToggleButton();
        
        // Play feedback sound
        if (this.soundEnabled) {
            this.play('click');
        }
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('soundToggle');
        if (!toggleBtn) return;
        
        const icon = toggleBtn.querySelector('i');
        if (this.soundEnabled) {
            toggleBtn.classList.remove('muted');
            icon.className = 'fa-solid fa-volume-high';
        } else {
            toggleBtn.classList.add('muted');
            icon.className = 'fa-solid fa-volume-xmark';
        }
    }

    play(soundName) {
        if (!this.soundEnabled || !this.loaded) return;
        
        const sound = this.sounds[soundName];
        if (!sound) {
            console.warn(`Sound "${soundName}" not found`);
            return;
        }
        
        try {
            // If it's an Audio object
            if (sound instanceof HTMLAudioElement) {
                const soundClone = sound.cloneNode();
                soundClone.volume = this.volume;
                soundClone.play().catch(e => {
                    if (this.debugMode) console.log('Audio play failed:', e);
                });
            } 
            // If it's our fallback sound object
            else if (sound.play && typeof sound.play === 'function') {
                sound.play();
            }
        } catch (e) {
            if (this.debugMode) console.log('Sound error:', e);
        }
    }

    playDelayed(soundName, delay) {
        setTimeout(() => this.play(soundName), delay);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            if (sound.volume !== undefined) {
                sound.volume = this.volume;
            }
        });
    }

    isEnabled() {
        return this.soundEnabled;
    }
}

// Create singleton instance
const soundManager = new SoundManager();

// Export for use in other modules
export { soundManager };
export default soundManager;