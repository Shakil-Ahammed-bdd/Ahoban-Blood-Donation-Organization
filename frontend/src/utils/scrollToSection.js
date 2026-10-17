export function scrollToSection(id) {
  const target = document.getElementById(id)
  if (!target) return () => {}

  const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0
  const destination = () =>
    Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerHeight - 16)
  const start = window.scrollY
  const distance = Math.abs(destination() - start)
  if (distance < 1) return () => {}

  const duration = Math.min(900, Math.max(280, distance * 0.12))
  let animationFrame = 0
  let startedAt

  function cancel() {
    window.cancelAnimationFrame(animationFrame)
    window.removeEventListener('wheel', cancel)
    window.removeEventListener('touchstart', cancel)
    window.removeEventListener('keydown', cancel)
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: destination(), behavior: 'instant' })
    return cancel
  }

  function animate(timestamp) {
    if (startedAt === undefined) startedAt = timestamp
    const progress = Math.min((timestamp - startedAt) / duration, 1)
    const easedProgress = 1 - (1 - progress) ** 3
    const nextPosition = start + (destination() - start) * easedProgress
    window.scrollTo({ top: nextPosition, behavior: 'instant' })

    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(animate)
    } else {
      window.scrollTo({ top: destination(), behavior: 'instant' })
      cancel()
    }
  }

  window.addEventListener('wheel', cancel, { passive: true, once: true })
  window.addEventListener('touchstart', cancel, { passive: true, once: true })
  window.addEventListener('keydown', cancel, { once: true })
  animationFrame = window.requestAnimationFrame(animate)
  return cancel
}
