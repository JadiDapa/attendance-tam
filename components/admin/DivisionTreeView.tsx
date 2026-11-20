"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRightIcon,
  DotsHorizontalIcon,
  ExclamationTriangleIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  assignUserPosition,
  createDivision,
  createPosition,
  deleteDivision,
  deletePosition,
  renameDivision,
  renamePosition,
  type DivisionResult,
} from "@/app/action/division.action";
import {
  isDivisionSupervisor,
  type DivisionNode,
  type DivisionTree,
  type OrgUser,
  type PositionNode,
} from "@/lib/division";
import { ROLE_LABEL } from "@/lib/role";
import { NO_POSITION, type PositionGroup } from "@/lib/division";

export type DivisionPerson = OrgUser & { email: string };

type DialogState =
  | { kind: "create-division" }
  | { kind: "rename-division"; id: string; name: string }
  | { kind: "delete-division"; id: string; name: string }
  | { kind: "create-position"; divisionId: string; divisionName: string }
  | { kind: "rename-position"; id: string; name: string; holders: number }
  | { kind: "delete-position"; id: string; name: string }
  | { kind: "move-person"; person: DivisionPerson }
  | null;

type OpenDialog = (state: Exclude<DialogState, null>) => void;

export default function DivisionTreeView({
  tree,
  positionGroups,
}: {
  tree: DivisionTree<DivisionPerson>;
  positionGroups: PositionGroup[];
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setDialog({ kind: "create-division" })}>
          <PlusIcon className="size-4" />
          Tambah Divisi
        </Button>
      </div>

      <ManagerNode managers={tree.managers} />

      <div className="bg-border mx-auto -my-6 h-6 w-px" aria-hidden />

      {tree.divisions.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground text-center">
            Belum ada Divisi. Tambahkan Divisi lalu Jabatan di dalamnya.
          </CardContent>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {tree.divisions.map((division) => (
            <DivisionCard
              key={division.id}
              division={division}
              onOpen={setDialog}
            />
          ))}
        </div>
      )}

      <UnassignedCard people={tree.unassigned} onOpen={setDialog} />

      {dialog?.kind === "create-division" && (
        <NameDialog
          title="Tambah Divisi"
          label="Nama Divisi"
          placeholder="Contoh: Teknis"
          submitLabel="Tambah"
          onSubmit={(name) => createDivision({ name })}
          onClose={close}
        />
      )}
      {dialog?.kind === "rename-division" && (
        <NameDialog
          title="Ubah Nama Divisi"
          label="Nama Divisi"
          initialName={dialog.name}
          submitLabel="Simpan"
          onSubmit={(name) => renameDivision(dialog.id, { name })}
          onClose={close}
        />
      )}
      {dialog?.kind === "create-position" && (
        <NameDialog
          title="Tambah Jabatan"
          description={`Jabatan baru di Divisi ${dialog.divisionName}.`}
          label="Nama Jabatan"
          placeholder="Contoh: Teknisi"
          submitLabel="Tambah"
          onSubmit={(name) =>
            createPosition({ name, divisionId: dialog.divisionId })
          }
          onClose={close}
        />
      )}
      {dialog?.kind === "rename-position" && (
        <NameDialog
          title="Ubah Nama Jabatan"
          description={
            dialog.holders > 0
              ? `Nama jabatan di profil ${dialog.holders} pemegangnya ikut diperbarui.`
              : undefined
          }
          label="Nama Jabatan"
          initialName={dialog.name}
          submitLabel="Simpan"
          onSubmit={(name) => renamePosition(dialog.id, { name })}
          onClose={close}
        />
      )}
      {dialog?.kind === "delete-division" && (
        <ConfirmDeleteDialog
          title={`Hapus Divisi ${dialog.name}?`}
          description="Divisi hanya bisa dihapus kalau sudah tidak punya Jabatan."
          onConfirm={() => deleteDivision(dialog.id)}
          onClose={close}
        />
      )}
      {dialog?.kind === "delete-position" && (
        <ConfirmDeleteDialog
          title={`Hapus Jabatan ${dialog.name}?`}
          description="Jabatan hanya bisa dihapus kalau tidak ada pemegangnya, termasuk akun nonaktif."
          onConfirm={() => deletePosition(dialog.id)}
          onClose={close}
        />
      )}
      {dialog?.kind === "move-person" && (
        <MovePersonDialog
          person={dialog.person}
          positionGroups={positionGroups}
          onClose={close}
        />
      )}
    </div>
  );
}

function ManagerNode({ managers }: { managers: DivisionPerson[] }) {
  return (
    <Card size="sm" className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Manager</CardTitle>
        <CardDescription>
          Membawahi semua Divisi dan memutuskan Pengajuan para Supervisor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {managers.length === 0 ? (
          <p className="text-muted-foreground">Belum ada Manager aktif.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {managers.map((manager) => (
              <li key={manager.id} className="flex flex-col">
                <span className="font-medium">{manager.name}</span>
                <span className="text-muted-foreground text-xs">
                  {manager.email}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DivisionCard({
  division,
  onOpen,
}: {
  division: DivisionNode<DivisionPerson>;
  onOpen: OpenDialog;
}) {
  const people = division.positions.reduce(
    (total, position) => total + position.holders.length,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{division.name}</CardTitle>
        <CardDescription>
          {division.positions.length} Jabatan · {people} orang
        </CardDescription>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Aksi Divisi ${division.name}`}
              >
                <DotsHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() =>
                  onOpen({
                    kind: "create-position",
                    divisionId: division.id,
                    divisionName: division.name,
                  })
                }
              >
                <PlusIcon />
                Tambah Jabatan
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  onOpen({
                    kind: "rename-division",
                    id: division.id,
                    name: division.name,
                  })
                }
              >
                <Pencil1Icon />
                Ubah Nama
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  onOpen({
                    kind: "delete-division",
                    id: division.id,
                    name: division.name,
                  })
                }
              >
                <TrashIcon />
                Hapus Divisi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {division.hasSupervisor ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Supervisor Divisi:</span>
            {division.supervisors.map((supervisor) => (
              <Badge key={supervisor.id}>{supervisor.name}</Badge>
            ))}
          </div>
        ) : (
          <Alert variant="destructive">
            <ExclamationTriangleIcon />
            <AlertTitle>Belum ada Supervisor Divisi</AlertTitle>
            <AlertDescription>
              Pengajuan anggota Divisi ini naik ke Manager. Pindahkan seorang
              Supervisor ke Jabatan di Divisi ini.
            </AlertDescription>
          </Alert>
        )}

        {division.positions.length === 0 ? (
          <p className="text-muted-foreground">
            Belum ada Jabatan di Divisi ini.
          </p>
        ) : (
          division.positions.map((position) => (
            <PositionItem key={position.id} position={position} onOpen={onOpen} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PositionItem({
  position,
  onOpen,
}: {
  position: PositionNode<DivisionPerson>;
  onOpen: OpenDialog;
}) {
  const totalHolders = position.holders.length + position.inactiveHolderCount;

  return (
    <Collapsible defaultOpen className="rounded-lg border">
      <div className="flex items-center gap-1 py-1 pr-1 pl-1">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="group flex-1 justify-start gap-2 font-medium"
          >
            <ChevronRightIcon className="transition-transform group-data-[state=open]:rotate-90" />
            <span className="truncate">{position.name}</span>
            <Badge variant="secondary">{position.holders.length}</Badge>
          </Button>
        </CollapsibleTrigger>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Aksi Jabatan ${position.name}`}
            >
              <DotsHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() =>
                onOpen({
                  kind: "rename-position",
                  id: position.id,
                  name: position.name,
                  holders: totalHolders,
                })
              }
            >
              <Pencil1Icon />
              Ubah Nama
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() =>
                onOpen({
                  kind: "delete-position",
                  id: position.id,
                  name: position.name,
                })
              }
            >
              <TrashIcon />
              Hapus Jabatan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CollapsibleContent className="border-t">
        {position.holders.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2">
            Belum ada pemegang.
          </p>
        ) : (
          <ul className="divide-y">
            {position.holders.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actionLabel="Pindahkan"
                onAction={() => onOpen({ kind: "move-person", person })}
              />
            ))}
          </ul>
        )}
        {position.inactiveHolderCount > 0 && (
          <p className="text-muted-foreground border-t px-3 py-2 text-xs">
            + {position.inactiveHolderCount} akun nonaktif masih memegang
            Jabatan ini.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function PersonRow({
  person,
  actionLabel,
  onAction,
}: {
  person: DivisionPerson;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{person.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          {person.email}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isDivisionSupervisor(person) && <Badge>Supervisor Divisi</Badge>}
        <Badge variant="outline">{ROLE_LABEL[person.role]}</Badge>
        <Button variant="ghost" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </li>
  );
}

function UnassignedCard({
  people,
  onOpen,
}: {
  people: DivisionPerson[];
  onOpen: OpenDialog;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Belum punya Jabatan</CardTitle>
        <CardDescription>
          User aktif selain Manager yang belum punya Jabatan, jadi belum punya
          Divisi. Pengajuan mereka terlihat oleh semua Supervisor.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{people.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-muted-foreground">Semua user aktif sudah punya Jabatan.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {people.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                actionLabel="Atur Jabatan"
                onAction={() => onOpen({ kind: "move-person", person })}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Jalankan aksi server, tampilkan toast, segarkan data halaman kalau berhasil. */
function useDivisionAction(onDone: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<DivisionResult>) =>
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      onDone();
      router.refresh();
    });

  return { pending, run };
}

function NameDialog({
  title,
  description,
  label,
  placeholder,
  initialName = "",
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  initialName?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<DivisionResult>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const { pending, run } = useDivisionAction(onClose);
  const unchanged = name.trim() === initialName.trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => onSubmit(name));
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">{label}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={placeholder}
              maxLength={60}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" disabled={pending || !name.trim() || unchanged}>
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<DivisionResult>;
  onClose: () => void;
}) {
  const { pending, run } = useDivisionAction(onClose);

  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Tetap terbuka sampai server menjawab — kalau ditolak, pesannya
              // muncul sebagai toast dan admin bisa membatalkan.
              event.preventDefault();
              run(onConfirm);
            }}
          >
            {pending && <Spinner />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MovePersonDialog({
  person,
  positionGroups,
  onClose,
}: {
  person: DivisionPerson;
  positionGroups: PositionGroup[];
  onClose: () => void;
}) {
  const current = person.positionId ?? NO_POSITION;
  const [value, setValue] = useState(current);
  const { pending, run } = useDivisionAction(onClose);
  const groups = positionGroups.filter((group) => group.positions.length > 0);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Atur Jabatan</DialogTitle>
          <DialogDescription>
            {person.name}. Divisi ikut Jabatan yang dipilih dan berlaku
            langsung, tanpa approval. Role ({ROLE_LABEL[person.role]}) tidak
            berubah.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="move-position">Jabatan</Label>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada Jabatan. Tambahkan Jabatan di salah satu Divisi dulu.
            </p>
          ) : (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger id="move-position" className="w-full">
                <SelectValue placeholder="Pilih Jabatan" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectGroup key={group.divisionId}>
                    <SelectLabel>Divisi {group.divisionName}</SelectLabel>
                    {group.positions.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
                <SelectSeparator />
                <SelectItem value={NO_POSITION}>Kosongkan Jabatan</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Batal
          </Button>
          <Button
            disabled={pending || value === current}
            onClick={() =>
              run(() =>
                assignUserPosition({
                  userId: person.id,
                  positionId: value === NO_POSITION ? null : value,
                }),
              )
            }
          >
            {pending && <Spinner />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
