// 《星野栖所》新手教程系统 - 引导新玩家了解游戏玩法

import { EventEmitter } from '../core/EventEmitter';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string;
  targetElement?: HTMLElement;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  highlight?: boolean;
  showSkip?: boolean;
  action?: 'click' | 'hover' | 'wait' | 'custom';
  actionTarget?: string;
  actionCallback?: () => boolean;
  nextButton?: boolean;
  nextButtonText?: string;
}

export interface TutorialConfig {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export class TutorialSystem extends EventEmitter {
  private tutorials: Map<string, TutorialConfig> = new Map();
  private currentTutorial: TutorialConfig | null = null;
  private currentStepIndex: number = 0;
  private overlayElement: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private highlightElement: HTMLElement | null = null;
  private isActive: boolean = false;

  constructor() {
    super();
    this.createOverlay();
    this.createTooltip();
    this.registerDefaultTutorials();
  }

  private createOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'tutorial-overlay';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      display: none;
      pointer-events: none;
    `;
    document.body.appendChild(this.overlayElement);
  }

  private createTooltip(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.id = 'tutorial-tooltip';
    this.tooltipElement.style.cssText = `
      position: fixed;
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.98), rgba(20, 20, 35, 0.98));
      color: #fff;
      padding: 20px;
      border-radius: 12px;
      max-width: 400px;
      z-index: 10003;
      display: none;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: 'Noto Sans SC', sans-serif;
      pointer-events: auto;
    `;
    document.body.appendChild(this.tooltipElement);
  }

  private registerDefaultTutorials(): void {
    this.registerTutorial({
      id: 'basic_intro',
      name: '游戏基础介绍',
      description: '了解《星野栖所》的基本玩法',
      steps: [
        {
          id: 'welcome',
          title: '欢迎来到星野栖所 🌟',
          content: '欢迎来到这个宁静的开放世界！在开始你的冒险之前，让我为你介绍一些基本操作。',
          position: 'center',
          highlight: false,
          nextButton: true,
          nextButtonText: '开始教程'
        },
        {
          id: 'camera_control',
          title: '视角控制 📷',
          content: '按住鼠标右键并拖动可以旋转视角，观察你的家园四周。按住滚轮可以平移视角。',
          position: 'center',
          highlight: false,
          nextButton: true,
          nextButtonText: '下一步'
        },
        {
          id: 'plant_action',
          title: '种植作物 🌱',
          content: '点击下方的"种植"按钮打开作物面板，选择想要种植的作物，然后在土地上点击即可播种。不同作物有不同的生长时间和产出。',
          position: 'bottom',
          targetSelector: '[data-action="plant"]',
          highlight: true,
          showSkip: true,
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'build_action',
          title: '建造系统 🏗️',
          content: '点击"建造"按钮进入建造模式，在这里你可以放置各种建筑和装饰。点击"退出"或按ESC键退出建造模式。',
          position: 'bottom',
          targetSelector: '[data-action="build"]',
          highlight: true,
          showSkip: true,
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'beast_action',
          title: '异兽互动 🦊',
          content: '在游戏中有各种可爱的异兽等待你的发现！点击"异兽"按钮可以查看当前遇到的异兽，与它们互动可以获得奖励。',
          position: 'bottom',
          targetSelector: '[data-action="beast"]',
          highlight: true,
          showSkip: true,
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'menu_action',
          title: '游戏菜单 📋',
          content: '点击"菜单"可以打开游戏设置，在这里你可以保存/读取游戏、调整音量、查看帮助信息等。',
          position: 'bottom',
          targetSelector: '[data-action="menu"]',
          highlight: true,
          showSkip: true,
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'time_system',
          title: '时间与季节 🌅',
          content: '游戏中存在真实的时间流逝和四季更替。不同季节会有不同的天气和景色，作物也会受到季节影响哦！',
          position: 'center',
          highlight: false,
          nextButton: true,
          nextButtonText: '我学会了！'
        }
      ],
      onComplete: () => {
        console.log('🎓 新手教程完成！');
        localStorage.setItem('tutorial_basic_intro_completed', 'true');
      },
      onSkip: () => {
        console.log('⏭️ 用户跳过了新手教程');
        localStorage.setItem('tutorial_basic_intro_completed', 'true');
      }
    });

    this.registerTutorial({
      id: 'building_guide',
      name: '建造指南',
      description: '学习如何使用建造系统',
      steps: [
        {
          id: 'enter_build',
          title: '进入建造模式 🏗️',
          content: '建造系统让你可以自由布置你的家园。点击下方菜单的"建造"按钮进入建造模式。',
          position: 'center',
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'select_building',
          title: '选择建筑',
          content: '在建造面板中选择你想要放置的建筑类型。每种建筑都有不同的功能和样式。',
          position: 'right',
          targetSelector: '#build-panel',
          highlight: true,
          nextButton: true,
          nextButtonText: '继续'
        },
        {
          id: 'place_building',
          title: '放置建筑',
          content: '选择了建筑后，在场景中点击即可放置。你可以拖动来移动建筑位置。',
          position: 'center',
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'exit_build',
          title: '退出建造',
          content: '建造完成后，点击"退出"按钮或按ESC键退出建造模式。',
          position: 'center',
          nextButton: true,
          nextButtonText: '完成'
        }
      ],
      onComplete: () => {
        console.log('🏗️ 建造教程完成！');
      }
    });

    this.registerTutorial({
      id: 'farming_guide',
      name: '农耕指南',
      description: '学习如何种植和收获作物',
      steps: [
        {
          id: 'open_crop_panel',
          title: '打开作物面板 🌾',
          content: '点击下方菜单的"种植"按钮打开作物选择面板。',
          position: 'center',
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'select_crop',
          title: '选择作物',
          content: '面板中显示了所有可种植的作物。选择你想要种植的作物类型。',
          position: 'right',
          targetSelector: '#crop-panel',
          highlight: true,
          nextButton: true,
          nextButtonText: '继续'
        },
        {
          id: 'plant_crop',
          title: '播种',
          content: '选择作物后，在农田上点击即可播种。作物会开始生长！',
          position: 'center',
          nextButton: false,
          action: 'wait'
        },
        {
          id: 'wait_growth',
          title: '等待生长',
          content: '作物需要时间生长。你可以通过观察作物上方的进度条来了解生长状态。当进度条满时就可以收获了！',
          position: 'center',
          nextButton: true,
          nextButtonText: '我明白了'
        }
      ],
      onComplete: () => {
        console.log('🌾 农耕教程完成！');
      }
    });
  }

  public registerTutorial(config: TutorialConfig): void {
    this.tutorials.set(config.id, config);
  }

  public startTutorial(tutorialId: string): boolean {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      console.warn(`教程不存在: ${tutorialId}`);
      return false;
    }

    this.currentTutorial = tutorial;
    this.currentStepIndex = 0;
    this.isActive = true;
    this.showStep(0);
    this.emit('tutorialStart', { tutorialId });
    return true;
  }

  public nextStep(): void {
    if (!this.currentTutorial) return;

    this.currentStepIndex++;
    if (this.currentStepIndex >= this.currentTutorial.steps.length) {
      this.completeTutorial();
    } else {
      this.showStep(this.currentStepIndex);
    }
  }

  public previousStep(): void {
    if (!this.currentTutorial || this.currentStepIndex <= 0) return;
    this.currentStepIndex--;
    this.showStep(this.currentStepIndex);
  }

  private showStep(index: number): void {
    if (!this.currentTutorial || !this.tooltipElement) return;

    const step = this.currentTutorial.steps[index];
    if (!step) return;

    this.emit('stepShow', { step, index });

    this.overlayElement!.style.display = 'block';
    this.tooltipElement.style.display = 'block';

    if (step.highlight && (step.targetSelector || step.targetElement)) {
      this.createHighlight(step);
    } else {
      this.hideHighlight();
      this.overlayElement!.style.pointerEvents = 'none';
    }

    this.updateTooltipContent(step);
    this.positionTooltip(step);
  }

  private createHighlight(step: TutorialStep): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
    }

    let targetEl: HTMLElement | null = null;
    
    if (step.targetElement) {
      targetEl = step.targetElement;
    } else if (step.targetSelector) {
      targetEl = document.querySelector(step.targetSelector) as HTMLElement;
    }

    if (!targetEl) {
      console.warn(`找不到目标元素: ${step.targetSelector}`);
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const padding = 8;

    this.highlightElement = document.createElement('div');
    this.highlightElement.id = 'tutorial-highlight';
    this.highlightElement.style.cssText = `
      position: fixed;
      top: ${rect.top - padding}px;
      left: ${rect.left - padding}px;
      width: ${rect.width + padding * 2}px;
      height: ${rect.height + padding * 2}px;
      border: 3px solid #ffd700;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
      z-index: 9999;
      pointer-events: none;
      animation: highlightPulse 1.5s infinite;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes highlightPulse {
        0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 10px #ffd700; }
        50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px #ffd700; }
      }
    `;
    if (!document.querySelector('#tutorial-highlight-style')) {
      style.id = 'tutorial-highlight-style';
      document.head.appendChild(style);
    }

    document.body.appendChild(this.highlightElement);
  }

  private hideHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.remove();
      this.highlightElement = null;
    }
  }

  private updateTooltipContent(step: TutorialStep): void {
    if (!this.tooltipElement) return;

    let html = `
      <div style="margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: bold; color: #ffd700; margin-bottom: 8px;">
          ${step.title}
        </div>
        <div style="font-size: 14px; line-height: 1.6; color: #e0e0e0;">
          ${step.content}
        </div>
      </div>
    `;

    this.tooltipElement.innerHTML = html;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 16px;
      justify-content: ${step.showSkip ? 'space-between' : 'flex-end'};
    `;

    if (step.showSkip) {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = '跳过教程';
      skipBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #aaa;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      `;
      skipBtn.onmouseenter = () => skipBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      skipBtn.onmouseleave = () => skipBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      skipBtn.onclick = () => this.skipTutorial();
      buttonContainer.appendChild(skipBtn);
    }

    if (step.nextButton !== false) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = step.nextButtonText || '下一步';
      nextBtn.style.cssText = `
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        border: none;
        color: #000;
        padding: 8px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: bold;
        transition: all 0.2s;
      `;
      nextBtn.onmouseenter = () => nextBtn.style.transform = 'scale(1.05)';
      nextBtn.onmouseleave = () => nextBtn.style.transform = 'scale(1)';
      nextBtn.onclick = () => this.nextStep();
      buttonContainer.appendChild(nextBtn);
    }

    this.tooltipElement.appendChild(buttonContainer);
  }

  private positionTooltip(step: TutorialStep): void {
    if (!this.tooltipElement) return;

    let targetRect: DOMRect | null = null;

    if (step.targetElement) {
      targetRect = step.targetElement.getBoundingClientRect();
    } else if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector) as HTMLElement;
      if (el) targetRect = el.getBoundingClientRect();
    }

    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const padding = 20;
    const arrowSize = 10;

    let left = 0;
    let top = 0;

    switch (step.position) {
      case 'top':
        if (targetRect) {
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          top = targetRect.top - tooltipRect.height - padding - arrowSize;
        } else {
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          top = window.innerHeight / 4;
        }
        break;
      case 'bottom':
        if (targetRect) {
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          top = targetRect.bottom + padding + arrowSize;
        } else {
          left = window.innerWidth / 2 - tooltipRect.width / 2;
          top = window.innerHeight * 0.75;
        }
        break;
      case 'left':
        if (targetRect) {
          left = targetRect.left - tooltipRect.width - padding - arrowSize;
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        }
        break;
      case 'right':
        if (targetRect) {
          left = targetRect.right + padding + arrowSize;
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        }
        break;
      case 'center':
        left = window.innerWidth / 2 - tooltipRect.width / 2;
        top = window.innerHeight / 2 - tooltipRect.height / 2;
        break;
    }

    left = Math.max(20, Math.min(left, window.innerWidth - tooltipRect.width - 20));
    top = Math.max(20, Math.min(top, window.innerHeight - tooltipRect.height - 20));

    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  public skipTutorial(): void {
    if (!this.currentTutorial) return;

    if (this.currentTutorial.onSkip) {
      this.currentTutorial.onSkip();
    }

    this.emit('tutorialSkip', { tutorialId: this.currentTutorial.id });
    this.hideTutorial();
  }

  private completeTutorial(): void {
    if (!this.currentTutorial) return;

    if (this.currentTutorial.onComplete) {
      this.currentTutorial.onComplete();
    }

    this.emit('tutorialComplete', { tutorialId: this.currentTutorial.id });
    this.hideTutorial();
  }

  public hideTutorial(): void {
    this.isActive = false;
    this.currentTutorial = null;
    this.currentStepIndex = 0;

    if (this.overlayElement) {
      this.overlayElement.style.display = 'none';
    }
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
    this.hideHighlight();
  }

  public isTutorialActive(): boolean {
    return this.isActive;
  }

  public getCurrentTutorial(): TutorialConfig | null {
    return this.currentTutorial;
  }

  public getCurrentStep(): TutorialStep | null {
    if (!this.currentTutorial) return null;
    return this.currentTutorial.steps[this.currentStepIndex] || null;
  }

  public hasCompletedTutorial(tutorialId: string): boolean {
    return localStorage.getItem(`tutorial_${tutorialId}_completed`) === 'true';
  }

  public resetTutorialProgress(): void {
    this.tutorials.forEach((_, id) => {
      localStorage.removeItem(`tutorial_${id}_completed`);
    });
  }

  public dispose(): void {
    this.hideTutorial();
    if (this.overlayElement) {
      this.overlayElement.remove();
    }
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
    if (this.highlightElement) {
      this.highlightElement.remove();
    }
    console.log('🧹 教程系统已销毁');
  }
}
