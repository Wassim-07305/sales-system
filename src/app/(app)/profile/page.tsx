import { redirect } from "next/navigation";
import { getProfile } from "@/lib/actions/settings";
import { ProfileView } from "./profile-view";

export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return <ProfileView profile={profile} />;
}
