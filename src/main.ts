// 《星野栖所》主入口文件

import { GameEngine } from './core/GameEngine';

class StarFieldGame {
  public engine: GameEngine | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log('🌟 初始化《星野栖所》游戏...');
      
      // 创建游戏引擎实例
      this.engine = new GameEngine();
      
      // 监听引擎事件
      this.setupEngineEvents();
      
      // 初始化完成后启动游戏
      setTimeout(() => {
        this.engine?.start();
        this.initializeGameWorld();
      }, 1000);
      
    } catch (error) {
      console.error('❌ 游戏初始化失败:', error);
      this.showErrorScreen();
    }
  }

  private setupEngineEvents(): void {
    if (!this.engine) return;

    this.engine.on('engineReady', () => {
      console.log('✅ 引擎已就绪');
    });

    this.engine.on('engineError', (error) => {
      console.error('❌ 引擎错误:', error);
    });

    this.engine.on('gameStart', () => {
      console.log('🎮 游戏开始');
    });

    this.engine.on('gamePause', () => {
      console.log('⏸️ 游戏暂停');
    });

    this.engine.on('gameResume', () => {
      console.log('▶️ 游戏继续');
    });

    this.engine.on('gameSaved', (saveData) => {
      console.log('💾 游戏已保存:', saveData);
    });

    this.engine.on('gameLoaded', (saveData) => {
      console.log('📂 游戏已加载:', saveData);
    });

    // 作物系统事件
    this.engine.getCropSystem().on('cropPlanted', (crop) => {
      console.log(`🌱 作物种植: ${crop.data.name}`);
    });

    this.engine.getCropSystem().on('cropReady', (crop) => {
      console.log(`🌾 作物成熟: ${crop.data.name}`);
      this.engine?.getUIManager().showCropReadyNotification(crop.data.name);
    });

    this.engine.getCropSystem().on('cropHarvested', (data) => {
      console.log(`🎉 收获作物: ${data.crop.data.name}, 获得:`, data.items);
      this.engine?.getUIManager().showNotification(`收获了 ${data.crop.data.name}！`, 'success');
    });

    // 时间系统事件
    this.engine.getTimeSystem().on('weatherChange', (data) => {
      console.log(`天气变化: ${data.previous} -> ${data.current}`);
      this.engine?.getUIManager().showWeatherNotification(data.current);
    });

    this.engine.getTimeSystem().on('seasonChange', (data) => {
      console.log(`季节变化: ${data.previous} -> ${data.current}`);
      this.engine?.getUIManager().showSeasonNotification(data.current);
    });

    // 异兽系统事件
    this.engine.getBeastManager().on('beastSpawned', (beast) => {
      console.log(`🐾 异兽出现: ${beast.data.name}`);
    });

    this.engine.getBeastManager().on('abilityUnlocked', (data) => {
      console.log(`✨ ${data.beast.data.name} 解锁能力: ${data.ability.name}`);
      this.engine?.getUIManager().showNotification(`${data.beast.data.name} 解锁了新能力！`, 'success');
    });

    this.engine.getBeastManager().on('beastInteracted', (data) => {
      console.log(`❤️ 与 ${data.beast.data.name} 互动，亲密度: ${data.newIntimacy}`);
    });

    // 输入事件
    this.engine.getUIManager();
    
    // 监听键盘快捷键
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') {
        this.engine?.saveGame();
        this.engine?.getUIManager().showNotification('游戏已保存', 'success');
      } else if (e.code === 'KeyL') {
        const loaded = this.engine?.loadGame();
        if (loaded) {
          this.engine?.getUIManager().showNotification('游戏已加载', 'success');
        } else {
          this.engine?.getUIManager().showNotification('没有找到存档', 'warning');
        }
      } else if (e.code === 'Escape') {
        if (this.engine) {
          this.engine.getUIManager().showMainMenu();
        }
      }
    });

    // 对象选择事件
    this.engine.getUIManager();
  }

  private initializeGameWorld(): void {
    if (!this.engine) return;

    console.log('🌍 初始化游戏世界...');

    const cropSystem = this.engine.getCropSystem();
    const beastManager = this.engine.getBeastManager();

    // 尝试加载存档
    const saveString = localStorage.getItem('xingye_qisu_save');
    if (saveString) {
      try {
        const saveData = JSON.parse(saveString);
        if (saveData.timestamp) {
          console.log('📂 检测到存档，正在加载...');
          this.engine.loadGame();
          return;
        }
      } catch (e) {
        console.warn('存档加载失败，将创建新游戏');
      }
    }

    // 创建示例作物
    setTimeout(() => {
      console.log('🌱 种植示例作物...');
      
      cropSystem.plantCrop('wheat', { x: -2, y: 0, z: 3 });
      cropSystem.plantCrop('tomato', { x: 0, y: 0, z: 3 });
      cropSystem.plantCrop('carrot', { x: 2, y: 0, z: 3 });
      cropSystem.plantCrop('star_flower', { x: -4, y: 0, z: 5 });
      cropSystem.plantCrop('moon_fruit', { x: 4, y: 0, z: 5 });

    }, 2000);

    // 创建示例异兽
    setTimeout(() => {
      console.log('🐾 召唤示例异兽...');
      
      beastManager.spawnBeast('star_bunny', { x: 0, y: 0, z: 5 });
      beastManager.spawnBeast('fog_deer', { x: -5, y: 0, z: 0 });
      beastManager.spawnBeast('cloud_bird', { x: 5, y: 0, z: 0 });

    }, 3000);

    // 显示欢迎信息
    setTimeout(() => {
      console.log('🎮 欢迎来到星野栖所！');
      console.log('📖 游戏说明:');
      console.log('  - WASD/方向键: 移动视角');
      console.log('  - 鼠标右键: 旋转视角');
      console.log('  - 鼠标滚轮: 缩放');
      console.log('  - P: 保存游戏');
      console.log('  - L: 加载游戏');
      
    }, 4000);
  }

  private showErrorScreen(): void {
    const errorScreen = document.createElement('div');
    errorScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: Arial, sans-serif;
      z-index: 2000;
    `;
    
    errorScreen.innerHTML = `
      <h1 style="font-size: 48px; margin-bottom: 20px;">❌ 游戏加载失败</h1>
      <p style="font-size: 18px; margin-bottom: 30px;">请检查浏览器是否支持WebGL</p>
      <button onclick="location.reload()" style="
        padding: 15px 40px;
        font-size: 18px;
        border: none;
        border-radius: 10px;
        background: white;
        color: #ee5a24;
        cursor: pointer;
        transition: transform 0.2s;
      ">重新加载</button>
    `;
    
    document.body.appendChild(errorScreen);
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  const game = new StarFieldGame();
  setTimeout(() => {
    (window as any).uiManager = game.engine?.getUIManager?.();
  }, 1500);
});
