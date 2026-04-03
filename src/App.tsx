import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Client } from '@gradio/client'
import './App.css'

const PRODUCT_OPTIONS = [
  'Tablet',
  'Microwave',
  'DSLR Camera',
  'Air Conditioner',
  'Smartwatch',
  'TV',
  'Electric Scooter',
  'Washing Machine',
  'Laptop',
  'Smartphone',
  'Refrigerator',
  'Gaming Console',
]

const BRAND_OPTIONS = [
  'Samsung',
  'LG',
  'Apple',
  'Sony',
  'IFB',
  'Lenovo',
  'Bosch',
  'Whirlpool',
  'OnePlus',
  'Microsoft',
  'Nintendo',
  'Nikon',
  'Canon',
  'Fujifilm',
  'Huawei',
  'Ola',
  'Panasonic',
  'Voltas',
  'Noise',
  'Bajaj',
  'Daikin',
  'Amazfit',
  'Carrier',
  'TVS',
  'Boat',
  'Blue Star',
  'Ather',
  'Hero',
  'Morphy Richards',
  'TCL',
  'Acer',
  'Godrej',
  'Realme',
  'Asus',
  'Dell',
  'HP',
  'Xiaomi',
  'Vivo',
]

const PRODUCT_IMAGE_FILES: Record<string, string> = {
  tablet: 'tablet.png',
  microwave: 'microwave.png',
  'dslr-camera': 'dslr-camera.png',
  'air-conditioner': 'air-conditioner.png',
  smartwatch: 'smartwatch.png',
  tv: 'tv.png',
  'electric-scooter': 'electric-scooter.png',
  'washing-machine': 'washing-machine.png',
  laptop: 'laptop.png',
  smartphone: 'smartphone.png',
  refrigerator: 'Refridgerator.png',
  'gaming-console': 'gaming-console.png',
}

const BRAND_IMAGE_FILES: Record<string, string> = {
  samsung: 'samsung.png',
  lg: 'lg.png',
  apple: 'apple.png',
  sony: 'sony.png',
  ifb: 'ifb.png',
  lenovo: 'lenovo.png',
  bosch: 'bosch.png',
  whirlpool: 'whirlpool.png',
  oneplus: 'oneplus.png',
  microsoft: 'mircrosoft.png',
  nintendo: 'nintendo.png',
  nikon: 'nikon.png',
  canon: 'canon.png',
  fujifilm: 'fujifilm.png',
  huawei: 'huawei.png',
  ola: 'ola.png',
  panasonic: 'panasonic.png',
  voltas: 'voltas.png',
  noise: 'noise.png',
  bajaj: 'bajaj.png',
  daikin: 'dalkin.png',
  amazfit: 'amazfit.png',
  carrier: 'carrier.png',
  tvs: 'tvs.png',
  boat: 'boat.png',
  'blue-star': 'bluestar.png',
  ather: 'ather.png',
  hero: 'hero.png',
  'morphy-richards': 'morphy-richards.png',
  tcl: 'tcl.png',
  acer: 'acer.png',
  godrej: 'godrej.png',
  realme: 'realme.png',
  asus: 'asus.png',
  dell: 'dell.png',
  hp: 'hp.png',
  xiaomi: 'xiaomi.png',
  vivo: 'vivo.png',
}

type FormState = {
  productType: string
  brand: string
  usagePattern: '' | 'Light' | 'Moderate' | 'Heavy'
  buildQuality: string
  condition: string
  usedDuration: string
  originalPrice: string
}

type AnalysisResult = {
  status: 'READY' | 'NOT READY'
  probability: string
  explanation: string
  recommendation: string
}

type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed'

type ApiPrediction = {
  status: string
  probability: number
  explanation: string
  recommendation: string
}

type ClientPayload = {
  product_type: string
  brand: string
  build_quality: number
  usage_intensity: number
  condition: number
  original_price: number
  used_duration: number
}

type SpinClass = '' | 'spin-left' | 'spin-right'
type ProjectionPoint = { year: number; probability: number }

const PROJECTION_CHART = {
  xMin: 30,
  xMax: 400,
  yMin: 20,
  yMax: 140,
}

const REQUEST_TIMEOUT_MS = 20000
const WHEEL_ANIM_DURATION = 520
const USAGE_PATTERN_TO_INTENSITY: Record<'Light' | 'Moderate' | 'Heavy', number> = {
  Light: 1,
  Moderate: 2,
  Heavy: 3,
}

function App() {
  const [form, setForm] = useState<FormState>({
    productType: '',
    brand: '',
    usagePattern: '',
    buildQuality: '3',
    condition: '3',
    usedDuration: '',
    originalPrice: '',
  })

  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [projection, setProjection] = useState<ProjectionPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle')
  const [connectionMessage, setConnectionMessage] = useState<string>(
    'Connection not tested yet.'
  )
  const [workingEndpoint, setWorkingEndpoint] = useState<string | null>(null)
  const [workingSpaceId, setWorkingSpaceId] = useState<string | null>(null)
  const [carouselMotion, setCarouselMotion] = useState<{
    productType: SpinClass
    brand: SpinClass
  }>({
    productType: '',
    brand: '',
  })

  const triggerWheelMotion = (field: 'productType' | 'brand', direction: 1 | -1) => {
    const spinClass: SpinClass = direction === 1 ? 'spin-right' : 'spin-left'

    // avoid re-triggering while an animation is active
    if (carouselMotion[field]) return

    setCarouselMotion((prev) => ({
      ...prev,
      [field]: spinClass,
    }))

    // safety clear in case caller forgets
    window.setTimeout(() => {
      setCarouselMotion((prev) => ({
        ...prev,
        [field]: '',
      }))
    }, WHEEL_ANIM_DURATION + 60)
  }

  const getRotationDirection = (
    options: string[],
    currentValue: string,
    nextValue: string
  ): 1 | -1 => {
    const currentIndex = getMatchedIndex(currentValue, options)
    const nextIndex = getMatchedIndex(nextValue, options)

    const forwardSteps = (nextIndex - currentIndex + options.length) % options.length
    const backwardSteps = (currentIndex - nextIndex + options.length) % options.length

    return forwardSteps <= backwardSteps ? 1 : -1
  }

  const cycleOption = (field: 'productType' | 'brand', direction: 1 | -1) => {
    const options = field === 'productType' ? PRODUCT_OPTIONS : BRAND_OPTIONS

    // prevent re-trigger while animating
    if (carouselMotion[field]) return

    const currentValue = field === 'productType' ? form.productType : form.brand
    const currentIndex = getMatchedIndex(currentValue, options)
    const nextIndex = (currentIndex + direction + options.length) % options.length
    const nextValue = options[nextIndex]

    triggerWheelMotion(field, direction)

    // update the selected value after the wheel animation completes so the
    // visual rotation is visible transitioning from old -> new
    window.setTimeout(() => {
      setForm((prev) => ({
        ...prev,
        [field]: nextValue,
      }))
      setCarouselMotion((prev) => ({ ...prev, [field]: '' }))
    }, WHEEL_ANIM_DURATION)
  }
  const [openDropdown, setOpenDropdown] = useState<null | 'productType' | 'brand'>(
    null
  )
  const productDropdownRef = useRef<HTMLDivElement | null>(null)
  const brandDropdownRef = useRef<HTMLDivElement | null>(null)

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const getMappedImageSrc = (kind: 'products' | 'brands', value: string) => {
    const normalized = value.trim()
    const imageFiles = kind === 'products' ? PRODUCT_IMAGE_FILES : BRAND_IMAGE_FILES
    const normalizedKey = toSlug(normalized)
    const imageDirectory = kind === 'products' ? 'brands' : 'products'

    if (normalizedKey && imageFiles[normalizedKey]) {
      return `/placeholders/${imageDirectory}/${imageFiles[normalizedKey]}`
    }

    const fileName = normalized ? `${toSlug(normalized)}.png` : '_placeholder.svg'
    return `/placeholders/${imageDirectory}/${fileName}`
  }

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideProduct = productDropdownRef.current?.contains(target)
      const clickedInsideBrand = brandDropdownRef.current?.contains(target)

      if (!clickedInsideProduct && !clickedInsideBrand) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [])

  const getMatchedIndex = (value: string, options: string[]) => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return 0

    const exactIndex = options.findIndex(
      (option) => option.toLowerCase() === normalized
    )
    if (exactIndex >= 0) return exactIndex

    const startsWithIndex = options.findIndex((option) =>
      option.toLowerCase().startsWith(normalized)
    )

    return startsWithIndex >= 0 ? startsWithIndex : 0
  }

  const productIndex = getMatchedIndex(form.productType, PRODUCT_OPTIONS)
  const brandIndex = getMatchedIndex(form.brand, BRAND_OPTIONS)

  const productValueForCarousel =
    form.productType.trim() || PRODUCT_OPTIONS[productIndex]
  const brandValueForCarousel = form.brand.trim() || BRAND_OPTIONS[brandIndex]

 
  const getCoverflowSlides = (options: string[], currentIndex: number) => {
    const getAtOffset = (offset: number) =>
      options[(currentIndex + offset + options.length) % options.length]

    return [
      { key: 'far-left', value: getAtOffset(-2), position: 'far-left' as const },
      { key: 'left', value: getAtOffset(-1), position: 'left' as const },
      { key: 'center', value: getAtOffset(0), position: 'center' as const },
      { key: 'right', value: getAtOffset(1), position: 'right' as const },
      { key: 'far-right', value: getAtOffset(2), position: 'far-right' as const },
    ]
  }

  const productCoverflowSlides = getCoverflowSlides(PRODUCT_OPTIONS, productIndex)
  const brandCoverflowSlides = getCoverflowSlides(BRAND_OPTIONS, brandIndex)

  const selectDropdownOption = (
    field: 'productType' | 'brand',
    selectedValue: string
  ) => {
    const options = field === 'productType' ? PRODUCT_OPTIONS : BRAND_OPTIONS
    const currentValue = field === 'productType' ? form.productType : form.brand

    if (selectedValue.trim() && selectedValue !== currentValue) {
      const dir = getRotationDirection(options, currentValue, selectedValue)
      // start the wheel motion then update DOM after animation completes
      triggerWheelMotion(field, dir)
      window.setTimeout(() => {
        setForm((prev) => ({ ...prev, [field]: selectedValue }))
        setOpenDropdown(null)
        setCarouselMotion((prev) => ({ ...prev, [field]: '' }))
      }, WHEEL_ANIM_DURATION)
      return
    }

    setForm((prev) => ({
      ...prev,
      [field]: selectedValue,
    }))
    setOpenDropdown(null)
  }

  const optionMatchesInput = (option: string, input: string) => {
    const normalizedInput = input.trim().toLowerCase()
    if (!normalizedInput) return true
    return option.toLowerCase().includes(normalizedInput)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value as FormState['usagePattern'],
    }))
  }

  const deriveModelFeatures = (input: {
    buildQuality: number
    condition: number
    originalPrice: number
    usedDuration: number
    usageIntensity: number
  }) => {
    const safeBuild = Math.max(input.buildQuality, 1e-6)
    const degradationRate = (6 - input.condition) / (input.usedDuration + 1)
    const stressIndex = input.usageIntensity / safeBuild
    const investmentDensity = input.originalPrice / safeBuild

    return {
      degradationRate,
      stressIndex,
      investmentDensity,
    }
  }

  const localFallbackPrediction = (input: {
    buildQuality: number
    condition: number
    usedDuration: number
    usageIntensity: number
    degradationRate: number
    stressIndex: number
  }) => {
    const conditionRisk = (5 - input.condition) / 4
    const buildRisk = (5 - input.buildQuality) / 4
    const durationRisk = Math.min(input.usedDuration / 10, 1)
    const usageRisk = (input.usageIntensity - 1) / 2
    const degradationRisk = Math.min(input.degradationRate / 2, 1)
    const stressRisk = Math.min(input.stressIndex / 3, 1)

    const riskScore =
      0.25 * conditionRisk +
      0.2 * buildRisk +
      0.15 * durationRisk +
      0.1 * usageRisk +
      0.15 * degradationRisk +
      0.15 * stressRisk

    const probability = Math.max(0, Math.min(1, riskScore))
    return {
      status: probability >= 0.5 ? 'READY' : 'NOT READY',
      probability: (probability * 100).toFixed(2),
      explanation:
        probability >= 0.5
          ? 'Remote prediction failed. Local estimate indicates elevated disposal readiness risk.'
          : 'Remote prediction failed. Local estimate indicates disposal readiness is currently low.',
      recommendation:
        probability >= 0.5
          ? 'Inspect device and route to certified e-waste channel if confirmed.'
          : 'Continue usage with periodic condition checks.',
    } as const
  }

  const buildProbabilityProjection = (input: {
    buildQuality: number
    condition: number
    usedDuration: number
    originalPrice: number
    usageIntensity: number
    baseProbabilityPct?: number
  }): ProjectionPoint[] => {
    const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
    const yearsAhead = 6
    const baseFromModel =
      input.baseProbabilityPct !== undefined
        ? clamp01(input.baseProbabilityPct / 100)
        : undefined

    const localNow =
      clamp01(
        Number(
          localFallbackPrediction({
            buildQuality: input.buildQuality,
            condition: input.condition,
            usedDuration: input.usedDuration,
            usageIntensity: input.usageIntensity,
            degradationRate: deriveModelFeatures({
              buildQuality: input.buildQuality,
              condition: input.condition,
              originalPrice: input.originalPrice,
              usedDuration: input.usedDuration,
              usageIntensity: input.usageIntensity,
            }).degradationRate,
            stressIndex: deriveModelFeatures({
              buildQuality: input.buildQuality,
              condition: input.condition,
              originalPrice: input.originalPrice,
              usedDuration: input.usedDuration,
              usageIntensity: input.usageIntensity,
            }).stressIndex,
          }).probability
        )
      ) / 100

    // Year-0 anchor is the model estimate (if present) or local estimate.
    // Future years use an incremental hazard update so readiness never decreases.
    const baseProbability = baseFromModel ?? localNow

    const series: ProjectionPoint[] = [
      {
        year: 0,
        probability: baseProbability * 100,
      },
    ]

    let rollingProbability = baseProbability

    for (let year = 1; year <= yearsAhead; year += 1) {
      const futureCondition = Math.max(1, input.condition - 0.35 * year)
      const futureBuildQuality = Math.max(1, input.buildQuality - 0.12 * year)
      const futureUsedDuration = input.usedDuration + year

      const futureDerived = deriveModelFeatures({
        buildQuality: futureBuildQuality,
        condition: futureCondition,
        originalPrice: input.originalPrice,
        usedDuration: futureUsedDuration,
        usageIntensity: input.usageIntensity,
      })

      const futureLocal = clamp01(
        Number(
          localFallbackPrediction({
            buildQuality: futureBuildQuality,
            condition: futureCondition,
            usedDuration: futureUsedDuration,
            usageIntensity: input.usageIntensity,
            degradationRate: futureDerived.degradationRate,
            stressIndex: futureDerived.stressIndex,
          }).probability
        ) / 100
      )

      const degradationPressure = clamp01(futureDerived.degradationRate / 2)
      const usagePressure = clamp01((input.usageIntensity - 1) / 2)
      const agingPressure = clamp01(futureUsedDuration / 12)

      const annualIncrement = clamp01(
        0.018 +
          0.05 * futureLocal +
          0.035 * degradationPressure +
          0.025 * usagePressure +
          0.02 * agingPressure
      )

      rollingProbability = clamp01(
        rollingProbability + (1 - rollingProbability) * annualIncrement
      )

      series.push({
        year,
        probability: rollingProbability * 100,
      })
    }

    return series
  }

  const getProjectionChartPoints = (series: ProjectionPoint[]) => {
    const total = series.length - 1
    const xRange = PROJECTION_CHART.xMax - PROJECTION_CHART.xMin
    const yRange = PROJECTION_CHART.yMax - PROJECTION_CHART.yMin

    return series.map((point, index) => {
      const safeProbability = Math.max(0, Math.min(100, point.probability))
      const ratio = total > 0 ? index / total : 0
      const x = PROJECTION_CHART.xMin + ratio * xRange
      const y = PROJECTION_CHART.yMax - (safeProbability / 100) * yRange

      return {
        ...point,
        probability: safeProbability,
        x,
        y,
      }
    })
  }

  const getCandidateEndpoints = () => {
    const directUrl = (import.meta.env.VITE_PREDICT_URL as string | undefined)?.trim()
    const spaceUrl = (import.meta.env.VITE_HF_SPACE_URL as string | undefined)?.trim()

    const endpoints = new Set<string>()

    const addFromValue = (value: string) => {
      const normalized = value.trim().replace(/\/+$/, '')
      if (!normalized) return

      if (/\/run\/predict$/i.test(normalized)) {
        endpoints.add(normalized)
        endpoints.add(normalized.replace(/\/run\/predict$/i, '/api/predict'))
        return
      }

      if (/\/api\/predict$/i.test(normalized)) {
        endpoints.add(normalized)
        endpoints.add(normalized.replace(/\/api\/predict$/i, '/run/predict'))
        return
      }

      endpoints.add(`${normalized}/run/predict`)
      endpoints.add(`${normalized}/api/predict`)
    }

    if (directUrl) addFromValue(directUrl)
    if (spaceUrl) addFromValue(spaceUrl)

    return Array.from(endpoints)
  }

  const normalizeSpaceId = (rawValue: string): string | null => {
    const value = rawValue.trim()
    if (!value) return null

    const fromUrl = value.match(/huggingface\.co\/spaces\/([^/?#]+\/[^/?#]+)/i)
    if (fromUrl?.[1]) return fromUrl[1]

    const withoutPrefix = value.replace(/^spaces\//i, '')
    if (/^[^/\s]+\/[^/\s]+$/.test(withoutPrefix)) return withoutPrefix

    return null
  }

  const getCandidateSpaceIds = () => {
    const explicitSpaceId = (
      import.meta.env.VITE_HF_SPACE_ID as string | undefined
    )?.trim()
    const hfUrl = (import.meta.env.VITE_HF_SPACE_URL as string | undefined)?.trim()

    const ids = new Set<string>()
    if (explicitSpaceId) {
      const normalized = normalizeSpaceId(explicitSpaceId)
      if (normalized) ids.add(normalized)
    }

    if (hfUrl) {
      const normalized = normalizeSpaceId(hfUrl)
      if (normalized) ids.add(normalized)
    }

    return Array.from(ids)
  }

  const getClientOptions = () => {
    const token = (import.meta.env.VITE_HF_TOKEN as string | undefined)?.trim()
    if (!token) return undefined

    return {
      token: token as `hf_${string}`,
    }
  }

  const getSpaceErrorHint = (message: string) => {
    if (/metadata could not be loaded|invalid username or password|401|403/i.test(message)) {
      return 'Space appears private/gated or token is missing. Set VITE_HF_TOKEN=hf_... in .env.local, or make the Space public.'
    }

    if (/not found|404/i.test(message)) {
      return 'Space ID may be incorrect. Use owner/space from huggingface.co/spaces/<owner>/<space>.'
    }

    return message
  }

  const formatUnknownError = (error: unknown) => {
    if (error instanceof Error) return error.message

    if (typeof error === 'object' && error !== null) {
      const maybeMessage =
        'message' in error && typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : null

      if (maybeMessage) return maybeMessage

      try {
        return JSON.stringify(error)
      } catch {
        return '[unserializable error object]'
      }
    }

    return String(error)
  }

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, context: string) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timed out after ${timeoutMs}ms while ${context}`))
      }, timeoutMs)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  const getPredictionErrorHint = (message: string) => {
    if (/feature schema mismatch|number of features|shape|feature/i.test(message)) {
      return 'Model/input schema mismatch on Space. Verify app.py FEATURE_COLUMNS exactly matches model.feature_name().'
    }

    if (/timed out/i.test(message)) {
      return 'Model request timed out. Space may be cold, overloaded, or stuck during inference.'
    }

    return message
  }

  const parseApiPrediction = (raw: unknown): ApiPrediction | null => {
    if (!raw || typeof raw !== 'object') return null

    const payload = raw as { data?: unknown }
    if (!Array.isArray(payload.data) || payload.data.length < 4) return null

    const [status, probability, explanation, recommendation] = payload.data

    if (
      typeof status !== 'string' ||
      typeof explanation !== 'string' ||
      typeof recommendation !== 'string'
    ) {
      return null
    }

    const numericProbability = Number(probability)
    if (Number.isNaN(numericProbability)) return null

    return {
      status,
      probability: numericProbability,
      explanation,
      recommendation,
    }
  }

  const requestPrediction = async (endpoint: string, payload: { data: unknown[] }) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify(payload),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${endpoint}`)
    }

    const raw = await response.json()
    const parsed = parseApiPrediction(raw)

    if (!parsed) {
      throw new Error(`Unexpected response format from ${endpoint}`)
    }

    return parsed
  }

  const parseClientPrediction = (raw: unknown): ApiPrediction | null => {
    if (!raw || typeof raw !== 'object') return null
    const payload = raw as { data?: unknown }
    if (!Array.isArray(payload.data) || payload.data.length < 4) return null

    const [status, probability, explanation, recommendation] = payload.data
    if (
      typeof status !== 'string' ||
      typeof explanation !== 'string' ||
      typeof recommendation !== 'string'
    ) {
      return null
    }

    const numericProbability = Number(probability)
    if (Number.isNaN(numericProbability)) return null

    return {
      status,
      probability: numericProbability,
      explanation,
      recommendation,
    }
  }

  const requestPredictionViaClient = async (
    spaceId: string,
    payload: ClientPayload
  ) => {
    const apiName =
      ((import.meta.env.VITE_GRADIO_API_NAME as string | undefined)?.trim() ||
        '/predict') as '/predict'

    const client = await withTimeout(
      Client.connect(spaceId, getClientOptions()),
      REQUEST_TIMEOUT_MS,
      `connecting to Space ${spaceId}`
    )
    const raw = await withTimeout(
      client.predict(apiName, payload),
      REQUEST_TIMEOUT_MS,
      `predicting on Space ${spaceId}`
    )
    const parsed = parseClientPrediction(raw)

    if (!parsed) {
      throw new Error(`Unexpected response format from Space ${spaceId}`)
    }

    return parsed
  }

  const testSpaceConnection = async (spaceId: string) => {
    await withTimeout(
      Client.connect(spaceId, getClientOptions()),
      REQUEST_TIMEOUT_MS,
      `testing Space connection for ${spaceId}`
    )
  }

  const buildPayload = (input: {
    productType: string
    brand: string
    usageIntensity: number
    buildQuality: number
    condition: number
    originalPrice: number
    usedDuration: number
  }) => ({
    ...deriveModelFeatures({
      buildQuality: input.buildQuality,
      condition: input.condition,
      originalPrice: input.originalPrice,
      usedDuration: input.usedDuration,
      usageIntensity: input.usageIntensity,
    }),
    data: [
      input.productType,
      input.brand,
      input.buildQuality,
      input.usageIntensity,
      input.condition,
      input.originalPrice,
      input.usedDuration,
    ],
  })

  const buildClientPayload = (input: {
    productType: string
    brand: string
    usageIntensity: number
    buildQuality: number
    condition: number
    originalPrice: number
    usedDuration: number
  }): ClientPayload => {
    return {
      product_type: input.productType,
      brand: input.brand,
      build_quality: input.buildQuality,
      usage_intensity: input.usageIntensity,
      condition: input.condition,
      original_price: input.originalPrice,
      used_duration: input.usedDuration,
    }
  }

  const handleTestConnection = async () => {
    setConnectionStatus('testing')
    setConnectionMessage('Testing deployed model connection...')

    const spaceIds = [
      ...(workingSpaceId ? [workingSpaceId] : []),
      ...getCandidateSpaceIds(),
    ].filter((value, index, array) => array.indexOf(value) === index)

    if (spaceIds.length > 0) {
      const spaceErrors: string[] = []
      for (const spaceId of spaceIds) {
        try {
          await testSpaceConnection(spaceId)
          setWorkingSpaceId(spaceId)
          setConnectionStatus('connected')
          setConnectionMessage(`Connected to Space: ${spaceId}`)
          return
        } catch (e) {
          const message = formatUnknownError(e)
          spaceErrors.push(getSpaceErrorHint(message))
        }
      }
    }

    const endpoints = getCandidateEndpoints()
    if (endpoints.length === 0) {
      setConnectionStatus('failed')
      if (spaceIds.length > 0) {
        setConnectionMessage(
          `Connection failed. Tried ${spaceIds.length} Space ID(s). Last error: Space metadata could not be loaded. ${getSpaceErrorHint('metadata could not be loaded')}`
        )
      } else {
        setConnectionMessage(
          'No Space configured. Set VITE_HF_SPACE_ID (preferred) or VITE_PREDICT_URL in .env.local'
        )
      }
      return
    }

    const payload = buildPayload({
      productType: form.productType.trim() || 'Smartphone',
      brand: form.brand.trim() || 'Samsung',
      usageIntensity:
        USAGE_PATTERN_TO_INTENSITY[
          (form.usagePattern || 'Moderate') as 'Light' | 'Moderate' | 'Heavy'
        ],
      buildQuality: Number(form.buildQuality || '3'),
      condition: Number(form.condition || '3'),
      originalPrice: Number(form.originalPrice || '20000'),
      usedDuration: Number(form.usedDuration || '1'),
    })

    const errors: string[] = []
    for (const endpoint of endpoints) {
      try {
        await requestPrediction(endpoint, payload)
        setWorkingEndpoint(endpoint)
        setConnectionStatus('connected')
        setConnectionMessage(`Connected: ${endpoint}`)
        return
      } catch (e) {
        const message = formatUnknownError(e)
        errors.push(message)
      }
    }

    setConnectionStatus('failed')
    setConnectionMessage(
      `Connection failed. Tried ${endpoints.length} endpoint(s). Last error: ${errors[errors.length - 1]}`
    )
  }

  const handleSubmit = async () => {
    setError(null)
    setResult(null)
    setProjection([])

    if (
      !form.productType.trim() ||
      !form.brand.trim() ||
      !form.usagePattern ||
      !form.buildQuality ||
      !form.condition ||
      !form.usedDuration ||
      !form.originalPrice
    ) {
      setError('Please fill all fields before analysis.')
      return
    }

    const buildQuality = Number(form.buildQuality)
    const condition = Number(form.condition)
    const usageIntensity = USAGE_PATTERN_TO_INTENSITY[form.usagePattern]
    const usedDuration = Number(form.usedDuration)
    const originalPrice = Number(form.originalPrice)

    if (
      Number.isNaN(buildQuality) ||
      Number.isNaN(condition) ||
      Number.isNaN(usedDuration) ||
      Number.isNaN(originalPrice)
    ) {
      setError('Please enter valid numeric values.')
      return
    }

    if (
      buildQuality < 1 ||
      buildQuality > 5 ||
      condition < 1 ||
      condition > 5 ||
      !usageIntensity
    ) {
      setError('Build Quality/Condition must be 1-5, and Usage Pattern is required.')
      return
    }

    const derived = deriveModelFeatures({
      buildQuality,
      condition,
      originalPrice,
      usedDuration,
      usageIntensity,
    })

    const payload = buildPayload({
      productType: form.productType.trim(),
      brand: form.brand.trim(),
      usageIntensity,
      buildQuality,
      condition,
      originalPrice,
      usedDuration,
    })

    const clientPayload = buildClientPayload({
      productType: form.productType.trim(),
      brand: form.brand.trim(),
      usageIntensity,
      buildQuality,
      condition,
      originalPrice,
      usedDuration,
    })

    setIsLoading(true)

    try {
      const spaceIds = [
        ...(workingSpaceId ? [workingSpaceId] : []),
        ...getCandidateSpaceIds(),
      ].filter((value, index, array) => array.indexOf(value) === index)

      if (spaceIds.length > 0) {
        const spaceErrors: string[] = []

        for (const spaceId of spaceIds) {
          try {
            const prediction = await requestPredictionViaClient(spaceId, clientPayload)

            setWorkingSpaceId(spaceId)
            setConnectionStatus('connected')
            setConnectionMessage(`Connected via Gradio client: ${spaceId}`)

            setResult({
              status: prediction.status === 'READY' ? 'READY' : 'NOT READY',
              probability: prediction.probability.toFixed(2),
              explanation: prediction.explanation,
              recommendation: prediction.recommendation,
            })
            setProjection(
              buildProbabilityProjection({
                buildQuality,
                condition,
                usedDuration,
                originalPrice,
                usageIntensity,
                baseProbabilityPct: prediction.probability,
              })
            )
            return
          } catch (e) {
            const message = formatUnknownError(e)
            spaceErrors.push(message)
          }
        }

        if (spaceErrors.length > 0) {
          // Continue to endpoint fallback, but preserve context for final error.
          console.warn('Gradio client inference failed:', spaceErrors[spaceErrors.length - 1])
        }
      }

      const endpoints = [
        ...(workingEndpoint ? [workingEndpoint] : []),
        ...getCandidateEndpoints(),
      ].filter((value, index, array) => array.indexOf(value) === index)

      if (endpoints.length > 0) {
        const errors: string[] = []

        for (const endpoint of endpoints) {
          try {
            const prediction = await requestPrediction(endpoint, payload)

            setWorkingEndpoint(endpoint)
            setConnectionStatus('connected')
            setConnectionMessage(`Connected: ${endpoint}`)

            setResult({
              status: prediction.status === 'READY' ? 'READY' : 'NOT READY',
              probability: prediction.probability.toFixed(2),
              explanation: prediction.explanation,
              recommendation: prediction.recommendation,
            })
            setProjection(
              buildProbabilityProjection({
                buildQuality,
                condition,
                usedDuration,
                originalPrice,
                usageIntensity,
                baseProbabilityPct: prediction.probability,
              })
            )
            return
          } catch (e) {
            const message = formatUnknownError(e)
            errors.push(message)
          }
        }

        throw new Error(
          `Tried ${endpoints.length} endpoint(s). Last error: ${errors[errors.length - 1]}`
        )
      }

      setConnectionStatus('failed')
      setConnectionMessage(
        'No endpoint configured. Set VITE_PREDICT_URL or VITE_HF_SPACE_URL in .env.local'
      )

      const fallback = localFallbackPrediction({
        buildQuality,
        condition,
        usedDuration,
        usageIntensity,
        degradationRate: derived.degradationRate,
        stressIndex: derived.stressIndex,
      })
      setResult(fallback)
      setProjection(
        buildProbabilityProjection({
          buildQuality,
          condition,
          usedDuration,
          originalPrice,
          usageIntensity,
          baseProbabilityPct: Number(fallback.probability),
        })
      )
    } catch (error) {
      console.error('API error:', error)
      setConnectionStatus('failed')

      const fallback = localFallbackPrediction({
        buildQuality,
        condition,
        usedDuration,
        usageIntensity,
        degradationRate: derived.degradationRate,
        stressIndex: derived.stressIndex,
      })
      setResult(fallback)
      setProjection(
        buildProbabilityProjection({
          buildQuality,
          condition,
          usedDuration,
          originalPrice,
          usageIntensity,
          baseProbabilityPct: Number(fallback.probability),
        })
      )

      const reason = formatUnknownError(error)
      setConnectionMessage(
        `Connected Space may be running, but prediction failed: ${getPredictionErrorHint(reason)}`
      )
      setError(
        'Remote model call failed during prediction. Showing local fallback recommendation. Check Space logs for stack trace.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const projectionStartYear = new Date().getFullYear()
  const projectionChartPoints = getProjectionChartPoints(projection)
  const projectionPath = projectionChartPoints
    .map((point) => `${point.x},${point.y}`)
    .join(' ')

  return (
    <div className="app-shell">
      <div className="glow glow-pink" />
      <div className="glow glow-blue" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="analyzer-card"
      >
        <h1 className="title">E-Waste AI Analyzer</h1>

        <div className={`connection-badge connection-${connectionStatus}`}>
          {connectionStatus === 'idle' && 'Model: not tested'}
          {connectionStatus === 'testing' && 'Model: testing...'}
          {connectionStatus === 'connected' && 'Model: connected'}
          {connectionStatus === 'failed' && 'Model: connection failed'}
        </div>
        <p className="connection-message">{connectionMessage}</p>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="productType">Product Type</label>
            <div className="dropdown-wrap" ref={productDropdownRef}>
              <div className="dropdown-trigger-row">
                <input
                  id="productType"
                  type="text"
                  name="productType"
                  placeholder="Search or select product type"
                  onChange={handleChange}
                  className="input dropdown-input"
                  value={form.productType}
                />
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() =>
                    setOpenDropdown((prev) =>
                      prev === 'productType' ? null : 'productType'
                    )
                  }
                  aria-label="Toggle product options"
                  aria-expanded={openDropdown === 'productType'}
                >
                  {openDropdown === 'productType' ? '▲' : '▼'}
                </button>
              </div>

              {openDropdown === 'productType' && (
                <div className="dropdown-panel" role="listbox" aria-label="Product types">
                  {PRODUCT_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`dropdown-option ${
                        form.productType.trim().toLowerCase() === option.toLowerCase()
                          ? 'dropdown-option-active'
                          : ''
                      } ${
                        optionMatchesInput(option, form.productType)
                          ? 'dropdown-option-match'
                          : ''
                      }`}
                      onClick={() => selectDropdownOption('productType', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Type Carousel */}
            <div className="carousel-card compact-carousel">
              <p className="carousel-title">Product Preview</p>
              <div className="carousel-viewport">
                {/* Nav buttons stay exactly the same */}
                <button
                  type="button"
                  className="carousel-nav carousel-nav-left"
                  onClick={() => cycleOption('productType', -1)}
                  aria-label="Previous product"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-nav carousel-nav-right"
                  onClick={() => cycleOption('productType', 1)}
                  aria-label="Next product"
                >
                  ›
                </button>

                <div className="carousel-side-fade carousel-side-fade-left" />
                <div className="carousel-side-fade carousel-side-fade-right" />

                {/* Track — NO spin class anymore */}
                <div className={`carousel-track ${carouselMotion.productType}`}>
                  {productCoverflowSlides.map((slide) => (
                    <div
                      key={`product-${slide.key}-${slide.value}`}
                      className={`carousel-slide carousel-slide-${slide.position}`}
                    >
                      <img
                        src={getMappedImageSrc('products', slide.value)}
                        alt={`${slide.value} preview`}
                        className="carousel-image"
                        onError={(event) => {
                          event.currentTarget.src = '/placeholders/products/_placeholder.svg'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="carousel-caption">{productValueForCarousel}</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="brand">Brand</label>
            <div className="dropdown-wrap" ref={brandDropdownRef}>
              <div className="dropdown-trigger-row">
                <input
                  id="brand"
                  type="text"
                  name="brand"
                  placeholder="Search or select brand"
                  onChange={handleChange}
                  className="input dropdown-input"
                  value={form.brand}
                />
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === 'brand' ? null : 'brand'))
                  }
                  aria-label="Toggle brand options"
                  aria-expanded={openDropdown === 'brand'}
                >
                  {openDropdown === 'brand' ? '▲' : '▼'}
                </button>
              </div>

              {openDropdown === 'brand' && (
                <div className="dropdown-panel" role="listbox" aria-label="Brands">
                  {BRAND_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`dropdown-option ${
                        form.brand.trim().toLowerCase() === option.toLowerCase()
                          ? 'dropdown-option-active'
                          : ''
                      } ${
                        optionMatchesInput(option, form.brand)
                          ? 'dropdown-option-match'
                          : ''
                      }`}
                      onClick={() => selectDropdownOption('brand', option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="carousel-card compact-carousel">
              <p className="carousel-title">Brand Preview</p>
              <div className="carousel-viewport">
                <button
                  type="button"
                  className="carousel-nav carousel-nav-left"
                  onClick={() => cycleOption('brand', -1)}
                  aria-label="Previous brand"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="carousel-nav carousel-nav-right"
                  onClick={() => cycleOption('brand', 1)}
                  aria-label="Next brand"
                >
                  ›
                </button>

                <div className="carousel-side-fade carousel-side-fade-left" />
                <div className="carousel-side-fade carousel-side-fade-right" />

                <div className={`carousel-track ${carouselMotion.brand}`}>
                  {brandCoverflowSlides.map((slide) => (
                    <div
                      key={`brand-${slide.key}-${slide.value}`}
                      className={`carousel-slide carousel-slide-${slide.position}`}
                    >
                      <img
                        src={getMappedImageSrc('brands', slide.value)}
                        alt={`${slide.value} preview`}
                        className="carousel-image"
                        onError={(event) => {
                          event.currentTarget.src = '/placeholders/brands/_placeholder.svg'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="carousel-caption">{brandValueForCarousel}</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="usagePattern">Usage Pattern</label>
            <select
              id="usagePattern"
              name="usagePattern"
              onChange={handleSelectChange}
              className="input"
              value={form.usagePattern}
            >
              <option value="" disabled>
                Select usage pattern
              </option>
              <option value="Light">Light</option>
              <option value="Moderate">Moderate</option>
              <option value="Heavy">Heavy</option>
            </select>
            {form.usagePattern && (
              <small>
                Internal usage intensity: {USAGE_PATTERN_TO_INTENSITY[form.usagePattern]}
              </small>
            )}
          </div>

          <div className="field">
            <label htmlFor="originalPrice">Original Price</label>
            <input
              id="originalPrice"
              type="number"
              min={0}
              step="0.01"
              name="originalPrice"
              placeholder="e.g. 60000"
              onChange={handleChange}
              className="input"
              value={form.originalPrice}
            />
          </div>

          <div className="field">
            <label htmlFor="usedDuration">Used Duration (years)</label>
            <input
              id="usedDuration"
              type="number"
              min={0}
              step="0.1"
              name="usedDuration"
              placeholder="e.g. 3"
              onChange={handleChange}
              className="input"
              value={form.usedDuration}
            />
          </div>

          <div className="field-pair">
            <div className="field">
              <label htmlFor="buildQuality">Build Quality (1-5)</label>
              <input
                id="buildQuality"
                type="range"
                min="1"
                max="5"
                step="1"
                name="buildQuality"
                onChange={handleChange}
                className="input"
                value={form.buildQuality || '3'}
              />
              <small>Selected: {form.buildQuality || '3'}</small>
            </div>

            <div className="field">
              <label htmlFor="condition">Condition (1-5)</label>
              <input
                id="condition"
                type="range"
                min="1"
                max="5"
                step="1"
                name="condition"
                onChange={handleChange}
                className="input"
                value={form.condition || '3'}
              />
              <small>Selected: {form.condition || '3'}</small>
            </div>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            onClick={handleTestConnection}
            className="secondary-button"
            disabled={isLoading || connectionStatus === 'testing'}
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="analyze-button"
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Device'}
          </button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="result-card"
          >
            <h2>Status: {result.status}</h2>
            <p>Confidence: {result.probability}%</p>
            <p>
              <strong>Explanation:</strong> {result.explanation}
            </p>
            <p>
              <strong>Recommendation:</strong> {result.recommendation}
            </p>

            {projection.length > 1 && (
              <div className="projection-chart-wrap">
                <h3>E-Waste Readiness Projection (next years)</h3>
                <svg viewBox="0 0 420 170" className="projection-chart" role="img" aria-label="E-waste readiness projection over coming years">
                  <line x1={PROJECTION_CHART.xMin} y1={PROJECTION_CHART.yMax} x2={PROJECTION_CHART.xMax} y2={PROJECTION_CHART.yMax} className="projection-axis" />
                  <line x1={PROJECTION_CHART.xMin} y1={PROJECTION_CHART.yMin} x2={PROJECTION_CHART.xMin} y2={PROJECTION_CHART.yMax} className="projection-axis" />
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y =
                      PROJECTION_CHART.yMax -
                      (tick / 100) * (PROJECTION_CHART.yMax - PROJECTION_CHART.yMin)
                    return (
                      <g key={`tick-${tick}`}>
                        <line x1={PROJECTION_CHART.xMin} y1={y} x2={PROJECTION_CHART.xMax} y2={y} className="projection-grid" />
                        <text x="6" y={y + 4} className="projection-tick-label">
                          {tick}%
                        </text>
                      </g>
                    )
                  })}

                  <polyline
                    className="projection-line"
                    fill="none"
                    points={projectionPath}
                  />

                  {projectionChartPoints.map((point) => {
                    return (
                      <g key={`point-${point.year}`}>
                        <circle cx={point.x} cy={point.y} r="4.2" className="projection-point" />
                        <text x={point.x - 13} y="157" className="projection-year-label">
                          {projectionStartYear + point.year}
                        </text>
                        <title>{`Year ${projectionStartYear + point.year}: ${point.probability.toFixed(2)}%`}</title>
                      </g>
                    )
                  })}
                </svg>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default App
