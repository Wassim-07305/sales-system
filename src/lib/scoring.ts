/**
 * Advanced prospect scoring utilities.
 * Shared between server actions and client components.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ScoreTier = "froid" | "tiede" | "chaud" | "brulant";

export interface ScoreBreakdown {
  statusScore: number;        // max 30
  engagementScore: number;    // max 15
  recencyScore: number;       // max 15
  notesScore: number;         // max 10
  platformFitScore: number;   // max 10
  behavioralScore: number;    // max 15 (message frequency + conversation depth)
  decayPenalty: number;       // 0 to -15
  total: number;
  tier: ScoreTier;
  tierLabel: string;
}

// ─── Tier helpers ───────────────────────────────────────────────────

export function getScoreTier(score: number): ScoreTier {
  if (score >= 76) return "brulant";
  if (score >= 51) return "chaud";
  if (score >= 26) return "tiede";
  return "froid";
}

export function getScoreTierLabel(tier: ScoreTier): string {
  const labels: Record<ScoreTier, string> = {
    froid: "Froid",
    tiede: "Tiede",
    chaud: "Chaud",
    brulant: "Brulant",
  };
  return labels[tier];
}

// ─── Score computation (pure function) ──────────────────────────────

/**
 * Computes the advanced score breakdown for a single prospect.
 * Pure function — no DB access, safe for both server and client use.
 *
 * Factors:
 *  1. Statut du pipeline (30 pts max)
 *  2. Engagement existant (15 pts max)
 *  3. Recence du dernier message (15 pts max)
 *  4. Profondeur des notes (10 pts max)
 *  5. Fit plateforme (10 pts max)
 *  6. Score comportemental (15 pts max)
 *  7. Penalite d'inactivite (0 a -15 pts)
 */
export function computeScoreBreakdown(
  prospect: Record<string, unknown>,
  allProspects: Record<string, unknown>[]
): ScoreBreakdown {
  // ── 1. Statut (30 pts max) ──
  const statusWeights: Record<string, number> = {
    new: 4,
    contacted: 12,
    replied: 20,
    interested: 25,
    booked: 28,
    converted: 30,
    lost: 2,
    not_interested: 2,
  };
  const statusScore = statusWeights[prospect.status as string] ?? 4;

  // ── 2. Engagement existant (15 pts max) ──
  const rawEngagement = typeof prospect.engagement_score === "number" ? prospect.engagement_score : 0;
  const engagementScore = Math.round((Math.min(rawEngagement, 100) / 100) * 15);

  // ── 3. Recence du dernier message (15 pts max) ──
  let recencyScore = 0;
  const lastMessageDate = prospect.last_message_at
    ? new Date(prospect.last_message_at as string)
    : null;

  let daysSinceMessage = -1;
  if (lastMessageDate) {
    daysSinceMessage = Math.floor(
      (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceMessage <= 1) recencyScore = 15;
    else if (daysSinceMessage <= 3) recencyScore = 12;
    else if (daysSinceMessage <= 7) recencyScore = 9;
    else if (daysSinceMessage <= 14) recencyScore = 5;
    else if (daysSinceMessage <= 30) recencyScore = 2;
    else recencyScore = 0;
  }

  // ── 4. Notes / profondeur de conversation (10 pts max) ──
  let notesScore = 0;
  const notes = typeof prospect.notes === "string" ? prospect.notes.trim() : "";
  if (notes.length > 200) notesScore = 10;
  else if (notes.length > 100) notesScore = 7;
  else if (notes.length > 30) notesScore = 5;
  else if (notes.length > 0) notesScore = 3;

  // ── 5. Fit plateforme (10 pts max) ──
  let platformFitScore = 5; // default middle score
  if (allProspects.length > 0) {
    const platformStats: Record<string, { total: number; converted: number }> = {};
    for (const p of allProspects) {
      const plat = (p.platform as string) || "autre";
      if (!platformStats[plat]) platformStats[plat] = { total: 0, converted: 0 };
      platformStats[plat].total++;
      const positiveStatuses = ["interested", "booked", "converted"];
      if (positiveStatuses.includes(p.status as string)) {
        platformStats[plat].converted++;
      }
    }
    // Find best platform by conversion rate
    let bestPlatform = "";
    let bestRate = -1;
    for (const [plat, stats] of Object.entries(platformStats)) {
      const rate = stats.total > 0 ? stats.converted / stats.total : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestPlatform = plat;
      }
    }
    const prospectPlatform = (prospect.platform as string) || "autre";
    if (prospectPlatform === bestPlatform) platformFitScore = 10;
    else {
      const ownStats = platformStats[prospectPlatform];
      if (ownStats && ownStats.total > 0) {
        const ownRate = ownStats.converted / ownStats.total;
        platformFitScore = Math.round(3 + ownRate * 7); // 3-10
      } else {
        platformFitScore = 3;
      }
    }
  }

  // ── 6. Score comportemental (15 pts max) ──
  let behavioralScore = 0;
  const conversationHistory = Array.isArray(prospect.conversation_history)
    ? prospect.conversation_history
    : [];
  const messageCount = conversationHistory.length;

  // Message frequency component (up to 8 pts)
  if (messageCount >= 10) behavioralScore += 8;
  else if (messageCount >= 6) behavioralScore += 6;
  else if (messageCount >= 3) behavioralScore += 4;
  else if (messageCount >= 1) behavioralScore += 2;

  // Conversation depth from notes length (up to 7 pts)
  if (notes.length > 300) behavioralScore += 7;
  else if (notes.length > 150) behavioralScore += 5;
  else if (notes.length > 50) behavioralScore += 3;
  else if (notes.length > 0) behavioralScore += 1;

  // ── 7. Penalite de declin (0 a -15 pts) ──
  let decayPenalty = 0;
  if (daysSinceMessage > 14) {
    const weeksInactive = Math.floor((daysSinceMessage - 14) / 7);
    decayPenalty = -Math.min(15, weeksInactive * 3 + 3);
  }

  // ── Total (clamp 0-100) ──
  const rawTotal =
    statusScore + engagementScore + recencyScore + notesScore +
    platformFitScore + behavioralScore + decayPenalty;
  const total = Math.max(0, Math.min(100, rawTotal));

  const tier = getScoreTier(total);

  return {
    statusScore,
    engagementScore,
    recencyScore,
    notesScore,
    platformFitScore,
    behavioralScore,
    decayPenalty,
    total,
    tier,
    tierLabel: getScoreTierLabel(tier),
  };
}
