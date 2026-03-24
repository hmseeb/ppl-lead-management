'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  RowSelectionState,
} from '@tanstack/react-table'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ReassignDialog } from '@/components/leads/reassign-dialog'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T, unknown>[]
  totalCount: number
  brokersWithOrders?: any[]
}

export function LeadsDataTable<T extends { id: string; assigned_broker_id: string | null }>({ data, columns, totalCount, brokersWithOrders }: DataTableProps<T>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const selectColumn: ColumnDef<T, unknown> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        disabled={!row.original.assigned_broker_id}
      />
    ),
    enableSorting: false,
  }

  const allColumns = [selectColumn, ...columns]

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    meta: { brokersWithOrders },
    enableRowSelection: (row) => !!row.original.assigned_broker_id,
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedLeadIds = selectedRows.map((r) => r.original.id)

  return (
    <div>
      {selectedLeadIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">{selectedLeadIds.length} selected</span>
          <ReassignDialog
            selectedLeadIds={selectedLeadIds}
            onComplete={() => setRowSelection({})}
          />
        </div>
      )}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={allColumns.length} className="h-24 text-center text-muted-foreground">
                No leads found matching your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground mt-2">{totalCount} total leads</p>
    </div>
  )
}
