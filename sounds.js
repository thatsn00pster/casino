// Sound System
class SoundSystem {
    constructor() {
        this.enabled = true;
        this.sounds = {};
        this.volume = 0.5;
        
        this.initialize();
    }

    initialize() {
        // Create audio elements
        const soundFiles = {
            click: 'sounds/click.wav',
            card: 'sounds/card.wav',
            win: 'sounds/win.wav',
            lose: 'sounds/lose.wav',
            mine: 'sounds/explosion.wav',
            gem: 'sounds/win.wav',
            hop: 'sounds/click.wav',
            coinflip: 'sounds/click.wav'
        };

        // Create audio objects
        Object.keys(soundFiles).forEach(key => {
            this.sounds[key] = new Audio();
            this.sounds[key].src = soundFiles[key];
            this.sounds[key].volume = this.volume;
            this.sounds[key].preload = 'auto';
        });

        // Setup sound toggle
        this.setupSoundToggle();
    }

    setupSoundToggle() {
        const soundToggle = document.getElementById('soundToggle');
        if (!soundToggle) return;

        soundToggle.addEventListener('click', () => {
            this.toggle();
        });

        // Update icon based on initial state
        this.updateToggleIcon();
    }

    toggle() {
        this.enabled = !this.enabled;
        this.updateToggleIcon();
        
        // Show toast notification
        const message = this.enabled ? 'Sound enabled' : 'Sound muted';
        const type = this.enabled ? 'success' : 'warning';
        
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        }
    }

    updateToggleIcon() {
        const soundToggle = document.getElementById('soundToggle');
        if (!soundToggle) return;
        
        const icon = soundToggle.querySelector('i');
        if (!icon) return;
        
        if (this.enabled) {
            soundToggle.classList.remove('muted');
            icon.className = 'fa-solid fa-volume-high';
        } else {
            soundToggle.classList.add('muted');
            icon.className = 'fa-solid fa-volume-xmark';
        }
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            // Create a new audio instance to allow overlapping sounds
            const sound = new Audio(this.sounds[soundName].src);
            sound.volume = this.volume;
            sound.play().catch(e => {
                // Silent fail for autoplay restrictions
                console.log('Audio play failed:', e.message);
            });
        } catch (e) {
            console.log('Sound error:', e);
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }
}
