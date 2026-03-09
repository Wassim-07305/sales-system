"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitNpsScore(surveyId: string, score: number, comment?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase
    .from("nps_surveys")
    .update({
      score,
      comment: comment || null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", surveyId)
    .eq("client_id", user.id);

  // If score >= 8, trigger testimonial request
  if (score >= 8) {
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Partagez votre expérience !",
      body: "Vous kiffez le Sales System ? Partagez un témoignage pour inspirer la communauté !",
      type: "testimonial_request",
      link: "/profile?tab=testimonial",
    });
  }

  revalidatePath("/");
}

export async function submitTestimonial(content: string, videoUrl?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  await supabase.from("testimonials").insert({
    client_id: user.id,
    content,
    video_url: videoUrl || null,
    status: "pending",
  });

  // Notify admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"]);

  if (admins) {
    for (const admin of admins) {
      await supabase.from("notifications").insert({
        user_id: admin.id,
        title: "Nouveau témoignage",
        body: "Un client a soumis un nouveau témoignage à valider.",
        type: "testimonial",
        link: "/customers?tab=testimonials",
      });
    }
  }

  revalidatePath("/customers");
}

export async function updateTestimonialStatus(testimonialId: string, status: "approved" | "published" | "rejected") {
  const supabase = await createClient();
  await supabase
    .from("testimonials")
    .update({ status })
    .eq("id", testimonialId);
  revalidatePath("/customers");
}

export async function checkAndCreateNpsSurveys() {
  const supabase = await createClient();

  // Get all clients
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, created_at")
    .in("role", ["client_b2b", "client_b2c"]);

  if (!clients) return;

  const triggerDays = [30, 60, 90];

  for (const client of clients) {
    const createdAt = new Date(client.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    for (const day of triggerDays) {
      if (daysSinceCreation >= day) {
        // Check if survey already exists for this trigger
        const { data: existing } = await supabase
          .from("nps_surveys")
          .select("id")
          .eq("client_id", client.id)
          .eq("trigger_day", day)
          .single();

        if (!existing) {
          await supabase.from("nps_surveys").insert({
            client_id: client.id,
            trigger_day: day,
            sent_at: new Date().toISOString(),
          });

          await supabase.from("notifications").insert({
            user_id: client.id,
            title: "Donnez votre avis !",
            body: `Ça fait ${day} jours que vous êtes avec nous. Comment évaluez-vous votre expérience ?`,
            type: "nps",
            link: "/kpis",
          });
        }
      }
    }
  }
}
