import { useEffect, useState } from 'react'
import { fetchApiHealth } from '../services/api/healthApi'

function useApiHealth() {
  const [health, setHealth] = useState({ state: 'checking' })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const result = await fetchApiHealth({ signal: controller.signal })
        setHealth({
          state: result.ok ? 'online' : 'degraded',
          data: result.data,
        })
      } catch (error) {
        if (error.name !== 'AbortError') {
          setHealth({ state: 'offline', error: error.message })
        }
      }
    }

    checkHealth()
    return () => controller.abort()
  }, [retry])

  return {
    health,
    retryHealthCheck: () => setRetry((current) => current + 1),
  }
}

export default useApiHealth
