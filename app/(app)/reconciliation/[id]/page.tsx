import { notFound } from "next/navigation";
import { loadRecon, liteAssets } from "../../../../lib/reconData";
import ReconEditor from "./ReconEditor";

export const dynamic = "force-dynamic";

export default async function ReconPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const data = await loadRecon(id);
  if (!data) notFound();
  const assets = await liteAssets();
  return <ReconEditor initial={JSON.parse(JSON.stringify(data))} assets={JSON.parse(JSON.stringify(assets))} />;
}
