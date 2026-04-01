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

export interface ConceptIdea {
  id: string;
  name: string;
  text: string;
  rank: number;
  notes: string;
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

export interface FollowUpStudy {
  method: string;
  gap: string;
  description: string;
}

export interface Assessment {
  data_utilization: AssessmentCategory;
  thematic_quality: AssessmentCategory;
  system_alignment: AssessmentCategory;
  bias: AssessmentCategory;
  passed: boolean;
  revealedInsights?: { content: string; type: 'qualitative' | 'quantitative' }[];
  followUpStudies?: FollowUpStudy[];
}

export interface HeuristicScore {
  name: string;
  score: number;
  comment: string;
}

export interface PersonaEvaluation {
  personaId: string;
  satisfactionScore: number;
  summary: string;
  heuristics: HeuristicScore[];
  topIssues: string[];
  positives: string[];
}

export interface AppState {
  currentPhase: Phase;
  rawCSVData: any[];
  stickies: StickyNote[];
  clusters: Cluster[];
  personas: Persona[];
  concepts: ConceptIdea[];
  chatHistories: Record<string, ChatMessage[]>;
  testPlan: TestPlan;
  mentorMessages: ChatMessage[];
  evaluativeUrl: string;
  personaEvaluations: PersonaEvaluation[];
  evalChatHistories: Record<string, ChatMessage[]>;
  rigorCheckPassed: boolean;
  lastAssessment?: Assessment;
}
