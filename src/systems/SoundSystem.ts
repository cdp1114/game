import { EventEmitter } from '../core/EventEmitter';

export interface SoundConfig {
  frequency?: number;
  duration?: number;
  volume?: number;
  type?: OscillatorType;
  fadeIn?: number;
  fadeOut?: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  bpm: number;
  loops: boolean;
  layers: SoundConfig[][];
}

export class SoundSystem extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private currentMusic: string | null = null;
  private activeOscillators: Map<string, { oscillators: OscillatorNode[]; gains: GainNode[] }> = new Map();
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private isMuted: boolean = false;

  constructor() {
    super();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();

      this.masterGain.connect(this.audioContext.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);

      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.musicGain.gain.value = this.musicVolume;
      this.sfxGain.gain.value = this.sfxVolume;

      this.isInitialized = true;
      console.log('🔊 音效系统初始化完成');
    } catch (error) {
      console.error('音效系统初始化失败:', error);
    }
  }

  public async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public playTone(config: SoundConfig & { id: string }): void {
    if (!this.audioContext || !this.sfxGain) return;

    const { id, frequency = 440, duration = 0.5, volume = 0.5, type = 'sine', fadeIn = 0.01, fadeOut = 0.1 } = config;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + fadeIn);
    
    if (fadeOut > 0) {
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime + duration - fadeOut);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    }

    oscillator.connect(gainNode);
    gainNode.connect(this.sfxGain);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);

    this.emit('tonePlayed', { id, frequency, duration });
  }

  public playClick(): void {
    this.playTone({
      id: 'click',
      frequency: 800,
      duration: 0.05,
      type: 'square',
      volume: 0.3
    });
  }

  public playSelect(): void {
    this.playTone({
      id: 'select',
      frequency: 523,
      duration: 0.1,
      type: 'sine',
      volume: 0.4
    });
    setTimeout(() => {
      this.playTone({
        id: 'select_high',
        frequency: 659,
        duration: 0.1,
        type: 'sine',
        volume: 0.3
      });
    }, 50);
  }

  public playSuccess(): void {
    this.playTone({
      id: 'success_1',
      frequency: 392,
      duration: 0.15,
      type: 'sine',
      volume: 0.5
    });
    setTimeout(() => {
      this.playTone({
        id: 'success_2',
        frequency: 523,
        duration: 0.15,
        type: 'sine',
        volume: 0.5
      });
    }, 100);
    setTimeout(() => {
      this.playTone({
        id: 'success_3',
        frequency: 659,
        duration: 0.2,
        type: 'sine',
        volume: 0.5
      });
    }, 200);
  }

  public playError(): void {
    this.playTone({
      id: 'error',
      frequency: 200,
      duration: 0.2,
      type: 'sawtooth',
      volume: 0.3
    });
  }

  public playHarvest(): void {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.playTone({
          id: `harvest_${i}`,
          frequency: 600 + i * 150,
          duration: 0.08,
          type: 'sine',
          volume: 0.4
        });
      }, i * 60);
    }
  }

  public playPlant(): void {
    this.playTone({
      id: 'plant',
      frequency: 300,
      duration: 0.2,
      type: 'triangle',
      volume: 0.4
    });
    setTimeout(() => {
      this.playTone({
        id: 'plant_high',
        frequency: 450,
        duration: 0.15,
        type: 'sine',
        volume: 0.3
      });
    }, 100);
  }

  public playBuild(): void {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        this.playTone({
          id: `build_${i}`,
          frequency: 200 + i * 100,
          duration: 0.1,
          type: 'square',
          volume: 0.3
        });
      }, i * 50);
    }
  }

  public playBeastHappy(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone({
          id: `beast_happy_${i}`,
          frequency: freq,
          duration: 0.15,
          type: 'sine',
          volume: 0.4
        });
      }, i * 80);
    });
  }

  public playAmbient(): void {
    if (!this.audioContext || !this.musicGain) return;

    const duration = 3;
    
    const playChord = (freqs: number[], startTime: number, vol: number) => {
      freqs.forEach((freq) => {
        const osc = this.audioContext!.createOscillator();
        const gain = this.audioContext!.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(vol / freqs.length, startTime + 0.5);
        gain.gain.linearRampToValueAtTime(0, startTime + duration - 0.5);
        
        osc.connect(gain);
        gain.connect(this.musicGain!);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };

    const now = this.audioContext.currentTime;
    const chord1 = [130.81, 164.81, 196.00];
    const chord2 = [146.83, 174.61, 220.00];
    const chord3 = [164.81, 196.00, 246.94];

    playChord(chord1, now, 0.3);
    playChord(chord2, now + 2, 0.25);
    playChord(chord3, now + 4, 0.3);
  }

  public playMusic(trackId: string, loop: boolean = true): void {
    if (!this.audioContext || !this.musicGain) return;

    if (this.currentMusic) {
      this.stopMusic();
    }

    this.currentMusic = trackId;

    const tracks: { [key: string]: { freqs: number[]; interval: number; volume: number } } = {
      'ambient_nature': {
        freqs: [261.63, 329.63, 392.00, 523.25],
        interval: 2000,
        volume: 0.2
      },
      'peaceful_morning': {
        freqs: [293.66, 349.23, 440.00],
        interval: 3000,
        volume: 0.25
      },
      'night_calm': {
        freqs: [220.00, 261.63, 329.63],
        interval: 4000,
        volume: 0.15
      },
      'celebration': {
        freqs: [523.25, 659.25, 783.99, 1046.50],
        interval: 500,
        volume: 0.3
      }
    };

    const track = tracks[trackId];
    if (!track) {
      console.warn(`Music track not found: ${trackId}`);
      return;
    }

    this.playAmbientLoop(track.freqs, track.interval, track.volume, loop);
  }

  private playAmbientLoop(freqs: number[], interval: number, volume: number, loop: boolean): void {
    if (!this.audioContext || !this.musicGain) return;

    const id = 'ambient_loop';
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    freqs.forEach((freq) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      
      osc.connect(gain);
      gain.connect(this.musicGain!);
      
      osc.start();
      oscillators.push(osc);
      gains.push(gain);
    });

    this.activeOscillators.set(id, { oscillators, gains });

    const fadeInTime = 2;
    const now = this.audioContext.currentTime;
    gains.forEach(gain => {
      gain.gain.linearRampToValueAtTime(volume / freqs.length, now + fadeInTime);
    });

    if (loop) {
      let step = 0;
      
      const intervalId = setInterval(() => {
        if (!this.activeOscillators.has(id)) {
          clearInterval(intervalId);
          return;
        }
        
        step++;
        const currentTime = this.audioContext!.currentTime;
        
        gains.forEach((gain, i) => {
          const targetVol = Math.sin((step + i * 0.25) * 0.5) * 0.5 + 0.5;
          gain.gain.setValueAtTime(gain.gain.value, currentTime);
          gain.gain.linearRampToValueAtTime((targetVol * volume) / freqs.length, currentTime + interval / 1000 * 0.5);
        });
      }, interval);
    }
  }

  public stopMusic(): void {
    this.activeOscillators.forEach((data, id) => {
      if (id === 'ambient_loop' || id.startsWith('music_')) {
        const now = this.audioContext?.currentTime || 0;
        data.gains.forEach(gain => {
          gain.gain.linearRampToValueAtTime(0, now + 1);
        });
        
        setTimeout(() => {
          data.oscillators.forEach(osc => {
            try { osc.stop(); } catch {}
          });
        }, 1100);
        
        this.activeOscillators.delete(id);
      }
    });
    
    this.currentMusic = null;
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && !this.isMuted) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && !this.isMuted) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public isMusicPlaying(): boolean {
    return this.currentMusic !== null;
  }

  public getCurrentMusic(): string | null {
    return this.currentMusic;
  }

  public dispose(): void {
    this.stopMusic();
    
    this.activeOscillators.forEach(data => {
      data.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
    });
    this.activeOscillators.clear();

    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.isInitialized = false;
  }
}
