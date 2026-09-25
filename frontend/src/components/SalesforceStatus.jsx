import { useEffect, useState } from 'react'
import {
  getSalesforceLoginUrl,
  getSalesforceStatus,
} from '../services/api'

function SalesforceStatus() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const data = await getSalesforceStatus()

        if (cancelled) {
          return
        }

        setStatus({
          connected: data.connected === true,
          instanceUrl: data.instance_url ?? null,
          tokenAvailable: data.token_available === true,
          refreshTokenAvailable: data.refresh_token_available === true,
          status: data.status ?? 'Unknown',
        })

        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to check Salesforce connection.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  function connectSalesforce() {
    window.location.href = getSalesforceLoginUrl()
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-500" />

          <span className="text-sm text-slate-400">
            Checking Salesforce connection...
          </span>
        </div>
      </div>
    )
  }

  const connected = status?.connected === true

  if (error || !connected) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

              <span className="text-sm font-semibold text-white">
                Salesforce Disconnected
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Connect Salesforce to synchronize captured leads.
            </p>
          </div>

          <button
            type="button"
            onClick={connectSalesforce}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Connect Salesforce
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-slate-900 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />

          <div>
            <p className="text-sm font-semibold text-white">
              Salesforce Connected
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Lead synchronization is active.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          Connected
        </span>
      </div>
    </div>
  )
}

export default SalesforceStatus