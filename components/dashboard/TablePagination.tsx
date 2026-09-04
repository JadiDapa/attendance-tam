import { Table } from "@tanstack/react-table";
import { Button } from "../ui/button";
import {
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
  DoubleArrowLeftIcon as ChevronsLeft,
  DoubleArrowRightIcon as ChevronsRight,
} from "@radix-ui/react-icons";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TData = any;

type Props = {
  table: Table<TData>;
};

export default function TablePagination({ table }: Props) {
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const rowCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-muted-foreground text-sm">
        {rowCount} baris · halaman {Math.min(pageIndex + 1, pageCount || 1)}{" "}
        dari {pageCount || 1}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman pertama"
          onClick={() => table.firstPage()}
          disabled={!table.getCanPreviousPage()}
          className="size-8"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman sebelumnya"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman berikutnya"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Halaman terakhir"
          onClick={() => table.lastPage()}
          disabled={!table.getCanNextPage()}
          className="size-8"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
