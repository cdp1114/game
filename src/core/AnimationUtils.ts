// 缓动函数工具类 - 平滑动画

export class EasingFunctions {
  // 线性插值
  static linear(t: number): number {
    return t;
  }

  // 缓入 (二次方)
  static easeInQuad(t: number): number {
    return t * t;
  }

  // 缓出 (二次方)
  static easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  // 缓入缓出 (二次方)
  static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  // 缓入 (三次方)
  static easeInCubic(t: number): number {
    return t * t * t;
  }

  // 缓出 (三次方)
  static easeOutCubic(t: number): number {
    return (--t) * t * t + 1;
  }

  // 缓入缓出 (三次方)
  static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // 弹性缓动
  static easeOutElastic(t: number): number {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  }

  // 回弹缓动
  static easeOutBack(t: number): number {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  }

  // 反弹缓动
  static easeOutBounce(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
}

// 插值工具
export class InterpolationUtils {
  // 线性插值
  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  // 角度线性插值 (处理360度边界)
  static lerpAngle(start: number, end: number, t: number): number {
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return start + delta * t;
  }

  // 向量线性插值
  static lerpVector3(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number },
    t: number
  ): { x: number; y: number; z: number } {
    return {
      x: InterpolationUtils.lerp(start.x, end.x, t),
      y: InterpolationUtils.lerp(start.y, end.y, t),
      z: InterpolationUtils.lerp(start.z, end.z, t)
    };
  }

  // 平滑阻尼
  static smoothDamp(
    current: number,
    target: number,
    velocity: number,
    smoothTime: number,
    deltaTime: number,
    maxSpeed: number = Infinity
  ): { value: number; velocity: number } {
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    
    let change = current - target;
    const originalTo = target;
    
    const maxChange = maxSpeed * smoothTime;
    change = Math.max(-maxChange, Math.min(maxChange, change));
    target = current - change;
    
    const temp = (velocity + omega * change) * deltaTime;
    velocity = (velocity - omega * temp) * exp;
    let output = target + (change + temp) * exp;
    
    if (originalTo - current > 0 === output > originalTo) {
      output = originalTo;
      velocity = (output - originalTo) / deltaTime;
    }
    
    return { value: output, velocity };
  }
}

// 动画序列管理器
interface AnimationStep {
  duration: number;
  easing: (t: number) => number;
  onUpdate: (progress: number, easedProgress: number) => void;
}

export class AnimationSequence {
  private steps: AnimationStep[] = [];
  private currentStepIndex: number = 0;
  private stepStartTime: number = 0;
  private isPlaying: boolean = false;
  private onComplete: (() => void) | null = null;

  addStep(
    duration: number,
    easing: (t: number) => number,
    onUpdate: (progress: number, easedProgress: number) => void
  ): AnimationSequence {
    this.steps.push({ duration, easing, onUpdate });
    return this;
  }

  play(onComplete?: () => void): void {
    this.currentStepIndex = 0;
    this.stepStartTime = performance.now();
    this.isPlaying = true;
    this.onComplete = onComplete || null;
    this.update();
  }

  stop(): void {
    this.isPlaying = false;
  }

  private update = (): void => {
    if (!this.isPlaying) return;

    const currentTime = performance.now();
    const currentStep = this.steps[this.currentStepIndex];
    
    if (!currentStep) {
      this.isPlaying = false;
      this.onComplete?.();
      return;
    }

    const elapsed = currentTime - this.stepStartTime;
    const rawProgress = Math.min(elapsed / currentStep.duration, 1);
    const easedProgress = currentStep.easing(rawProgress);

    currentStep.onUpdate(rawProgress, easedProgress);

    if (rawProgress < 1) {
      requestAnimationFrame(this.update);
    } else {
      this.currentStepIndex++;
      this.stepStartTime = currentTime;
      
      if (this.currentStepIndex < this.steps.length) {
        requestAnimationFrame(this.update);
      } else {
        this.isPlaying = false;
        this.onComplete?.();
      }
    }
  };
}
