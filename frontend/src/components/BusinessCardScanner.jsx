import { useEffect, useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'

function BusinessCardScanner({ onClose, onScan }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [starting, setStarting] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera access is not supported by this browser.',
          )
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment',
            },
            width: {
              ideal: 1920,
            },
            height: {
              ideal: 1080,
            },
          },
          audio: false,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (!videoRef.current) {
          throw new Error('Unable to initialize the camera preview.')
        }

        videoRef.current.srcObject = stream

        await videoRef.current.play()

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

    startCamera()

    return () => {
      mounted = false

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  function rotateCanvas(sourceCanvas, degrees) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      return null
    }

    const radians = (degrees * Math.PI) / 180

    if (degrees === 90 || degrees === 270) {
      canvas.width = sourceCanvas.height
      canvas.height = sourceCanvas.width
    } else {
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
    }

    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(radians)

    context.drawImage(
      sourceCanvas,
      -sourceCanvas.width / 2,
      -sourceCanvas.height / 2,
    )

    return canvas
  }

  function enhanceCanvas(sourceCanvas) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', {
      willReadFrequently: true,
    })

    if (!context) {
      return sourceCanvas
    }

    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height

    context.drawImage(sourceCanvas, 0, 0)

    const imageData = context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const data = imageData.data

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]

      const gray =
        red * 0.299 +
        green * 0.587 +
        blue * 0.114

      const contrast =
        ((gray - 128) * 1.35) + 128

      const value = Math.max(
        0,
        Math.min(255, contrast),
      )

      data[index] = value
      data[index + 1] = value
      data[index + 2] = value
    }

    context.putImageData(imageData, 0, 0)

    return canvas
  }

  function normalizeLine(line) {
    return line
      .replace(/\s+/g, ' ')
      .replace(/[|]+/g, 'I')
      .trim()
  }

  function cleanText(text) {
    return text
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
  }

  function extractEmail(text) {
    const match = text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    )

    return match ? match[0].trim() : ''
  }

  function extractUrls(text) {
    const matches = text.match(
      /(?:https?:\/\/|www\.)[^\s]+/gi,
    )

    if (!matches) {
      return []
    }

    return matches.map((value) =>
      value
        .replace(/[),.;]+$/, '')
        .trim(),
    )
  }

  function normalizePhone(value) {
    return value
      .replace(/[^\d+]/g, '')
      .replace(/^\+?2340/, '+234')
  }

  function extractPhones(text) {
    const matches = text.match(
      /(?:\+?234[\s().-]?)?(?:0\d{2,3}[\s().-]?)?\d{3,4}[\s.-]?\d{3,4}/g,
    )

    if (!matches) {
      return []
    }

    const phones = matches
      .map((value) => normalizePhone(value))
      .filter((value) => {
        const digits = value.replace(/\D/g, '')

        return digits.length >= 10 && digits.length <= 15
      })

    return [...new Set(phones)]
  }

  function looksLikeEmail(line) {
    return /@/.test(line)
  }

  function looksLikeUrl(line) {
    return /(?:https?:\/\/|www\.)/i.test(line)
  }

  function looksLikeAddress(line) {
    return /\b(street|road|avenue|close|drive|floor|plaza|lagos|abuja|nigeria|suite|st\.|rd\.|ave\.)\b/i.test(
      line,
    )
  }

  function looksLikeCompany(line) {
    return /\b(plc|ltd|limited|llc|inc|incorporated|bank|group|company|corporation|corp|technologies|technology|consulting|solutions|holdings|insurance|university|college)\b/i.test(
      line,
    )
  }

  function looksLikeTitle(line) {
    return /\b(manager|director|officer|executive|engineer|developer|administrator|consultant|specialist|analyst|associate|advisor|adviser|founder|coordinator|supervisor|lead|president|chairman|chief|partner|accountant|architect|designer|sales|marketing|relationship)\b/i.test(
      line,
    )
  }

  function looksLikeName(line) {
    if (!line) {
      return false
    }

    if (looksLikeEmail(line) || looksLikeUrl(line)) {
      return false
    }

    if (looksLikeAddress(line)) {
      return false
    }

    if (looksLikeCompany(line)) {
      return false
    }

    if (looksLikeTitle(line)) {
      return false
    }

    if (/\d/.test(line)) {
      return false
    }

    const words = line.split(' ').filter(Boolean)

    if (words.length < 2 || words.length > 5) {
      return false
    }

    const letters = line.replace(/[^A-Za-z]/g, '')

    if (letters.length < 5) {
      return false
    }

    return true
  }

  function parseName(name) {
    if (!name) {
      return {
        first_name: '',
        last_name: '',
      }
    }

    const parts = name
      .split(' ')
      .filter(Boolean)

    return {
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
    }
  }

  function parseBusinessCard(text) {
    const cleaned = cleanText(text)

    const rawLines = cleaned
      .split('\n')
      .map(normalizeLine)
      .filter(Boolean)

    const lines = []

    for (const line of rawLines) {
      if (!lines.includes(line)) {
        lines.push(line)
      }
    }

    const email = extractEmail(cleaned)
    const urls = extractUrls(cleaned)
    const phones = extractPhones(cleaned)

    const titleLine =
      lines.find((line) => looksLikeTitle(line)) || ''

    const companyLine =
      lines.find(
        (line) =>
          looksLikeCompany(line) &&
          line !== titleLine,
      ) || ''

    let nameLine =
      lines.find(
        (line) =>
          looksLikeName(line) &&
          line !== titleLine &&
          line !== companyLine,
      ) || ''

    if (!nameLine) {
      const firstUsefulLine = lines.find(
        (line) =>
          !looksLikeEmail(line) &&
          !looksLikeUrl(line) &&
          !looksLikeAddress(line) &&
          !/\d/.test(line),
      )

      nameLine = firstUsefulLine || ''
    }

    const name = parseName(nameLine)

    const linkedinUrl =
      urls.find((url) =>
        /linkedin\.com/i.test(url),
      ) || ''

    const website =
      urls.find(
        (url) =>
          !/linkedin\.com/i.test(url),
      ) || ''

    return {
      first_name: name.first_name,
      last_name: name.last_name,
      company: companyLine,
      email,
      phone: phones[0] || '',
      title: titleLine,
      linkedin_url: linkedinUrl,
      website,
    }
  }

  function scoreOCR(text, confidence) {
    let score = Number(confidence) || 0

    const normalized = text.toLowerCase()

    if (/@/.test(text)) {
      score += 25
    }

    if (/\b(plc|ltd|limited|bank|company|group)\b/i.test(text)) {
      score += 20
    }

    if (
      /\b(manager|director|officer|executive|engineer|consultant)\b/i.test(
        text,
      )
    ) {
      score += 15
    }

    if (/\+?\d[\d\s().-]{7,}/.test(text)) {
      score += 15
    }

    if (/www\.|https?:\/\//i.test(text)) {
      score += 10
    }

    if (normalized.length > 80) {
      score += 5
    }

    return score
  }

  async function runOCR(canvas) {
    const worker = await createWorker('eng')

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      })

      const result = await worker.recognize(canvas)

      return {
        text: result?.data?.text || '',
        confidence: result?.data?.confidence || 0,
      }
    } finally {
      await worker.terminate()
    }
  }

  async function handleCapture() {
    const video = videoRef.current

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight ||
      processing
    ) {
      return
    }

    setProcessing(true)
    setError(null)

    const canvas = document.createElement('canvas')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')

    if (!context) {
      setProcessing(false)
      setError('Unable to process the captured image.')
      return
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    stopCamera()

    try {
      const orientations = [0, 90, 180, 270]

      let bestResult = null

      for (const orientation of orientations) {
        const rotated = rotateCanvas(
          canvas,
          orientation,
        )

        if (!rotated) {
          continue
        }

        const enhanced = enhanceCanvas(rotated)

        const result = await runOCR(enhanced)

        const score = scoreOCR(
          result.text,
          result.confidence,
        )

        if (
          !bestResult ||
          score > bestResult.score
        ) {
          bestResult = {
            ...result,
            score,
          }
        }
      }

      if (!bestResult || !bestResult.text.trim()) {
        throw new Error(
          'LeadFlow could not read the business card. Please move closer, improve the lighting, and try again.',
        )
      }

      const contact = parseBusinessCard(
        bestResult.text,
      )

      onScan({
        type: 'business-card',
        contact,
        rawText: bestResult.text,
      })
    } catch (err) {
      setError(
        err?.message ||
          'Unable to read the business card. Please try again.',
      )
    } finally {
      setProcessing(false)
    }
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
              Scan Business Card
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-lg text-slate-400 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close business card scanner"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-80 max-w-[85%] rounded-xl border-2 border-indigo-400/80">
                <span className="absolute -left-1 -top-1 h-8 w-8 border-l-4 border-t-4 border-indigo-400" />
                <span className="absolute -right-1 -top-1 h-8 w-8 border-r-4 border-t-4 border-indigo-400" />
                <span className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-indigo-400" />
                <span className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-indigo-400" />
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

            {processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85 px-6">
                <div className="text-center">
                  <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />

                  <p className="mt-4 text-sm font-semibold text-white">
                    Reading business card...
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    LeadFlow is checking the card orientation and extracting
                    the contact details.
                  </p>
                </div>
              </div>
            )}

            {error && !processing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950 px-6">
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-400">
                    !
                  </div>

                  <h3 className="mt-4 font-semibold text-white">
                    Unable to read card
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
              Position the business card inside the frame
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep the card flat, visible, and well lit. LeadFlow will
              automatically check the card orientation.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCapture}
            disabled={
              starting ||
              processing ||
              Boolean(error)
            }
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">📷</span>

            {processing
              ? 'Reading Card...'
              : 'Capture Business Card'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BusinessCardScanner