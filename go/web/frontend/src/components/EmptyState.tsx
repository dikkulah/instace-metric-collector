export function EmptyState({ message }: { message: string }) {
  return (
    <div className="panel p-8 text-center text-on-surface-variant text-sm">
      {message}
    </div>
  )
}
