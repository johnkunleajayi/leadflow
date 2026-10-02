import { useEffect, useRef, useState } from 'react'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function BusinessCardScanner({ onClose, onScan }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const mountedRef = useRef(false)

  const [starting, setStarting] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    mountedRef.current = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera access is not supported by this browser.',
          )
        }

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: {
                ideal: 'environment',
              },
              width: {
                ideal: 3840,
              },
              height: {
                ideal: 2160,
              },
            },
            audio: false,
          })

        if (!active || !mountedRef.current) {
          stream
            .getTracks()
            .forEach((track) => track.stop())

          return
        }

        const video = videoRef.current

        if (!video) {
          stream
            .getTracks()
            .forEach((track) => track.stop())

          throw new Error(
            'Unable to initialize the camera preview.',
          )
        }

        streamRef.current = stream

        video.srcObject = stream
        video.muted = true
        video.playsInline = true

        await new Promise((resolve) => {
          if (video.readyState >= 1) {
            resolve()
            return
          }

          const handleLoadedMetadata = () => {
            video.removeEventListener(
              'loadedmetadata',
              handleLoadedMetadata,
            )

            resolve()
          }

          video.addEventListener(
            'loadedmetadata',
            handleLoadedMetadata,
          )
        })

        if (!active || !mountedRef.current) {
          return
        }

        await video.play()

        if (active && mountedRef.current) {
          setStarting(false)
        }
      } catch (err) {
        console.error(
          'LeadFlow camera error:',
          err,
        )

        if (
          active &&
          mountedRef.current
        ) {
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
      active = false
      mountedRef.current = false

      stopCamera()
    }
  }, [])

  function stopCamera() {
    const video = videoRef.current

    if (video) {
      try {
        video.pause()
      } catch {
        // Ignore pause errors.
      }

      video.srcObject = null
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      streamRef.current = null
    }
  }

  function handleClose() {
    if (processing) {
      return
    }

    stopCamera()

    onClose()
  }

  function createCardCanvas(video) {
    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    if (!videoWidth || !videoHeight) {
      throw new Error(
        'The camera image is not ready yet.',
      )
    }

    /*
     * The scanner frame is approximately a business-card
     * aspect ratio. The previous implementation used:
     *
     *   78% width × 46% height
     *
     * which produced images such as 998 × 331.
     *
     * That crop was much too short and removed important
     * information from the business card.
     *
     * We now calculate the crop from an explicit
     * business-card aspect ratio instead of independently
     * shrinking width and height.
     */

    const targetAspectRatio = 1.75

    let cropWidth = Math.round(
      videoWidth * 0.82,
    )

    let cropHeight = Math.round(
      cropWidth / targetAspectRatio,
    )

    /*
     * Keep the crop inside the camera frame.
     */
    if (cropHeight > videoHeight * 0.82) {
      cropHeight = Math.round(
        videoHeight * 0.82,
      )

      cropWidth = Math.round(
        cropHeight * targetAspectRatio,
      )
    }

    if (cropWidth > videoWidth * 0.92) {
      cropWidth = Math.round(
        videoWidth * 0.92,
      )

      cropHeight = Math.round(
        cropWidth / targetAspectRatio,
      )
    }

    const cropX = Math.round(
      (videoWidth - cropWidth) / 2,
    )

    const cropY = Math.round(
      (videoHeight - cropHeight) / 2,
    )

    /*
     * Preserve enough resolution for Tesseract.
     */
    const maxWidth = 1920

    const scale =
      cropWidth > maxWidth
        ? maxWidth / cropWidth
        : 1

    const outputWidth = Math.max(
      1,
      Math.round(cropWidth * scale),
    )

    const outputHeight = Math.max(
      1,
      Math.round(cropHeight * scale),
    )

    const canvas =
      document.createElement('canvas')

    canvas.width = outputWidth
    canvas.height = outputHeight

    const context =
      canvas.getContext('2d', {
        alpha: false,
      })

    if (!context) {
      throw new Error(
        'Unable to create the image processing canvas.',
      )
    }

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )

    console.log(
      'LeadFlow source video:',
      `${videoWidth} x ${videoHeight}`,
    )

    console.log(
      'LeadFlow business-card crop:',
      `${cropWidth} x ${cropHeight}`,
    )

    console.log(
      'LeadFlow OCR image:',
      `${outputWidth} x ${outputHeight}`,
    )

    return canvas
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                'Unable to create an image from the camera capture.',
              ),
            )

            return
          }

          resolve(blob)
        },
        'image/jpeg',
        0.97,
      )
    })
  }

  async function sendToBackend(canvas) {
    const imageBlob =
      await canvasToBlob(canvas)

    const formData = new FormData()

    formData.append(
      'file',
      imageBlob,
      'business-card.jpg',
    )

    const response = await fetch(
      `${API_BASE_URL}/api/v1/ocr/business-card`,
      {
        method: 'POST',
        body: formData,
      },
    )

    let payload = null

    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const detail =
        payload?.detail ||
        'The LeadFlow OCR service could not process the business card.'

      throw new Error(
        typeof detail === 'string'
          ? detail
          : 'The LeadFlow OCR service could not process the business card.',
      )
    }

    return payload
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

    try {
      const cardCanvas =
        createCardCanvas(video)

      stopCamera()

      const result =
        await sendToBackend(cardCanvas)

      console.log(
        'LeadFlow backend OCR result:',
        result,
      )

      if (
        !result?.contact ||
        !result?.rawText
      ) {
        throw new Error(
          'LeadFlow could not detect readable text on this business card. Please position the entire card inside the frame, improve the lighting, and try again.',
        )
      }

      onScan(result)
    } catch (err) {
      console.error(
        'LeadFlow business card OCR error:',
        err,
      )

      if (
        mountedRef.current
      ) {
        setError(
          err?.message ||
            'Unable to read the business card. Please try again.',
        )
      }
    } finally {
      if (
        mountedRef.current
      ) {
        setProcessing(false)
      }
    }
  }

  const scannerReady =
    !starting &&
    !processing &&
    !error

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
              <div className="relative aspect-[1.75/1] w-[82%] max-w-[90%] rounded-xl border-2 border-indigo-400/80">
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
                    LeadFlow is sending the captured card to the backend OCR engine.
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
              Position the entire business card inside the frame
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep the card flat, visible, and well lit. Avoid glare and make
              sure all text is inside the frame.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCapture}
            disabled={!scannerReady}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">
              📷
            </span>

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