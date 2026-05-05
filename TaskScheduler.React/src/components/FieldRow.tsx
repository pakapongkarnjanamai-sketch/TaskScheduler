import type { ReactNode } from 'react'

type FieldRowProps = {
  label: string
  children: ReactNode
}

export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <label className="field-row">
      <span>{label}</span>
      {children}
    </label>
  )
}