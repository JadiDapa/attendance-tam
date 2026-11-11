"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil2Icon as Pencil,
  TrashIcon as Trash2,
  PlusIcon as Plus,
  LayersIcon as Layers,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  createDivision,
  updateDivision,
  deleteDivision,
} from "@/app/action/division.action";

export type DivisionItem = {
  id: string;
  name: string;
  positionsCount: number;
  usersCount: number;
  createdAt: string;
};

export default function DivisionManagement({
  divisions,
}: {
  divisions: DivisionItem[];
}) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DivisionItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DivisionItem | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [pending, startTransition] = useTransition();

  const handleOpenCreate = () => {
    setNameInput("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (item: DivisionItem) => {
    setEditTarget(item);
    setNameInput(item.name);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error("Nama divisi wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await createDivision({ name: nameInput.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setIsCreateOpen(false);
      setNameInput("");
      router.refresh();
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!nameInput.trim()) {
      toast.error("Nama divisi wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await updateDivision(editTarget.id, { name: nameInput.trim() });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      setEditTarget(null);
      setNameInput("");
      router.refresh();
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteDivision(deleteTarget.id);
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Daftar Divisi</h3>
          <p className="text-muted-foreground text-sm">
            Total {divisions.length} divisi terdaftar
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 self-start sm:self-auto">
          <Plus className="size-4" />
          Tambah Divisi
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Divisi</TableHead>
              <TableHead className="text-center">Jumlah Jabatan</TableHead>
              <TableHead className="text-center">Jumlah Karyawan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada divisi yang dibuat.
                </TableCell>
              </TableRow>
            ) : (
              divisions.map((div, idx) => (
                <TableRow key={div.id}>
                  <TableCell className="text-center text-muted-foreground text-xs font-mono">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    {div.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{div.positionsCount} Jabatan</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={div.usersCount > 0 ? "secondary" : "outline"}>
                      {div.usersCount} Karyawan
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(div)}
                        title="Edit nama divisi"
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(div)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Hapus divisi"
                        disabled={div.usersCount > 0}
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

      {/* Dialog Tambah Divisi */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Tambah Divisi Baru</DialogTitle>
              <DialogDescription>
                Masukkan nama divisi yang ingin ditambahkan ke sistem.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="create-division-name">Nama Divisi</Label>
              <Input
                id="create-division-name"
                placeholder="Contoh: Operasional, Logistik"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                disabled={pending}
              />
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
              <Button type="submit" disabled={pending || !nameInput.trim()}>
                {pending ? "Menyimpan..." : "Simpan Divisi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Divisi */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Nama Divisi</DialogTitle>
              <DialogDescription>
                Ubah nama divisi &apos;{editTarget?.name}&apos;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="edit-division-name">Nama Divisi</Label>
              <Input
                id="edit-division-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
                disabled={pending}
              />
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
              <Button type="submit" disabled={pending || !nameInput.trim()}>
                {pending ? "Memperbarui..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Hapus Divisi */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Divisi &apos;{deleteTarget?.name}&apos;?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus divisi dan seluruh jabatan yang berada di bawahnya.
              {deleteTarget && deleteTarget.usersCount > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Perhatian: Terdapat {deleteTarget.usersCount} karyawan pada divisi ini. Divisi tidak dapat dihapus sebelum karyawan dialihkan ke divisi lain.
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
              {pending ? "Menghapus..." : "Hapus Divisi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

