import Link from "next/link";
import { fmtIdr } from "../lib/format";
import type { DueAlerts } from "../lib/queries";

/** Alert di semua halaman: aset yang sudah waktunya di-claim ke customer (dan yang segera jatuh tempo). */
export default function DueBanner({ a }: { a: DueAlerts }) {
  if (!a.due && !a.soon) return null;
  return (
    <div className="space-y-2 mb-5" role="region" aria-label="Pengingat claim customer">
      {a.due > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center justify-between gap-2" role="alert">
          <span>
            <b>⚠ {a.due} aset sudah waktunya di-claim ke customer</b> ({fmtIdr(a.dueAmount)})
            {a.overdue > 0 && <> · {a.overdue} sudah lewat jatuh tempo</>}{a.today > 0 && <> · {a.today} jatuh tempo hari ini</>}
          </span>
          <Link href="/assets?due=due" className="btn-danger !py-1 !px-3 text-xs">Lihat &amp; claim →</Link>
        </div>
      )}
      {a.soon > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>{a.soon} aset akan jatuh tempo dalam 7 hari ke depan ({fmtIdr(a.soonAmount)})</span>
          <Link href="/assets?due=soon" className="underline">Lihat</Link>
        </div>
      )}
    </div>
  );
}
