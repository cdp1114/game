// 《星野栖所》UI增强系统 - 交互反馈、动画效果、提示系统

import { EventEmitter } from '../core/EventEmitter';

export interface UIFeedbackOptions {
  scale?: number;
  duration?: number;
  color?: string;
  sound?: boolean;
}

export interface TooltipOptions {
  title?: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
}

export interface NotificationOptions {
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement';
  title?: string;
  message: string;
  duration?: number;
  icon?: string;
  persistent?: boolean;
}

export class UIFeedbackSystem extends EventEmitter {
  private feedbackContainer: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private tooltipTimeout: number | null = null;
  private activeTooltips: Map<HTMLElement, number> = new Map();
  
  private readonly DEFAULT_FEEDBACK: UIFeedbackOptions = {
    scale: 1.15,
    duration: 150,
    sound: true
  };

  constructor() {
    super();
    this.createFeedbackContainer();
    this.createTooltipElement();
  }

  private createFeedbackContainer(): void {
    this.feedbackContainer = document.createElement('div');
    this.feedbackContainer.id = 'ui-feedback-container';
    this.feedbackContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(this.feedbackContainer);
  }

  private createTooltipElement(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.id = 'ui-tooltip';
    this.tooltipElement.style.cssText = `
      position: fixed;
      padding: 8px 12px;
      background: rgba(20, 20, 30, 0.95);
      color: #fff;
      border-radius: 8px;
      font-size: 13px;
      font-family: 'Noto Sans SC', sans-serif;
      pointer-events: none;
      z-index: 10000;
      opacity: 0;
      transform: translateY(5px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      max-width: 280px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    document.body.appendChild(this.tooltipElement);
  }

  public playButtonFeedback(element: HTMLElement, options?: UIFeedbackOptions): void {
    const opts = { ...this.DEFAULT_FEEDBACK, ...options };
    const originalTransform = element.style.transform;
    const originalTransition = element.style.transition;

    element.style.transition = `transform ${opts.duration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;
    element.style.transform = `scale(${opts.scale})`;

    setTimeout(() => {
      element.style.transform = originalTransform || 'scale(1)';
    }, opts.duration);

    setTimeout(() => {
      element.style.transition = originalTransition;
    }, (opts.duration ?? 150) * 2);

    if (opts.sound) {
      this.playUISound('click');
    }

    this.emit('buttonClick', { element, options: opts });
  }

  public playUISound(type: 'click' | 'hover' | 'success' | 'warning' | 'error' | 'achievement'): void {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'click':
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
      case 'hover':
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.03);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.03);
        break;
      case 'success':
        oscillator.frequency.value = 523.25;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        setTimeout(() => {
          oscillator.frequency.value = 659.25;
        }, 100);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'warning':
        oscillator.frequency.value = 400;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'error':
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        oscillator.start();
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'achievement':
        const now = audioContext.currentTime;
        oscillator.frequency.value = 523.25;
        oscillator.start();
        gainNode.gain.setValueAtTime(0.12, now);
        setTimeout(() => { oscillator.frequency.value = 659.25; }, 80);
        setTimeout(() => { oscillator.frequency.value = 783.99; }, 160);
        setTimeout(() => { oscillator.frequency.value = 1046.50; }, 240);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.stop(now + 0.4);
        break;
    }
  }

  public showTooltip(target: HTMLElement, options: TooltipOptions): void {
    const delay = options.delay || 300;
    
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    const existingTimeout = this.activeTooltips.get(target);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = window.setTimeout(() => {
      if (!this.tooltipElement) return;

      if (options.title) {
        this.tooltipElement.innerHTML = `
          <div style="font-weight: bold; margin-bottom: 4px; color: #ffd700;">${options.title}</div>
          <div>${options.content}</div>
        `;
      } else {
        this.tooltipElement.textContent = options.content;
      }

      if (options.maxWidth) {
        this.tooltipElement.style.maxWidth = `${options.maxWidth}px`;
      }

      const rect = target.getBoundingClientRect();
      const tooltipRect = this.tooltipElement.getBoundingClientRect();

      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = 0;

      switch (options.position || 'top') {
        case 'top':
          top = rect.top - tooltipRect.height - 10;
          break;
        case 'bottom':
          top = rect.bottom + 10;
          break;
        case 'left':
          left = rect.left - tooltipRect.width - 10;
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          left = rect.right + 10;
          top = rect.top + rect.height / 2 - tooltipRect.height / 2;
          break;
      }

      left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));

      this.tooltipElement.style.left = `${left}px`;
      this.tooltipElement.style.top = `${top}px`;
      this.tooltipElement.style.opacity = '1';
      this.tooltipElement.style.transform = 'translateY(0)';

      this.activeTooltips.delete(target);
    }, delay);

    this.activeTooltips.set(target, timeout);
  }

  public hideTooltip(target?: HTMLElement): void {
    if (target) {
      const timeout = this.activeTooltips.get(target);
      if (timeout) {
        clearTimeout(timeout);
        this.activeTooltips.delete(target);
      }
    } else {
      this.activeTooltips.forEach((timeout) => clearTimeout(timeout));
      this.activeTooltips.clear();
    }

    if (this.tooltipElement) {
      this.tooltipElement.style.opacity = '0';
      this.tooltipElement.style.transform = 'translateY(5px)';
    }
  }

  public showFloatingText(text: string, position: { x: number; y: number }, options?: {
    color?: string;
    size?: number;
    duration?: number;
    offsetY?: number;
  }): void {
    const element = document.createElement('div');
    element.textContent = text;
    element.style.cssText = `
      position: fixed;
      left: ${position.x}px;
      top: ${position.y}px;
      color: ${options?.color || '#ffd700'};
      font-size: ${options?.size || 18}px;
      font-weight: bold;
      font-family: 'Noto Sans SC', sans-serif;
      pointer-events: none;
      z-index: 10001;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      animation: floatUp ${options?.duration || 1000}ms ease-out forwards;
    `;

    this.feedbackContainer?.appendChild(element);

    setTimeout(() => {
      element.remove();
    }, options?.duration || 1000);
  }

  public createRippleEffect(element: HTMLElement, event?: MouseEvent): void {
    const rect = element.getBoundingClientRect();
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
      border-radius: 50%;
      width: 10px;
      height: 10px;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, -50%) scale(0);
      animation: rippleEffect 0.6s ease-out forwards;
      pointer-events: none;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  }

  public createShakeEffect(element: HTMLElement, intensity: number = 5): void {
    const originalTransform = element.style.transform;
    let shakeCount = 0;
    const maxShakes = 6;

    const shake = () => {
      if (shakeCount >= maxShakes) {
        element.style.transform = originalTransform;
        return;
      }
      
      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      element.style.transform = `${originalTransform} translate(${offsetX}px, ${offsetY}px)`;
      shakeCount++;
      
      setTimeout(shake, 50);
    };

    shake();
  }

  public createPulseEffect(element: HTMLElement, color: string = '#ffd700'): void {
    element.style.boxShadow = `0 0 0 0 ${color}`;
    element.style.transition = 'box-shadow 0.3s ease';

    requestAnimationFrame(() => {
      element.style.boxShadow = `0 0 0 15px transparent`;
    });
  }

  public createGlowEffect(element: HTMLElement, color: string = '#ffd700'): void {
    element.style.transition = 'all 0.3s ease';
    element.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;

    setTimeout(() => {
      element.style.boxShadow = '';
    }, 1000);
  }

  public showSelectionHighlight(element: HTMLElement): void {
    element.style.outline = '2px solid #ffd700';
    element.style.outlineOffset = '2px';
  }

  public hideSelectionHighlight(element: HTMLElement): void {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }

  public animateNumber(
    element: HTMLElement,
    start: number,
    end: number,
    duration: number = 1000,
    formatter?: (num: number) => string
  ): void {
    const startTime = performance.now();
    
    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * eased);
      
      element.textContent = formatter ? formatter(current) : current.toString();
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  public createProgressBar(
    container: HTMLElement,
    options?: {
      width?: number;
      height?: number;
      color?: string;
      background?: string;
      animated?: boolean;
    }
  ): { setProgress: (value: number) => void; destroy: () => void } {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      width: ${options?.width || 200}px;
      height: ${options?.height || 8}px;
      background: ${options?.background || 'rgba(255,255,255,0.2)'};
      border-radius: 4px;
      overflow: hidden;
    `;

    const fill = document.createElement('div');
    fill.style.cssText = `
      width: 0%;
      height: 100%;
      background: ${options?.color || '#4CAF50'};
      transition: width 0.3s ease;
      ${options?.animated ? 'animation: progressGlow 2s infinite;' : ''}
    `;

    progressBar.appendChild(fill);
    container.appendChild(progressBar);

    return {
      setProgress: (value: number) => {
        fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
      },
      destroy: () => {
        progressBar.remove();
      }
    };
  }

  public dispose(): void {
    if (this.feedbackContainer) {
      this.feedbackContainer.remove();
    }
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
    this.activeTooltips.forEach((timeout) => clearTimeout(timeout));
    this.activeTooltips.clear();
    console.log('🧹 UI反馈系统已销毁');
  }
}

export class NotificationManager extends EventEmitter {
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();
  private notificationId = 0;

  constructor() {
    super();
    this.createContainer();
    this.injectStyles();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'notification-manager';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10002;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      @keyframes floatUp {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-30px);
          opacity: 0;
        }
      }
      
      @keyframes rippleEffect {
        to {
          transform: translate(-50%, -50%) scale(20);
          opacity: 0;
        }
      }
      
      @keyframes progressGlow {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      
      @keyframes achievementUnlock {
        0% {
          transform: scale(0.5);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public show(options: NotificationOptions): string {
    if (!this.container) return '';

    const id = `notification-${this.notificationId++}`;
    const notification = document.createElement('div');
    
    const colors = {
      info: { bg: 'rgba(33, 150, 243, 0.95)', border: '#2196F3' },
      success: { bg: 'rgba(76, 175, 80, 0.95)', border: '#4CAF50' },
      warning: { bg: 'rgba(255, 152, 0, 0.95)', border: '#FF9800' },
      error: { bg: 'rgba(244, 67, 54, 0.95)', border: '#F44336' },
      achievement: { bg: 'rgba(255, 215, 0, 0.95)', border: '#FFD700' }
    };

    const colorScheme = colors[options.type] || colors.info;

    notification.id = id;
    notification.style.cssText = `
      background: ${colorScheme.bg};
      color: ${options.type === 'achievement' ? '#000' : '#fff'};
      padding: 12px 16px;
      border-radius: 8px;
      min-width: 250px;
      max-width: 350px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border-left: 4px solid ${colorScheme.border};
      animation: slideInRight 0.3s ease-out;
      pointer-events: auto;
      font-family: 'Noto Sans SC', sans-serif;
    `;

    let html = '';
    if (options.title) {
      html += `<div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${options.title}</div>`;
    }
    html += `<div style="font-size: 13px; opacity: 0.9;">${options.message}</div>`;
    
    notification.innerHTML = html;

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    if (!options.persistent) {
      const duration = options.duration || (options.type === 'achievement' ? 4000 : 3000);
      setTimeout(() => this.dismiss(id), duration);
    }

    this.emit('notificationShow', { id, options });
    return id;
  }

  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
    
    setTimeout(() => {
      notification.remove();
      this.notifications.delete(id);
      this.emit('notificationDismiss', { id });
    }, 300);
  }

  public dismissAll(): void {
    this.notifications.forEach((_, id) => this.dismiss(id));
  }

  public showAchievement(title: string, message: string, _icon?: string): string {
    return this.show({
      type: 'achievement',
      title: `🏆 ${title}`,
      message,
      duration: 4000
    });
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
    }
    this.notifications.clear();
    console.log('🧹 通知管理器已销毁');
  }
}
