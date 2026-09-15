import { Table } from "@tanstack/react-table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "@/lib/utils";

/** Filter kolom lewat dropdown — bukan filter string bebas seperti `SearchDataTable`. */
interface SelectDataTableProps<TData> {
  table: Table<TData>;
  column: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
}

const ALL_VALUE = "__all__";

export default function SelectDataTable<TData>({
  table,
  column,
  options,
  placeholder = "Filter",
  allLabel = "Semua",
  className,
}: SelectDataTableProps<TData>) {
  const filterValue = table.getColumn(column)?.getFilterValue();
  const value = filterValue === undefined ? ALL_VALUE : String(filterValue);

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        table.getColumn(column)?.setFilterValue(next === ALL_VALUE ? undefined : next)
      }
    >
      <SelectTrigger className={cn("w-full sm:w-44", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
