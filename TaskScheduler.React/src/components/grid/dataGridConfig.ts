export const WORKSPACE_GRID_HEIGHT = 'calc(100vh - 300px)' as const
export const CATALOG_GRID_HEIGHT = 'calc(100vh - 190px)' as const

export const baseDataGridProps = {
  width: '100%',
  showBorders: true,
  rowAlternationEnabled: true,
} as const

export const workspaceDataGridProps = {
  ...baseDataGridProps,
  columnAutoWidth: true,
  wordWrapEnabled: true,
  remoteOperations: true,
  height: WORKSPACE_GRID_HEIGHT,
} as const

export const catalogDataGridProps = {
  ...baseDataGridProps,
  repaintChangesOnly: true,
  columnAutoWidth: true,
  columnHidingEnabled: false,
  wordWrapEnabled: true,
  remoteOperations: true,
  height: CATALOG_GRID_HEIGHT,
} as const

export const fixedActionColumnProps = {
  caption: 'Actions',
  width: 170,
  minWidth: 150,
  alignment: 'center' as const,
  cssClass: 'actions-column',
  fixed: true,
  fixedPosition: 'right' as const,
  allowSorting: false,
  allowFiltering: false,
  allowHeaderFiltering: false,
} as const

export const standardVirtualScrollingProps = {
  mode: 'virtual' as const,
  columnRenderingMode: 'virtual' as const,
  showScrollbar: 'always' as const,
  useNative: false,
} as const
