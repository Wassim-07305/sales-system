"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { BADGE_DEFINITIONS } from "@/lib/badge-definitions";
import { REWARDS_CATALOG } from "@/lib/reward-definitions";
import { notify } from "@/lib/actions/notifications";

const LEVELS = [
  { level: 1, name: "Setter Débutant", minPoints: 0 },
  { level: 2, name: "Setter Confirmé", minPoints: 100 },
  { level: 3, name: "Setter Senior", minPoints: 300 },
  { level: 4, name: "Setter Elite", minPoints: 600 },
  { level: 5, name: "Setter Légende", minPoints: 1000 },
];

function getLevelForPoints(points: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

export async function addPoints(
  userId: string,
  points: number,
  reason: string,
) {
  const supabase = await createClient();

  // Get or create gamification profile
  let { data: profile } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("gamification_profiles")
      .insert({ user_id: userId })
      .select()
      .single();
    profile = newProfile;
  }

  if (!profile) return;

  const newTotal = profile.total_points + points;
  const oldLevel = getLevelForPoints(profile.total_points);
  const newLevel = getLevelForPoints(newTotal);

  await supabase
    .from("gamification_profiles")
    .update({
      total_points: newTotal,
      level: newLevel.level,
      level_name: newLevel.name,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Level up notification (in-app + push)
  if (newLevel.level > oldLevel.level) {
    notify(
      userId,
      `Niveau ${newLevel.level} atteint !`,
      `Félicitations ! Vous êtes maintenant ${newLevel.name} avec ${newTotal} points.`,
      {
        type: "level_up",
        link: "/challenges",
      },
    );
  }

  // Regular points notification (in-app + push)
  notify(userId, `+${points} points`, reason, {
    type: "points",
    link: "/challenges",
  });

  revalidatePath("/challenges");
  revalidatePath("/team/leaderboard");
}

export async function updateChallengeProgress(
  userId: string,
  metric: string,
  value: number,
) {
  const supabase = await createClient();

  // Get active challenges for this metric
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("metric", metric)
    .eq("is_active", true);

  if (!challenges) return;

  for (const challenge of challenges) {
    // Get or create progress
    let { data: progress } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("challenge_id", challenge.id)
      .single();

    if (!progress) {
      const { data: newProgress } = await supabase
        .from("challenge_progress")
        .insert({
          user_id: userId,
          challenge_id: challenge.id,
          current_value: 0,
        })
        .select()
        .single();
      progress = newProgress;
    }

    if (!progress || progress.completed) continue;

    const newValue = Math.min(
      (progress.current_value || 0) + value,
      challenge.target_value,
    );
    const justCompleted =
      newValue >= challenge.target_value && !progress.completed;

    await supabase
      .from("challenge_progress")
      .update({
        current_value: newValue,
        completed: justCompleted || progress.completed,
        completed_at: justCompleted
          ? new Date().toISOString()
          : progress.completed_at,
      })
      .eq("id", progress.id);

    // Award points on completion
    if (justCompleted) {
      await addPoints(
        userId,
        challenge.points_reward,
        `Défi complété : ${challenge.title}`,
      );
    }
  }

  revalidatePath("/challenges");
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

export async function getAvailableBadges() {
  return BADGE_DEFINITIONS;
}

/**
 * Award a specific badge to a user. Adds to the jsonb `badges` array if not
 * already present. Also awards bonus points.
 */
export async function awardBadge(userId: string, badgeId: string) {
  const supabase = await createClient();

  const badge = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
  if (!badge) return { awarded: false, reason: "Badge inconnu" };

  // Get current profile
  const { data: profile } = await supabase
    .from("gamification_profiles")
    .select("badges")
    .eq("user_id", userId)
    .single();

  if (!profile) return { awarded: false, reason: "Profil introuvable" };

  const currentBadges: Array<{
    badge_id: string;
    name: string;
    earned_at: string;
  }> = Array.isArray(profile.badges) ? profile.badges : [];

  // Already earned?
  if (currentBadges.some((b) => b.badge_id === badgeId)) {
    return { awarded: false, reason: "Badge deja obtenu" };
  }

  const newBadge = {
    badge_id: badgeId,
    name: badge.name,
    earned_at: new Date().toISOString(),
  };

  await supabase
    .from("gamification_profiles")
    .update({ badges: [...currentBadges, newBadge] })
    .eq("user_id", userId);

  // Award bonus points for earning the badge
  await addPoints(userId, badge.points, `Badge obtenu : ${badge.name}`);

  // Send notification (in-app + push)
  notify(userId, `Badge débloqué : ${badge.name} !`, badge.description, {
    type: "badge",
    link: "/challenges",
  });

  revalidatePath("/challenges");
  return { awarded: true, badge };
}

/**
 * Check all badge criteria for a user and auto-award any newly eligible ones.
 * Returns the list of newly awarded badges.
 */
export async function checkBadgeEligibility(userId: string) {
  const supabase = await createClient();

  // Fetch profile
  const { data: profile } = await supabase
    .from("gamification_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) return [];

  const earned: Array<{ badge_id: string }> = Array.isArray(profile.badges)
    ? profile.badges
    : [];
  const earnedIds = new Set(earned.map((b) => b.badge_id));
  const newlyAwarded: string[] = [];

  // Helper: check and award
  async function tryAward(badgeId: string, eligible: boolean) {
    if (!earnedIds.has(badgeId) && eligible) {
      const result = await awardBadge(userId, badgeId);
      if (result.awarded) newlyAwarded.push(badgeId);
    }
  }

  // 1. first_deal – at least 1 deal in the last pipeline stage (signed)
  const { count: dealsCount } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", userId);
  await tryAward("first_deal", (dealsCount ?? 0) >= 1);

  // 2. closer_star – 5 deals closed (assigned_to)
  await tryAward("closer_star", (dealsCount ?? 0) >= 5);

  // 3. week_streak & month_streak
  await tryAward("week_streak", (profile.current_streak ?? 0) >= 7);
  await tryAward("month_streak", (profile.current_streak ?? 0) >= 30);

  // 4. 10_calls & 50_calls
  const { count: callsCount } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  await tryAward("10_calls", (callsCount ?? 0) >= 10);
  await tryAward("50_calls", (callsCount ?? 0) >= 50);

  // 5. prospecting_pro – 50 prospects
  const { count: prospectsCount } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  await tryAward("prospecting_pro", (prospectsCount ?? 0) >= 50);

  // 6. team_player – 10 community posts
  const { count: postsCount } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId);
  await tryAward("team_player", (postsCount ?? 0) >= 10);

  // 7. speed_demon – 3 deals created in the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { count: recentDeals } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", userId)
    .gte("created_at", oneWeekAgo.toISOString());
  await tryAward("speed_demon", (recentDeals ?? 0) >= 3);

  // 8. legend – level 5
  await tryAward("legend", (profile.level ?? 1) >= 5);

  revalidatePath("/challenges");
  return newlyAwarded;
}

// ---------------------------------------------------------------------------
// Streak management
// ---------------------------------------------------------------------------

/**
 * Check if the user has logged a daily journal today. If yes, increment streak.
 * If the last journal was yesterday, keep the streak going. Otherwise reset to 1
 * (if today logged) or 0 (if not logged today).
 */
export async function checkAndUpdateStreak(userId: string) {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Check for today's journal
  const { data: todayJournal } = await supabase
    .from("daily_journals")
    .select("id")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  // Get current profile
  const { data: profile } = await supabase
    .from("gamification_profiles")
    .select("current_streak, updated_at")
    .eq("user_id", userId)
    .single();

  if (!profile) return { streak: 0 };

  if (!todayJournal) {
    // No journal today – don't modify streak yet (user might still log)
    return { streak: profile.current_streak ?? 0 };
  }

  // Check yesterday's journal to decide increment vs. reset
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: yesterdayJournal } = await supabase
    .from("daily_journals")
    .select("id")
    .eq("user_id", userId)
    .eq("date", yesterdayStr)
    .single();

  // Calculate new streak
  const lastUpdatedDate = profile.updated_at
    ? profile.updated_at.split("T")[0]
    : null;

  let newStreak: number;

  if (lastUpdatedDate === today) {
    // Already updated today
    return { streak: profile.current_streak ?? 0 };
  }

  if (yesterdayJournal) {
    // Continuation of streak
    newStreak = (profile.current_streak ?? 0) + 1;
  } else {
    // Streak broken – reset to 1 (today counts as day 1)
    newStreak = 1;
  }

  await supabase
    .from("gamification_profiles")
    .update({
      current_streak: newStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Check streak-related badges after update
  if (newStreak >= 7 || newStreak >= 30) {
    await checkBadgeEligibility(userId);
  }

  revalidatePath("/challenges");
  return { streak: newStreak };
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getGamificationAnalytics() {
  const supabase = await createClient();

  // 1. All gamification profiles
  const { data: profiles } = await supabase
    .from("gamification_profiles")
    .select("user_id, level, level_name, total_points, current_streak, badges");

  const allProfiles = profiles || [];
  const totalUsers = allProfiles.length;

  // 2. Points distribution (histogram buckets)
  const buckets = [
    { label: "0-99", min: 0, max: 99 },
    { label: "100-299", min: 100, max: 299 },
    { label: "300-599", min: 300, max: 599 },
    { label: "600-999", min: 600, max: 999 },
    { label: "1000+", min: 1000, max: Infinity },
  ];
  const pointsDistribution = buckets.map((b) => ({
    range: b.label,
    count: allProfiles.filter(
      (p) => p.total_points >= b.min && p.total_points <= b.max,
    ).length,
  }));

  // 3. Average streak
  const avgStreak =
    totalUsers > 0
      ? Math.round(
          (allProfiles.reduce((sum, p) => sum + (p.current_streak ?? 0), 0) /
            totalUsers) *
            10,
        ) / 10
      : 0;

  // 4. Average points
  const avgPoints =
    totalUsers > 0
      ? Math.round(
          allProfiles.reduce((sum, p) => sum + (p.total_points ?? 0), 0) /
            totalUsers,
        )
      : 0;

  // 5. Badge completion rates
  const badgeCompletionRates = BADGE_DEFINITIONS.map((badge) => {
    const earned = allProfiles.filter((p) => {
      const badges: Array<{ badge_id: string }> = Array.isArray(p.badges)
        ? p.badges
        : [];
      return badges.some((b) => b.badge_id === badge.id);
    }).length;
    return {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      color: badge.color,
      category: badge.category,
      earned,
      total: totalUsers,
      rate: totalUsers > 0 ? Math.round((earned / totalUsers) * 100) : 0,
    };
  });

  // Most popular badge
  const mostPopularBadge =
    badgeCompletionRates.length > 0
      ? badgeCompletionRates.reduce((best, b) =>
          b.earned > best.earned ? b : best,
        )
      : null;

  // 6. Level distribution
  const levelDistribution = LEVELS.map((l) => ({
    level: l.level,
    name: l.name,
    count: allProfiles.filter((p) => p.level === l.level).length,
  }));

  // 7. Challenge completion rates
  const { data: allChallenges } = await supabase
    .from("challenges")
    .select("id, title, is_active, target_value, points_reward");

  const { data: allProgress } = await supabase
    .from("challenge_progress")
    .select("challenge_id, completed");

  const challengeStats = (allChallenges || []).map((ch) => {
    const participants = (allProgress || []).filter(
      (p) => p.challenge_id === ch.id,
    );
    const completed = participants.filter((p) => p.completed).length;
    return {
      id: ch.id,
      title: ch.title,
      isActive: ch.is_active,
      participants: participants.length,
      completed,
      rate:
        participants.length > 0
          ? Math.round((completed / participants.length) * 100)
          : 0,
    };
  });

  const totalChallengesCompleted = (allProgress || []).filter(
    (p) => p.completed,
  ).length;

  // 8. Mood trends (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: journals } = await supabase
    .from("daily_journals")
    .select("date, mood")
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  // Group by date and average mood
  const moodByDate: Record<string, { sum: number; count: number }> = {};
  for (const j of journals || []) {
    if (j.mood == null) continue;
    if (!moodByDate[j.date]) moodByDate[j.date] = { sum: 0, count: 0 };
    moodByDate[j.date].sum += j.mood;
    moodByDate[j.date].count += 1;
  }
  const moodTrend = Object.entries(moodByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      mood: Math.round((sum / count) * 10) / 10,
    }));

  // 9. Impact analysis: active gamifiers (streak >= 7) vs others
  const activeUserIds = allProfiles
    .filter((p) => (p.current_streak ?? 0) >= 7)
    .map((p) => p.user_id);
  const otherUserIds = allProfiles
    .filter((p) => (p.current_streak ?? 0) < 7)
    .map((p) => p.user_id);

  async function getDealStats(userIds: string[]) {
    if (userIds.length === 0) return { avgDeals: 0, avgRevenue: 0 };
    const { data: deals } = await supabase
      .from("deals")
      .select("assigned_to, amount")
      .in("assigned_to", userIds);
    const d = deals || [];
    const totalDeals = d.length;
    const totalRevenue = d.reduce((s, deal) => s + (deal.amount ?? 0), 0);
    return {
      avgDeals:
        userIds.length > 0
          ? Math.round((totalDeals / userIds.length) * 10) / 10
          : 0,
      avgRevenue:
        userIds.length > 0 ? Math.round(totalRevenue / userIds.length) : 0,
    };
  }

  const activeStats = await getDealStats(activeUserIds);
  const otherStats = await getDealStats(otherUserIds);

  return {
    totalUsers,
    avgPoints,
    avgStreak,
    totalChallengesCompleted,
    mostPopularBadge,
    pointsDistribution,
    badgeCompletionRates,
    levelDistribution,
    challengeStats,
    moodTrend,
    impact: {
      active: { count: activeUserIds.length, ...activeStats },
      others: { count: otherUserIds.length, ...otherStats },
    },
  };
}

// ---------------------------------------------------------------------------
// Rewards catalog & redemption (F40.1 – Primes & Récompenses Réelles)
// ---------------------------------------------------------------------------

// Reward and REWARDS_CATALOG imported from @/lib/reward-definitions

export async function getRewardsCatalog() {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from("gamification_profiles")
      .select("total_points")
      .eq("user_id", user.id)
      .single();

    return {
      rewards: REWARDS_CATALOG,
      currentPoints: profile?.total_points ?? 0,
    };
  } catch {
    return { rewards: REWARDS_CATALOG, currentPoints: 0 };
  }
}

export async function redeemReward(rewardId: string) {
  try {
    const { supabase, user } = await requireAuth();

    const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);
    if (!reward) return { success: false, error: "Récompense introuvable" };

    // Get current profile
    const { data: profile } = await supabase
      .from("gamification_profiles")
      .select("total_points")
      .eq("user_id", user.id)
      .single();

    if (!profile)
      return { success: false, error: "Profil gamification introuvable" };

    if (profile.total_points < reward.pointsCost) {
      return { success: false, error: "Points insuffisants" };
    }

    const newTotal = profile.total_points - reward.pointsCost;
    const newLevel = getLevelForPoints(newTotal);

    // Deduct points
    await supabase
      .from("gamification_profiles")
      .update({
        total_points: newTotal,
        level: newLevel.level,
        level_name: newLevel.name,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // Log in audit_logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "reward_redeemed",
      details: {
        reward_id: reward.id,
        reward_name: reward.name,
        points_spent: reward.pointsCost,
        remaining_points: newTotal,
      },
    });

    // Send notification (in-app + push)
    notify(
      user.id,
      `Récompense échangée : ${reward.name}`,
      `Vous avez échangé ${reward.pointsCost} points contre "${reward.name}". Il vous reste ${newTotal} points.`,
      {
        type: "reward",
        link: "/challenges/rewards",
      },
    );

    revalidatePath("/challenges");
    revalidatePath("/challenges/rewards");

    return { success: true, remainingPoints: newTotal };
  } catch {
    return { success: false, error: "Non authentifié" };
  }
}

// ---------------------------------------------------------------------------
// Achievements (F40.2 – Achievements & Unlock System)
// ---------------------------------------------------------------------------

export async function getAchievements() {
  const { ACHIEVEMENTS } = await import("@/lib/achievement-definitions");
  try {
    const { supabase, user } = await requireAuth();

    // Get gamification profile — achievements stored in badges JSONB with type "achievement"
    const { data: profile } = await supabase
      .from("gamification_profiles")
      .select("total_points, current_streak, badges")
      .eq("user_id", user.id)
      .single();

    // Extract unlocked achievements from badges JSONB array
    const allBadges: Array<{
      badge_id: string;
      type?: string;
      earned_at: string;
    }> = Array.isArray(profile?.badges) ? profile.badges : [];
    const unlockedMap = new Map<string, string>();
    for (const b of allBadges) {
      if (b.type === "achievement") {
        unlockedMap.set(b.badge_id, b.earned_at);
      }
    }

    // Fetch counts for progress computation
    const [
      { count: dealsCount },
      { count: callsCount },
      { count: prospectsCount },
      { count: postsCount },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id),
      supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("prospects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", user.id),
    ]);

    const currentStreak = profile?.current_streak ?? 0;

    // Check for speed_closer (deal with closed_at set)
    const { count: speedCloseCount } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .not("closed_at", "is", null);

    function getCurrentValue(achievementId: string, category: string): number {
      switch (category) {
        case "deals":
          return dealsCount ?? 0;
        case "appels":
          return callsCount ?? 0;
        case "prospection":
          return prospectsCount ?? 0;
        case "streaks":
          return currentStreak;
        case "social":
          return postsCount ?? 0;
        case "hidden":
          if (achievementId === "speed_closer") return speedCloseCount ?? 0;
          // night_owl / early_bird are only unlocked via special triggers
          if (achievementId === "night_owl" || achievementId === "early_bird") {
            return unlockedMap.has(achievementId) ? 1 : 0;
          }
          return 0;
        default:
          return 0;
      }
    }

    const achievements = ACHIEVEMENTS.map((ach) => {
      const currentValue = getCurrentValue(ach.id, ach.category);
      const unlocked = unlockedMap.has(ach.id);
      const unlockedAt = unlockedMap.get(ach.id) ?? null;

      return {
        ...ach,
        currentValue: Math.min(currentValue, ach.targetValue),
        unlocked,
        unlockedAt,
      };
    });

    return {
      achievements,
      totalPoints: profile?.total_points ?? 0,
    };
  } catch {
    return { achievements: [], totalPoints: 0 };
  }
}

export async function checkAchievementProgress(userId: string) {
  const { ACHIEVEMENTS } = await import("@/lib/achievement-definitions");
  const supabase = await createClient();

  // Get profile with badges JSONB
  const { data: profile } = await supabase
    .from("gamification_profiles")
    .select("current_streak, badges")
    .eq("user_id", userId)
    .single();

  if (!profile) return [];

  const currentBadges: Array<{
    badge_id: string;
    type?: string;
    name: string;
    earned_at: string;
  }> = Array.isArray(profile.badges) ? profile.badges : [];
  const unlockedIds = new Set(
    currentBadges
      .filter((b) => b.type === "achievement")
      .map((b) => b.badge_id),
  );

  // Fetch counts
  const [
    { count: dealsCount },
    { count: callsCount },
    { count: prospectsCount },
    { count: postsCount },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", userId),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId),
  ]);

  const currentStreak = profile.current_streak ?? 0;

  function getCurrentValue(achievementId: string, category: string): number {
    switch (category) {
      case "deals":
        return dealsCount ?? 0;
      case "appels":
        return callsCount ?? 0;
      case "prospection":
        return prospectsCount ?? 0;
      case "streaks":
        return currentStreak;
      case "social":
        return postsCount ?? 0;
      default:
        return 0;
    }
  }

  const newlyUnlocked: string[] = [];
  let updatedBadges = [...currentBadges];

  for (const ach of ACHIEVEMENTS) {
    if (unlockedIds.has(ach.id)) continue;
    // Skip hidden achievements — they require special triggers
    if (ach.hidden) continue;

    const currentValue = getCurrentValue(ach.id, ach.category);
    if (currentValue >= ach.targetValue) {
      // Store in badges JSONB with type "achievement"
      updatedBadges = [
        ...updatedBadges,
        {
          badge_id: ach.id,
          type: "achievement",
          name: ach.name,
          earned_at: new Date().toISOString(),
        },
      ];

      // Award points
      await addPoints(userId, ach.points, `Achievement debloque : ${ach.name}`);

      // Send notification (in-app + push)
      notify(userId, `Achievement débloqué : ${ach.name} !`, ach.description, {
        type: "achievement",
        link: "/challenges/achievements",
      });

      newlyUnlocked.push(ach.id);
    }
  }

  // Persist updated badges array
  if (newlyUnlocked.length > 0) {
    await supabase
      .from("gamification_profiles")
      .update({ badges: updatedBadges })
      .eq("user_id", userId);

    revalidatePath("/challenges/achievements");
    revalidatePath("/challenges");
  }

  return newlyUnlocked;
}

// ── Journal de Bord / EOD ──────────────────────────────────────────

export async function submitDailyJournal(data: {
  dms_sent: number;
  replies_received: number;
  calls_booked: number;
  calls_completed: number;
  deals_closed: number;
  revenue_generated: number;
  mood: "great" | "good" | "neutral" | "tough" | "bad";
  wins: string;
  blockers: string;
  plan_tomorrow: string;
}) {
  try {
    const { supabase, user } = await requireAuth();

    const today = new Date().toISOString().split("T")[0];

    // Upsert for today
    const { error } = await supabase.from("daily_journals").upsert(
      {
        user_id: user.id,
        date: today,
        dms_sent: data.dms_sent,
        replies_received: data.replies_received,
        calls_booked: data.calls_booked,
        calls_completed: data.calls_completed,
        deals_closed: data.deals_closed,
        revenue_generated: data.revenue_generated,
        mood: data.mood,
        wins: data.wins,
        blockers: data.blockers,
        plan_tomorrow: data.plan_tomorrow,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    );

    if (error) return { error: error.message };

    // Notify about the EOD (in-app + push)
    notify(
      user.id,
      "EOD soumis",
      `Journal du ${today} : ${data.dms_sent} DMs, ${data.calls_booked} calls bookés, ${data.deals_closed} deals closés`,
      {
        type: "eod_submitted",
        link: "/team/journal",
      },
    );

    // Notify the assigned B2B entrepreneur (matched_entrepreneur_id)
    try {
      const { data: setterProfile } = await supabase
        .from("profiles")
        .select("full_name, matched_entrepreneur_id")
        .eq("id", user.id)
        .single();

      if (setterProfile?.matched_entrepreneur_id) {
        const setterName = setterProfile.full_name || "Setter";
        notify(
          setterProfile.matched_entrepreneur_id,
          `EOD de ${setterName}`,
          `Messages envoyés: ${data.dms_sent}, Réponses: ${data.replies_received}, Appels: ${data.calls_booked}`,
          {
            type: "eod_report",
            link: "/team/journal",
          },
        );
      }
    } catch {
      // Don't block EOD submission if entrepreneur notification fails
    }

    // Award gamification points for daily journal
    try {
      await addPoints(user.id, 5, "Journal quotidien soumis");
    } catch {
      // ignore gamification errors
    }

    revalidatePath("/journal");
    revalidatePath("/team/journal");
    return { success: true };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function getDailyJournal(date?: string) {
  try {
    const { supabase, user } = await requireAuth();

    const targetDate = date || new Date().toISOString().split("T")[0];

    const { data } = await supabase
      .from("daily_journals")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", targetDate)
      .single();

    return data;
  } catch {
    return null;
  }
}

export async function getJournalHistory(userId?: string, limit = 30) {
  try {
    const { supabase, user } = await requireAuth();

    const targetUserId = userId || user.id;

    const { data } = await supabase
      .from("daily_journals")
      .select("*")
      .eq("user_id", targetUserId)
      .order("date", { ascending: false })
      .limit(limit);

    return data || [];
  } catch {
    return [];
  }
}

export async function getTeamJournals(date?: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager", "client_b2b"].includes(profile.role))
      return [];

    const targetDate = date || new Date().toISOString().split("T")[0];

    // B2B clients only see journals from their assigned setters
    if (profile.role === "client_b2b") {
      const { data: assignedSetters } = await supabase
        .from("profiles")
        .select("id")
        .eq("matched_entrepreneur_id", user.id);

      const setterIds = (assignedSetters || []).map((s) => s.id);
      if (setterIds.length === 0) return [];

      const { data } = await supabase
        .from("daily_journals")
        .select("*, profile:profiles!user_id(full_name, avatar_url, role)")
        .eq("date", targetDate)
        .in("user_id", setterIds)
        .order("submitted_at", { ascending: false });

      return data || [];
    }

    // Admin/Manager see all journals
    const { data } = await supabase
      .from("daily_journals")
      .select("*, profile:profiles!user_id(full_name, avatar_url, role)")
      .eq("date", targetDate)
      .order("submitted_at", { ascending: false });

    return data || [];
  } catch {
    return [];
  }
}

export async function getMissingEodSetters(date?: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager", "client_b2b"].includes(profile.role))
      return [];

    const targetDate = date || new Date().toISOString().split("T")[0];

    // B2B clients only see missing EODs from their assigned setters
    let setters: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    }[] = [];

    if (profile.role === "client_b2b") {
      const { data: assignedSetters } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("matched_entrepreneur_id", user.id);
      setters = assignedSetters || [];
    } else {
      // Admin/Manager see all setters/closers
      const { data: allSetters } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("role", ["setter", "closer"]);
      setters = allSetters || [];
    }

    if (setters.length === 0) return [];

    // Get who submitted for this date
    const { data: submitted } = await supabase
      .from("daily_journals")
      .select("user_id")
      .eq("date", targetDate);

    const submittedIds = new Set((submitted || []).map((s) => s.user_id));
    return setters.filter((s) => !submittedIds.has(s.id));
  } catch {
    return [];
  }
}

export async function getTeamJournalRange(
  from: string,
  to: string,
  setterId?: string,
) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager", "client_b2b"].includes(profile.role))
      return [];

    let query = supabase
      .from("daily_journals")
      .select("*, profile:profiles!user_id(full_name, avatar_url, role)")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: false });

    if (setterId) {
      query = query.eq("user_id", setterId);
    } else if (profile.role === "client_b2b") {
      const { data: assignedSetters } = await supabase
        .from("profiles")
        .select("id")
        .eq("matched_entrepreneur_id", user.id);
      const setterIds = (assignedSetters || []).map((s) => s.id);
      if (setterIds.length === 0) return [];
      query = query.in("user_id", setterIds);
    }

    const { data } = await query;
    return data || [];
  } catch {
    return [];
  }
}

export async function getTeamSetters() {
  try {
    const { supabase, user } = await requireAuth();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "manager", "client_b2b"].includes(profile.role))
      return [];

    if (profile.role === "client_b2b") {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("matched_entrepreneur_id", user.id)
        .order("full_name");
      return data || [];
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("role", ["setter", "closer"])
      .order("full_name");
    return data || [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Setter/Closer Tasks (to-do list)
// ---------------------------------------------------------------------------

export async function getSetterTasks() {
  try {
    const { supabase, user } = await requireAuth();

    try {
      const { data, error } = await supabase
        .from("setter_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Table doesn't exist – graceful fallback
      if (error && error.code === "42P01") return [];
      return data || [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

export async function createSetterTask(title: string) {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("setter_tasks")
      .insert({ user_id: user.id, title, completed: false });

    if (error) {
      // Table may not exist
      if (error.code === "42P01") return { error: null };
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { error: null };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function toggleSetterTask(taskId: string) {
  try {
    const { supabase, user } = await requireAuth();

    // Get current state
    const { data: task } = await supabase
      .from("setter_tasks")
      .select("completed")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) return { error: "Tâche introuvable" };

    const { error } = await supabase
      .from("setter_tasks")
      .update({
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
  } catch {
    return { error: "Non authentifié" };
  }
}

export async function deleteSetterTask(taskId: string) {
  try {
    const { supabase, user } = await requireAuth();

    await supabase
      .from("setter_tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    revalidatePath("/dashboard");
    return { error: null };
  } catch {
    return { error: "Non authentifié" };
  }
}

// ---------------------------------------------------------------------------
// Admin: CRUD Challenges (admin/manager only)
// ---------------------------------------------------------------------------

export interface ChallengeFormData {
  title: string;
  description: string;
  type: "individual" | "team";
  metric: string;
  target_value: number;
  start_date: string;
  end_date: string;
  points_reward: number;
  recurrence: "once" | "weekly" | "monthly";
}

async function requireAdminOrManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { supabase, user: null, error: "Accès réservé aux administrateurs" };
  }

  return { supabase, user, error: null };
}

export async function createChallenge(data: ChallengeFormData) {
  const { supabase, error: authError } = await requireAdminOrManager();
  if (authError) return { success: false, error: authError };

  const { error } = await supabase.from("challenges").insert({
    title: data.title,
    description: data.description,
    challenge_type: data.type,
    metric: data.metric,
    target_value: data.target_value,
    start_date: data.start_date,
    end_date: data.end_date,
    points_reward: data.points_reward,
    recurrence: data.recurrence,
    is_active: true,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/challenges");
  return { success: true };
}

export async function updateChallenge(id: string, data: ChallengeFormData) {
  const { supabase, error: authError } = await requireAdminOrManager();
  if (authError) return { success: false, error: authError };

  const { error } = await supabase
    .from("challenges")
    .update({
      title: data.title,
      description: data.description,
      challenge_type: data.type,
      metric: data.metric,
      target_value: data.target_value,
      start_date: data.start_date,
      end_date: data.end_date,
      points_reward: data.points_reward,
      recurrence: data.recurrence,
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/challenges");
  return { success: true };
}

export async function deleteChallenge(id: string) {
  const { supabase, error: authError } = await requireAdminOrManager();
  if (authError) return { success: false, error: authError };

  // Supprimer les progressions associées d'abord
  await supabase.from("challenge_progress").delete().eq("challenge_id", id);

  const { error } = await supabase.from("challenges").delete().eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/challenges");
  return { success: true };
}

export async function getAllChallengesForAdmin() {
  const { supabase, error: authError } = await requireAdminOrManager();
  if (authError) return [];

  const { data } = await supabase
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getPastChallenges(
  period?: "month" | "last_month" | "all",
) {
  try {
    const { supabase } = await requireAuth();

    const now = new Date();
    let query = supabase
      .from("challenges")
      .select("*")
      .eq("is_active", false)
      .order("end_date", { ascending: false });

    if (period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      query = query.gte("end_date", startOfMonth);
    } else if (period === "last_month") {
      const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      query = query
        .gte("end_date", startLastMonth)
        .lt("end_date", startThisMonth);
    }

    const { data } = await query;

    if (!data || data.length === 0) return [];

    // Pour chaque challenge passé, récupérer le gagnant
    const challengeIds = data.map((c) => c.id);
    const { data: allProgress } = await supabase
      .from("challenge_progress")
      .select("challenge_id, user_id, current_value, completed, completed_at")
      .in("challenge_id", challengeIds);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url");

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    return data.map((challenge) => {
      const progressEntries = (allProgress || []).filter(
        (p) => p.challenge_id === challenge.id,
      );
      // Trouver le gagnant (celui qui a complété en premier ou avec la plus haute valeur)
      const completedEntries = progressEntries
        .filter((p) => p.completed)
        .sort((a, b) => {
          if (a.completed_at && b.completed_at) {
            return (
              new Date(a.completed_at).getTime() -
              new Date(b.completed_at).getTime()
            );
          }
          return (b.current_value || 0) - (a.current_value || 0);
        });

      const winner = completedEntries[0]
        ? profileMap.get(completedEntries[0].user_id)
        : null;

      return {
        ...challenge,
        participants_count: progressEntries.length,
        completed_count: completedEntries.length,
        winner: winner
          ? { full_name: winner.full_name, avatar_url: winner.avatar_url }
          : null,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Challenge Notifications (début/fin)
// ---------------------------------------------------------------------------

export async function notifyChallengeStart(challengeId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data: challenge } = await supabase
      .from("challenges")
      .select("title, description, points_reward")
      .eq("id", challengeId)
      .single();

    if (!challenge) return;

    // Notifier tous les setters et closers (participants potentiels)
    const { data: participants } = await supabase
      .from("profiles")
      .select("id")
      .in("role", ["setter", "closer", "admin", "manager"]);

    if (!participants || participants.length === 0) return;

    const { notifyMany } = await import("@/lib/actions/notifications");
    const userIds = participants.map((p) => p.id);

    notifyMany(
      userIds,
      `Nouveau défi : ${challenge.title}`,
      `${challenge.description || "Un nouveau défi vient de commencer !"} — ${challenge.points_reward} points à gagner !`,
      { type: "challenge_start", link: "/challenges" },
    );
  } catch {
    // Non authentifié — silently ignore
  }
}

export async function notifyChallengeEnd(challengeId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data: challenge } = await supabase
      .from("challenges")
      .select("title, points_reward")
      .eq("id", challengeId)
      .single();

    if (!challenge) return;

    // Trouver le gagnant
    const { data: progressEntries } = await supabase
      .from("challenge_progress")
      .select("user_id, current_value, completed, completed_at")
      .eq("challenge_id", challengeId)
      .eq("completed", true)
      .order("completed_at", { ascending: true })
      .limit(1);

    let winnerName = "Personne";
    if (progressEntries && progressEntries.length > 0) {
      const { data: winnerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", progressEntries[0].user_id)
        .single();
      winnerName = winnerProfile?.full_name || "Un participant";
    }

    // Notifier tous les participants
    const { data: allParticipants } = await supabase
      .from("challenge_progress")
      .select("user_id")
      .eq("challenge_id", challengeId);

    if (!allParticipants || allParticipants.length === 0) return;

    const { notifyMany } = await import("@/lib/actions/notifications");
    const userIds = allParticipants.map((p) => p.user_id);

    notifyMany(
      userIds,
      `Défi terminé : ${challenge.title}`,
      `Le défi "${challenge.title}" est terminé ! Gagnant : ${winnerName}. ${challenge.points_reward} points attribués.`,
      { type: "challenge_end", link: "/challenges" },
    );

    // Désactiver le challenge
    await supabase
      .from("challenges")
      .update({ is_active: false })
      .eq("id", challengeId);

    revalidatePath("/challenges");
  } catch {
    // Non authentifié — silently ignore
  }
}

export async function getRedemptionHistory() {
  try {
    const { supabase, user } = await requireAuth();

    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, created_at, details")
      .eq("user_id", user.id)
      .eq("action", "reward_redeemed")
      .order("created_at", { ascending: false });

    return (logs || []).map((log) => ({
      id: log.id,
      createdAt: log.created_at,
      rewardName:
        ((log.details as Record<string, unknown>)?.reward_name as string) ||
        "Inconnu",
      pointsSpent:
        ((log.details as Record<string, unknown>)?.points_spent as number) || 0,
    }));
  } catch {
    return [];
  }
}
