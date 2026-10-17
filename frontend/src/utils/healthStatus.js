const statusLabels = {
  checking: 'checking',
  online: 'online',
  degraded: 'degraded',
  offline: 'offline',
}

export function getHealthStatusLabel(status) {
  return statusLabels[status] || 'unknown'
}
