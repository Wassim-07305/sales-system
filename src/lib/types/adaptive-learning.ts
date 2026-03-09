// Types for the Adaptive Learning System (F32.4)

export type SkillCategory =
  | "prospection"
  | "closing"
  | "negociation"
  | "communication"
  | "objection";

export type SkillLevel = "Débutant" | "Intermédiaire" | "Avancé" | "Expert";

export interface DiagnosticQuestion {
  id: string;
  category: SkillCategory;
  categoryLabel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DiagnosticAnswer {
  questionId: string;
  answer: string;
}

export interface SkillScore {
  category: SkillCategory;
  categoryLabel: string;
  score: number; // 0-100
  level: SkillLevel;
  correct: number;
  total: number;
}

export interface DiagnosticResult {
  skills: SkillScore[];
  overallScore: number;
  completedAt: string;
  recommendedCourses: RecommendedCourse[];
}

export interface RecommendedCourse {
  id: string;
  title: string;
  description: string | null;
  skill: SkillCategory;
  skillLabel: string;
  priority: "haute" | "moyenne" | "basse";
  estimatedMinutes: number;
  progress?: number; // 0-100
}

export interface AdaptivePath {
  skills: SkillScore[];
  courses: RecommendedCourse[];
  overallScore: number;
  lastAssessedAt: string | null;
}
