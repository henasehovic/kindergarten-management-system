import { useEffect, useMemo, useRef, useState } from 'react'

let mapsPromise = null

const DEFAULT_CENTER = { lat: 43.8563, lng: 18.4131 }

function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (mapsPromise) {
    return mapsPromise
  }

  mapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-google-maps]')

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = 'true'
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  }).catch((err) => {
    mapsPromise = null
    throw err
  })

  return mapsPromise
}

export default function GoogleMap({ center, zoom = 15, markerTitle = 'Our location', className }) {
  const mapRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapCenter = useMemo(() => center || DEFAULT_CENTER, [center])

  useEffect(() => {
    let mapInstance = null
    let cancelled = false

    setStatus('loading')
    setError('')

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return

        mapInstance = new maps.Map(mapRef.current, {
          center: mapCenter,
          zoom,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        })

        new maps.Marker({
          position: mapCenter,
          map: mapInstance,
          title: markerTitle,
          clickable: false,
        })

        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(err.message || 'Unable to load map')
      })

    return () => {
      cancelled = true
      mapInstance = null
    }
  }, [apiKey, mapCenter, markerTitle, zoom])

  const containerClass = ['relative w-full h-full overflow-hidden', className].filter(Boolean).join(' ')

  return (
    <div className={containerClass} role="img" aria-label="Location map">
      <div ref={mapRef} className="absolute inset-0 rounded-xl" />

      {status !== 'ready' && (
        <div className="absolute inset-0 grid place-items-center text-sm text-navy/70 bg-mint/40">
          {status === 'loading' ? 'Loading map...' : error || 'Unable to load map'}
        </div>
      )}
    </div>
  )
}
