export type Phase = 'exploratory' | 'generative' | 'evaluative';

export interface StickyNote {
  id: string;
  content: string;
  type: 'qualitative' | 'quantitative';
  x: number;
  y: number;
  clusterId?: string;
}

export interface Cluster {
  id: string;
  name: string;
  color: string;
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  frustrations: string[];
  goals: string[];
  bio: string;
}

export interface ChatMessage {
  role: 'user' | 'persona' | 'mentor';
  content: string;
  timestamp: number;
}

export interface TestPlan {
  scenarios: string[];
  tasks: string[];
  questions: string[];
}

export interface AssessmentCategory {
  passed: boolean;
  feedback_string: string;
}

export interface Assessment {
  data_utilization: AssessmentCategory;
  thematic_quality: AssessmentCategory;
  system_alignment: AssessmentCategory;
  bias: AssessmentCategory;
  passed: boolean;
  revealedInsights?: { content: string; type: 'qualitative' | 'quantitative' }[];
}

export interface AppState {
  currentPhase: Phase;
  rawCSVData: any[];
  stickies: StickyNote[];
  clusters: Cluster[];
  personas: Persona[];
  conceptPitch: string;
  chatHistory: ChatMessage[];
  testPlan: TestPlan;
  mentorMessages: ChatMessage[];
  rigorCheckPassed: boolean;
  lastAssessment?: Assessment;
}
