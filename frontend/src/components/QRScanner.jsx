import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

function QRScanner({ onClose, onScan }) {
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)

  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let mounted = true

    async function startScanner() {
      if (!videoRef.current) {
        return
      }

      try {
        setError(null)
        setStarting(true)

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            if (!mounted || scannedRef.current) {
              return
            }

            scannedRef.current = true

            const value =
              typeof result === 'string'
                ? result
                : result?.data

            if (!value) {
              scannedRef.current = false
              return
            }

            scanner.stop()
            onScan(value)
          },
          {
            preferredCamera: 'environment',
            highlightScanRegion: false,
            highlightCodeOutline: false,
            returnDetailedScanResult: true,
            maxScansPerSecond: 10,
          },
        )

        scannerRef.current = scanner

        await scanner.start()

        if (mounted) {
          setStarting(false)
        }
      } catch (err) {
        if (mounted) {
          setStarting(false)

          setError(
            err?.message ||
              'Unable to access the camera. Please allow camera access and try again.',
          )
        }
      }
    }

    startScanner()

    return () => {
      mounted = false

      if (scannerRef.current) {
        scannerRef.current.stop()
        scannerRef.current.destroy()
        scannerRef.current = null
      }
    }
  }, [onScan])

  function handleClose() {
    if (scannerRef.current) {
      scannerRef.current.stop()
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
              LeadFlow
            </p>

            <h2 className="mt-1 text-lg font-bold text-white">
              Scan QR / Badge
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-lg text-slate-400 transition hover:border-slate-500 hover:text-white"
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-56 w-56">
                <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-indigo-400" />
                <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-indigo-400" />
                <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-indigo-400" />
                <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-indigo-400" />

                <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.9)]" />
              </div>
            </div>

            {starting && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70">
                <div className="text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />

                  <p className="mt-4 text-sm font-medium text-white">
                    Starting camera...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 px-6">
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-400">
                    !
                  </div>

                  <h3 className="mt-4 font-semibold text-white">
                    Camera unavailable
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-medium text-white">
              Point your camera at a QR code
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep the code inside the frame. LeadFlow will capture it
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QRScanner