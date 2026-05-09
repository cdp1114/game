import { EventEmitter } from '../core/EventEmitter';

export interface Dialogue {
  id: string;
  speaker: string;
  text: string;
  choices?: { text: string; nextId: string; condition?: string }[];
  nextId?: string;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: { type: string; amount: number }[];
  dialogueStart?: string;
  dialogueComplete?: string;
  status: 'locked' | 'active' | 'completed' | 'failed';
}

export interface QuestObjective {
  id: string;
  type: 'collect' | 'talk' | 'build' | 'breed' | 'craft' | 'explore';
  description: string;
  target: string;
  progress: number;
  required: number;
  completed: boolean;
}

export interface NPC {
  id: string;
  name: string;
  portrait?: string;
  dialogues: { [key: string]: string };
  quests: string[];
  position?: { x: number; y: number; z: number };
}

export class StorySystem extends EventEmitter {
  private dialogues: Map<string, Dialogue> = new Map();
  private quests: Map<string, Quest> = new Map();
  private npcs: Map<string, NPC> = new Map();
  private currentDialogue: Dialogue | null = null;
  private activeQuests: Quest[] = [];
  private completedQuests: string[] = [];
  private storyProgress: number = 0;

  constructor() {
    super();
    this.initializeDialogues();
    this.initializeQuests();
    this.initializeNPCs();
  }

  private initializeDialogues(): void {
    const dialogueData: Dialogue[] = [
      {
        id: 'prologue_1',
        speaker: '神秘老者',
        text: '欢迎来到星野栖所，年轻的旅人。这片土地蕴藏着无尽的神秘与可能...',
        nextId: 'prologue_2'
      },
      {
        id: 'prologue_2',
        speaker: '神秘老者',
        text: '你需要在这里种植作物、照顾异兽、建造属于你自己的家园。',
        nextId: 'prologue_3'
      },
      {
        id: 'prologue_3',
        speaker: '神秘老者',
        text: '记住，每一颗种子都有成为参天大树的潜力。去吧，开始你的冒险！',
        onExit: () => {
          this.emit('storyComplete', { storyId: 'prologue' });
          this.unlockQuest('first_harvest');
        }
      },
      {
        id: 'farmer_hint',
        speaker: '农夫',
        text: '种植作物需要耐心。不同作物有不同成熟时间，记得定期回来收获哦！',
        nextId: 'farmer_hint_2'
      },
      {
        id: 'farmer_hint_2',
        speaker: '农夫',
        text: '小麦是最基础的作物，适合新手种植。番茄收益更高，但需要更长时间。',
        onExit: () => {
          this.emit('hintReceived', { hint: 'crop_tips' });
        }
      },
      {
        id: 'builder_intro',
        speaker: '建筑师',
        text: '想要建造房屋？先收集足够的木材和石材。不同的建筑需要不同的材料。',
        nextId: 'builder_intro_2'
      },
      {
        id: 'builder_intro_2',
        speaker: '建筑师',
        text: '进入建造模式，选择你想要放置的建筑，然后点击空地进行建造。',
        onExit: () => {
          this.emit('hintReceived', { hint: 'building_tips' });
          this.unlockQuest('first_building');
        }
      },
      {
        id: 'beast_master_intro',
        speaker: '异兽大师',
        text: '异兽是这片土地上的神奇生物。它们各有独特的性格和能力。',
        nextId: 'beast_master_intro_2'
      },
      {
        id: 'beast_master_intro_2',
        speaker: '异兽大师',
        text: '当你与异兽建立深厚的羁绊时，它们会变得更强，并帮助你完成各种任务。',
        onExit: () => {
          this.emit('hintReceived', { hint: 'beast_tips' });
          this.unlockQuest('first_beast_friend');
        }
      }
    ];

    dialogueData.forEach(d => this.dialogues.set(d.id, d));
  }

  private initializeQuests(): void {
    const questData: Quest[] = [
      {
        id: 'first_harvest',
        title: '初次收获',
        description: '种植并收获你的第一批作物',
        objectives: [
          {
            id: 'harvest_wheat',
            type: 'collect',
            description: '收获小麦',
            target: 'wheat',
            progress: 0,
            required: 1,
            completed: false
          }
        ],
        rewards: [
          { type: 'coin', amount: 100 },
          { type: 'seed_wheat', amount: 5 }
        ],
        dialogueComplete: 'prologue_3',
        status: 'locked'
      },
      {
        id: 'first_building',
        title: '初建家园',
        description: '建造你的第一栋建筑',
        objectives: [
          {
            id: 'place_building',
            type: 'build',
            description: '放置任意建筑',
            target: 'any',
            progress: 0,
            required: 1,
            completed: false
          }
        ],
        rewards: [
          { type: 'coin', amount: 200 },
          { type: 'wood', amount: 10 }
        ],
        status: 'locked'
      },
      {
        id: 'first_beast_friend',
        title: '结交异兽',
        description: '与一只异兽建立友谊',
        objectives: [
          {
            id: 'feed_beast',
            type: 'breed',
            description: '喂养异兽',
            target: 'any',
            progress: 0,
            required: 1,
            completed: false
          }
        ],
        rewards: [
          { type: 'beast_food', amount: 5 },
          { type: 'coin', amount: 150 }
        ],
        status: 'locked'
      },
      {
        id: 'crop_expert',
        title: '作物专家',
        description: '收获各种不同类型的作物',
        objectives: [
          {
            id: 'harvest_tomato',
            type: 'collect',
            description: '收获番茄',
            target: 'tomato',
            progress: 0,
            required: 5,
            completed: false
          },
          {
            id: 'harvest_carrot',
            type: 'collect',
            description: '收获胡萝卜',
            target: 'carrot',
            progress: 0,
            required: 5,
            completed: false
          },
          {
            id: 'harvest_cabbage',
            type: 'collect',
            description: '收获卷心菜',
            target: 'cabbage',
            progress: 0,
            required: 5,
            completed: false
          }
        ],
        rewards: [
          { type: 'coin', amount: 500 },
          { type: 'rare_seed', amount: 3 }
        ],
        status: 'locked'
      },
      {
        id: 'master_builder',
        title: '建筑大师',
        description: '建造多种不同类型的建筑',
        objectives: [
          {
            id: 'build_house',
            type: 'build',
            description: '建造房屋',
            target: 'house',
            progress: 0,
            required: 1,
            completed: false
          },
          {
            id: 'build_farm',
            type: 'build',
            description: '建造农场',
            target: 'farm',
            progress: 0,
            required: 1,
            completed: false
          },
          {
            id: 'build_storage',
            type: 'build',
            description: '建造仓库',
            target: 'storage',
            progress: 0,
            required: 1,
            completed: false
          }
        ],
        rewards: [
          { type: 'coin', amount: 1000 },
          { type: 'premium_building', amount: 1 }
        ],
        status: 'locked'
      }
    ];

    questData.forEach(q => this.quests.set(q.id, q));
  }

  private initializeNPCs(): void {
    const npcData: NPC[] = [
      {
        id: 'elder',
        name: '神秘老者',
        dialogues: {
          greeting: 'prologue_1',
          hint: 'prologue_3'
        },
        quests: [],
        position: { x: 5, y: 0, z: 5 }
      },
      {
        id: 'farmer',
        name: '农夫',
        dialogues: {
          greeting: 'farmer_hint',
          tips: 'farmer_hint_2'
        },
        quests: ['first_harvest', 'crop_expert'],
        position: { x: -8, y: 0, z: 3 }
      },
      {
        id: 'builder',
        name: '建筑师',
        dialogues: {
          greeting: 'builder_intro',
          tips: 'builder_intro_2'
        },
        quests: ['first_building', 'master_builder'],
        position: { x: 8, y: 0, z: -5 }
      },
      {
        id: 'beast_master',
        name: '异兽大师',
        dialogues: {
          greeting: 'beast_master_intro',
          tips: 'beast_master_intro_2'
        },
        quests: ['first_beast_friend'],
        position: { x: -3, y: 0, z: -8 }
      }
    ];

    npcData.forEach(n => this.npcs.set(n.id, n));
  }

  public startDialogue(dialogueId: string): boolean {
    const dialogue = this.dialogues.get(dialogueId);
    if (!dialogue) {
      console.warn(`Dialogue not found: ${dialogueId}`);
      return false;
    }

    this.currentDialogue = dialogue;
    dialogue.onEnter?.();
    this.emit('dialogueStart', { dialogue });
    return true;
  }

  public advanceDialogue(): void {
    if (!this.currentDialogue) return;

    this.currentDialogue.onExit?.();

    if (this.currentDialogue.nextId) {
      const nextDialogue = this.dialogues.get(this.currentDialogue.nextId);
      if (nextDialogue) {
        this.currentDialogue = nextDialogue;
        nextDialogue.onEnter?.();
        this.emit('dialogueAdvance', { dialogue: nextDialogue });
        return;
      }
    }

    this.endDialogue();
  }

  public selectChoice(choiceIndex: number): void {
    if (!this.currentDialogue?.choices) return;
    
    const choice = this.currentDialogue.choices[choiceIndex];
    if (choice) {
      const nextDialogue = this.dialogues.get(choice.nextId);
      if (nextDialogue) {
        this.currentDialogue.onExit?.();
        this.currentDialogue = nextDialogue;
        nextDialogue.onEnter?.();
        this.emit('dialogueChoice', { choice, dialogue: nextDialogue });
      }
    }
  }

  public endDialogue(): void {
    if (this.currentDialogue) {
      this.emit('dialogueEnd', { dialogue: this.currentDialogue });
      this.currentDialogue = null;
    }
  }

  public unlockQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'locked') return false;

    quest.status = 'active';
    this.activeQuests.push(quest);
    this.emit('questUnlocked', { quest });
    return true;
  }

  public updateQuestProgress(objectiveType: string, target: string, amount: number = 1): void {
    this.activeQuests.forEach(quest => {
      quest.objectives.forEach(obj => {
        if (obj.type === objectiveType && (obj.target === target || obj.target === 'any')) {
          obj.progress = Math.min(obj.progress + amount, obj.required);
          
          if (obj.progress >= obj.required && !obj.completed) {
            obj.completed = true;
            this.emit('objectiveComplete', { quest, objective: obj });
          }
        }
      });

      if (this.isQuestComplete(quest)) {
        this.completeQuest(quest.id);
      }
    });
  }

  public isQuestComplete(quest: Quest): boolean {
    return quest.objectives.every(obj => obj.completed);
  }

  public completeQuest(questId: string): void {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'active') return;

    quest.status = 'completed';
    this.completedQuests.push(questId);
    this.activeQuests = this.activeQuests.filter(q => q.id !== questId);
    
    this.emit('questCompleted', { quest, rewards: quest.rewards });
  }

  public talkToNPC(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (!npc) return;

    const hasAvailableQuest = npc.quests.some(qId => {
      const quest = this.quests.get(qId);
      return quest?.status === 'active' || quest?.status === 'locked';
    });

    const dialogueId = hasAvailableQuest && npc.dialogues.greeting 
      ? npc.dialogues.greeting 
      : npc.dialogues.tips || npc.dialogues.greeting;

    this.startDialogue(dialogueId);
    this.emit('talkedToNPC', { npc });
  }

  public getActiveQuests(): Quest[] {
    return [...this.activeQuests];
  }

  public getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  public getCurrentDialogue(): Dialogue | null {
    return this.currentDialogue;
  }

  public getNPC(npcId: string): NPC | undefined {
    return this.npcs.get(npcId);
  }

  public getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  public saveProgress(): {
    completedQuests: string[];
    storyProgress: number;
  } {
    return {
      completedQuests: this.completedQuests,
      storyProgress: this.storyProgress
    };
  }

  public loadProgress(data: { completedQuests: string[]; storyProgress: number }): void {
    this.completedQuests = data.completedQuests;
    this.storyProgress = data.storyProgress;
    
    this.completedQuests.forEach(questId => {
      const quest = this.quests.get(questId);
      if (quest) quest.status = 'completed';
    });
  }
}
