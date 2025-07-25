'use client'

interface EmptyStateProps {
  message?: string
}

export default function EmptyState({
  message = 'No trips to display',
}: EmptyStateProps) {
  return (
    <div className="bg-muted rounded-lg p-8 text-center">
      <p className="mb-4 text-base">{message}</p>
    </div>
  )
}
