import { useEffect, useRef, useState } from 'react'

/**
 * IntersectionObserver-based lazy mount.
 * Shows a lightweight skeleton until the section enters the viewport.
 */
export default function LazySection({ children, placeholderHeight = 320, renderPlaceholder }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || visible) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '120px', threshold: 0.2 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])

  if (visible) {
    return <div ref={ref}>{children}</div>
  }

  const skeleton = renderPlaceholder ? (
    renderPlaceholder()
  ) : (
    <div
      className="w-full rounded-3xl bg-white/60 border border-berry/10 shadow-sm animate-pulse"
      style={{ minHeight: placeholderHeight }}
      aria-hidden="true"
    >
      <div className="h-full flex flex-col gap-3 p-6">
        <div className="h-6 w-1/3 bg-berry/20 rounded"></div>
        <div className="h-4 w-2/3 bg-berry/15 rounded"></div>
        <div className="flex-1 w-full bg-berry/10 rounded"></div>
      </div>
    </div>
  )

  return <div ref={ref}>{skeleton}</div>
}
