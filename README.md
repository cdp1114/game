# 《星野栖所》3D休闲治愈游戏

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="license">
  <img src="https://img.shields.io/badge/Three.js-r160-orange.svg" alt="three.js">
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="typescript">
</p>

> 🌟 一款无压力、零内卷的3D休闲治愈游戏。开放世界种田建造，与可爱异兽共生，感受四季变换与星雨浪漫。

## 🎮 项目简介

《星野栖所》是一款基于 **Three.js + TypeScript + Vite** 构建的3D休闲治愈游戏。游戏强调零压力游戏体验，无战斗、无战力数值、无PVP对抗，让玩家专注于种植、建造与异兽共生。

### 核心特色

- 🌅 **动态生态世界**: 实时昼夜循环、四季更替、天气系统
- 🌦️ **6种天气系统**: 晴、雾、细雨、星雨、落雪、极光
- 🐾 **AI异兽共生**: 5种特色异兽，自动辅助农作
- 🌱 **共生种植逻辑**: 相邻作物触发联动加成
- 🏠 **自由建造**: 全域地形编辑、模块化建造
- 📱 **跨平台支持**: 移动端、PC模拟器

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 pnpm >= 8.0.0
- 现代浏览器 (Chrome, Firefox, Safari, Edge)
- WebGL 2.0 支持

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd xingye-qisu
   ```

2. **安装依赖**
   ```bash
   # 使用 npm
   npm install
   
   # 或使用 pnpm (推荐)
   pnpm install
   ```

3. **启动开发服务器**
   ```bash
   # 使用 npm
   npm run dev
   
   # 或使用 pnpm
   pnpm dev
   ```

4. **访问游戏**
   打开浏览器访问 `http://localhost:3000`

### 构建生产版本

```bash
# 构建
npm run build

# 预览生产版本
npm run preview
```

## 🎯 项目结构

```
xingye-qisu/
├── src/
│   ├── core/                    # 核心系统
│   │   ├── GameEngine.ts       # 游戏引擎主类
│   │   ├── SceneManager.ts     # 场景管理器
│   │   ├── TimeSystem.ts       # 时间系统 (昼夜/四季/天气)
│   │   ├── InputManager.ts     # 输入管理
│   │   ├── EventEmitter.ts     # 事件系统
│   │   └── types.ts            # 类型定义
│   │
│   ├── systems/                # 游戏系统
│   │   ├── CropSystem.ts       # 作物种植系统
│   │   ├── TimeSystem.ts       # 时间系统
│   │   ├── BuildSystem.ts      # 建造系统
│   │   ├── InventorySystem.ts  # 背包/商店系统
│   │   └── BuildingTypes.ts    # 建筑类型定义
│   │
│   ├── entities/               # 游戏实体
│   │   └── BeastManager.ts     # 异兽管理器 (AI行为树)
│   │
│   ├── ui/                     # UI系统
│   │   └── UIManager.ts        # UI管理器
│   │
│   └── main.ts                 # 游戏入口
│
├── public/                     # 静态资源
├── index.html                  # HTML入口
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript配置
├── vite.config.ts             # Vite配置
├── README.md                  # 项目说明
└── .gitignore                 # Git忽略文件
```

## 🎮 游戏功能

### ✅ 已实现功能

#### 1. 核心引擎
- [x] Three.js 渲染引擎初始化
- [x] 场景管理与光照系统
- [x] 相机控制 (WASD移动 + 鼠标旋转 + 滚轮缩放)
- [x] 事件系统
- [x] 存档/读档系统

#### 2. 时间系统
- [x] 昼夜循环 (清晨/正午/黄昏/深夜)
- [x] 四季更替 (春/夏/秋/冬)
- [x] 6种天气系统 (晴/雾/细雨/星雨/落雪/极光)
- [x] 天气随机机制 (稀有天气概率)
- [x] 光照动态适配
- [x] 天气粒子效果

#### 3. 作物种植系统
- [x] 基础作物种植 (小麦/番茄/胡萝卜/卷心菜)
- [x] 星植作物 (星绒花/月华果)
- [x] 4阶段生长模型
- [x] 共生种植逻辑 (相邻加成)
- [x] 天气影响生长速度
- [x] 收获系统
- [x] 作物动画效果

#### 4. 异兽AI系统
- [x] 5种异兽建模 (星绒兔/云羽雀/雾灵鹿/晶溪豚/星巡狐)
- [x] AI行为树系统
- [x] 各异兽专属行为逻辑
- [x] 亲密度系统
- [x] 能力解锁机制
- [x] 异兽交互与喂养
- [x] 异兽动画与特效

#### 5. 建造系统
- [x] 8种建筑定义 (风车/长椅/石灯笼/花坛/收纳柜/兽兽小屋/温室/许愿池)
- [x] 4种地形编辑工具 (填土/挖掘/引水/铺路)
- [x] 网格化建筑放置与预览
- [x] 建造模式切换 (B键/按钮)
- [x] 建筑保存与加载

#### 6. 背包/商店系统
- [x] 物品管理 (添加/移除/查询)
- [x] 星尘货币系统
- [x] 商店购买功能 (13种商品)
- [x] 订单系统 (批量采购/折扣)
- [x] 背包UI面板

#### 7. 场景系统
- [x] 浮空岛屿地形
- [x] 装饰性树木花草
- [x] 动态天空盒
- [x] 地形起伏
- [x] 微动效 (花草摇摆)

#### 8. UI系统
- [x] HUD显示 (时间/天气/季节/FPS)
- [x] 工具提示系统
- [x] 通知系统
- [x] 快捷操作栏
- [x] 控制提示
- [x] 暂停/保存/加载
- [x] 背包面板 (I键)

### 🔄 待开发功能

#### 高优先级
- [ ] 剧情系统框架
- [ ] 成就系统
- [ ] 设置菜单 (音量/画质)
- [ ] 音效系统

#### 中优先级
- [ ] 好友系统
- [ ] 家园串门
- [ ] 图纸分享社区
- [ ] 更多异兽互动

#### 低优先级
- [ ] 联机功能
- [ ] 云存档
- [ ] 更多天气特效
- [ ] 季节限定活动

## 🛠️ 技术架构

### 渲染引擎
- **Three.js r160+**: WebGL 2.0 渲染
- **后处理效果**: 泛光、景深 (预留)
- **LOD系统**: 多级细节模型 (预留)

### 性能优化
- [x] 场景分片加载 (Chunk Loading)
- [x] 视锥剔除 (Frustum Culling)
- [x] 实例化渲染 (InstancedMesh) - 预留
- [x] 资源池管理
- [x] 对象回收机制

### AI系统
- **行为树 (Behavior Tree)**: 异兽AI决策
- **节点类型**:
  - Sequence (顺序执行)
  - Selector (选择执行)
  - Condition (条件判断)
  - Action (行为执行)

### 数据驱动
- [x] 配置表系统 (Excel/JSON)
- [x] 热更新预留接口
- [x] 本地存储存档

## 📖 游戏设计文档

详细的游戏设计文档位于项目根目录：
- 📄 `《星野栖所》游戏开发立项落地文档（可直接开发）.docx`
- 📄 `《星野栖所》技术架构优化方案.md`

## 🎨 开发规范

### 代码规范
- TypeScript 严格模式
- ESLint + Prettier (预留)
- 组件化开发
- 完整的类型定义

### Git 规范
- 分支命名: `feature/` / `fix/` / `docs/`
- 提交信息: 中文描述，简洁明了
- 代码审查后合并

### 测试规范
- [ ] 单元测试 (Vitest/Jest)
- [ ] 集成测试 (Playwright)
- [ ] 性能测试 (Lighthouse)
- [ ] 兼容性测试

## 📝 游戏操作指南

### 基础操作
| 操作 | 功能 |
|------|------|
| W/↑ | 向前移动 |
| S/↓ | 向后移动 |
| A/← | 向左移动 |
| D/→ | 向右移动 |
| 鼠标右键 | 旋转视角 |
| 鼠标滚轮 | 缩放视角 |
| 左键点击 | 选择对象 |

### 快捷键
| 快捷键 | 功能 |
|--------|------|
| W/↑ | 向前移动 |
| S/↓ | 向后移动 |
| A/← | 向左移动 |
| D/→ | 向右移动 |
| 鼠标右键 | 旋转视角 |
| 鼠标滚轮 | 缩放视角 |
| 左键点击 | 选择对象/种植/放置建筑 |
| B | 进入/退出建造模式 |
| I | 打开/关闭背包 |
| ESC | 退出建造模式/暂停 |
| P | 保存游戏 |
| L | 加载游戏 |

### 游戏特性
- 🎮 **无压力设计**: 无体力限制、无惩罚机制、无战力数值
- 💾 **自动存档**: 游戏自动保存进度
- 🌙 **离线收益**: 离线期间作物正常生长
- 🐾 **异兽互助**: 异兽自动工作，无需喂养

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👥 团队

- **开发**: SOLO AI Assistant
- **设计**: StarWild Studio
- **美术**: 待定

## 🙏 致谢

- [Three.js](https://threejs.org/) - 优秀的3D渲染引擎
- [Vite](https://vitejs.dev/) - 快速的前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的JavaScript超集

---

<p align="center">
  <strong>🌟 星野栖所 - 让心灵在星空下栖息 🌟</strong>
</p>

<p align="center">
  <em>愿这片星野，成为你疲惫时的栖所</em>
</p>
