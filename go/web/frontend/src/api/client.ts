export async function apiGet<T>(path: string): Promise<T | null> {
  const res = await fetch(path)
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json() as Promise<T>
}
