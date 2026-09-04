import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  message: string
  timestamp: string
}

export function App() {
  const [healthMessage, setHealthMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server responded with status: ${res.status}`)
        }
        return res.json()
      })
      .then((data: HealthResponse) => {
        setHealthMessage(data.message)
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch health check')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 font-sans">
      <div className="text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900">AI Helpdesk</h1>

        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Backend API Status
          </p>
          {loading && <p className="text-sm text-slate-500">Checking API status...</p>}
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          {healthMessage && (
            <p className="text-sm font-medium text-emerald-600">{healthMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
