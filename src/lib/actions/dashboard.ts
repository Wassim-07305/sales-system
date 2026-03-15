"use server";

import { createClient } from "@/lib/supabase/server";

/** Auth guard — returns authenticated user or throws. */
async function requireAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

export async function getAdminDashboardData() {
  const supabase = await createClient();
  await requireAuth(supabase);
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  // Get the "Client Signé" stage id
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .single();

  const signedStageId = signedStage?.id;

  // Monthly deals
  const { data: monthlyDeals } = await supabase
    .from("deals")
    .select("value, stage_id")
    .gte("created_at", startOfMonth);

  const monthlyRevenue = (monthlyDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const pipelineTotal = (monthlyDeals || []).reduce(
    (sum, d) => sum + (d.value || 0),
    0,
  );

  // Active clients count
  const { count: activeClients } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["client_b2b", "client_b2c"]);

  // Upcoming bookings
  const { data: weekBookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, slot_type")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(10);

  // Recent deals with stage name and contact name
  const { data: recentDeals } = await supabase
    .from("deals")
    .select(
      "id, title, value, stage_id, contact_id, pipeline_stages(name), profiles!deals_contact_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(6);

  // Team stats — setter/closer profiles
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("role", ["setter", "closer"]);

  // Deal counts per setter this month
  const { data: setterDeals } = await supabase
    .from("deals")
    .select("assigned_to, value, stage_id")
    .gte("created_at", startOfMonth);

  const setterStats = (setters || []).map((s) => {
    const deals = (setterDeals || []).filter((d) => d.assigned_to === s.id);
    const revenue = deals
      .filter((d) => d.stage_id === signedStageId)
      .reduce((sum, d) => sum + (d.value || 0), 0);
    return { ...s, dealCount: deals.length, revenue };
  });

  // Alerts: prospects without activity in 7 days
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  let staleDeals: { id: string; title: string; stage_id: string | null; updated_at: string; pipeline_stages: { name: string } | { name: string }[] | null }[] | null = null;
  if (signedStageId) {
    const { data } = await supabase
      .from("deals")
      .select("id, title, stage_id, updated_at, pipeline_stages(name)")
      .lt("updated_at", sevenDaysAgo)
      .neq("stage_id", signedStageId)
      .limit(5);
    staleDeals = data;
  } else {
    // No "Client Signé" stage found — return all stale deals without stage filter
    const { data } = await supabase
      .from("deals")
      .select("id, title, stage_id, updated_at, pipeline_stages(name)")
      .lt("updated_at", sevenDaysAgo)
      .limit(5);
    staleDeals = data;
  }

  return {
    stats: {
      monthlyRevenue,
      pipelineTotal,
      activeClients: activeClients || 0,
      weeklyBookings: (weekBookings || []).length,
    },
    recentDeals: (recentDeals || []).map((d) => {
      const stage = Array.isArray(d.pipeline_stages)
        ? d.pipeline_stages[0]
        : d.pipeline_stages;
      const contact = Array.isArray((d as Record<string, unknown>).profiles)
        ? (
            (d as Record<string, unknown>).profiles as Array<{
              full_name: string | null;
            }>
          )[0]
        : ((d as Record<string, unknown>).profiles as {
            full_name: string | null;
          } | null);
      return {
        id: d.id,
        title: d.title,
        amount: d.value,
        stage: (stage as { name: string } | null)?.name || "—",
        contactName: contact?.full_name || "—",
      };
    }),
    upcomingBookings: (weekBookings || []).map((b) => ({
      id: b.id,
      name: b.prospect_name,
      time: b.scheduled_at,
      type: b.slot_type,
    })),
    setterStats,
    alerts: (staleDeals || []).map((d) => {
      const stage = Array.isArray(d.pipeline_stages)
        ? d.pipeline_stages[0]
        : d.pipeline_stages;
      return {
        id: d.id,
        title: d.title,
        stage: (stage as { name: string } | null)?.name || "—",
        updated_at: d.updated_at,
      };
    }),
  };
}

export async function getClientDashboardData(userId: string) {
  const supabase = await createClient();
  const authUser = await requireAuth(supabase);
  // Ensure users can only access their own data
  if (authUser.id !== userId) throw new Error("Accès refusé");

  // Course progress via lesson_progress
  const { data: enrollments } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, lessons(course_id, courses(title))")
    .eq("user_id", userId);

  // Group by course
  const courseMap: Record<
    string,
    { title: string; completed: number; total: number }
  > = {};
  for (const e of enrollments || []) {
    const lesson = Array.isArray(e.lessons) ? e.lessons[0] : e.lessons;
    const course = lesson
      ? Array.isArray((lesson as Record<string, unknown>).courses)
        ? (
            (lesson as Record<string, unknown>).courses as Array<{
              title: string;
            }>
          )[0]
        : ((lesson as Record<string, unknown>).courses as {
            title: string;
          } | null)
      : null;
    if (course) {
      if (!courseMap[course.title])
        courseMap[course.title] = {
          title: course.title,
          completed: 0,
          total: 0,
        };
      courseMap[course.title].total++;
      if (e.completed) courseMap[course.title].completed++;
    }
  }

  // Daily journal
  const today = new Date().toISOString().split("T")[0];
  const { data: todayJournal } = await supabase
    .from("daily_journals")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  // Upcoming events (bookings)
  const { data: upcomingEvents } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, slot_type")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(5);

  // Onboarding progress
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step, is_ready_to_place")
    .eq("id", userId)
    .single();

  // Quiz attempts today
  const { data: quizAttempts } = await supabase
    .from("quiz_attempts")
    .select("id, score, passed")
    .eq("user_id", userId)
    .gte("attempted_at", new Date(today).toISOString());

  return {
    courseProgress: Object.values(courseMap),
    todayJournal,
    upcomingEvents: (upcomingEvents || []).map((e) => ({
      id: e.id,
      title: e.prospect_name || "RDV",
      date: e.scheduled_at,
      type: e.slot_type,
    })),
    profile: profile || {
      onboarding_completed: false,
      onboarding_step: 0,
      is_ready_to_place: false,
    },
    quizAttemptsToday: (quizAttempts || []).length,
  };
}

export async function getSetterDashboardData(userId: string) {
  const supabase = await createClient();
  const authUser = await requireAuth(supabase);
  // Setters can only view their own data; admin/manager can view anyone
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
  const isAdmin = profile && ["admin", "manager"].includes(profile.role);
  if (authUser.id !== userId && !isAdmin) throw new Error("Accès refusé");
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  ).toISOString();

  // Get the "Client Signé" stage id
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .single();

  const signedStageId = signedStage?.id;

  // My deals this month
  const { data: myDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", userId)
    .gte("created_at", startOfMonth);

  const revenue = (myDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  // Last month revenue for comparison
  const { data: lastMonthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", userId)
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  const lastMonthRevenue = (lastMonthDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  // My upcoming bookings
  const { data: myBookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, slot_type, status")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(8);

  // Gamification profile
  const { data: gamProfile } = await supabase
    .from("gamification_profiles")
    .select("level, level_name, total_points, current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  // Show-up rate this month
  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", startOfMonth)
    .lt("scheduled_at", new Date().toISOString());

  const showedUp = (pastBookings || []).filter(
    (b) => b.status === "completed",
  ).length;
  const showUpRate = pastBookings?.length
    ? Math.round((showedUp / pastBookings.length) * 100)
    : 0;

  // Closing rate
  const closedDeals = (myDeals || []).filter(
    (d) => d.stage_id === signedStageId,
  ).length;
  const closingRate = myDeals?.length
    ? Math.round((closedDeals / myDeals.length) * 100)
    : 0;

  // Active conversations count
  const { count: activeConversations } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("assigned_setter_id", userId)
    .eq("status", "contacted");

  // Today's daily quota
  const { data: todayQuota } = await supabase
    .from("daily_quotas")
    .select("dms_sent, dms_target, replies_received, bookings_from_dms")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  // Active coaching objectives (not completed)
  const { data: objectives } = await supabase
    .from("coaching_objectives")
    .select(
      "id, title, category, target_value, current_value, target_date, status",
    )
    .eq("assignee_id", userId)
    .neq("status", "completed")
    .order("target_date", { ascending: true })
    .limit(3);

  // Weekly performance data (last 7 days)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data: weekDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, created_at")
    .eq("assigned_to", userId)
    .gte("created_at", weekAgo.toISOString());

  // Group by day for chart
  const dailyPerformance: { day: string; deals: number; revenue: number }[] =
    [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = date.toISOString().split("T")[0];
    const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" });
    const dayDeals = (weekDeals || []).filter(
      (d) => d.created_at.split("T")[0] === dayStr,
    );
    const dayRevenue = dayDeals
      .filter((d) => d.stage_id === signedStageId)
      .reduce((sum, d) => sum + (d.value || 0), 0);
    dailyPerformance.push({
      day: dayLabel,
      deals: dayDeals.length,
      revenue: dayRevenue,
    });
  }

  return {
    stats: {
      bookings: (myBookings || []).length,
      showUpRate,
      closingRate,
      revenue,
      lastMonthRevenue,
      revenueTrend:
        lastMonthRevenue > 0
          ? Math.round(((revenue - lastMonthRevenue) / lastMonthRevenue) * 100)
          : revenue > 0
            ? 100
            : 0,
      activeConversations: activeConversations || 0,
      dealsClosed: closedDeals,
      dealsTotal: (myDeals || []).length,
    },
    upcomingCalls: (myBookings || []).map((b) => ({
      id: b.id,
      name: b.prospect_name,
      time: b.scheduled_at,
      type: b.slot_type,
    })),
    gamification: {
      points: gamProfile?.total_points || 0,
      level: gamProfile?.level || 1,
      levelName: gamProfile?.level_name || "Setter Débutant",
      streakDays: gamProfile?.current_streak || 0,
    },
    dailyQuota: {
      dmsSent: todayQuota?.dms_sent || 0,
      dmsTarget: todayQuota?.dms_target || 30,
      repliesReceived: todayQuota?.replies_received || 0,
      bookingsFromDms: todayQuota?.bookings_from_dms || 0,
    },
    objectives: (objectives || []).map((o) => ({
      id: o.id,
      title: o.title,
      category: o.category,
      targetValue: o.target_value,
      currentValue: o.current_value,
      targetDate: o.target_date,
      status: o.status,
      progress: Math.round((o.current_value / (o.target_value || 1)) * 100),
    })),
    dailyPerformance,
  };
}

export async function saveDailyJournal(data: {
  mood: number;
  wins: string;
  challenges: string;
  goals: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const today = new Date().toISOString().split("T")[0];

  await supabase.from("daily_journals").upsert(
    {
      user_id: user.id,
      date: today,
      mood: data.mood,
      wins: data.wins,
      struggles: data.challenges,
      goals_tomorrow: data.goals,
    },
    { onConflict: "user_id,date" },
  );

  // Auto-update gamification streak after journal save
  try {
    const { checkAndUpdateStreak } = await import("@/lib/actions/gamification");
    await checkAndUpdateStreak(user.id);
  } catch {
    // Non-blocking
  }
}

export async function getSetterHubData(userId: string) {
  const supabase = await createClient();
  const authUser = await requireAuth(supabase);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
  const isAdmin = profile && ["admin", "manager"].includes(profile.role);
  if (authUser.id !== userId && !isAdmin) throw new Error("Accès refusé");
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const startOfWeek = new Date(
    now.getTime() - now.getDay() * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Today's DM quota
  const { data: todayQuota } = await supabase
    .from("daily_quotas")
    .select("dms_sent, dms_target, replies_received, bookings_from_dms")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  // Week DM stats
  const { data: weekQuotas } = await supabase
    .from("daily_quotas")
    .select("dms_sent, replies_received, bookings_from_dms")
    .eq("user_id", userId)
    .gte("date", startOfWeek.split("T")[0]);

  const weekDms = (weekQuotas || []).reduce((s, q) => s + (q.dms_sent || 0), 0);
  const weekReplies = (weekQuotas || []).reduce(
    (s, q) => s + (q.replies_received || 0),
    0,
  );
  const weekBookingsFromDms = (weekQuotas || []).reduce(
    (s, q) => s + (q.bookings_from_dms || 0),
    0,
  );

  // Active prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, status")
    .eq("assigned_setter_id", userId);

  const activeProspects = (prospects || []).filter(
    (p) => p.status === "contacted",
  ).length;
  const hotProspects = (prospects || []).filter(
    (p) => p.status === "hot",
  ).length;
  const totalProspects = (prospects || []).length;

  // Monthly revenue from deals
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .single();

  const { data: monthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", userId)
    .gte("created_at", startOfMonth);

  const monthRevenue = (monthDeals || [])
    .filter((d) => d.stage_id === signedStage?.id)
    .reduce((s, d) => s + (d.value || 0), 0);

  const monthDealsCount = (monthDeals || []).length;
  const monthClosedCount = (monthDeals || []).filter(
    (d) => d.stage_id === signedStage?.id,
  ).length;

  // Bookings this month
  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", now.toISOString());

  const totalBookings = (monthBookings || []).length;
  const completedBookings = (monthBookings || []).filter(
    (b) => b.status === "completed",
  ).length;
  const showUpRate =
    totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0;

  // Response rate
  const responseRate =
    weekDms > 0 ? Math.round((weekReplies / weekDms) * 100) : 0;

  // Gamification
  const { data: gamProfile } = await supabase
    .from("gamification_profiles")
    .select("total_points, level_name, current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    today: {
      dmsSent: todayQuota?.dms_sent || 0,
      dmsTarget: todayQuota?.dms_target || 30,
      repliesReceived: todayQuota?.replies_received || 0,
      bookingsFromDms: todayQuota?.bookings_from_dms || 0,
    },
    week: {
      totalDms: weekDms,
      totalReplies: weekReplies,
      responseRate,
      bookingsFromDms: weekBookingsFromDms,
    },
    prospects: {
      total: totalProspects,
      active: activeProspects,
      hot: hotProspects,
    },
    month: {
      revenue: monthRevenue,
      dealsCreated: monthDealsCount,
      dealsClosed: monthClosedCount,
      closingRate:
        monthDealsCount > 0
          ? Math.round((monthClosedCount / monthDealsCount) * 100)
          : 0,
      showUpRate,
    },
    gamification: {
      points: gamProfile?.total_points || 0,
      levelName: gamProfile?.level_name || "Debutant",
      streak: gamProfile?.current_streak || 0,
    },
  };
}

// ─── PERSONAL PERFORMANCE REPORT ─────────────────────────────────
export interface PerformanceMetric {
  label: string;
  current: number;
  target: number;
  previous: number;
  trend: number | null;
  unit: string;
}

export interface PersonalPerformanceReport {
  period: string;
  metrics: PerformanceMetric[];
  weeklyData: Array<{
    week: string;
    revenue: number;
    deals: number;
    bookings: number;
  }>;
  objectivesProgress: Array<{
    id: string;
    title: string;
    category: string;
    progress: number;
    status: string;
    daysLeft: number;
  }>;
  ranking: {
    position: number;
    total: number;
    metric: string;
  };
}

export async function getPersonalPerformanceReport(
  userId: string,
): Promise<PersonalPerformanceReport> {
  const supabase = await createClient();
  const authUser = await requireAuth(supabase);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authUser.id).single();
  const isAdmin = profile && ["admin", "manager"].includes(profile.role);
  if (authUser.id !== userId && !isAdmin) throw new Error("Accès refusé");
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).toISOString();
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  ).toISOString();

  // Get signed stage
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .single();
  const signedStageId = signedStage?.id;

  // This month's deals
  const { data: monthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, created_at")
    .eq("assigned_to", userId)
    .gte("created_at", startOfMonth);

  // Last month's deals
  const { data: lastMonthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .eq("assigned_to", userId)
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  // This month's bookings
  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("assigned_to", userId)
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth);

  // Last month's bookings
  const { data: lastBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("assigned_to", userId)
    .gte("scheduled_at", startOfLastMonth)
    .lte("scheduled_at", endOfLastMonth);

  // Calculate metrics
  const currentRevenue = (monthDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);
  const lastRevenue = (lastMonthDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  const currentDeals = (monthDeals || []).filter(
    (d) => d.stage_id === signedStageId,
  ).length;
  const lastDeals = (lastMonthDeals || []).filter(
    (d) => d.stage_id === signedStageId,
  ).length;

  const currentBookings = (monthBookings || []).length;
  const lastBookingsCount = (lastBookings || []).length;

  const currentShowUp = (monthBookings || []).filter(
    (b) => b.status === "completed",
  ).length;
  const lastShowUp = (lastBookings || []).filter(
    (b) => b.status === "completed",
  ).length;

  const showUpRate =
    currentBookings > 0
      ? Math.round((currentShowUp / currentBookings) * 100)
      : 0;
  const lastShowUpRate =
    lastBookingsCount > 0
      ? Math.round((lastShowUp / lastBookingsCount) * 100)
      : 0;

  // Fetch user's coaching objectives for personalized targets, fallback to defaults
  const { data: targetObjectives } = await supabase
    .from("coaching_objectives")
    .select("target_type, target_value")
    .eq("user_id", userId)
    .eq("status", "active");

  const getTarget = (type: string, fallback: number) => {
    const obj = (targetObjectives || []).find((o) => o.target_type === type);
    return obj?.target_value ?? fallback;
  };

  const revenueTarget = getTarget("revenue", 10000);
  const dealsTarget = getTarget("deals", 5);
  const bookingsTarget = getTarget("bookings", 15);
  const showUpTarget = getTarget("show_up_rate", 80);

  const metrics: PerformanceMetric[] = [
    {
      label: "Chiffre d'affaires",
      current: currentRevenue,
      target: revenueTarget,
      previous: lastRevenue,
      trend:
        lastRevenue > 0
          ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
          : null,
      unit: "€",
    },
    {
      label: "Deals closes",
      current: currentDeals,
      target: dealsTarget,
      previous: lastDeals,
      trend:
        lastDeals > 0
          ? Math.round(((currentDeals - lastDeals) / lastDeals) * 100)
          : null,
      unit: "",
    },
    {
      label: "Bookings",
      current: currentBookings,
      target: bookingsTarget,
      previous: lastBookingsCount,
      trend:
        lastBookingsCount > 0
          ? Math.round(
              ((currentBookings - lastBookingsCount) / lastBookingsCount) * 100,
            )
          : null,
      unit: "",
    },
    {
      label: "Taux show-up",
      current: showUpRate,
      target: showUpTarget,
      previous: lastShowUpRate,
      trend: lastBookingsCount > 0 ? showUpRate - lastShowUpRate : null,
      unit: "%",
    },
  ];

  // Weekly data for the last 4 weeks
  const weeklyData: Array<{
    week: string;
    revenue: number;
    deals: number;
    bookings: number;
  }> = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(
      now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000,
    );
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `S${Math.ceil((now.getDate() - i * 7) / 7)}`;

    const weekDeals = (monthDeals || []).filter((d) => {
      const date = new Date(d.created_at);
      return date >= weekStart && date < weekEnd;
    });

    const weekRevenue = weekDeals
      .filter((d) => d.stage_id === signedStageId)
      .reduce((sum, d) => sum + (d.value || 0), 0);

    weeklyData.push({
      week: weekLabel,
      revenue: weekRevenue,
      deals: weekDeals.filter((d) => d.stage_id === signedStageId).length,
      bookings: 0, // Would need to filter bookings by week too
    });
  }

  // Get active objectives
  const { data: objectives } = await supabase
    .from("coaching_objectives")
    .select(
      "id, title, category, target_value, current_value, target_date, status",
    )
    .eq("assignee_id", userId)
    .neq("status", "completed")
    .order("target_date");

  const objectivesProgress = (objectives || []).map((o) => {
    const targetDate = new Date(o.target_date);
    const daysLeft = Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      id: o.id,
      title: o.title,
      category: o.category,
      progress: Math.round((o.current_value / (o.target_value || 1)) * 100),
      status: o.status,
      daysLeft: Math.max(0, daysLeft),
    };
  });

  // Get ranking among setters
  const { data: allSetters } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["setter", "closer"]);

  const { data: allDeals } = await supabase
    .from("deals")
    .select("assigned_to, value, stage_id")
    .eq("stage_id", signedStageId || "")
    .gte("created_at", startOfMonth);

  const setterRevenues = (allSetters || [])
    .map((s) => {
      const rev = (allDeals || [])
        .filter((d) => d.assigned_to === s.id)
        .reduce((sum, d) => sum + (d.value || 0), 0);
      return { id: s.id, revenue: rev };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const position = setterRevenues.findIndex((s) => s.id === userId) + 1;

  return {
    period: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    metrics,
    weeklyData,
    objectivesProgress,
    ranking: {
      position: position || setterRevenues.length,
      total: setterRevenues.length,
      metric: "CA du mois",
    },
  };
}

export async function getTeamKPIs() {
  const supabase = await createClient();
  await requireAuth(supabase);
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const startOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).toISOString();

  // Get the "Client Signé" stage id
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .single();

  const signedStageId = signedStage?.id;

  // --- CURRENT MONTH ---

  // All bookings this month
  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, status, assigned_to")
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth);

  const totalBookings = (monthBookings || []).length;
  const confirmedBookings = (monthBookings || []).filter(
    (b) => b.status === "completed" || b.status === "confirmed",
  ).length;
  const showUpRate =
    totalBookings > 0
      ? Math.round((confirmedBookings / totalBookings) * 100)
      : 0;

  // All deals this month
  const { data: monthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, assigned_to, setter_id, closer_id")
    .gte("created_at", startOfMonth);

  const closedDeals = (monthDeals || []).filter(
    (d) => d.stage_id === signedStageId,
  );
  const closingRate =
    (monthDeals || []).length > 0
      ? Math.round((closedDeals.length / (monthDeals || []).length) * 100)
      : 0;
  const totalRevenue = closedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  // --- LAST MONTH (for trends) ---

  const { data: lastMonthBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", startOfLastMonth)
    .lte("scheduled_at", endOfLastMonth);

  const lastTotalBookings = (lastMonthBookings || []).length;
  const lastConfirmed = (lastMonthBookings || []).filter(
    (b) => b.status === "completed" || b.status === "confirmed",
  ).length;
  const lastShowUpRate =
    lastTotalBookings > 0
      ? Math.round((lastConfirmed / lastTotalBookings) * 100)
      : 0;

  const { data: lastMonthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  const lastClosedDeals = (lastMonthDeals || []).filter(
    (d) => d.stage_id === signedStageId,
  );
  const lastClosingRate =
    (lastMonthDeals || []).length > 0
      ? Math.round(
          (lastClosedDeals.length / (lastMonthDeals || []).length) * 100,
        )
      : 0;
  const lastRevenue = lastClosedDeals.reduce(
    (sum, d) => sum + (d.value || 0),
    0,
  );

  // --- PER-MEMBER BREAKDOWN ---

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .in("role", ["setter", "closer"])
    .order("created_at");

  const memberKPIs = (teamMembers || []).map((member) => {
    // Bookings assigned to this member
    const memberBookings = (monthBookings || []).filter(
      (b) => b.assigned_to === member.id,
    );
    const memberConfirmed = memberBookings.filter(
      (b) => b.status === "completed" || b.status === "confirmed",
    ).length;
    const memberShowUp =
      memberBookings.length > 0
        ? Math.round((memberConfirmed / memberBookings.length) * 100)
        : 0;

    // Deals where member is assigned_to, setter, or closer
    const memberDeals = (monthDeals || []).filter(
      (d) =>
        d.assigned_to === member.id ||
        d.setter_id === member.id ||
        d.closer_id === member.id,
    );
    const memberClosed = memberDeals.filter(
      (d) => d.stage_id === signedStageId,
    );
    const memberClosingRate =
      memberDeals.length > 0
        ? Math.round((memberClosed.length / memberDeals.length) * 100)
        : 0;
    const memberRevenue = memberClosed.reduce(
      (sum, d) => sum + (d.value || 0),
      0,
    );

    return {
      id: member.id,
      fullName: member.full_name,
      role: member.role,
      avatarUrl: member.avatar_url,
      bookings: memberBookings.length,
      showUpRate: memberShowUp,
      closingRate: memberClosingRate,
      revenue: memberRevenue,
      dealsClosed: memberClosed.length,
      dealsTotal: memberDeals.length,
    };
  });

  return {
    summary: {
      totalBookings,
      showUpRate,
      closingRate,
      totalRevenue,
    },
    trends: {
      bookingsDelta: totalBookings - lastTotalBookings,
      showUpDelta: showUpRate - lastShowUpRate,
      closingDelta: closingRate - lastClosingRate,
      revenueDelta: totalRevenue - lastRevenue,
    },
    members: memberKPIs,
  };
}

// ─── B2B CLIENT DASHBOARD ──────────────────────────────────────

export interface B2BDashboardData {
  stats: {
    messagesSent: number;
    responseRate: number;
    bookingsBooked: number;
    closingRate: number;
  };
  setterPerformance: {
    setterId: string | null;
    setterName: string;
    avatarUrl: string | null;
    messagesPerDay: number;
    prospectsContacted: number;
    activeConversations: number;
    lastActivityAt: string | null;
  };
  pipeline: Array<{
    stageName: string;
    stageColor: string;
    count: number;
    value: number;
  }>;
  pipelineTotal: number;
  upcomingBookings: Array<{
    id: string;
    name: string;
    time: string;
    type: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: "message" | "booking" | "deal_move" | "call";
    description: string;
    date: string;
  }>;
}

export async function getB2BDashboardData(
  userId: string,
): Promise<B2BDashboardData> {
  const supabase = await createClient();
  const authUser = await requireAuth(supabase);
  if (authUser.id !== userId) throw new Error("Accès refusé");
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  ).toISOString();

  // Get matched setter for this B2B client
  const { data: profile } = await supabase
    .from("profiles")
    .select("matched_entrepreneur_id")
    .eq("id", userId)
    .single();

  // The B2B client may have a matched setter via matched_entrepreneur_id
  // or deals assigned with setter_id
  let setterId: string | null = null;
  let setterName = "Non assigne";
  let setterAvatar: string | null = null;

  // Check if there's a setter linked via deals
  const { data: clientDeals } = await supabase
    .from("deals")
    .select("id, setter_id, assigned_to")
    .eq("contact_id", userId)
    .limit(1);

  if (clientDeals && clientDeals.length > 0) {
    setterId = clientDeals[0].setter_id || clientDeals[0].assigned_to || null;
  }

  // Fallback: check matched_entrepreneur_id
  if (!setterId && profile?.matched_entrepreneur_id) {
    setterId = profile.matched_entrepreneur_id;
  }

  if (setterId) {
    const { data: setterProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", setterId)
      .single();
    if (setterProfile) {
      setterName = setterProfile.full_name || "Setter";
      setterAvatar = setterProfile.avatar_url;
    }
  }

  // Get setter's DM stats this month (from daily_quotas)
  let messagesThisMonth = 0;
  let messagesPerDay = 0;
  let repliesThisMonth = 0;

  if (setterId) {
    const { data: quotas } = await supabase
      .from("daily_quotas")
      .select("dms_sent, replies_received, date")
      .eq("user_id", setterId)
      .gte("date", startOfMonth.split("T")[0]);

    messagesThisMonth = (quotas || []).reduce(
      (s, q) => s + (q.dms_sent || 0),
      0,
    );
    repliesThisMonth = (quotas || []).reduce(
      (s, q) => s + (q.replies_received || 0),
      0,
    );
    const daysWithActivity = (quotas || []).filter(
      (q) => q.dms_sent > 0,
    ).length;
    messagesPerDay =
      daysWithActivity > 0
        ? Math.round(messagesThisMonth / daysWithActivity)
        : 0;
  }

  const responseRate =
    messagesThisMonth > 0
      ? Math.round((repliesThisMonth / messagesThisMonth) * 100)
      : 0;

  // Prospects contacted by setter
  let prospectsContacted = 0;
  let activeConversations = 0;
  let lastActivityAt: string | null = null;

  if (setterId) {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, status, updated_at")
      .eq("assigned_setter_id", setterId)
      .order("updated_at", { ascending: false });

    prospectsContacted = (prospects || []).length;
    activeConversations = (prospects || []).filter(
      (p) => p.status === "contacted" || p.status === "replied",
    ).length;
    lastActivityAt =
      prospects && prospects.length > 0 ? prospects[0].updated_at : null;
  }

  // Pipeline overview - get all stages and count deals
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, color, position")
    .order("position");

  const { data: allDeals } = await supabase
    .from("deals")
    .select("id, stage_id, value")
    .eq("contact_id", userId);

  // If no deals linked to contact_id, try via setter
  let dealsForPipeline = allDeals || [];
  if (dealsForPipeline.length === 0 && setterId) {
    const { data: setterDeals } = await supabase
      .from("deals")
      .select("id, stage_id, value")
      .eq("assigned_to", setterId);
    dealsForPipeline = setterDeals || [];
  }

  const pipeline = (stages || []).map((stage) => {
    const stageDeals = dealsForPipeline.filter((d) => d.stage_id === stage.id);
    return {
      stageName: stage.name,
      stageColor: stage.color || "#6b7280",
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    };
  });

  const pipelineTotal = dealsForPipeline.reduce(
    (sum, d) => sum + (d.value || 0),
    0,
  );

  // Get "Client Signé" stage for closing rate
  const signedStage = (stages || []).find(
    (s) => s.name === "Client Signé",
  );
  const closedDeals = signedStage
    ? dealsForPipeline.filter((d) => d.stage_id === signedStage.id).length
    : 0;
  const closingRate =
    dealsForPipeline.length > 0
      ? Math.round((closedDeals / dealsForPipeline.length) * 100)
      : 0;

  // Upcoming bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, prospect_name, scheduled_at, slot_type")
    .gte("scheduled_at", now.toISOString())
    .order("scheduled_at")
    .limit(5);

  // Bookings count this month
  const { count: bookingsMonthCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", endOfMonth);

  // Recent activity - deal activities
  const dealIds = dealsForPipeline.map((d) => d.id);
  let recentActivity: B2BDashboardData["recentActivity"] = [];

  if (dealIds.length > 0) {
    const { data: dealActivities } = await supabase
      .from("deal_activities")
      .select("id, type, description, created_at")
      .in("deal_id", dealIds)
      .order("created_at", { ascending: false })
      .limit(10);

    recentActivity = (dealActivities || []).map((a) => ({
      id: a.id,
      type: (a.type === "message"
        ? "message"
        : a.type === "meeting"
          ? "booking"
          : a.type === "call"
            ? "call"
            : "deal_move") as "message" | "booking" | "deal_move" | "call",
      description: a.description || "",
      date: a.created_at,
    }));
  }

  return {
    stats: {
      messagesSent: messagesThisMonth,
      responseRate,
      bookingsBooked: bookingsMonthCount || 0,
      closingRate,
    },
    setterPerformance: {
      setterId,
      setterName,
      avatarUrl: setterAvatar,
      messagesPerDay,
      prospectsContacted,
      activeConversations,
      lastActivityAt,
    },
    pipeline,
    pipelineTotal,
    upcomingBookings: (bookings || []).map((b) => ({
      id: b.id,
      name: b.prospect_name || "RDV",
      time: b.scheduled_at,
      type: b.slot_type,
    })),
    recentActivity,
  };
}

// ─── F85: Mobile Dashboard Widget Data ───────────────────────────

export async function getMobileDashboardWidgetData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { dealsEnCours: 0, caDuMois: 0, tachesDuJour: 0, prochainsRdv: 0 };

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  // Get the "Client Signé" stage id
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signé")
    .maybeSingle();

  const signedStageId = signedStage?.id;

  // Active deals (not in "Client Signé" stage)
  let dealsEnCours = 0;
  if (signedStageId) {
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .neq("stage_id", signedStageId);
    dealsEnCours = count || 0;
  } else {
    const { count } = await supabase
      .from("deals")
      .select("id", { count: "exact", head: true });
    dealsEnCours = count || 0;
  }

  // Monthly revenue (CA du mois)
  const { data: monthlyDeals } = await supabase
    .from("deals")
    .select("value, stage_id")
    .gte("created_at", startOfMonth);

  const caDuMois = (monthlyDeals || [])
    .filter((d) => d.stage_id === signedStageId)
    .reduce((sum, d) => sum + (d.value || 0), 0);

  // Today's bookings count (tâches du jour proxy)
  const { count: tachesDuJour } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", `${today}T00:00:00`)
    .lt("scheduled_at", `${today}T23:59:59`);

  // Upcoming bookings (prochains RDV)
  const { count: prochainsRdv } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", now.toISOString())
    .in("status", ["confirmed", "pending"]);

  return {
    dealsEnCours,
    caDuMois,
    tachesDuJour: tachesDuJour || 0,
    prochainsRdv: prochainsRdv || 0,
  };
}
