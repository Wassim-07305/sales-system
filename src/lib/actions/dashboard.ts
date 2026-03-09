"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAdminDashboardData() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
    0
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
      "id, title, value, stage_id, contact_id, pipeline_stages(name), profiles!deals_contact_id_fkey(full_name)"
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
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: staleDeals } = await supabase
    .from("deals")
    .select("id, title, stage_id, updated_at, pipeline_stages(name)")
    .lt("updated_at", sevenDaysAgo)
    .not("stage_id", "eq", signedStageId || "")
    .limit(5);

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
      const contact = Array.isArray(
        (d as Record<string, unknown>).profiles
      )
        ? ((d as Record<string, unknown>).profiles as Array<{ full_name: string | null }>)[0]
        : (d as Record<string, unknown>).profiles as { full_name: string | null } | null;
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
        ? ((lesson as Record<string, unknown>).courses as Array<{ title: string }>)[0]
        : ((lesson as Record<string, unknown>).courses as { title: string } | null)
      : null;
    if (course) {
      if (!courseMap[course.title])
        courseMap[course.title] = { title: course.title, completed: 0, total: 0 };
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
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
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
    .single();

  // Show-up rate this month
  const { data: pastBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", startOfMonth)
    .lt("scheduled_at", new Date().toISOString());

  const showedUp = (pastBookings || []).filter(
    (b) => b.status === "completed"
  ).length;
  const showUpRate = pastBookings?.length
    ? Math.round((showedUp / pastBookings.length) * 100)
    : 0;

  // Closing rate
  const closedDeals = (myDeals || []).filter(
    (d) => d.stage_id === signedStageId
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

  return {
    stats: {
      bookings: (myBookings || []).length,
      showUpRate,
      closingRate,
      revenue,
      activeConversations: activeConversations || 0,
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
    { onConflict: "user_id,date" }
  );
}

export async function getSetterHubData(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000).toISOString();

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

  const weekDms = (weekQuotas || []).reduce((s, q) => s + q.dms_sent, 0);
  const weekReplies = (weekQuotas || []).reduce((s, q) => s + q.replies_received, 0);
  const weekBookingsFromDms = (weekQuotas || []).reduce((s, q) => s + q.bookings_from_dms, 0);

  // Active prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, status")
    .eq("assigned_setter_id", userId);

  const activeProspects = (prospects || []).filter((p) => p.status === "contacted").length;
  const hotProspects = (prospects || []).filter((p) => p.status === "hot").length;
  const totalProspects = (prospects || []).length;

  // Monthly revenue from deals
  const { data: signedStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("name", "Client Signe")
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
  const monthClosedCount = (monthDeals || []).filter((d) => d.stage_id === signedStage?.id).length;

  // Bookings this month
  const { data: monthBookings } = await supabase
    .from("bookings")
    .select("id, status")
    .gte("scheduled_at", startOfMonth)
    .lte("scheduled_at", now.toISOString());

  const totalBookings = (monthBookings || []).length;
  const completedBookings = (monthBookings || []).filter((b) => b.status === "completed").length;
  const showUpRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  // Response rate
  const responseRate = weekDms > 0 ? Math.round((weekReplies / weekDms) * 100) : 0;

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
      closingRate: monthDealsCount > 0 ? Math.round((monthClosedCount / monthDealsCount) * 100) : 0,
      showUpRate,
    },
    gamification: {
      points: gamProfile?.total_points || 0,
      levelName: gamProfile?.level_name || "Debutant",
      streak: gamProfile?.current_streak || 0,
    },
  };
}

export async function getTeamKPIs() {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

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
    .gte("scheduled_at", startOfMonth);

  const totalBookings = (monthBookings || []).length;
  const confirmedBookings = (monthBookings || []).filter(
    (b) => b.status === "completed" || b.status === "confirmed"
  ).length;
  const showUpRate = totalBookings > 0 ? Math.round((confirmedBookings / totalBookings) * 100) : 0;

  // All deals this month
  const { data: monthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id, assigned_to, setter_id, closer_id")
    .gte("created_at", startOfMonth);

  const closedDeals = (monthDeals || []).filter((d) => d.stage_id === signedStageId);
  const closingRate = (monthDeals || []).length > 0
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
    (b) => b.status === "completed" || b.status === "confirmed"
  ).length;
  const lastShowUpRate = lastTotalBookings > 0
    ? Math.round((lastConfirmed / lastTotalBookings) * 100)
    : 0;

  const { data: lastMonthDeals } = await supabase
    .from("deals")
    .select("id, value, stage_id")
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  const lastClosedDeals = (lastMonthDeals || []).filter((d) => d.stage_id === signedStageId);
  const lastClosingRate = (lastMonthDeals || []).length > 0
    ? Math.round((lastClosedDeals.length / (lastMonthDeals || []).length) * 100)
    : 0;
  const lastRevenue = lastClosedDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  // --- PER-MEMBER BREAKDOWN ---

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url")
    .in("role", ["setter", "closer"])
    .order("created_at");

  const memberKPIs = (teamMembers || []).map((member) => {
    // Bookings assigned to this member
    const memberBookings = (monthBookings || []).filter(
      (b) => b.assigned_to === member.id
    );
    const memberConfirmed = memberBookings.filter(
      (b) => b.status === "completed" || b.status === "confirmed"
    ).length;
    const memberShowUp = memberBookings.length > 0
      ? Math.round((memberConfirmed / memberBookings.length) * 100)
      : 0;

    // Deals where member is assigned_to, setter, or closer
    const memberDeals = (monthDeals || []).filter(
      (d) => d.assigned_to === member.id || d.setter_id === member.id || d.closer_id === member.id
    );
    const memberClosed = memberDeals.filter((d) => d.stage_id === signedStageId);
    const memberClosingRate = memberDeals.length > 0
      ? Math.round((memberClosed.length / memberDeals.length) * 100)
      : 0;
    const memberRevenue = memberClosed.reduce((sum, d) => sum + (d.value || 0), 0);

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
