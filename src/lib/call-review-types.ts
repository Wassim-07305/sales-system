// F48.3 — Call Review & Analysis types

export interface CallReviewScoreBreakdown {
  ouverture: number;
  decouverte: number;
  argumentation: number;
  closing: number;
}

export interface CallReviewAIAnalysis {
  scoreBreakdown: CallReviewScoreBreakdown;
  sentimentTimeline: {
    time: string;
    sentiment: "positif" | "neutre" | "négatif";
  }[];
  objections: string[];
  recommendations: string[];
  talkRatio: { vendeur: number; prospect: number };
  keyMoments: string[];
}

export interface CallReview {
  id: string;
  callId: string;
  userId: string;
  transcript: string;
  aiAnalysis: CallReviewAIAnalysis | null;
  score: number;
  keywords: string[];
  sentiment: "positif" | "neutre" | "négatif" | "mixte";
  strengths: string[];
  improvements: string[];
  prospectName: string;
  duration: number; // minutes
  createdAt: string;
}

export interface CallReviewStats {
  totalReviews: number;
  averageScore: number;
  commonKeywords: { keyword: string; count: number }[];
  improvementTrends: { area: string; count: number }[];
  scoreOverTime: { date: string; score: number }[];
  scoreDistribution: { range: string; count: number }[];
}
