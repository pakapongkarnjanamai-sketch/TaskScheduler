type StatusTextProps = {
  value?: string | null
}

const statusClassNames: Record<string, string> = {
  Success: 'status-text status-text--success',
  Failed: 'status-text status-text--failed',
  Error: 'status-text status-text--failed',
  Running: 'status-text status-text--running',
  Enabled: 'status-text status-text--success',
  Disabled: 'status-text status-text--empty',
  Connected: 'status-text status-text--success',
  Reconnecting: 'status-text status-text--running',
  Disconnected: 'status-text status-text--failed',
}

export function StatusText({ value }: StatusTextProps) {
  if (!value) {
    return <span className="status-text status-text--empty">Not run</span>
  }

  return <span className={statusClassNames[value] ?? 'status-text'}>{value}</span>
}