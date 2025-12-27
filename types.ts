
export interface ContentImprovement {
  section: string;
  suggestion: string;
}

export interface ProposedChanges {
  integratedKeywords: string[];
  phrasingImprovements: Array<{
    section: string;
    original: string;
    improved: string;
    reason: string;
  }>;
  predictedScore: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  category: 'Logical' | 'Quantitative' | 'Technical' | 'Verbal' | 'System Design';
}

export interface OptimizedResume {
  name: string;
  jobTitle: string;
  profile: string;
  profilePhoto?: string;
  contact: {
    phone: string;
    website: string;
    email: string;
  };
  hobbies: string[];
  education: Array<{
    school: string;
    dates: string;
    details: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    dates: string;
    details: string;
  }>;
  skills: string[];
}

export interface AnalysisResult {
  matchPercentage: number;
  overallSummary: string;
  missingKeywords: string[];
  softSkillsMissing: string[];
  contentImprovements: ContentImprovement[];
  atsOptimizationTips: string[];
  matchingStrengths: string[];
}

export enum AnalysisStep {
  LANDING = 'LANDING',
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  PROPOSING = 'PROPOSING',
  REVIEWING = 'REVIEWING',
  OPTIMIZED_RESUME = 'OPTIMIZED_RESUME',
  QUIZ = 'QUIZ',
  QUIZ_RESULTS = 'QUIZ_RESULTS'
}
