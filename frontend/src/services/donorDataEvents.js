const DONOR_DATA_CHANGED = 'ahoban:donor-data-changed'
const DONOR_DATA_CHANNEL = 'ahoban-donor-data'
const subscribers = new Set()
const channel = typeof window === 'undefined' || typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(DONOR_DATA_CHANNEL)

channel?.addEventListener('message', () => {
  subscribers.forEach((callback) => callback())
})

export function notifyDonorDataChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(DONOR_DATA_CHANGED))
  channel?.postMessage('changed')
}

export function subscribeToDonorDataChanges(callback) {
  if (typeof window === 'undefined') return () => {}
  subscribers.add(callback)
  window.addEventListener(DONOR_DATA_CHANGED, callback)
  window.addEventListener('focus', callback)

  return () => {
    subscribers.delete(callback)
    window.removeEventListener(DONOR_DATA_CHANGED, callback)
    window.removeEventListener('focus', callback)
  }
}
