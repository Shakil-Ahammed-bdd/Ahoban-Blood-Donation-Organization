export async function fetchApiHealth({ signal } = {}) {
  const response = await fetch('/api/health', { credentials: 'include', signal })
  const data = await response.json()

  return { data, ok: response.ok }
}
