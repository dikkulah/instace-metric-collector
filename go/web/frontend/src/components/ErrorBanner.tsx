export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-error/40 bg-error/10 text-error px-4 py-3 text-sm" role="alert">
      {message}
    </div>
  )
}
