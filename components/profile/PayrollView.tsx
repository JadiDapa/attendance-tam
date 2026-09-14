import { formatRupiah } from "@/lib/employee-profile";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

type Props = {
  payroll: {
    baseSalary: number;
    allowance: number | null;
    bonus: number | null;
    bankAccountNumber: string;
    bankAccountName: string;
    bpjsKesehatanNumber: string | null;
    bpjsKetenagakerjaanNumber: string | null;
  } | null;
};

/** Read-only — karyawan hanya boleh melihat penggajiannya sendiri, tidak ada jalur edit. */
export default function PayrollView({ payroll }: Props) {
  if (!payroll) {
    return (
      <p className="text-muted-foreground text-sm">
        Data penggajian belum diisi admin.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gaji Pokok" value={formatRupiah(payroll.baseSalary)} />
        <Field label="Tunjangan" value={formatRupiah(payroll.allowance)} />
        <Field label="Bonus" value={formatRupiah(payroll.bonus)} />
        <Field label="Nomor Rekening" value={payroll.bankAccountNumber} />
        <Field label="Nama Pemilik Rekening" value={payroll.bankAccountName} />
        <Field
          label="Nomor BPJS Kesehatan"
          value={payroll.bpjsKesehatanNumber || "—"}
        />
        <Field
          label="Nomor BPJS Ketenagakerjaan"
          value={payroll.bpjsKetenagakerjaanNumber || "—"}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Data penggajian hanya bisa diubah oleh admin.
      </p>
    </div>
  );
}
