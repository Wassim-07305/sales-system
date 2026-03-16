import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron quotidien : gestion du cycle de vie des challenges.
 *
 * 1. Notifie les participants quand un challenge commence aujourd'hui
 * 2. Clôture et notifie les résultats quand un challenge se termine aujourd'hui
 * 3. Recrée les challenges récurrents (hebdomadaires/mensuels)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
  );

  const today = new Date().toISOString().split("T")[0];
  const results = {
    started: 0,
    ended: 0,
    recreated: 0,
    errors: 0,
    details: [] as string[],
  };

  try {
    // --- 1. Challenges qui commencent aujourd'hui ---
    const { data: startingChallenges } = await supabase
      .from("challenges")
      .select("id, title, description, points_reward")
      .eq("is_active", true)
      .eq("start_date", today);

    if (startingChallenges && startingChallenges.length > 0) {
      // Recuperer tous les participants potentiels
      const { data: participants } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["setter", "closer", "admin", "manager"]);

      const userIds = (participants || []).map((p) => p.id);

      for (const challenge of startingChallenges) {
        if (userIds.length > 0) {
          const notifications = userIds.map((uid) => ({
            user_id: uid,
            title: `Nouveau défi : ${challenge.title}`,
            body: `${challenge.description || "Un nouveau défi vient de commencer !"} — ${challenge.points_reward} points à gagner !`,
            type: "challenge_start",
            link: "/challenges",
          }));
          await supabase.from("notifications").insert(notifications);
          results.started++;
          results.details.push(
            `Défi commencé : "${challenge.title}" — ${userIds.length} notifications`,
          );
        }
      }
    }

    // --- 2. Challenges qui se terminent aujourd'hui ---
    const { data: endingChallenges } = await supabase
      .from("challenges")
      .select(
        "id, title, points_reward, recurrence, challenge_type, metric, target_value, description",
      )
      .eq("is_active", true)
      .eq("end_date", today);

    if (endingChallenges && endingChallenges.length > 0) {
      for (const challenge of endingChallenges) {
        try {
          // Trouver le gagnant
          const { data: completedProgress } = await supabase
            .from("challenge_progress")
            .select("user_id, current_value, completed_at")
            .eq("challenge_id", challenge.id)
            .eq("completed", true)
            .order("completed_at", { ascending: true })
            .limit(1);

          let winnerName = "Personne";
          if (completedProgress && completedProgress.length > 0) {
            const { data: winnerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", completedProgress[0].user_id)
              .single();
            winnerName = winnerProfile?.full_name || "Un participant";
          }

          // Notifier tous les participants
          const { data: allParticipants } = await supabase
            .from("challenge_progress")
            .select("user_id")
            .eq("challenge_id", challenge.id);

          if (allParticipants && allParticipants.length > 0) {
            const notifications = allParticipants.map((p) => ({
              user_id: p.user_id,
              title: `Défi terminé : ${challenge.title}`,
              body: `Le défi "${challenge.title}" est terminé ! Gagnant : ${winnerName}. ${challenge.points_reward} points attribués.`,
              type: "challenge_end",
              link: "/challenges",
            }));
            await supabase.from("notifications").insert(notifications);
          }

          // Desactiver le challenge
          await supabase
            .from("challenges")
            .update({ is_active: false })
            .eq("id", challenge.id);

          results.ended++;
          results.details.push(
            `Défi terminé : "${challenge.title}" — Gagnant : ${winnerName}`,
          );

          // --- 3. Recréer si récurrent ---
          if (
            challenge.recurrence === "weekly" ||
            challenge.recurrence === "monthly"
          ) {
            const startDate = new Date(today);
            const endDate = new Date(today);

            if (challenge.recurrence === "weekly") {
              startDate.setDate(startDate.getDate() + 1);
              endDate.setDate(endDate.getDate() + 8);
            } else {
              startDate.setDate(startDate.getDate() + 1);
              endDate.setMonth(endDate.getMonth() + 1);
              endDate.setDate(endDate.getDate() + 1);
            }

            await supabase.from("challenges").insert({
              title: challenge.title,
              description: challenge.description,
              challenge_type: challenge.challenge_type,
              metric: challenge.metric,
              target_value: challenge.target_value,
              points_reward: challenge.points_reward,
              recurrence: challenge.recurrence,
              start_date: startDate.toISOString().split("T")[0],
              end_date: endDate.toISOString().split("T")[0],
              is_active: true,
            });

            results.recreated++;
            results.details.push(
              `Défi récurrent recréé : "${challenge.title}"`,
            );
          }
        } catch (err) {
          results.errors++;
          results.details.push(
            `Erreur clôture "${challenge.title}": ${err instanceof Error ? err.message : "Erreur inconnue"}`,
          );
        }
      }
    }
  } catch (globalErr) {
    return NextResponse.json(
      {
        error: `Erreur globale: ${globalErr instanceof Error ? globalErr.message : "Erreur inconnue"}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...results,
    timestamp: new Date().toISOString(),
  });
}
