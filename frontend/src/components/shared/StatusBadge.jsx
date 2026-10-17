import { getHealthStatusLabel } from '../../utils/healthStatus'

const statusClasses = {
  checking: 'bg-amber-100 text-amber-800',
  online: 'bg-emerald-100 text-emerald-800',
  degraded: 'bg-amber-100 text-amber-800',
  offline: 'bg-rose-100 text-rose-800',
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${statusClasses[status]}`}
    >
      {getHealthStatusLabel(status)}
    </span>
  )
}

export default StatusBadge
