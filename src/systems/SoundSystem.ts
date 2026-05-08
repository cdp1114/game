import { EventEmitter } from '../core/EventEmitter';

export type SoundType = 
  | 'block_place'
  | 'block_break'
  | 'block_hit'
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'achievement'
  | 'notification'
  | 'jump'
  | 'land'
  | 'footstep'
  | 'ambient_nature'
  | 'ambient_water'
  | 'ambient_wind'
  | 'pickup'
  | 'drop'
  | 'craft'
  | 'error'
  | 'success';

export interface SoundConfig {
  type: SoundType;
  url?: string;
  volume?: number;
  loop?: boolean;
  spatial?: boolean;
}

export interface AudioContext {
  context: globalThis.AudioContext;
  masterGain: GainNode;
  musicGain: GainNode;
  sfxGain: GainNode;
}

export class SoundSystem extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private activeSources: Map<string, AudioBufferSourceNode> = new Map();
  private musicSource: AudioBufferSourceNode | null = null;
  
  private isInitialized: boolean = false;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;
  
  private generatedSounds: Map<SoundType, OscillatorConfig> = new Map();
  private soundBuffers: Map<SoundType, AudioBuffer> = new Map();
  
  constructor() {
    super();
    this.initializeGeneratedSounds();
  }
  
  private initializeGeneratedSounds(): void {
    this.generatedSounds.set('block_place', {
      type: 'square',
      frequency: 440,
      duration: 0.1,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.04 }
    });
    
    this.generatedSounds.set('block_break', {
      type: 'sawtooth',
      frequency: 200,
      duration: 0.15,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.04 }
    });
    
    this.generatedSounds.set('block_hit', {
      type: 'triangle',
      frequency: 300,
      duration: 0.05,
      envelope: { attack: 0.001, decay: 0.02, sustain: 0.2, release: 0.03 }
    });
    
    this.generatedSounds.set('ui_click', {
      type: 'sine',
      frequency: 800,
      duration: 0.05,
      envelope: { attack: 0.001, decay: 0.02, sustain: 0.5, release: 0.03 }
    });
    
    this.generatedSounds.set('ui_open', {
      type: 'sine',
      frequency: 600,
      duration: 0.1,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.05 }
    });
    
    this.generatedSounds.set('ui_close', {
      type: 'sine',
      frequency: 400,
      duration: 0.1,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.05 }
    });
    
    this.generatedSounds.set('achievement', {
      type: 'sine',
      frequency: 880,
      duration: 0.3,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
      arpeggio: [523, 659, 784, 1047]
    });
    
    this.generatedSounds.set('notification', {
      type: 'sine',
      frequency: 660,
      duration: 0.15,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.1 }
    });
    
    this.generatedSounds.set('jump', {
      type: 'sine',
      frequency: 200,
      duration: 0.15,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.05 }
    });
    
    this.generatedSounds.set('land', {
      type: 'triangle',
      frequency: 80,
      duration: 0.1,
      envelope: { attack: 0.001, decay: 0.05, sustain: 0.2, release: 0.05 }
    });
    
    this.generatedSounds.set('pickup', {
      type: 'sine',
      frequency: 880,
      duration: 0.1,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.5, release: 0.05 },
      arpeggio: [440, 660, 880]
    });
    
    this.generatedSounds.set('drop', {
      type: 'triangle',
      frequency: 330,
      duration: 0.1,
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.05 },
      arpeggio: [440, 330, 220]
    });
    
    this.generatedSounds.set('success', {
      type: 'sine',
      frequency: 523,
      duration: 0.2,
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.1 },
      arpeggio: [523, 659, 784]
    });
    
    this.generatedSounds.set('error', {
      type: 'sawtooth',
      frequency: 150,
      duration: 0.2,
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
    });
    
    this.generatedSounds.set('footstep', {
      type: 'triangle',
      frequency: 100,
      duration: 0.05,
      envelope: { attack: 0.001, decay: 0.02, sustain: 0.1, release: 0.03 }
    });
  }
  
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = {
        context: new (window.AudioContext || (window as any).webkitAudioContext)(),
        masterGain: this.audioContext!.context.createGain(),
        musicGain: this.audioContext!.context.createGain(),
        sfxGain: this.audioContext!.context.createGain()
      };
      
      const ctx = this.audioContext.context;
      
      this.audioContext.masterGain.gain.value = 1;
      this.audioContext.musicGain.gain.value = this.musicVolume;
      this.audioContext.sfxGain.gain.value = this.sfxVolume;
      
      this.audioContext.musicGain.connect(this.audioContext.masterGain);
      this.audioContext.sfxGain.connect(this.audioContext.masterGain);
      this.audioContext.masterGain.connect(ctx.destination);
      
      await this.generateAllSounds();
      
      this.isInitialized = true;
      console.log('🔊 音效系统已初始化');
    } catch (error) {
      console.warn('音效系统初始化失败:', error);
    }
  }
  
  private async generateAllSounds(): Promise<void> {
    for (const [type, config] of this.generatedSounds) {
      const buffer = await this.generateSound(config);
      this.soundBuffers.set(type, buffer);
    }
  }
  
  private async generateSound(config: OscillatorConfig): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const ctx = this.audioContext.context;
    const sampleRate = ctx.sampleRate;
    const duration = config.duration + config.envelope.release;
    const numSamples = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);
    
    const { attack, decay, sustain, release } = config.envelope;
    
    let phase = 0;
    const phaseIncrement = (config.frequency * 2 * Math.PI) / sampleRate;
    
    if (config.arpeggio) {
      const notes = config.arpeggio;
      const noteDuration = numSamples / notes.length;
      
      for (let i = 0; i < numSamples; i++) {
        const noteIndex = Math.min(Math.floor(i / noteDuration), notes.length - 1);
        const freq = notes[noteIndex];
        const localPhaseInc = (freq * 2 * Math.PI) / sampleRate;
        
        let envelope = 0;
        let t = i / sampleRate;
        
        if (t < attack) {
          envelope = t / attack;
        } else if (t < attack + decay) {
          envelope = 1 - (1 - sustain) * ((t - attack) / decay);
        } else if (t < duration - release) {
          envelope = sustain;
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }
        
        data[i] = Math.sin(phase) * envelope * 0.3;
        phase += localPhaseInc;
      }
    } else {
      for (let i = 0; i < numSamples; i++) {
        let envelope = 0;
        const t = i / sampleRate;
        
        if (t < attack) {
          envelope = t / attack;
        } else if (t < attack + decay) {
          envelope = 1 - (1 - sustain) * ((t - attack) / decay);
        } else if (t < duration - release) {
          envelope = sustain;
        } else {
          envelope = sustain * (1 - (t - (duration - release)) / release);
        }
        
        let sample = 0;
        
        switch (config.type) {
          case 'sine':
            sample = Math.sin(phase);
            break;
          case 'square':
            sample = Math.sin(phase) > 0 ? 1 : -1;
            break;
          case 'sawtooth':
            sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
            break;
          case 'triangle':
            sample = Math.abs(4 * ((phase / (2 * Math.PI)) % 1) - 2) - 1;
            break;
        }
        
        data[i] = sample * envelope * 0.3;
        phase += phaseIncrement;
      }
    }
    
    return buffer;
  }
  
  public async play(type: SoundType, options?: { volume?: number; loop?: boolean; spatial?: boolean }): Promise<void> {
    if (!this.isInitialized || this.isMuted) return;
    
    const buffer = this.soundBuffers.get(type);
    if (!buffer || !this.audioContext) return;
    
    try {
      const source = this.audioContext.context.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = this.audioContext.context.createGain();
      gainNode.gain.value = options?.volume ?? 1;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.sfxGain);
      
      if (options?.loop) {
        source.loop = true;
      }
      
      source.start();
      
      const sourceId = `${type}_${Date.now()}`;
      this.activeSources.set(sourceId, source);
      
      source.onended = () => {
        this.activeSources.delete(sourceId);
      };
    } catch (error) {
      console.warn(`播放音效失败 (${type}):`, error);
    }
  }
  
  public async playMusic(type: SoundType, fadeIn: boolean = true): Promise<void> {
    if (!this.isInitialized || this.isMuted) return;
    
    const buffer = this.soundBuffers.get(type);
    if (!buffer || !this.audioContext) return;
    
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource = null;
    }
    
    const source = this.audioContext.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    if (fadeIn) {
      this.audioContext.musicGain.gain.setValueAtTime(0, this.audioContext.context.currentTime);
      this.audioContext.musicGain.gain.linearRampToValueAtTime(
        this.musicVolume,
        this.audioContext.context.currentTime + 1
      );
    }
    
    source.connect(this.audioContext.musicGain);
    source.start();
    
    this.musicSource = source;
  }
  
  public stopMusic(fadeOut: boolean = true): void {
    if (!this.audioContext || !this.musicSource) return;
    
    if (fadeOut) {
      this.audioContext.musicGain.gain.linearRampToValueAtTime(
        0,
        this.audioContext.context.currentTime + 1
      );
      setTimeout(() => {
        if (this.musicSource) {
          this.musicSource.stop();
          this.musicSource = null;
        }
      }, 1000);
    } else {
      this.musicSource.stop();
      this.musicSource = null;
    }
  }
  
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.audioContext) {
      this.audioContext.musicGain.gain.value = this.musicVolume;
    }
  }
  
  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.audioContext) {
      this.audioContext.sfxGain.gain.value = this.sfxVolume;
    }
  }
  
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.audioContext) {
      this.audioContext.masterGain.gain.value = muted ? 0 : 1;
    }
  }
  
  public isSoundMuted(): boolean {
    return this.isMuted;
  }
  
  public getMusicVolume(): number {
    return this.musicVolume;
  }
  
  public getSFXVolume(): number {
    return this.sfxVolume;
  }
  
  public stopAll(): void {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeSources.clear();
    
    if (this.musicSource) {
      this.musicSource.stop();
      this.musicSource = null;
    }
  }
  
  public dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.context.close();
      this.audioContext = null;
    }
    this.sounds.clear();
    this.soundBuffers.clear();
    this.isInitialized = false;
  }
}

interface OscillatorConfig {
  type: 'sine' | 'square' | 'sawtooth' | 'triangle';
  frequency: number;
  duration: number;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  arpeggio?: number[];
}
