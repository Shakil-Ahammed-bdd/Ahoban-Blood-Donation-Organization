import { useEffect, useRef } from 'react'

function Reveal({ as: Element = 'div', children, className = '', delay = 0 }) {
  const elementRef = useRef(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return undefined

    element.classList.add('reveal-ready')

    if (!('IntersectionObserver' in window)) {
      element.classList.add('is-visible')
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.classList.add('is-visible')
          observer.unobserve(element)
        }
      },
      { threshold: 0.12 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Element
      className={`reveal${className ? ` ${className}` : ''}`}
      ref={elementRef}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Element>
  )
}

export default Reveal
