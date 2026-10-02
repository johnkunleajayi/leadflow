import { useCallback, useState } from 'react'
import QRScanner from './QRScanner'
import BusinessCardScanner from './BusinessCardScanner'

function ScanCapture() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showBusinessCardScanner, setShowBusinessCardScanner] = useState(false)
  const [scannedResult, setScannedResult] = useState(null)
  const [businessCardResult, setBusinessCardResult] = useState(null)

  const handleQRScan = useCallback((result) => {
    setScannedResult(result)
    setShowQRScanner(false)
  }, [])

  const handleBusinessCardScan = useCallback((result) => {
    console.log('LEADFLOW FINAL BUSINESS CARD RESULT:')
    console.log(JSON.stringify(result, null, 2))

    console.log('LEADFLOW FINAL CONTACT:')
    console.log(JSON.stringify(result?.contact, null, 2))

    setBusinessCardResult(result)
    setShowBusinessCardScanner(false)
  }, [])

  function renderCapturedResult() {
    if (!scannedResult) {
      return null
    }

    const { type, rawValue, contact } = scannedResult

    if (type === 'vcard' && contact) {
      return (
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              ✓
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                Contact captured
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Name
                  </p>

                  <p className="mt-1 text-sm text-white">
                    {[contact.first_name, contact.last_name]
                      .filter(Boolean)
                      .join(' ') || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Company
                  </p>

                  <p className="mt-1 text-sm text-white">
                    {contact.company || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm text-white">
                    {contact.email || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Phone
                  </p>

                  <p className="mt-1 text-sm text-white">
                    {contact.phone || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Title
                  </p>

                  <p className="mt-1 text-sm text-white">
                    {contact.title || 'Not provided'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    LinkedIn
                  </p>

                  <p className="mt-1 break-all text-sm text-white">
                    {contact.linkedin_url || 'Not provided'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (type === 'url') {
      return (
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              ✓
            </span>

            <div className="min-w-0">
              <p className="font-semibold text-white">
                QR code captured
              </p>

              <p className="mt-1 text-sm text-slate-400">
                This QR code contains a URL rather than contact information.
              </p>

              <a
                href={rawValue}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                {rawValue}
              </a>
            </div>
          </div>
        </div>
      )
    }

    return (
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
              {rawValue}
            </p>
          </div>
        </div>
      </div>
    )
  }

  function renderBusinessCardResult() {
    if (!businessCardResult) {
      return null
    }

    const contact = businessCardResult.contact

    if (!contact) {
      return (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
              !
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">
                Business card captured
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                The OCR service returned a response, but no structured contact
                information was found.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            ✓
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">
              Business card captured
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Contact information extracted from the business card.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Name
                </p>

                <p className="mt-1 text-sm text-white">
                  {[contact.first_name, contact.last_name]
                    .filter(Boolean)
                    .join(' ') || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Company
                </p>

                <p className="mt-1 text-sm text-white">
                  {contact.company || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Email
                </p>

                <p className="mt-1 break-all text-sm text-white">
                  {contact.email || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Phone
                </p>

                <p className="mt-1 text-sm text-white">
                  {contact.phone || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Title
                </p>

                <p className="mt-1 text-sm text-white">
                  {contact.title || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  LinkedIn
                </p>

                <p className="mt-1 break-all text-sm text-white">
                  {contact.linkedin_url || 'Not provided'}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Create Lead
            </button>
          </div>
        </div>
      </div>
    )
  }

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
                  setScannedResult(null)
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
                onClick={() => {
                  setBusinessCardResult(null)
                  setShowBusinessCardScanner(true)
                }}
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

            {renderCapturedResult()}

            {renderBusinessCardResult()}

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

      {showBusinessCardScanner && (
        <BusinessCardScanner
          onClose={() => setShowBusinessCardScanner(false)}
          onScan={handleBusinessCardScan}
        />
      )}
    </>
  )
}

export default ScanCapture