// 《星野栖所》UI管理器 - HUD显示和信息面板

import { Season, Weather, DayPhase } from '../core/types';
import { EventEmitter } from '../core/EventEmitter';

// SVG图标定义
const SVG_ICONS = {
  weather: {
    [Weather.CLEAR]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    [Weather.CLOUDY]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><circle cx="8" cy="8" r="3"/></svg>`,
    [Weather.OVERCAST]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/><path d="M6 16a4 4 0 0 1 0-8"/></svg>`,
    [Weather.RAIN]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`,
    [Weather.STORM]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/></svg>`,
    [Weather.FOG]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="6" y1="6" x2="18" y2="6"/><line x1="6" y1="18" x2="18" y2="18"/></svg>`,
    [Weather.SNOW]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="2" x2="8" y2="6"/><line x1="12" y1="2" x2="16" y2="6"/><line x1="12" y1="22" x2="8" y2="18"/><line x1="12" y1="22" x2="16" y2="18"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`,
    [Weather.STAR_RAIN]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="16" x2="8" y2="19"/></svg>`,
    [Weather.AURORA]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12C2 12 5 6 12 6C19 6 22 12 22 12"/><path d="M2 12C2 12 5 18 12 18C19 18 22 12 22 12"/><circle cx="12" cy="12" r="2"/></svg>`
  },
  season: {
    [Season.SPRING]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12z"/><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M12 12v4"/></svg>`,
    [Season.SUMMER]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    [Season.AUTUMN]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V8"/><path d="M5 12c0-5 3-8 7-10 4 2 7 5 7 10"/></svg>`,
    [Season.WINTER]: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><line x1="12" y1="2" x2="8" y2="6"/><line x1="12" y1="2" x2="16" y2="6"/><line x1="12" y1="22" x2="8" y2="18"/><line x1="12" y1="22" x2="16" y2="18"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`
  },
  action: {
    plant: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/></svg>`,
    build: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 21V11h6v10"/><path d="M2 7l10-5 10 5"/></svg>`,
    beast: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c4-4 8-7.5 8-12a8 8 0 1 0-16 0c0 4.5 4 8 8 12z"/><circle cx="12" cy="10" r="3"/></svg>`,
    menu: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`
  }
};

export class UIManager extends EventEmitter {
  private timeDisplay: HTMLElement | null = null;
  private weatherDisplay: HTMLElement | null = null;
  private seasonDisplay: HTMLElement | null = null;
  private fpsDisplay: HTMLElement | null = null;
  private phaseDisplay: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private notificationContainer: HTMLElement | null = null;
  private cropPanel: HTMLElement | null = null;
  private buildPanel: HTMLElement | null = null;
  private beastPanel: HTMLElement | null = null;

  private actionCallbacks: Record<string, () => void> = {
    plant: () => this.showCropPanel(),
    build: () => this.showBuildPanel(),
    beast: () => this.showBeastPanel(),
    menu: () => this.showMainMenu()
  };

  private cropSelectCallback: ((cropId: string) => void) | null = null;
  private buildingSelectCallback: ((buildingId: string) => void) | null = null;
  private toolSelectCallback: ((toolId: string) => void) | null = null;
  private beastSelectCallback: ((beastId: string) => void) | null = null;
  private menuCallback: Record<string, () => void> = {};

  public setCropSelectCallback(callback: (cropId: string) => void): void {
    this.cropSelectCallback = callback;
  }

  public setBuildingSelectCallback(callback: (buildingId: string) => void): void {
    this.buildingSelectCallback = callback;
  }

  public setToolSelectCallback(callback: (toolId: string) => void): void {
    this.toolSelectCallback = callback;
  }

  public setBeastSelectCallback(callback: (beastId: string) => void): void {
    this.beastSelectCallback = callback;
  }

  public setMenuCallback(action: string, callback: () => void): void {
    this.menuCallback[action] = callback;
  }

  public setActionCallback(actionId: string, callback: () => void): void {
    this.actionCallbacks[actionId] = callback;
  }

  constructor() {
    super();
    this.initializeElements();
    this.createNotificationSystem();
  }

  private initializeElements(): void {
    this.timeDisplay = document.getElementById('time-display');
    this.weatherDisplay = document.getElementById('weather-display');
    this.seasonDisplay = document.getElementById('season-display');
    
    this.createFPSDisplay();
    this.createPhaseDisplay();
    this.createTooltip();
  }

  private createFPSDisplay(): void {
    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.id = 'fps-display';
    this.fpsDisplay.className = 'hud-panel fps-panel';
    this.fpsDisplay.textContent = '60 FPS';
    document.body.appendChild(this.fpsDisplay);
  }

  private createPhaseDisplay(): void {
    this.phaseDisplay = document.createElement('div');
    this.phaseDisplay.id = 'phase-display';
    this.phaseDisplay.className = 'hud-panel phase-panel';
    this.phaseDisplay.textContent = '正午';
    document.body.appendChild(this.phaseDisplay);
  }

  private createTooltip(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.id = 'tooltip';
    this.tooltipElement.className = 'tooltip';
    document.body.appendChild(this.tooltipElement);
  }

  private createNotificationSystem(): void {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'notification-container';
    this.notificationContainer.className = 'notification-container';
    document.body.appendChild(this.notificationContainer);

    const actionBar = document.createElement('div');
    actionBar.id = 'action-bar';
    actionBar.className = 'action-bar';

    const actions = [
      { id: 'plant', icon: SVG_ICONS.action.plant, label: '种植' },
      { id: 'build', icon: SVG_ICONS.action.build, label: '建造' },
      { id: 'beast', icon: SVG_ICONS.action.beast, label: '异兽' },
      { id: 'menu', icon: SVG_ICONS.action.menu, label: '菜单' }
    ];

    actions.forEach(action => {
      const button = document.createElement('button');
      button.id = `action-${action.id}`;
      button.className = 'action-button';
      button.innerHTML = `
        <div class="action-icon">${action.icon}</div>
        <span class="action-label">${action.label}</span>
      `;
      
      button.addEventListener('click', () => {
        const callback = this.actionCallbacks[action.id];
        if (callback) callback();
      });
      
      actionBar.appendChild(button);
    });

    document.body.appendChild(actionBar);

    const controlsHint = document.createElement('div');
    controlsHint.id = 'controls-hint';
    controlsHint.className = 'controls-hint';
    controlsHint.innerHTML = `
      <div class="controls-content">
        <div class="control-item"><span class="key">WASD</span> 移动视角</div>
        <div class="control-item"><span class="key">鼠标右键</span> 旋转视角</div>
        <div class="control-item"><span class="key">滚轮</span> 缩放</div>
        <div class="control-item"><span class="key">P</span> 保存 <span class="key">L</span> 加载</div>
      </div>
    `;
    document.body.appendChild(controlsHint);
  }

  public updateTimeDisplay(data: any): void {
    if (this.timeDisplay) {
      this.timeDisplay.textContent = data.formattedTime;
    }
  }

  public updateWeatherDisplay(weather: Weather): void {
    if (this.weatherDisplay) {
      const weatherNames: Record<Weather, string> = {
        [Weather.CLEAR]: '晴朗',
        [Weather.CLOUDY]: '多云',
        [Weather.OVERCAST]: '阴天',
        [Weather.RAIN]: '细雨',
        [Weather.STORM]: '暴雨',
        [Weather.FOG]: '雾气',
        [Weather.SNOW]: '落雪',
        [Weather.STAR_RAIN]: '星雨',
        [Weather.AURORA]: '极光'
      };
      const weatherColors: Record<Weather, string> = {
        [Weather.CLEAR]: '#FFD700',
        [Weather.CLOUDY]: '#E0E0E0',
        [Weather.OVERCAST]: '#A0A0A0',
        [Weather.RAIN]: '#4682B4',
        [Weather.STORM]: '#5555AA',
        [Weather.FOG]: '#C0C0C0',
        [Weather.SNOW]: '#E0FFFF',
        [Weather.STAR_RAIN]: '#9370DB',
        [Weather.AURORA]: '#00FF7F'
      };
      
      this.weatherDisplay.innerHTML = `
        <div class="weather-icon">${SVG_ICONS.weather[weather]}</div>
        <span class="weather-name" style="color: ${weatherColors[weather]}">${weatherNames[weather]}</span>
      `;
    }
  }

  public updateSeasonDisplay(season: Season): void {
    if (this.seasonDisplay) {
      const seasonNames: Record<Season, string> = {
        [Season.SPRING]: '春季',
        [Season.SUMMER]: '夏季',
        [Season.AUTUMN]: '秋季',
        [Season.WINTER]: '冬季'
      };
      const seasonColors: Record<Season, string> = {
        [Season.SPRING]: '#FFB6C1',
        [Season.SUMMER]: '#FFD700',
        [Season.AUTUMN]: '#FF8C00',
        [Season.WINTER]: '#B0C4DE'
      };
      
      this.seasonDisplay.innerHTML = `
        <div class="season-icon">${SVG_ICONS.season[season]}</div>
        <span class="season-name" style="color: ${seasonColors[season]}">${seasonNames[season]}</span>
      `;
    }
  }

  public updateDayPhaseDisplay(phase: DayPhase): void {
    if (this.phaseDisplay) {
      const phaseNames: Record<DayPhase, string> = {
        [DayPhase.DAWN]: '清晨',
        [DayPhase.MORNING]: '上午',
        [DayPhase.NOON]: '正午',
        [DayPhase.AFTERNOON]: '下午',
        [DayPhase.EVENING]: '傍晚',
        [DayPhase.DUSK]: '黄昏',
        [DayPhase.NIGHT]: '深夜'
      };
      this.phaseDisplay.textContent = phaseNames[phase];
    }
  }

  public updateFPS(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `${fps} FPS`;
      this.fpsDisplay.className = `hud-panel fps-panel ${fps >= 50 ? 'fps-good' : fps >= 30 ? 'fps-warn' : 'fps-bad'}`;
    }
  }

  public showTooltip(text: string, x: number, y: number): void {
    if (this.tooltipElement) {
      this.tooltipElement.textContent = text;
      this.tooltipElement.style.left = `${x + 10}px`;
      this.tooltipElement.style.top = `${y + 10}px`;
      this.tooltipElement.classList.add('tooltip-visible');
    }
  }

  public hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('tooltip-visible');
    }
  }

  public showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-icon">${this.getNotificationIcon(type)}</div>
      <div class="notification-content">${message}</div>
      <button class="notification-close">&times;</button>
    `;
    
    this.notificationContainer.appendChild(notification);
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', () => {
      notification.classList.add('notification-exit');
      setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('notification-exit');
        setTimeout(() => notification.remove(), 300);
      }
    }, 3000);
  }

  private getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    return icons[type] || icons.info;
  }

  public showCropReadyNotification(cropName: string): void {
    this.showNotification(`${cropName} 已成熟，可以收获了！`, 'success');
  }

  public showWeatherNotification(weather: Weather): void {
    const messages: Record<Weather, string> = {
      [Weather.CLEAR]: '天空放晴了~',
      [Weather.CLOUDY]: '天空飘来几朵白云',
      [Weather.OVERCAST]: '天色有些阴沉',
      [Weather.RAIN]: '开始下雨了，作物会加速生长',
      [Weather.STORM]: '暴雨来袭！请注意安全',
      [Weather.FOG]: '起了淡淡的雾气',
      [Weather.SNOW]: '雪花飘落，冬日景象',
      [Weather.STAR_RAIN]: '星雨降临！这是稀有天气！',
      [Weather.AURORA]: '极光出现！绝佳的收获时机！'
    };
    this.showNotification(messages[weather], weather === Weather.STAR_RAIN || weather === Weather.AURORA ? 'success' : 'info');
  }

  public showSeasonNotification(season: Season): void {
    const messages: Record<Season, string> = {
      [Season.SPRING]: '春天来了，万物复苏',
      [Season.SUMMER]: '炎炎夏日，注意防暑',
      [Season.AUTUMN]: '秋风送爽，硕果累累',
      [Season.WINTER]: '冬雪降临，银装素裹'
    };
    this.showNotification(messages[season], 'info');
  }

  public showBeastNotification(beastName: string, action: string): void {
    this.showNotification(`${beastName} ${action}`, 'info');
  }

  public toggleInventory(): void {
    const existing = document.getElementById('inventory-panel');
    if (existing) {
      existing.remove();
      return;
    }
    this.showInventoryPanel();
  }

  private showInventoryPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'inventory-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      fontSize: '14px',
      zIndex: '1000',
      minWidth: '450px',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    });

    const items = this.getInventoryItems();
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">🎒</span>
          <span style="font-size:20px;font-weight:bold;">背包</span>
          <span style="font-size:13px;opacity:0.6;">(${totalCount}/100)</span>
        </div>
        <button id="close-inventory" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;">✕</button>
      </div>
      ${items.length > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:12px;">
          ${items.map(item => `
            <div style="
              background:rgba(255,255,255,0.08);
              padding:12px;
              border-radius:10px;
              text-align:center;
              cursor:pointer;
              transition:all 0.2s;
              border:1px solid transparent;
            " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.borderColor='rgba(255,200,100,0.5)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='transparent';">
              <div style="font-size:28px;margin-bottom:4px;">${item.emoji}</div>
              <div style="font-size:12px;font-weight:bold;margin-bottom:2px;">${item.name}</div>
              <div style="font-size:11px;opacity:0.7;">x${item.count}</div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:40px 20px;opacity:0.6;">
          <div style="font-size:48px;margin-bottom:10px;">📦</div>
          <div>背包空空如也</div>
          <div style="font-size:12px;margin-top:8px;">收获作物后可在此查看</div>
        </div>
      `}
    `;

    document.body.appendChild(panel);

    document.getElementById('close-inventory')?.addEventListener('click', () => panel.remove());
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  private getInventoryItems(): Array<{ id: string; name: string; emoji: string; count: number; category: string }> {
    return [
      { id: 'wheat_grain', name: '小麦粒', emoji: '🌾', count: 5, category: 'crop' },
      { id: 'tomato', name: '番茄', emoji: '🍅', count: 3, category: 'crop' },
      { id: 'carrot', name: '胡萝卜', emoji: '🥕', count: 2, category: 'crop' },
      { id: 'star_petal', name: '星绒花瓣', emoji: '🌸', count: 1, category: 'special' },
      { id: 'moon_crystal', name: '月华晶', emoji: '💎', count: 0, category: 'special' }
    ].filter(item => item.count > 0);
  }

  public getInventoryItemCount(): number {
    return this.getInventoryItems().reduce((sum, item) => sum + item.count, 0);
  }

  private showAchievementsPanel(): void {
    const existing = document.getElementById('achievements-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'achievements-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      fontSize: '14px',
      zIndex: '1000',
      minWidth: '500px',
      maxWidth: '700px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    });

    const achievements = this.getAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">🏆</span>
          <span style="font-size:20px;font-weight:bold;">成就</span>
          <span style="font-size:13px;opacity:0.6;">(${unlockedCount}/${achievements.length})</span>
        </div>
        <button id="close-achievements" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${achievements.map(achievement => `
          <div style="
            background:${achievement.unlocked ? 'rgba(255,200,100,0.15)' : 'rgba(255,255,255,0.05)'};
            padding:16px;
            border-radius:12px;
            display:flex;
            align-items:center;
            gap:16px;
            border:1px solid ${achievement.unlocked ? 'rgba(255,200,100,0.3)' : 'transparent'};
            opacity:${achievement.unlocked ? '1' : '0.6'};
          ">
            <div style="
              width:48px;
              height:48px;
              border-radius:50%;
              background:${achievement.unlocked ? 'linear-gradient(135deg,#FFD700,#FFA500)' : 'rgba(100,100,100,0.3)'};
              display:flex;
              align-items:center;
              justify-content:center;
              font-size:24px;
            ">${achievement.unlocked ? '✓' : achievement.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:bold;margin-bottom:4px;">${achievement.name}</div>
              <div style="font-size:12px;opacity:0.7;">${achievement.description}</div>
              ${achievement.progress !== undefined ? `
                <div style="margin-top:8px;">
                  <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
                    <span>进度</span>
                    <span>${achievement.progress}/${achievement.target || 1}</span>
                  </div>
                  <div style="background:rgba(255,255,255,0.1);height:4px;border-radius:2px;overflow:hidden;">
                    <div style="width:${(achievement.progress / (achievement.target || 1)) * 100}%;height:100%;background:${achievement.unlocked ? '#FFD700' : '#4CAF50'};transition:width 0.3s;"></div>
                  </div>
                </div>
              ` : ''}
            </div>
            ${achievement.unlocked ? '<span style="color:#FFD700;font-size:12px;">已完成</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('close-achievements')?.addEventListener('click', () => panel.remove());
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  private getAchievements(): Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    progress?: number;
    target?: number;
  }> {
    return [
      {
        id: 'first_plant',
        name: '初尝耕耘',
        description: '种植你的第一株作物',
        icon: '🌱',
        unlocked: true,
        progress: 1,
        target: 1
      },
      {
        id: 'harvest_10',
        name: '丰收时节',
        description: '累计收获10次作物',
        icon: '🌾',
        unlocked: true,
        progress: 12,
        target: 10
      },
      {
        id: 'build_first',
        name: '筑梦之始',
        description: '建造第一个建筑',
        icon: '🏗️',
        unlocked: true,
        progress: 1,
        target: 1
      },
      {
        id: 'beast_friend',
        name: '灵兽之友',
        description: '与一只异兽建立友谊',
        icon: '🐾',
        unlocked: false,
        progress: 0,
        target: 1
      },
      {
        id: 'all_crops',
        name: '五谷丰登',
        description: '收获所有类型的作物',
        icon: '🌻',
        unlocked: false,
        progress: 4,
        target: 6
      },
      {
        id: 'explorer',
        name: '星野探索者',
        description: '探索地图的每个角落',
        icon: '🗺️',
        unlocked: false,
        progress: 45,
        target: 100
      },
      {
        id: 'weather_watcher',
        name: '观星者',
        description: '见证所有特殊天气',
        icon: '🌟',
        unlocked: false,
        progress: 3,
        target: 9
      },
      {
        id: 'master_farmer',
        name: '种植大师',
        description: '单季收获100个作物',
        icon: '👨‍🌾',
        unlocked: false,
        progress: 23,
        target: 100
      }
    ];
  }

  public showCropPanel(): void {
    const existing = document.getElementById('crop-panel');
    if (existing) {
      existing.remove();
      this.cropPanel = null;
      return;
    }

    this.cropPanel = document.createElement('div');
    this.cropPanel.id = 'crop-panel';
    Object.assign(this.cropPanel.style, {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20, 25, 35, 0.95)',
      color: '#fff',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '13px',
      zIndex: '999',
      minWidth: '400px',
      maxWidth: '90vw',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    });

    this.cropPanel.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:12px;gap:8px;">
        <span style="font-size:18px;">🌱</span>
        <span style="font-size:16px;font-weight:bold;">选择作物种植</span>
        <span style="margin-left:auto;font-size:12px;opacity:0.7;">点击选择后再点击地面种植</span>
      </div>
      <div id="crop-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
      <button id="close-crop-panel" style="margin-top:12px;padding:8px 16px;background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;cursor:pointer;width:100%;">关闭</button>
    `;
    document.body.appendChild(this.cropPanel);

    const closeBtn = document.getElementById('close-crop-panel');
    closeBtn?.addEventListener('click', () => {
      this.cropPanel?.remove();
      this.cropPanel = null;
    });

    this.updateCropList();
  }

  public updateCropList(): void {
    const cropList = document.getElementById('crop-list');
    if (!cropList) return;

    const crops = this.getAvailableCrops();
    
    const seasonNames: Record<string, string> = {
      'SPRING': '🌸',
      'SUMMER': '☀️',
      'AUTUMN': '🍂',
      'WINTER': '❄️'
    };
    const currentSeason = (this as any).getCurrentSeason?.() || 'SPRING';

    if (crops.length === 0) {
      cropList.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.7;">当前季节没有可种植的作物</div>';
      return;
    }

    cropList.innerHTML = crops.map(crop => {
      const seasonIcons = crop.seasons.map((s: string) => seasonNames[s] || s).join('');
      const isCurrentSeason = crop.seasons.includes(currentSeason);
      
      return `
        <div class="crop-item" data-crop-id="${crop.id}" style="
          background: rgba(255,255,255,0.08);
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          min-width: 120px;
          text-align: center;
          transition: all 0.2s;
          border: 1px solid ${isCurrentSeason ? 'rgba(100,200,100,0.5)' : 'transparent'};
        " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.borderColor='rgba(100,200,100,0.8)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='${isCurrentSeason ? 'rgba(100,200,100,0.5)' : 'transparent'}';">
          <div style="font-size:24px;margin-bottom:4px;">${this.getCropEmoji(crop.id)}</div>
          <div style="font-weight:bold;margin-bottom:4px;">${crop.name}</div>
          <div style="font-size:11px;opacity:0.7;">
            生长时间: ${crop.growthTime}分钟
          </div>
          <div style="font-size:10px;margin-top:4px;color:#aaa;">
            适合: ${seasonIcons}
          </div>
          <div style="font-size:11px;color:#90EE90;margin-top:4px;">
            收获: ${crop.harvestYield.map((y: { itemId: string; amount: number }) => `${y.itemId} x${y.amount}`).join(', ')}
          </div>
        </div>
      `;
    }).join('');

    cropList.querySelectorAll('.crop-item').forEach(item => {
      item.addEventListener('click', () => {
        const cropId = item.getAttribute('data-crop-id');
        if (cropId && this.cropSelectCallback) {
          this.cropSelectCallback(cropId);
          this.cropPanel?.remove();
          this.cropPanel = null;
        }
      });
    });
  }

  private getCropEmoji(cropId: string): string {
    const emojis: Record<string, string> = {
      wheat: '🌾',
      tomato: '🍅',
      carrot: '🥕',
      cabbage: '🥬',
      star_flower: '🌸',
      moon_fruit: '🌙'
    };
    return emojis[cropId] || '🌱';
  }

  private getAvailableCrops(): any[] {
    return [
      { id: 'wheat', name: '小麦', growthTime: 60, harvestYield: [{ itemId: 'wheat_grain', amount: 3 }] },
      { id: 'tomato', name: '番茄', growthTime: 45, harvestYield: [{ itemId: 'tomato', amount: 4 }] },
      { id: 'carrot', name: '胡萝卜', growthTime: 40, harvestYield: [{ itemId: 'carrot', amount: 3 }] },
      { id: 'cabbage', name: '卷心菜', growthTime: 50, harvestYield: [{ itemId: 'cabbage', amount: 2 }] },
      { id: 'star_flower', name: '星绒花', growthTime: 90, harvestYield: [{ itemId: 'star_petal', amount: 2 }] },
      { id: 'moon_fruit', name: '月华果', growthTime: 120, harvestYield: [{ itemId: 'moon_crystal', amount: 3 }] }
    ];
  }

  public showBuildPanel(): void {
    const existing = document.getElementById('build-panel');
    if (existing) {
      existing.remove();
      this.buildPanel = null;
      return;
    }

    this.buildPanel = document.createElement('div');
    this.buildPanel.id = 'build-panel';
    Object.assign(this.buildPanel.style, {
      position: 'fixed',
      top: '50%',
      left: '20px',
      transform: 'translateY(-50%)',
      background: 'rgba(20, 25, 35, 0.95)',
      color: '#fff',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '13px',
      zIndex: '999',
      width: '280px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    });

    this.buildPanel.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:12px;gap:8px;">
        <span style="font-size:18px;">🏗️</span>
        <span style="font-size:16px;font-weight:bold;">建造模式</span>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">建筑</div>
        <div id="building-list" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;">
        <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">地形工具</div>
        <div id="tool-list" style="display:flex;flex-direction:column;gap:6px;"></div>
      </div>
      <div style="margin-top:12px;font-size:11px;opacity:0.6;text-align:center;">
        点击选择后再点击地面放置<br>按 B 或 ESC 退出建造模式
      </div>
      <button id="exit-build-mode" style="margin-top:12px;padding:10px;background:rgba(255,100,100,0.3);border:none;border-radius:8px;color:#fff;cursor:pointer;width:100%;">退出建造模式</button>
    `;
    document.body.appendChild(this.buildPanel);

    const exitBtn = document.getElementById('exit-build-mode');
    exitBtn?.addEventListener('click', () => {
      this.emit('exitBuildMode');
    });

    this.updateBuildingList();
    this.updateToolList();
  }

  public updateBuildingList(): void {
    const buildingList = document.getElementById('building-list');
    if (!buildingList) return;

    const buildings = this.getBuildingDefs();
    buildingList.innerHTML = buildings.map(b => `
      <div class="building-item" data-building-id="${b.id}" style="
        background: rgba(255,255,255,0.08);
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        display:flex;
        align-items:center;
        gap:10px;
        transition: all 0.2s;
        border: 1px solid transparent;
      " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.borderColor='rgba(100,180,255,0.5)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='transparent';">
        <span style="font-size:20px;">${this.getBuildingEmoji(b.type)}</span>
        <div>
          <div style="font-weight:bold;font-size:13px;">${b.name}</div>
          <div style="font-size:10px;opacity:0.7;">${b.description}</div>
        </div>
      </div>
    `).join('');

    buildingList.querySelectorAll('.building-item').forEach(item => {
      item.addEventListener('click', () => {
        const buildingId = item.getAttribute('data-building-id');
        if (buildingId && this.buildingSelectCallback) {
          this.buildingSelectCallback(buildingId);
          this.showNotification(`已选择建筑: ${buildings.find(b => b.id === buildingId)?.name}`, 'success');
        }
      });
    });
  }

  public updateToolList(): void {
    const toolList = document.getElementById('tool-list');
    if (!toolList) return;

    const tools = this.getTerrainTools();
    toolList.innerHTML = tools.map(t => `
      <div class="tool-item" data-tool-id="${t.id}" style="
        background: rgba(255,255,255,0.08);
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        display:flex;
        align-items:center;
        gap:10px;
        transition: all 0.2s;
        border: 1px solid transparent;
      " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.borderColor='rgba(255,180,100,0.5)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='transparent';">
        <span style="font-size:20px;">${this.getToolEmoji(t.type)}</span>
        <div>
          <div style="font-weight:bold;font-size:13px;">${t.name}</div>
          <div style="font-size:10px;opacity:0.7;">${t.description}</div>
        </div>
      </div>
    `).join('');

    toolList.querySelectorAll('.tool-item').forEach(item => {
      item.addEventListener('click', () => {
        const toolId = item.getAttribute('data-tool-id');
        if (toolId && this.toolSelectCallback) {
          this.toolSelectCallback(toolId);
          this.showNotification(`已选择工具: ${tools.find(t => t.id === toolId)?.name}`, 'success');
        }
      });
    });
  }

  private getBuildingEmoji(type: string): string {
    const emojis: Record<string, string> = {
      DECORATION: '🏠',
      BASIC: '📦',
      SPECIAL: '✨'
    };
    return emojis[type] || '🏗️';
  }

  private getToolEmoji(type: string): string {
    const emojis: Record<string, string> = {
      FILL: '⛰️',
      DIG: '⛏️',
      WATER: '💧',
      PAVE: '🧱'
    };
    return emojis[type] || '🔧';
  }

  private getBuildingDefs(): any[] {
    return [
      { id: 'windmill', name: '风车', type: 'DECORATION', description: '一座小型风车，随风转动' },
      { id: 'garden_bench', name: '花园长椅', type: 'DECORATION', description: '木质长椅，可以休息的地方' },
      { id: 'stone_lamp', name: '石灯笼', type: 'DECORATION', description: '柔和的石灯，夜晚提供温暖光线' },
      { id: 'flower_bed', name: '花坛', type: 'DECORATION', description: '种植各种花卉的花坛' },
      { id: 'storage_cabinet', name: '收纳柜', type: 'BASIC', description: '增加背包容量上限' },
      { id: 'beast_house', name: '兽兽小屋', type: 'SPECIAL', description: '给兽兽们的小屋' },
      { id: 'greenhouse', name: '温室', type: 'SPECIAL', description: '加速附近农作物生长' },
      { id: 'fountain', name: '许愿池', type: 'SPECIAL', description: '美丽的喷泉，偶尔出现星雨' }
    ];
  }

  private getTerrainTools(): any[] {
    return [
      { id: 'fill_tool', name: '填土', type: 'FILL', description: '填高地形' },
      { id: 'dig_tool', name: '挖掘', type: 'DIG', description: '挖低地形' },
      { id: 'water_tool', name: '引水', type: 'WATER', description: '创造小型水池' },
      { id: 'pave_tool', name: '铺路', type: 'PAVE', description: '铺设石板路' }
    ];
  }

  public showCropInfo(crop: any): void {
    const existing = document.getElementById('crop-info');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'crop-info';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      background: 'rgba(20, 25, 35, 0.95)',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '13px',
      zIndex: '998',
      minWidth: '200px',
      border: '1px solid rgba(255,255,255,0.1)'
    });

    const remainingMinutes = Math.ceil((1 - crop.growthProgress) * crop.data.growthTime);
    const isReady = crop.isHarvestable;

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:20px;">${this.getCropEmoji(crop.data.id)}</span>
        <span style="font-weight:bold;">${crop.data.name}</span>
        ${isReady ? '<span style="background:#4CAF50;padding:2px 8px;border-radius:4px;font-size:11px;">可收获!</span>' : ''}
      </div>
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="opacity:0.7;">生长进度</span>
          <span>${Math.round(crop.growthProgress * 100)}%</span>
        </div>
        <div style="background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
          <div style="width:${crop.growthProgress * 100}%;height:100%;background:${isReady ? '#4CAF50' : '#2196F3'};transition:width 0.3s;"></div>
        </div>
      </div>
      ${!isReady ? `<div style="font-size:12px;opacity:0.7;">预计剩余: ${remainingMinutes} 分钟</div>` : ''}
      <div style="margin-top:8px;font-size:11px;opacity:0.6;">点击作物即可收获</div>
    `;
    document.body.appendChild(panel);

    setTimeout(() => {
      panel.style.opacity = '0';
      panel.style.transition = 'opacity 0.3s';
      setTimeout(() => panel.remove(), 300);
    }, 4000);
  }

  public hideBuildPanel(): void {
    const existing = document.getElementById('build-panel');
    if (existing) {
      existing.remove();
      this.buildPanel = null;
    }
  }

  public showBeastPanel(): void {
    const existing = document.getElementById('beast-panel');
    if (existing) {
      existing.remove();
      this.beastPanel = null;
      return;
    }

    this.beastPanel = document.createElement('div');
    this.beastPanel.id = 'beast-panel';
    Object.assign(this.beastPanel.style, {
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      background: 'rgba(20, 25, 35, 0.95)',
      color: '#fff',
      padding: '16px',
      borderRadius: '16px',
      fontSize: '13px',
      zIndex: '999',
      width: '320px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    });

    this.beastPanel.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:16px;gap:8px;">
        <span style="font-size:20px;">🐾</span>
        <span style="font-size:18px;font-weight:bold;">我的异兽</span>
      </div>
      <div id="beast-list" style="display:flex;flex-direction:column;gap:10px;"></div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);">
        <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">喂食异兽提升亲密度</div>
        <div id="beast-food-list" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
      </div>
    `;
    document.body.appendChild(this.beastPanel);

    this.updateBeastList();
    this.updateBeastFoodList();
  }

  public updateBeastList(): void {
    const beastList = document.getElementById('beast-list');
    if (!beastList) return;

    const beasts = this.getBeastConfigs();
    if (beasts.length === 0) {
      beastList.innerHTML = '<div style="padding:20px;text-align:center;opacity:0.7;">还没有召唤任何异兽</div>';
      return;
    }

    beastList.innerHTML = beasts.map(beast => {
      const intimacyPercent = Math.round((beast.intimacy / beast.maxIntimacy) * 100);
      const statusText = this.getBeastStatusText(beast.behaviorTree);
      return `
        <div class="beast-item" data-beast-id="${beast.id}" style="
          background: rgba(255,255,255,0.08);
          padding: 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        " onmouseover="this.style.background='rgba(255,255,255,0.15)';this.style.borderColor='rgba(200,150,255,0.5)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='transparent';">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:32px;">${this.getBeastEmoji(beast.type)}</span>
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="font-weight:bold;font-size:15px;">${beast.name}</span>
                <span style="font-size:11px;opacity:0.6;">Lv.${Math.floor(beast.intimacy / 200) + 1}</span>
              </div>
              <div style="font-size:11px;opacity:0.7;margin-bottom:6px;">${beast.description}</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:10px;color:#FFB6C1;">❤ ${intimacyPercent}%</span>
                <span style="font-size:10px;color:#87CEEB;">${statusText}</span>
              </div>
              <div style="background:rgba(255,255,255,0.1);height:4px;border-radius:2px;margin-top:6px;overflow:hidden;">
                <div style="width:${intimacyPercent}%;height:100%;background:linear-gradient(90deg,#FF6B6B,#FFB6C1);transition:width 0.3s;"></div>
              </div>
            </div>
          </div>
          ${beast.abilities.length > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.1);">
              <div style="font-size:11px;opacity:0.6;margin-bottom:6px;">能力</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${beast.abilities.map((ability: { name: string; unlockIntimacy: number }) => `
                  <span style="
                    font-size:10px;
                    padding:3px 8px;
                    background:${ability.unlockIntimacy <= beast.intimacy ? 'rgba(100,200,100,0.3)' : 'rgba(100,100,100,0.3)'};
                    border-radius:4px;
                  ">${ability.name}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    beastList.querySelectorAll('.beast-item').forEach(item => {
      item.addEventListener('click', () => {
        const beastId = item.getAttribute('data-beast-id');
        if (beastId && this.beastSelectCallback) {
          this.beastSelectCallback(beastId);
          this.showNotification(`与 ${beasts.find(b => b.id === beastId)?.name} 互动中...`, 'success');
        }
      });
    });
  }

  public updateBeastFoodList(): void {
    const foodList = document.getElementById('beast-food-list');
    if (!foodList) return;

    const foods = this.getBeastFoods();
    foodList.innerHTML = foods.map(food => `
      <div class="food-item" data-food-id="${food.id}" style="
        background: rgba(255,255,255,0.08);
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size:12px;
        display:flex;
        align-items:center;
        gap:6px;
        transition: all 0.2s;
        border: 1px solid transparent;
      " onmouseover="this.style.background='rgba(255,200,150,0.2)';this.style.borderColor='rgba(255,180,100,0.5)';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='transparent';" onclick="alert('选择要喂食的异兽后，点击这里喂食')">
        <span>${food.emoji}</span>
        <span>${food.name}</span>
      </div>
    `).join('');
  }

  private getBeastEmoji(type: string): string {
    const emojis: Record<string, string> = {
      STAR_BUNNY: '🐰',
      CLOUD_BIRD: '🐦',
      FOG_DEER: '🦌',
      CRYSTAL_DOLPHIN: '🐬',
      STAR_FOX: '🦊'
    };
    return emojis[type] || '🐾';
  }

  private getBeastStatusText(behaviorTree: string): string {
    const statusTexts: Record<string, string> = {
      star_bunny: '采集中',
      cloud_bird: '飞行中',
      fog_deer: '巡视中',
      crystal_dolphin: '游泳中',
      star_fox: '休憩中'
    };
    return statusTexts[behaviorTree] || '空闲';
  }

  private getBeastConfigs(): any[] {
    return [
      {
        id: 'star_bunny',
        name: '星绒兔',
        type: 'STAR_BUNNY',
        description: '毛茸茸的小兔子，会自动巡逻农田',
        intimacy: 250,
        maxIntimacy: 1000,
        behaviorTree: 'star_bunny',
        abilities: [
          { name: '自动采集', unlockIntimacy: 0 },
          { name: '自动播种', unlockIntimacy: 500 }
        ]
      },
      {
        id: 'cloud_bird',
        name: '云羽雀',
        type: 'CLOUD_BIRD',
        description: '高空飞行的鸟类，会拾取浮空星材',
        intimacy: 0,
        maxIntimacy: 1000,
        behaviorTree: 'cloud_bird',
        abilities: [
          { name: '高空探索', unlockIntimacy: 0 }
        ]
      },
      {
        id: 'fog_deer',
        name: '雾灵鹿',
        type: 'FOG_DEER',
        description: '优雅生物，范围内作物产量+20%',
        intimacy: 0,
        maxIntimacy: 1000,
        behaviorTree: 'fog_deer',
        abilities: [
          { name: '产量增益', unlockIntimacy: 0 }
        ]
      },
      {
        id: 'crystal_dolphin',
        name: '晶溪豚',
        type: 'CRYSTAL_DOLPHIN',
        description: '水域生物，净化水域提升品质',
        intimacy: 0,
        maxIntimacy: 1000,
        behaviorTree: 'crystal_dolphin',
        abilities: [
          { name: '水域净化', unlockIntimacy: 0 }
        ]
      },
      {
        id: 'star_fox',
        name: '星巡狐',
        type: 'STAR_FOX',
        description: '夜间激活，探索隐藏宝箱',
        intimacy: 0,
        maxIntimacy: 1000,
        behaviorTree: 'star_fox',
        abilities: [
          { name: '夜间探索', unlockIntimacy: 0 }
        ]
      }
    ];
  }

  private getBeastFoods(): any[] {
    return [
      { id: 'bunny_treat', name: '星兔点心', emoji: '🥕' },
      { id: 'bird_seed_mix', name: '云雀混合粮', emoji: '🌾' },
      { id: 'deer_moss', name: '雾鹿苔藓', emoji: '🌿' },
      { id: 'fish_treat', name: '晶溪鱼干', emoji: '🐟' },
      { id: 'berry_mix', name: '星果拼盘', emoji: '🍇' }
    ];
  }

  public showBeastInfo(beast: any): void {
    const existing = document.getElementById('beast-info');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'beast-info';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '100px',
      left: '20px',
      background: 'rgba(20, 25, 35, 0.95)',
      color: '#fff',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '13px',
      zIndex: '998',
      minWidth: '220px',
      border: '1px solid rgba(255,255,255,0.1)'
    });

    const intimacyPercent = Math.round((beast.intimacy / beast.maxIntimacy) * 100);

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:28px;">${this.getBeastEmoji(beast.type)}</span>
        <div>
          <div style="font-weight:bold;font-size:15px;">${beast.name}</div>
          <div style="font-size:11px;opacity:0.6;">等级 ${Math.floor(beast.intimacy / 200) + 1}</div>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="opacity:0.7;">亲密度</span>
          <span style="color:#FFB6C1;">${beast.intimacy}/${beast.maxIntimacy}</span>
        </div>
        <div style="background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
          <div style="width:${intimacyPercent}%;height:100%;background:linear-gradient(90deg,#FF6B6B,#FFB6C1);transition:width 0.3s;"></div>
        </div>
      </div>
      <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">${beast.description}</div>
      ${beast.currentTask ? `
        <div style="font-size:11px;padding:6px 10px;background:rgba(135,206,235,0.2);border-radius:6px;">
          当前状态: <span style="color:#87CEEB;">${this.getBeastStatusText(beast.behaviorTree || beast.id)}</span>
        </div>
      ` : ''}
    `;
    document.body.appendChild(panel);

    setTimeout(() => {
      panel.style.opacity = '0';
      panel.style.transition = 'opacity 0.3s';
      setTimeout(() => panel.remove(), 300);
    }, 4000);
  }

  public hideBeastPanel(): void {
    const existing = document.getElementById('beast-panel');
    if (existing) {
      existing.remove();
      this.beastPanel = null;
    }
  }

  public showMainMenu(): void {
    const existing = document.getElementById('main-menu');
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'main-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: '2000',
      backdropFilter: 'blur(10px)'
    });

    menu.innerHTML = `
      <div style="
        background: rgba(30, 35, 50, 0.98);
        border-radius: 20px;
        padding: 32px;
        min-width: 320px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      ">
        <div style="font-size:28px;margin-bottom:8px;">🌟</div>
        <div style="font-size:22px;font-weight:bold;color:#fff;margin-bottom:4px;">星野栖所</div>
        <div style="font-size:13px;opacity:0.6;color:#aaa;margin-bottom:28px;">让心灵在星空下栖息</div>
        
        <div style="display:flex;flex-direction:column;gap:12px;">
          <button id="menu-save" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(100,200,100,0.3),rgba(80,180,80,0.2));
            border:1px solid rgba(100,200,100,0.4);
            border-radius:12px;
            color:#90EE90;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">💾 保存游戏</button>
          
          <button id="menu-load" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(100,150,255,0.3),rgba(80,130,255,0.2));
            border:1px solid rgba(100,150,255,0.4);
            border-radius:12px;
            color:#87CEEB;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">📂 加载游戏</button>
          
          <button id="menu-settings" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(200,150,100,0.3),rgba(180,130,80,0.2));
            border:1px solid rgba(200,150,100,0.4);
            border-radius:12px;
            color:#DEB887;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">⚙️ 游戏设置</button>

          <button id="menu-inventory" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(255,200,100,0.3),rgba(255,180,80,0.2));
            border:1px solid rgba(255,200,100,0.4);
            border-radius:12px;
            color:#FFD700;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">🎒 背包(${this.getInventoryItemCount() || 0})</button>

          <button id="menu-achievements" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(255,100,100,0.3),rgba(255,80,80,0.2));
            border:1px solid rgba(255,100,100,0.4);
            border-radius:12px;
            color:#FF6B6B;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">🏆 成就</button>

          <button id="menu-friends" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(100,180,255,0.3),rgba(80,160,255,0.2));
            border:1px solid rgba(100,180,255,0.4);
            border-radius:12px;
            color:#87CEEB;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">👥 好友系统</button>

          <button id="menu-multiplayer" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(150,100,255,0.3),rgba(130,80,255,0.2));
            border:1px solid rgba(150,100,255,0.4);
            border-radius:12px;
            color:#DDA0DD;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">🌐 联机模式</button>

          <button id="menu-help" class="menu-btn" style="
            padding:14px 32px;
            background:linear-gradient(135deg,rgba(180,100,200,0.3),rgba(160,80,180,0.2));
            border:1px solid rgba(180,100,200,0.4);
            border-radius:12px;
            color:#DDA0DD;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">❓ 游戏帮助</button>
          
          <div style="height:1px;background:rgba(255,255,255,0.1);margin:8px 0;"></div>
          
          <button id="menu-close" class="menu-btn" style="
            padding:14px 32px;
            background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1);
            border-radius:12px;
            color:#fff;
            font-size:15px;
            cursor:pointer;
            transition:all 0.2s;
          ">继续游戏</button>
        </div>
      </div>
    `;
    document.body.appendChild(menu);

    menu.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('mouseover', () => {
        (btn as HTMLElement).style.transform = 'scale(1.02)';
      });
      btn.addEventListener('mouseout', () => {
        (btn as HTMLElement).style.transform = 'scale(1)';
      });
    });

    document.getElementById('menu-save')?.addEventListener('click', () => {
      if (this.menuCallback['save']) this.menuCallback['save']();
      menu.remove();
    });

    document.getElementById('menu-load')?.addEventListener('click', () => {
      if (this.menuCallback['load']) this.menuCallback['load']();
      menu.remove();
    });

    document.getElementById('menu-settings')?.addEventListener('click', () => {
      menu.remove();
      this.showSettingsMenu();
    });

    document.getElementById('menu-inventory')?.addEventListener('click', () => {
      menu.remove();
      this.showInventoryPanel();
    });

    document.getElementById('menu-achievements')?.addEventListener('click', () => {
      menu.remove();
      this.showAchievementsPanel();
    });

    document.getElementById('menu-friends')?.addEventListener('click', () => {
      menu.remove();
      this.showFriendsPanel();
    });

    document.getElementById('menu-multiplayer')?.addEventListener('click', () => {
      menu.remove();
      this.showMultiplayerPanel();
    });

    document.getElementById('menu-help')?.addEventListener('click', () => {
      menu.remove();
      this.showHelpMenu();
    });

    document.getElementById('menu-close')?.addEventListener('click', () => {
      menu.remove();
    });

    menu.addEventListener('click', (e) => {
      if (e.target === menu) {
        menu.remove();
      }
    });
  }

  public showSettingsMenu(): void {
    const existing = document.getElementById('settings-menu');
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'settings-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      borderRadius: '16px',
      padding: '24px',
      minWidth: '360px',
      color: '#fff',
      zIndex: '2001',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
    });

    menu.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:bold;">⚙️ 游戏设置</span>
        <button id="close-settings" style="
          background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;
        ">✕</button>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>🎵 音乐音量</span>
          <span id="music-value">80%</span>
        </div>
        <input type="range" id="music-volume" min="0" max="100" value="80" style="width:100%;">
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>🔊 音效音量</span>
          <span id="sfx-value">80%</span>
        </div>
        <input type="range" id="sfx-volume" min="0" max="100" value="80" style="width:100%;">
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>🖥️ 画质</span>
        </div>
        <select id="graphics-quality" style="width:100%;padding:8px;border-radius:8px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;">
          <option value="LOW">低</option>
          <option value="MEDIUM" selected>中</option>
          <option value="HIGH">高</option>
        </select>
      </div>
      
      <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;">
        <span>📖 显示教程</span>
        <label style="position:relative;width:48px;height:24px;">
          <input type="checkbox" id="show-tutorial" checked style="display:none;">
          <span style="
            position:absolute;top:0;left:0;right:0;bottom:0;
            background:rgba(100,200,100,0.5);border-radius:12px;cursor:pointer;
            transition:all 0.2s;
          "></span>
          <span style="
            position:absolute;top:2px;left:2px;width:20px;height:20px;
            background:#fff;border-radius:50%;transition:all 0.2s;
          "></span>
        </label>
      </div>
    `;
    document.body.appendChild(menu);

    document.getElementById('close-settings')?.addEventListener('click', () => menu.remove());
    menu.addEventListener('click', (e) => {
      if (e.target === menu) menu.remove();
    });
  }

  private showFriendsPanel(): void {
    const existing = document.getElementById('friends-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'friends-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      fontSize: '14px',
      zIndex: '1000',
      minWidth: '450px',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    });

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">👥</span>
          <span style="font-size:20px;font-weight:bold;">好友系统</span>
        </div>
        <button id="close-friends" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;">✕</button>
      </div>
      <div style="margin-bottom:20px;">
        <button id="add-friend-btn" style="
          width:100%;
          padding:12px;
          background:linear-gradient(135deg,rgba(100,180,255,0.3),rgba(80,160,255,0.2));
          border:1px solid rgba(100,180,255,0.4);
          border-radius:10px;
          color:#87CEEB;
          font-size:14px;
          cursor:pointer;
          transition:all 0.2s;
        ">➕ 添加好友</button>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;opacity:0.7;margin-bottom:10px;">我的好友 (0)</div>
        <div style="
          background:rgba(255,255,255,0.05);
          padding:30px;
          border-radius:12px;
          text-align:center;
          opacity:0.6;
        ">
          <div style="font-size:36px;margin-bottom:8px;">🌟</div>
          <div style="margin-bottom:4px;">暂无好友</div>
          <div style="font-size:12px;">快去添加好友一起游玩吧！</div>
        </div>
      </div>
      <div style="
        background:rgba(100,200,100,0.1);
        border:1px solid rgba(100,200,100,0.3);
        border-radius:10px;
        padding:16px;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="color:#90EE90;">💡</span>
          <span style="font-weight:bold;color:#90EE90;">功能说明</span>
        </div>
        <div style="font-size:12px;opacity:0.8;line-height:1.6;">
          好友系统可以让你与其他玩家互动、互赠礼物、拜访好友的家园。<br>
          未来版本中将支持：<br>
          • 添加/删除好友<br>
          • 好友列表管理<br>
          • 互赠虚拟礼物<br>
          • 拜访好友家园
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('close-friends')?.addEventListener('click', () => panel.remove());
    document.getElementById('add-friend-btn')?.addEventListener('click', () => {
      this.showNotification('添加好友功能即将推出，敬请期待！', 'info');
    });
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  private showMultiplayerPanel(): void {
    const existing = document.getElementById('multiplayer-panel');
    if (existing) {
      existing.remove();
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'multiplayer-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      color: '#fff',
      padding: '24px',
      borderRadius: '16px',
      fontSize: '14px',
      zIndex: '1000',
      minWidth: '450px',
      maxWidth: '600px',
      maxHeight: '80vh',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
    });

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:24px;">🌐</span>
          <span style="font-size:20px;font-weight:bold;">联机模式</span>
        </div>
        <button id="close-multiplayer" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        <button id="create-room-btn" style="
          padding:16px;
          background:linear-gradient(135deg,rgba(100,200,100,0.3),rgba(80,180,80,0.2));
          border:1px solid rgba(100,200,100,0.4);
          border-radius:12px;
          color:#90EE90;
          font-size:14px;
          cursor:pointer;
          transition:all 0.2s;
          text-align:left;
        ">
          <div style="font-weight:bold;margin-bottom:4px;">🏠 创建房间</div>
          <div style="font-size:12px;opacity:0.7;">创建一个新房间，邀请好友加入</div>
        </button>
        <button id="join-room-btn" style="
          padding:16px;
          background:linear-gradient(135deg,rgba(255,180,100,0.3),rgba(255,160,80,0.2));
          border:1px solid rgba(255,180,100,0.4);
          border-radius:12px;
          color:#FFD700;
          font-size:14px;
          cursor:pointer;
          transition:all 0.2s;
          text-align:left;
        ">
          <div style="font-weight:bold;margin-bottom:4px;">🚪 加入房间</div>
          <div style="font-size:12px;opacity:0.7;">输入房间号加入好友的房间</div>
        </button>
      </div>
      <div style="
        background:rgba(100,200,100,0.1);
        border:1px solid rgba(100,200,100,0.3);
        border-radius:10px;
        padding:16px;
      ">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="color:#90EE90;">💡</span>
          <span style="font-weight:bold;color:#90EE90;">功能说明</span>
        </div>
        <div style="font-size:12px;opacity:0.8;line-height:1.6;">
          联机模式让你可以与好友一起游玩：<br>
          • 最多4人同时在线<br>
          • 实时同步作物种植和建筑建造<br>
          • 共享天气和时间系统<br>
          • 一起收获和交易物品<br><br>
          <span style="color:#FFB6C1;">⚠️ 联机功能正在开发中，敬请期待！</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('close-multiplayer')?.addEventListener('click', () => panel.remove());
    document.getElementById('create-room-btn')?.addEventListener('click', () => {
      this.showNotification('联机功能即将推出，敬请期待！', 'info');
    });
    document.getElementById('join-room-btn')?.addEventListener('click', () => {
      this.showNotification('联机功能即将推出，敬请期待！', 'info');
    });
    panel.addEventListener('click', (e) => {
      if (e.target === panel) panel.remove();
    });
  }

  public showHelpMenu(): void {
    const existing = document.getElementById('help-menu');
    if (existing) {
      existing.remove();
      return;
    }

    const menu = document.createElement('div');
    menu.id = 'help-menu';
    Object.assign(menu.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 25, 40, 0.98)',
      borderRadius: '16px',
      padding: '24px',
      minWidth: '400px',
      maxWidth: '90vw',
      color: '#fff',
      zIndex: '2001',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      maxHeight: '80vh',
      overflowY: 'auto'
    });

    menu.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <span style="font-size:18px;font-weight:bold;">❓ 游戏帮助</span>
        <button id="close-help" style="
          background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;
        ">✕</button>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#90EE90;">🕹️ 基础操作</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.8;">
          <div>WASD / 方向键 - 移动视角</div>
          <div>鼠标右键 - 旋转视角</div>
          <div>鼠标滚轮 - 缩放视角</div>
          <div>左键点击 - 选择/交互</div>
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#87CEEB;">⌨️ 快捷键</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.8;">
          <div>B - 进入/退出建造模式</div>
          <div>I - 打开/关闭背包</div>
          <div>P - 保存游戏</div>
          <div>L - 加载游戏</div>
          <div>ESC - 退出当前界面</div>
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#DDA0DD;">🌱 种植说明</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.8;">
          <div>1. 点击底部"种植"按钮打开作物面板</div>
          <div>2. 选择要种植的作物</div>
          <div>3. 点击地面即可种植</div>
          <div>4. 点击已种植的作物可查看进度/收获</div>
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#DEB887;">🏗️ 建造说明</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.8;">
          <div>1. 点击"建造"或按B进入建造模式</div>
          <div>2. 在左侧面板选择建筑或工具</div>
          <div>3. 点击地面放置建筑</div>
          <div>4. 再次按B或ESC退出建造模式</div>
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:bold;margin-bottom:8px;color:#FFB6C1;">🐾 异兽说明</div>
        <div style="font-size:13px;opacity:0.8;line-height:1.8;">
          <div>1. 点击"异兽"按钮查看我的异兽</div>
          <div>2. 异兽会自动工作帮助玩家</div>
          <div>3. 通过喂食提升亲密度解锁能力</div>
          <div>4. 亲密度越高异兽效果越强</div>
        </div>
      </div>
    `;
    document.body.appendChild(menu);

    document.getElementById('close-help')?.addEventListener('click', () => menu.remove());
    menu.addEventListener('click', (e) => {
      if (e.target === menu) menu.remove();
    });
  }

  public hideMainMenu(): void {
    const existing = document.getElementById('main-menu');
    if (existing) {
      existing.remove();
    }
  }

  public dispose(): void {
    const elements = ['fps-display', 'phase-display', 'tooltip', 'notification-container', 'action-bar', 'controls-hint', 'crop-panel', 'build-panel', 'inventory-panel', 'crop-info', 'beast-panel', 'beast-info'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
    this.removeAllListeners();
  }
}
