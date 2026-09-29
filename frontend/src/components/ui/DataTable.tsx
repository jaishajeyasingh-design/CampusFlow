import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  actionSlot?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There is currently no data matching your query.',
  searchable = false,
  searchPlaceholder = 'Search...',
  searchFilter,
  actionSlot,
  className = '',
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');

  const filteredData = React.useMemo(() => {
    if (!searchable || !internalSearch.trim()) return data;
    if (searchFilter) {
      return data.filter((item) => searchFilter(item, internalSearch.trim()));
    }
    // Default search heuristic across all string/number fields of item
    const lower = internalSearch.toLowerCase();
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some((val) =>
        String(val ?? '').toLowerCase().includes(lower)
      )
    );
  }, [data, internalSearch, searchable, searchFilter]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search and Action Toolbar */}
      {(searchable || actionSlot) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {searchable ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          ) : <div />}

          {actionSlot && <div className="flex items-center gap-2">{actionSlot}</div>}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <LoadingState message="Fetching data..." rows={4} type="skeleton" className="border-0 shadow-none" />
        ) : filteredData.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            className="border-0 shadow-none py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`py-2.5 px-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredData.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`py-2.5 px-3.5 ${col.className || ''}`}>
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? String(item[col.accessorKey] ?? '')
                          : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
