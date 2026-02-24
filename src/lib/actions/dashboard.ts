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
