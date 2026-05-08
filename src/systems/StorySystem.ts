import { EventEmitter } from '../core/EventEmitter';

export interface Dialogue {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  choices?: DialogueChoice[];
  nextId?: string;
  condition?: () => boolean;
}

export interface DialogueChoice {
  text: string;
  nextId: string;
  condition?: () => boolean;
  effect?: () => void;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  reward: QuestReward;
  nextQuest?: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  target: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface QuestReward {
  items?: { id: string; name: string; amount: number }[];
  experience?: number;
  gold?: number;
  achievement?: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  dialogues: Dialogue[];
  quests?: string[];
  unlockedByDefault?: boolean;
}

export class StorySystem extends EventEmitter {
  private chapters: Map<string, StoryChapter> = new Map();
  private currentChapter: string | null = null;
  private currentDialogue: string | null = null;
  private dialogueHistory: string[] = [];
  private completedDialogues: Set<string> = new Set();
  private activeQuests: Map<string, Quest> = new Map();
  private completedQuests: Set<string> = new Set();
  
  private dialogueUI: HTMLDivElement | null = null;
  private isDialogueActive: boolean = false;
  
  constructor() {
    super();
    this.initializeStory();
  }
  
  private initializeStory(): void {
    this.addChapter({
      id: 'prologue',
      title: '第一章：星野初遇',
      unlockedByDefault: true,
      dialogues: [
        {
          id: 'prologue_1',
          speaker: '神秘声音',
          text: '欢迎来到星野栖所，旅行者。这里是万物生灵共存的神秘之地。',
          nextId: 'prologue_2'
        },
        {
          id: 'prologue_2',
          speaker: '神秘声音',
          text: '你将在这里建造家园，驯服异兽，种植作物。记住，每一块土地都有它的故事。',
          nextId: 'prologue_3'
        },
        {
          id: 'prologue_3',
          speaker: '神秘声音',
          text: '你的旅程从这里开始。去探索这个世界吧！',
          choices: [
            { text: '开始探索', nextId: 'prologue_end' },
            { text: '我想了解更多', nextId: 'prologue_tips' }
          ]
        },
        {
          id: 'prologue_tips',
          speaker: '神秘声音',
          text: '让我告诉你一些生存技巧：\n\n• WASD移动，空格跳跃\n• 左键破坏方块，右键放置\n• 按E打开背包\n• 按B进入建造模式\n\n还有更多等待你去发现！',
          nextId: 'prologue_end'
        },
        {
          id: 'prologue_end',
          speaker: '系统',
          text: '🎉 恭喜你完成了新手教程！现在自由探索吧！',
        }
      ]
    });
    
    this.addChapter({
      id: 'first_quest',
      title: '第二章：首个任务',
      quests: ['quest_collect_wood'],
      dialogues: [
        {
          id: 'quest_intro',
          speaker: '村庄老人',
          text: '年轻的旅行者，我需要你的帮助。村子的储备不多了。',
          nextId: 'quest_1_detail'
        },
        {
          id: 'quest_1_detail',
          speaker: '村庄老人',
          text: '请帮我收集10块木头回来。我会在村口等你。',
          condition: () => this.completedQuests.has('quest_collect_wood'),
          choices: [
            { text: '交任务', nextId: 'quest_1_complete' },
            { text: '我还没完成', nextId: 'quest_1_wait' }
          ]
        },
        {
          id: 'quest_1_wait',
          speaker: '村庄老人',
          text: '去吧，我会在这里等你。记得收集10块木头！',
        },
        {
          id: 'quest_1_complete',
          speaker: '村庄老人',
          text: '太感谢你了！这是你的报酬。愿星光指引你的道路。',
        }
      ]
    });
  }
  
  private addChapter(chapter: StoryChapter): void {
    this.chapters.set(chapter.id, chapter);
    if (chapter.unlockedByDefault && !this.currentChapter) {
      this.currentChapter = chapter.id;
    }
  }
  
  public startDialogue(chapterId: string, dialogueId?: string): void {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) return;
    
    this.currentChapter = chapterId;
    
    const startDialogue = dialogueId || chapter.dialogues[0]?.id;
    if (startDialogue) {
      this.showDialogue(startDialogue);
    }
  }
  
  private showDialogue(dialogueId: string): void {
    const chapter = this.chapters.get(this.currentChapter!);
    if (!chapter) return;
    
    const dialogue = chapter.dialogues.find(d => d.id === dialogueId);
    if (!dialogue) return;
    
    if (dialogue.condition && !dialogue.condition()) {
      return;
    }
    
    this.currentDialogue = dialogueId;
    this.isDialogueActive = true;
    
    if (!this.dialogueUI) {
      this.dialogueUI = this.createDialogueUI();
    }
    
    this.updateDialogueUI(dialogue);
    document.body.appendChild(this.dialogueUI);
    
    this.emit('dialogueStart', { dialogueId, speaker: dialogue.speaker });
  }
  
  private createDialogueUI(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'story-dialogue-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 3000;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;
    
    const box = document.createElement('div');
    box.id = 'story-dialogue-box';
    box.style.cssText = `
      width: 100%;
      max-width: 800px;
      background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
      border-radius: 16px;
      border: 2px solid rgba(255, 215, 0, 0.5);
      padding: 24px;
      box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
    `;
    
    const speakerBox = document.createElement('div');
    speakerBox.id = 'dialogue-speaker';
    speakerBox.style.cssText = `
      color: #FFD700;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    `;
    
    const textBox = document.createElement('div');
    textBox.id = 'dialogue-text';
    textBox.style.cssText = `
      color: white;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 20px;
      min-height: 60px;
    `;
    
    const choicesBox = document.createElement('div');
    choicesBox.id = 'dialogue-choices';
    choicesBox.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    
    const continueBtn = document.createElement('button');
    continueBtn.id = 'dialogue-continue';
    continueBtn.style.cssText = `
      background: rgba(255, 215, 0, 0.2);
      border: 1px solid rgba(255, 215, 0, 0.5);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    `;
    continueBtn.textContent = '继续 ▼';
    continueBtn.onmouseenter = () => continueBtn.style.background = 'rgba(255, 215, 0, 0.4)';
    continueBtn.onmouseleave = () => continueBtn.style.background = 'rgba(255, 215, 0, 0.2)';
    
    box.appendChild(speakerBox);
    box.appendChild(textBox);
    box.appendChild(choicesBox);
    box.appendChild(continueBtn);
    overlay.appendChild(box);
    
    return overlay;
  }
  
  private updateDialogueUI(dialogue: Dialogue): void {
    if (!this.dialogueUI) return;
    
    const speaker = this.dialogueUI.querySelector('#dialogue-speaker') as HTMLElement;
    const text = this.dialogueUI.querySelector('#dialogue-text') as HTMLElement;
    const choices = this.dialogueUI.querySelector('#dialogue-choices') as HTMLElement;
    const continueBtn = this.dialogueUI.querySelector('#dialogue-continue') as HTMLElement;
    
    speaker.textContent = dialogue.speaker;
    this.typeText(text, dialogue.text);
    
    choices.innerHTML = '';
    continueBtn.style.display = 'none';
    
    if (dialogue.choices && dialogue.choices.length > 0) {
      dialogue.choices.forEach(choice => {
        if (choice.condition && !choice.condition()) return;
        
        const btn = document.createElement('button');
        btn.style.cssText = `
          background: rgba(100, 100, 120, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 14px 20px;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          transition: all 0.2s;
        `;
        btn.textContent = `▶ ${choice.text}`;
        btn.onclick = () => {
          if (choice.effect) choice.effect();
          this.showDialogue(choice.nextId);
        };
        btn.onmouseenter = () => {
          btn.style.background = 'rgba(100, 100, 120, 0.9)';
          btn.style.borderColor = 'rgba(255, 215, 0, 0.5)';
        };
        btn.onmouseleave = () => {
          btn.style.background = 'rgba(100, 100, 120, 0.6)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        };
        choices.appendChild(btn);
      });
    } else if (dialogue.nextId) {
      continueBtn.style.display = 'block';
      continueBtn.onclick = () => this.showDialogue(dialogue.nextId!);
    } else {
      continueBtn.textContent = '关闭 ✕';
      continueBtn.style.display = 'block';
      continueBtn.onclick = () => this.closeDialogue();
    }
  }
  
  private typeText(element: HTMLElement, text: string): void {
    element.innerHTML = '';
    let index = 0;
    const speed = 30;
    
    const type = () => {
      if (index < text.length) {
        const char = text.charAt(index);
        if (char === '\n') {
          element.innerHTML += '<br>';
        } else {
          element.innerHTML += char;
        }
        index++;
        setTimeout(type, speed);
      }
    };
    
    type();
  }
  
  public closeDialogue(): void {
    if (this.currentDialogue) {
      this.completedDialogues.add(this.currentDialogue);
      this.dialogueHistory.push(this.currentDialogue);
    }
    
    this.isDialogueActive = false;
    this.currentDialogue = null;
    
    if (this.dialogueUI) {
      this.dialogueUI.remove();
      this.dialogueUI = null;
    }
    
    this.emit('dialogueEnd');
  }
  
  public updateObjective(questId: string, objectiveId: string, progress: number): void {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;
    
    const objective = quest.objectives.find(o => o.id === objectiveId);
    if (!objective) return;
    
    objective.current = Math.min(progress, objective.required);
    
    if (objective.current >= objective.required && !objective.completed) {
      objective.completed = true;
      this.emit('objectiveComplete', { questId, objectiveId });
    }
    
    this.checkQuestCompletion(questId);
    this.emit('questUpdated', { quest });
  }
  
  private checkQuestCompletion(questId: string): void {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;
    
    const allCompleted = quest.objectives.every(o => o.completed);
    if (allCompleted) {
      this.emit('questCompletable', { quest });
    }
  }
  
  public completeQuest(questId: string): void {
    const quest = this.activeQuests.get(questId);
    if (!quest) return;
    
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);
    
    this.emit('questCompleted', { quest });
    
    if (quest.reward.items) {
      quest.reward.items.forEach(item => {
        this.emit('rewardReceived', { item });
      });
    }
    
    if (quest.reward.achievement) {
      this.emit('achievementUnlocked', { achievementId: quest.reward.achievement });
    }
    
    if (quest.nextQuest) {
      const nextChapter = this.findChapterWithQuest(quest.nextQuest);
      if (nextChapter) {
        this.startDialogue(nextChapter);
      }
    }
  }
  
  private findChapterWithQuest(questId: string): string | null {
    for (const [chapterId, chapter] of this.chapters) {
      if (chapter.quests?.includes(questId)) {
        return chapterId;
      }
    }
    return null;
  }
  
  public getActiveQuests(): Quest[] {
    return Array.from(this.activeQuests.values());
  }
  
  public getCompletedQuests(): string[] {
    return Array.from(this.completedQuests);
  }
  
  public isDialogueOpen(): boolean {
    return this.isDialogueActive;
  }
  
  public getCurrentDialogue(): string | null {
    return this.currentDialogue;
  }
  
  public save(): { completedDialogues: string[]; completedQuests: string[]; activeQuests: [string, Quest][] } {
    return {
      completedDialogues: Array.from(this.completedDialogues),
      completedQuests: Array.from(this.completedQuests),
      activeQuests: Array.from(this.activeQuests.entries())
    };
  }
  
  public load(data: { completedDialogues: string[]; completedQuests: string[]; activeQuests: [string, Quest][] }): void {
    this.completedDialogues = new Set(data.completedDialogues);
    this.completedQuests = new Set(data.completedQuests);
    this.activeQuests = new Map(data.activeQuests);
  }
  
  public dispose(): void {
    this.closeDialogue();
  }
}
