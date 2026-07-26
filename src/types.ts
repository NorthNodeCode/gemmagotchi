export type PetType = 'sproutling' | 'pyros' | 'aether';

export type PetStage = 'seedling' | 'blooming' | 'ancient';

export interface PetState {
  id: string;
  name: string;
  type: PetType;
  stage: PetStage;
  health: number; // 0 to 100
  happiness: number; // 0 to 100
  xp: number;
  level: number;
  isSick: boolean; // True if health < 45 or procrastination skipped
  sizeScale: number; // 0.5 (shrunk/sick) to 1.5 (big/thriving)
  lastFedAt: string;
  accessories: string[];
}

export type CropType = 'sunflower' | 'wisdom_berry' | 'focus_sprout' | 'crystal_lotus' | 'golden_wheat';

export interface FarmPlot {
  id: number;
  cropType: CropType | null;
  stage: number; // 0 (empty), 1 (sprout), 2 (growing), 3 (mature bloom)
  watered: boolean;
  plantedAt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMins: number;
  completed: boolean;
  keyTakeaway?: string;
  quizQuestions?: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  iconName: string;
  estimatedWeeks: number;
  progressPercent: number;
  modules: CourseModule[];
}

export interface StudyLog {
  id: string;
  timestamp: string;
  courseTitle: string;
  durationMins: number;
  gemsEarned: number;
  petHealAmount: number;
  wasProcrastinationRescued: boolean;
}

export interface AINudge {
  nudge: string;
  tone: 'urgent' | 'encouraging' | 'celebratory' | 'warning';
  actionItem: string;
  petReaction: string;
}

export interface ProcrastinationRescueData {
  rescueTitle: string;
  microChallenge: string;
  quickQuestion?: QuizQuestion;
  rewardFocusGems: number;
  petHealAmount: number;
  encouragement: string;
}

export interface TrajectoryDataPoint {
  week: string;
  consistentMastery: number;
  procrastinatingMastery: number;
  petHealthConsistent: number;
  petHealthProcrastinating: number;
}

export interface TrajectoryForecast {
  summaryText: string;
  forecastData: TrajectoryDataPoint[];
  outcomes: {
    ifConsistent: string;
    ifProcrastinating: string;
  };
}
