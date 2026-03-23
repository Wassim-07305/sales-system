import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CRMDealPage({ params }: Props) {
  const { id } = await params;
  redirect(`/pipeline/${id}`);
}
