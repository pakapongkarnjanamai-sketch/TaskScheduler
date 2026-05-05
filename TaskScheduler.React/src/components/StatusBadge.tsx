type StatusBadgeProps = {
  value?: string | null
}

const statusClassNames: Record<string, string> = {
  Success: 'status-badge status-badge--success',
  Failed: 'status-badge status-badge--failed',
  Error: 'status-badge status-badge--failed',
  Running: 'status-badge status-badge--running',
  Enabled: 'status-badge status-badge--success',
  Disabled: 'status-badge status-badge--empty',
  Connected: 'status-badge status-badge--success',
  Reconnecting: 'status-badge status-badge--running',
  Disconnected: 'status-badge status-badge--failed',
}

export function StatusBadge({ value }: StatusBadgeProps) {
  if (!value) {
    return <span className="status-badge status-badge--empty">Not run</span>
  }

  return <span className={statusClassNames[value] ?? 'status-badge'}>{value}</span>
}