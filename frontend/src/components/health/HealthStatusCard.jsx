import DetailCard from '../shared/DetailCard'
import StatusBadge from '../shared/StatusBadge'

function HealthStatusCard({ health, onRetry }) {
  return (
    <section
      aria-live="polite"
      className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Backend health</h2>
        <StatusBadge status={health.state} />
      </div>

      {health.data && (
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailCard label="API" value={health.data.status} />
          <DetailCard label="MongoDB" value={health.data.database} />
        </dl>
      )}

      {health.error && (
        <p className="mt-5 text-sm text-rose-300">
          Could not reach the backend: {health.error}
        </p>
      )}

      {health.data?.message && (
        <p className="mt-5 text-sm text-amber-200">{health.data.message}</p>
      )}

      <button
        className="button button-primary mt-6"
        onClick={onRetry}
        type="button"
      >
        Check again
      </button>
    </section>
  )
}

export default HealthStatusCard
