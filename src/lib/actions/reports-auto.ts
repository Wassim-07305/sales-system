"use server";

import { createClient } from "@/lib/supabase/server";

export async function generateMonthlyB2BReport(entrepreneurId: string) {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  ).toISOString();

  // Get entrepreneur profile
  const { data: entrepreneur } = await supabase
    .from("profiles")
    .select("id, full_name, email, company")
    .eq("id", entrepreneurId)
    .single();

  if (!entrepreneur) return null;

  // Get assigned setters
  const { data: setters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("matched_entrepreneur_id", entrepreneurId)
    .eq("role", "client_b2c");

  const setterIds = (setters || []).map((s) => s.id);

  // Get deals for this month
  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, value, stage_id, created_at")
    .in("assigned_to", setterIds.length > 0 ? setterIds : ["none"])
    .gte("created_at", startOfMonth)
    .lte("created_at", endOfMonth);

  // Get journals for activity metrics
  const { data: journals } = await supabase
    .from("daily_journals")
    .select("dms_sent, replies_received, calls_booked, deals_closed")
    .in("user_id", setterIds.length > 0 ? setterIds : ["none"])
    .gte("date", startOfMonth.split("T")[0])
    .lte("date", endOfMonth.split("T")[0]);

  const totalDms = (journals || []).reduce(
    (sum, j) => sum + (j.dms_sent || 0),
    0,
  );
  const totalReplies = (journals || []).reduce(
    (sum, j) => sum + (j.replies_received || 0),
    0,
  );
  const totalCalls = (journals || []).reduce(
    (sum, j) => sum + (j.calls_booked || 0),
    0,
  );
  const totalDeals = (journals || []).reduce(
    (sum, j) => sum + (j.deals_closed || 0),
    0,
  );
  const totalCA = (deals || []).reduce((sum, d) => sum + (d.value || 0), 0);

  return {
    entrepreneur: entrepreneur.full_name || entrepreneur.email,
    company: entrepreneur.company as string | null,
    period: `${now.toLocaleString("fr-FR", { month: "long", year: "numeric" })}`,
    setters: (setters || []).map((s) => s.full_name),
    metrics: {
      messagesEnvoyes: totalDms,
      reponsesRecues: totalReplies,
      tauxReponse:
        totalDms > 0 ? Math.round((totalReplies / totalDms) * 100) : 0,
      appelsBookes: totalCalls,
      dealsFermes: totalDeals,
      caGenere: totalCA,
    },
    deals: (deals || []).map((d) => ({ title: d.title, value: d.value })),
  };
}

export async function generateMonthlyB2CReport(setterId: string) {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  ).toISOString();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  ).toISOString();

  const { data: setter } = await supabase
    .from("profiles")
    .select("id, full_name, email, setter_maturity_score")
    .eq("id", setterId)
    .single();

  if (!setter) return null;

  // Lesson progress
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("id")
    .eq("user_id", setterId)
    .eq("completed", true);

  const { data: totalLessons } = await supabase.from("lessons").select("id");

  // Journals
  const { data: journals } = await supabase
    .from("daily_journals")
    .select("dms_sent, replies_received, calls_booked, deals_closed")
    .eq("user_id", setterId)
    .gte("date", startOfMonth.split("T")[0])
    .lte("date", endOfMonth.split("T")[0]);

  const totalDms = (journals || []).reduce(
    (sum, j) => sum + (j.dms_sent || 0),
    0,
  );
  const totalCalls = (journals || []).reduce(
    (sum, j) => sum + (j.calls_booked || 0),
    0,
  );

  // Gamification
  const { data: gamProfile } = await supabase
    .from("gamification_profiles")
    .select("points, level, current_streak")
    .eq("user_id", setterId)
    .single();

  return {
    setter: setter.full_name || setter.email,
    period: `${now.toLocaleString("fr-FR", { month: "long", year: "numeric" })}`,
    formation: {
      modulesCompletes: (progress || []).length,
      modulesTotal: (totalLessons || []).length,
      pourcentage:
        (totalLessons || []).length > 0
          ? Math.round(
              ((progress || []).length / (totalLessons || []).length) * 100,
            )
          : 0,
    },
    activite: {
      messagesEnvoyes: totalDms,
      appelsBookes: totalCalls,
      scoreMaturite: (setter.setter_maturity_score as number) || 0,
    },
    gamification: {
      points: gamProfile?.points || 0,
      niveau: (gamProfile?.level as string) || "Débutant",
      streak: gamProfile?.current_streak || 0,
    },
  };
}
