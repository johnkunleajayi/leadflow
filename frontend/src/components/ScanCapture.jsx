import { useCallback, useState } from 'react'
import QRScanner from './QRScanner'

function ScanCapture() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedValue, setScannedValue] = useState(null)

  const handleQRScan = useCallback((value) => {
    setScannedValue(value)
    setShowQRScanner(false)
  }, [])

  return (
    <>
      <section className="mt-10">
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
          <div className="p-8 md:p-10">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Fast Capture
              </span>

              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Scan a connection.
              </h2>

              <p className="mt-3 text-slate-400">
                Skip the long form. Scan a QR code, badge, or business card and
                let LeadFlow capture the contact details for you.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setScannedValue(null)
                  setShowQRScanner(true)
                }}
                className="group rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-left transition hover:border-indigo-400/60 hover:bg-indigo-500/15"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-3xl">
                  📷
                </div>

                <h3 className="mt-5 text-xl font-bold text-white">
                  Scan QR / Badge
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Scan an event badge or QR code and capture the attendee's
                  information instantly.
                </p>

                <span className="mt-5 inline-flex items-center text-sm font-semibold text-indigo-400 transition group-hover:text-indigo-300">
                  Open scanner
                  <span className="ml-2 transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </button>

              <button
                type="button"
                className="group rounded-2xl border border-slate-700 bg-slate-950/60 p-6 text-left transition hover:border-slate-500 hover:bg-slate-950"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
                  💳
                </div>

                <h3 className="mt-5 text-xl font-bold text-white">
                  Scan Business Card
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Capture a business card with your camera and extract the
                  contact details automatically.
                </p>

                <span className="mt-5 inline-flex items-center text-sm font-semibold text-slate-300 transition group-hover:text-white">
                  Scan card
                  <span className="ml-2 transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </button>
            </div>

            {scannedValue && (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                    ✓
                  </span>

                  <div className="min-w-0">
                    <p className="font-semibold text-white">
                      QR code captured
                    </p>

                    <p className="mt-1 break-all text-sm text-slate-400">
                      {scannedValue}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col items-start gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Prefer to enter the details yourself?
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  You can still capture a lead manually when scanning isn't
                  possible.
                </p>
              </div>

              <button
                type="button"
                className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Enter Manually
              </button>
            </div>
          </div>
        </div>
      </section>

      {showQRScanner && (
        <QRScanner
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}
    </>
  )
}

export default ScanCapture