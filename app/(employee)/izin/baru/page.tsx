import { notFound } from "next/navigation";
import {
  LeaveRequestFormBody,
  type LeaveFormType,
} from "@/components/mobile/izin/leave-request-form-body";
import { requireUser } from "@/lib/session";

const TYPE_BY_PARAM: Record<
  string,
  { type: LeaveFormType; reasonPlaceholder: string }
> = {
  sakit: {
    type: "Sakit",
    reasonPlaceholder: "Contoh: demam sejak kemarin malam",
  },
  izin: {
    type: "Izin",
    reasonPlaceholder: "Contoh: mengurus keperluan keluarga",
  },
  cuti: {
    type: "Cuti",
    reasonPlaceholder: "Contoh: liburan tahunan bersama keluarga",
  },
};

export default async function IzinBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireUser();

  const { type: typeParam } = await searchParams;
  const config = typeParam ? TYPE_BY_PARAM[typeParam] : undefined;

  if (!config) notFound();

  return (
    <LeaveRequestFormBody
      type={config.type}
      reasonPlaceholder={config.reasonPlaceholder}
    />
  );
}
