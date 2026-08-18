"use client";

import { ReactNode, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  Table as TableType,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TablePagination from "./TablePagination";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filters?: (table: TableType<TData>) => ReactNode;
  title?: string;
  emptyMessage?: string;
  /** Tanpa kartu pembungkus — dipakai kalau tabelnya sudah berada di dalam panel. */
  bare?: boolean;
  /** Kartu mobile jadi bisa di-tap untuk buka detail baris — kolom aksi jadi berlebihan. */
  onRowClick?: (row: TData) => void;
  /** Tampilan kartu mobile sepenuhnya kustom — dipakai kalau kartu label:value
   * generik dari kolom tabel tidak cocok untuk data ini. */
  renderMobileCard?: (row: TData) => ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DataTable: React.FC<DataTableProps<any, any>> = ({
  columns,
  data,
  filters,
  title = "Data Filters",
  emptyMessage = "Tidak ada data.",
  bare = false,
  onRowClick,
  renderMobileCard,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const headerById = new Map(
    table.getFlatHeaders().map((header) => [header.column.id, header]),
  );

  return (
    <div
      className={
        bare ? "w-full" : "box-shadow bg-card w-full rounded-lg border py-4"
      }
    >
      {filters &&
        (bare ? (
          <div className="mb-3 flex flex-wrap justify-end gap-3">
            {filters(table)}
          </div>
        ) : (
          <>
            <div className="flex w-full items-center justify-between gap-24 px-5">
              <div className="text-lg font-medium">{title}:</div>
              <div className="flex flex-1 justify-end gap-4">
                {filters(table)}
              </div>
            </div>
            <div className="bg-muted my-2 h-px w-full" />
          </>
        ))}

      {/* Table — dari md ke atas */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Kartu per baris — di bawah md, supaya tidak scroll horizontal. Pakai
          semua baris yang lolos filter/sort, tanpa paginasi. */}
      <div className={cn("flex flex-col gap-3 md:hidden", !bare && "px-4")}>
        {table.getSortedRowModel().rows?.length ? (
          table.getSortedRowModel().rows.map((row) => {
            const rowProps = {
              role: onRowClick ? "button" : undefined,
              tabIndex: onRowClick ? 0 : undefined,
              onClick: onRowClick
                ? () => onRowClick(row.original)
                : undefined,
              onKeyDown: onRowClick
                ? (event: React.KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row.original);
                    }
                  }
                : undefined,
            };

            if (renderMobileCard) {
              return (
                <div
                  key={row.id}
                  {...rowProps}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {renderMobileCard(row.original)}
                </div>
              );
            }

            const cells = row
              .getVisibleCells()
              .filter((cell) => !cell.column.columnDef.meta?.hiddenInCard);

            return (
              <div
                key={row.id}
                {...rowProps}
                className={cn(
                  "divide-border relative flex flex-col divide-y rounded-xl border",
                  onRowClick &&
                    "hover:bg-muted/60 active:bg-muted cursor-pointer transition-colors",
                  bare ? "bg-background" : "bg-muted/30",
                )}
              >
                {cells.map((cell) => {
                  const header = headerById.get(cell.column.id);
                  const label =
                    header && !header.isPlaceholder
                      ? flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      : null;

                  return (
                    <div
                      key={cell.id}
                      className={cn(
                        "flex items-start gap-4 px-4 py-2.5 text-sm",
                        onRowClick && "pr-8",
                      )}
                    >
                      <span className="text-muted-foreground w-24 shrink-0 pt-0.5 text-xs font-medium">
                        {label}
                      </span>
                      <div className="min-w-0 flex-1">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    </div>
                  );
                })}

                {onRowClick && (
                  <ChevronRight className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2" />
                )}
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground rounded-xl border py-10 text-center text-sm">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <TablePagination table={table} />
      </div>
    </div>
  );
};

export default DataTable;
