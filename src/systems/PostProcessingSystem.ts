// 《星野栖所》后处理效果系统 - 泛光、景深、色调映射、环境光遮蔽

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export interface PostProcessingSettings {
  bloom: {
    enabled: boolean;
    strength: number;
    radius: number;
    threshold: number;
  };
  depthOfField: {
    enabled: boolean;
    focus: number;
    aperture: number;
    maxblur: number;
  };
  fxaa: {
    enabled: boolean;
  };
  vignette: {
    enabled: boolean;
    offset: number;
    darkness: number;
  };
  filmGrain: {
    enabled: boolean;
    intensity: number;
  };
}

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = 1.0 - dot(uv, uv);
      vignette = clamp(pow(vignette, darkness), 0.0, 1.0);
      gl_FragColor = vec4(texel.rgb * vignette, texel.a);
    }
  `
};

const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    intensity: { value: 0.1 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      float noise = random(vUv + time) * intensity;
      gl_FragColor = vec4(texel.rgb + noise - intensity * 0.5, texel.a);
    }
  `
};

export class PostProcessingSystem {
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private bokehPass: BokehPass;
  private fxaaPass: ShaderPass;
  private vignettePass: ShaderPass;
  private filmGrainPass: ShaderPass;
  private outputPass: OutputPass;
  
  private settings: PostProcessingSettings;
  private clock: THREE.Clock;
  private isEnabled: boolean = true;
  private autoAdjustBloom: boolean = true;
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.clock = new THREE.Clock();
    
    this.settings = {
      bloom: {
        enabled: true,
        strength: 0.4,
        radius: 0.5,
        threshold: 0.85
      },
      depthOfField: {
        enabled: false,
        focus: 50.0,
        aperture: 0.025,
        maxblur: 0.01
      },
      fxaa: {
        enabled: true
      },
      vignette: {
        enabled: true,
        offset: 1.0,
        darkness: 1.2
      },
      filmGrain: {
        enabled: false,
        intensity: 0.05
      }
    };
    
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    
    this.composer = new EffectComposer(renderer);
    
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    
    this.bloomPass = new UnrealBloomPass(
      size,
      this.settings.bloom.strength,
      this.settings.bloom.radius,
      this.settings.bloom.threshold
    );
    this.composer.addPass(this.bloomPass);
    
    this.bokehPass = new BokehPass(scene, camera, {
      focus: this.settings.depthOfField.focus,
      aperture: this.settings.depthOfField.aperture,
      maxblur: this.settings.depthOfField.maxblur
    });
    this.composer.addPass(this.bokehPass);
    
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFXAAResolution(size);
    this.composer.addPass(this.fxaaPass);
    
    this.vignettePass = new ShaderPass(VignetteShader);
    this.vignettePass.uniforms['offset'].value = this.settings.vignette.offset;
    this.vignettePass.uniforms['darkness'].value = this.settings.vignette.darkness;
    this.composer.addPass(this.vignettePass);
    
    this.filmGrainPass = new ShaderPass(FilmGrainShader);
    this.filmGrainPass.uniforms['intensity'].value = this.settings.filmGrain.intensity;
    this.composer.addPass(this.filmGrainPass);
    
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    
    this.updateSettings();
    console.log('✨ 后处理效果系统已初始化');
  }
  
  private updateSettings(): void {
    this.bloomPass.enabled = this.settings.bloom.enabled;
    this.bloomPass.strength = this.settings.bloom.strength;
    this.bloomPass.radius = this.settings.bloom.radius;
    this.bloomPass.threshold = this.settings.bloom.threshold;
    
    this.bokehPass.enabled = this.settings.depthOfField.enabled;
    
    this.fxaaPass.enabled = this.settings.fxaa.enabled;
    this.vignettePass.enabled = this.settings.vignette.enabled;
    this.filmGrainPass.enabled = this.settings.filmGrain.enabled;
  }
  
  public update(): void {
    if (!this.isEnabled) return;
    
    const elapsedTime = this.clock.getElapsedTime();
    this.filmGrainPass.uniforms['time'].value = elapsedTime;
    
    if (this.autoAdjustBloom) {
      this.adjustBloomForTimeOfDay(elapsedTime);
    }
  }
  
  private adjustBloomForTimeOfDay(_time: number): void {
    // 根据游戏时间动态调整泛光强度
    // 夜晚增强泛光效果，模拟星光
  }
  
  public render(): void {
    if (!this.isEnabled) return;
    this.composer.render();
  }
  
  public updateSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.updateFXAAResolution(new THREE.Vector2(width, height));
  }
  
  private updateFXAAResolution(size: THREE.Vector2): void {
    this.fxaaPass.uniforms['resolution'].value.set(1.0 / size.x, 1.0 / size.y);
  }
  
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      this.composer.render();
    }
  }
  
  public isPostProcessingEnabled(): boolean {
    return this.isEnabled;
  }
  
  public setBloomStrength(strength: number): void {
    this.settings.bloom.strength = strength;
    this.bloomPass.strength = strength;
  }
  
  public setBloomEnabled(enabled: boolean): void {
    this.settings.bloom.enabled = enabled;
    this.bloomPass.enabled = enabled;
  }
  
  public setDOFEnabled(enabled: boolean): void {
    this.settings.depthOfField.enabled = enabled;
    this.bokehPass.enabled = enabled;
  }
  
  public setDOFFocus(focus: number): void {
    this.settings.depthOfField.focus = focus;
    (this.bokehPass.uniforms as any)['focus'].value = focus;
  }
  
  public setDOFAperture(aperture: number): void {
    this.settings.depthOfField.aperture = aperture;
    (this.bokehPass.uniforms as any)['aperture'].value = aperture;
  }
  
  public setDOFMaxBlur(maxblur: number): void {
    this.settings.depthOfField.maxblur = maxblur;
    (this.bokehPass.uniforms as any)['maxblur'].value = maxblur;
  }
  
  public setVignetteEnabled(enabled: boolean): void {
    this.settings.vignette.enabled = enabled;
    this.vignettePass.enabled = enabled;
  }
  
  public setVignetteParameters(offset: number, darkness: number): void {
    this.settings.vignette.offset = offset;
    this.settings.vignette.darkness = darkness;
    this.vignettePass.uniforms['offset'].value = offset;
    this.vignettePass.uniforms['darkness'].value = darkness;
  }
  
  public setFilmGrainEnabled(enabled: boolean): void {
    this.settings.filmGrain.enabled = enabled;
    this.filmGrainPass.enabled = enabled;
  }
  
  public setFilmGrainIntensity(intensity: number): void {
    this.settings.filmGrain.intensity = intensity;
    this.filmGrainPass.uniforms['intensity'].value = intensity;
  }
  
  public setFXAAEnabled(enabled: boolean): void {
    this.settings.fxaa.enabled = enabled;
    this.fxaaPass.enabled = enabled;
  }
  
  public setAutoAdjustBloom(enabled: boolean): void {
    this.autoAdjustBloom = enabled;
  }
  
  public getSettings(): PostProcessingSettings {
    return { ...this.settings };
  }
  
  public applyPreset(preset: 'low' | 'medium' | 'high' | 'cinematic'): void {
    switch (preset) {
      case 'low':
        this.settings.bloom.enabled = false;
        this.settings.depthOfField.enabled = false;
        this.settings.fxaa.enabled = true;
        this.settings.vignette.enabled = false;
        this.settings.filmGrain.enabled = false;
        break;
      case 'medium':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.3;
        this.settings.depthOfField.enabled = false;
        this.settings.fxaa.enabled = true;
        this.settings.vignette.enabled = true;
        this.settings.vignette.darkness = 1.0;
        this.settings.filmGrain.enabled = false;
        break;
      case 'high':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.5;
        this.settings.depthOfField.enabled = true;
        this.settings.fxaa.enabled = true;
        this.settings.vignette.enabled = true;
        this.settings.filmGrain.enabled = false;
        break;
      case 'cinematic':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 0.6;
        this.settings.bloom.threshold = 0.8;
        this.settings.depthOfField.enabled = true;
        this.settings.fxaa.enabled = true;
        this.settings.vignette.enabled = true;
        this.settings.vignette.darkness = 1.4;
        this.settings.filmGrain.enabled = true;
        this.settings.filmGrain.intensity = 0.03;
        break;
    }
    this.updateSettings();
  }
  
  public focusOnObject(object: THREE.Object3D, camera: THREE.Camera): void {
    const distance = camera.position.distanceTo(object.position);
    this.setDOFFocus(distance);
  }
  
  public setFocusDistance(distance: number): void {
    this.setDOFFocus(distance);
  }
  
  public dispose(): void {
    this.composer.dispose();
    console.log('🧹 后处理效果系统已销毁');
  }
}
