"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
  PlusIcon as Plus,
  PersonIcon as Briefcase,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPosition,
  updatePosition,
  deletePosition,
} from "@/app/action/division.action";

export type PositionItem = {
  id: string;
  name: string;
  divisionId: string;
  divisionName: string;
  usersCount: number;
  createdAt: string;
};

export type DivisionOption = {
  id: string;
  name: string;
};

export default function PositionManagement({
  positions,
  divisions,
}: {
  positions: PositionItem[];
  divisions: DivisionOption[];
}) {
  const router = useRouter();
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PositionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PositionItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formDivisionId, setFormDivisionId] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredPositions = useMemo(() => {
    if (selectedDivisionFilter === "ALL") return positions;
    return positions.filter((p) => p.divisionId === selectedDivisionFilter);
  }, [positions, selectedDivisionFilter]);

  const handleOpenCreate = () => {
    setFormName("");
    setFormDivisionId(divisions[0]?.id ?? "");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: PositionItem) => {
    setEditTarget(item);
    setFormName(item.name);
    setFormDivisionId(item.divisionId);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nama jabatan wajib diisi");
      return;
    }
    if (!formDivisionId) {
      toast.error("Divisi wajib dipilih");
      return;
    }

    startTransition(async () => {
      const res = await createPosition({
        name: formName.trim(),
        divisionId: formDivisionId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setIsCreateOpen(false);
      setFormName("");
      router.refresh();
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!formName.trim()) {
      toast.error("Nama jabatan wajib diisi");
      return;
    }
    if (!formDivisionId) {
      toast.error("Divisi wajib dipilih");
      return;
    }

    startTransition(async () => {
      const res = await updatePosition(editTarget.id, {
        name: formName.trim(),
        divisionId: formDivisionId,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setEditTarget(null);
      setFormName("");
      router.refresh();
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deletePosition(deleteTarget.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daftar Jabatan / Posisi</h3>
          <p className="text-muted-foreground text-sm">
            Total {filteredPositions.length} jabatan{" "}
            {selectedDivisionFilter !== "ALL" ? "pada divisi terpilih" : "terdaftar"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-48">
            <Select
              value={selectedDivisionFilter}
              onValueChange={setSelectedDivisionFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter Divisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Divisi</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="size-4" />
            Tambah Jabatan
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Jabatan</TableHead>
              <TableHead>Divisi</TableHead>
              <TableHead className="text-center">Jumlah Karyawan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPositions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada jabatan untuk filter divisi ini.
                </TableCell>
              </TableRow>
            ) : (
              filteredPositions.map((pos, idx) => (
                <TableRow key={pos.id}>
                  <TableCell className="text-center text-muted-foreground text-xs font-mono">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    {pos.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{pos.divisionName}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={pos.usersCount > 0 ? "secondary" : "outline"}>
                      {pos.usersCount} Karyawan
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(pos)}
                        title="Edit jabatan"
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(pos)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Hapus jabatan"
                        disabled={pos.usersCount > 0}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Hapus</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Tambah Jabatan */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Jabatan Baru</DialogTitle>
              <DialogDescription>
                Pilih divisi dan masukkan nama jabatan yang ingin ditambahkan.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-pos-division">Divisi</Label>
                <Select
                  value={formDivisionId}
                  onValueChange={setFormDivisionId}
                  disabled={pending}
                >
                  <SelectTrigger id="create-pos-division">
                    <SelectValue placeholder="Pilih Divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-pos-name">Nama Jabatan</Label>
                <Input
                  id="create-pos-name"
                  placeholder="Contoh: Teknisi Senior, Staff IT"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={pending || !formName.trim() || !formDivisionId}
              >
                {pending ? "Menyimpan..." : "Simpan Jabatan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Jabatan */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Jabatan</DialogTitle>
              <DialogDescription>
                Ubah informasi jabatan &apos;{editTarget?.name}&apos;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pos-division">Divisi</Label>
                <Select
                  value={formDivisionId}
                  onValueChange={setFormDivisionId}
                  disabled={pending}
                >
                  <SelectTrigger id="edit-pos-division">
                    <SelectValue placeholder="Pilih Divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pos-name">Nama Jabatan</Label>
                <Input
                  id="edit-pos-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={pending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={pending || !formName.trim() || !formDivisionId}
              >
                {pending ? "Memperbarui..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Hapus Jabatan */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Jabatan &apos;{deleteTarget?.name}&apos;?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus data jabatan ini dari sistem.
              {deleteTarget && deleteTarget.usersCount > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Perhatian: Terdapat {deleteTarget.usersCount} karyawan dengan jabatan ini. Jabatan tidak dapat dihapus sebelum jabatan karyawan dialihkan.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={pending || (deleteTarget?.usersCount ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Menghapus..." : "Hapus Jabatan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

