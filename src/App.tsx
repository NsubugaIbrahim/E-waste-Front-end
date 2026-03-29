import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Client } from '@gradio/client'
import './App.css'

const PRODUCT_OPTIONS = [
  'Smartphone',
  'Laptop',
  'Tablet',
  'Desktop',
  'Smartwatch',
  'Monitor',
  'Printer',
  'Router',
]

const BRAND_OPTIONS = [
  'Apple',
  'Samsung',
  'Dell',
  'HP',
  'Lenovo',
  'Asus',
  'Acer',
  'Sony',
  'LG',
  'Xiaomi',
]

const PRODUCT_IMAGE_MAP: Record<string, string> = {
  Smartphone: '/placeholders/products/smartphone.png',
  Laptop: '/placeholders/products/laptop.png',
  Tablet: '/placeholders/products/tablet.png',
  Desktop: '/placeholders/products/desktop.png',
  Smartwatch: '/placeholders/products/smartwatch.png',
  Monitor: '/placeholders/products/monitor.png',
  Printer: '/placeholders/products/printer.png',
  Router: '/placeholders/products/router.png',
}

const BRAND_IMAGE_MAP: Record<string, string> = {
  Apple: '/placeholders/brands/apple.png',
  Samsung: '/placeholders/brands/samsung.png',
  Dell: '/placeholders/brands/dell.png',
  HP: '/placeholders/brands/hp.png',
  Lenovo: '/placeholders/brands/lenovo.png',
  Asus: '/placeholders/brands/asus.png',
  Acer: '/placeholders/brands/acer.png',
  Sony: '/placeholders/brands/sony.png',
  LG: '/placeholders/brands/lg.png',
  Xiaomi: '/placeholders/brands/xiaomi.png',
}

type FormState = {
  productType: string
  brand: string
  usagePattern: '' | 'Light' | 'Moderate' | 'Heavy'
  buildQuality: string
  condition: string
  userLifespan: string
  expiryYears: string
  usedDuration: string
  originalPrice: string
  currentPrice: string
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
  usage_pattern: 'Light' | 'Moderate' | 'Heavy'
  condition: number
  price_retention_ratio: number
  user_lifespan: number
}

type SpinClass = '' | 'spin-left' | 'spin-right'

const REQUEST_TIMEOUT_MS = 20000

function App() {
  const [form, setForm] = useState<FormState>({
    productType: '',
    brand: '',
    usagePattern: '',
    buildQuality: '3',
    condition: '3',
    userLifespan: '',
    expiryYears: '',
    usedDuration: '',
    originalPrice: '',
    currentPrice: '',
  })

  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle')
  const [connectionMessage, setConnectionMessage] = useState<string>(
    'Connection not tested yet.'
  )
  const [workingEndpoint, setWorkingEndpoint] = useState<string | null>(null)
  const [workingSpaceId, setWorkingSpaceId] = useState<string | null>(null)
  const [carouselSpin, setCarouselSpin] = useState<{
    productType: SpinClass
    brand: SpinClass
  }>({
    productType: '',
    brand: '',
  })
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
    const imageMap = kind === 'products' ? PRODUCT_IMAGE_MAP : BRAND_IMAGE_MAP

    if (normalized && imageMap[normalized]) return imageMap[normalized]

    const fileName = normalized ? `${toSlug(normalized)}.png` : '_placeholder.svg'
    return `/placeholders/${kind}/${fileName}`
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

  const cycleOption = (field: 'productType' | 'brand', direction: 1 | -1) => {
    const options = field === 'productType' ? PRODUCT_OPTIONS : BRAND_OPTIONS
    const spinClass: SpinClass = direction === 1 ? 'spin-right' : 'spin-left'

    setCarouselSpin((prev) => ({
      ...prev,
      [field]: '',
    }))

    window.requestAnimationFrame(() => {
      setCarouselSpin((prev) => ({
        ...prev,
        [field]: spinClass,
      }))
    })

    setForm((prev) => {
      const currentValue = field === 'productType' ? prev.productType : prev.brand
      const currentIndex = getMatchedIndex(currentValue, options)
      const nextIndex =
        (currentIndex + direction + options.length) % options.length

      return {
        ...prev,
        [field]: options[nextIndex],
      }
    })

    window.setTimeout(() => {
      setCarouselSpin((prev) => ({
        ...prev,
        [field]: '',
      }))
    }, 420)
  }

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
    setForm((prev) => ({ ...prev, [name]: value as FormState['usagePattern'] }))
  }

  const classifyEwaste = (input: {
    usagePattern: 'Light' | 'Moderate' | 'Heavy'
    buildQuality: number
    condition: number
    userLifespan: number
    expiryYears: number
    usedDuration: number
    originalPrice: number
    currentPrice: number
  }) => {
    const eps = 1e-6
    const priceRetentionRatio = input.currentPrice / (input.originalPrice + eps)
    const usageToExpiryRatio = input.usedDuration / (input.expiryYears + eps)
    const lifespanStressRatio = input.usedDuration / (input.userLifespan + eps)
    const yearsToExpiry = input.expiryYears - input.usedDuration

    const veryOld = yearsToExpiry <= 0 || usageToExpiryRatio >= 1.1
    const heavilyUsed = usageToExpiryRatio >= 0.8 || lifespanStressRatio >= 0.8
    const veryLowValue = priceRetentionRatio <= 0.1 || input.currentPrice <= 1000
    const lowValue = priceRetentionRatio <= 0.25
    const veryBadCondition = input.condition <= 2
    const midCondition = input.condition >= 3 && input.condition <= 4
    const lowBuild = input.buildQuality <= 3
    const heavyUsagePattern = input.usagePattern === 'Heavy'

    if (veryOld && (veryLowValue || veryBadCondition || heavyUsagePattern)) {
      return 'Recycle'
    }
    if (veryLowValue && (veryBadCondition || heavilyUsed)) {
      return 'Recycle'
    }
    if (lowValue && veryBadCondition && (lowBuild || heavyUsagePattern)) {
      return 'Recycle'
    }
    if (veryBadCondition && !veryLowValue) {
      return 'Refurbish'
    }
    if (
      heavilyUsed &&
      (midCondition || lowBuild || heavyUsagePattern) &&
      !veryLowValue
    ) {
      return 'Refurbish'
    }

    return 'Active'
  }

  const getCandidateEndpoints = () => {
    const directUrl = (import.meta.env.VITE_PREDICT_URL as string | undefined)?.trim()
    const spaceUrl = (import.meta.env.VITE_HF_SPACE_URL as string | undefined)?.trim()
    const apiName =
      (import.meta.env.VITE_GRADIO_API_NAME as string | undefined)?.trim() ||
      '/predict'

    const endpoints = new Set<string>()

    if (directUrl) endpoints.add(directUrl)

    if (spaceUrl) {
      if (spaceUrl.includes('huggingface.co')) {
        return Array.from(endpoints)
      }

      const normalizedBase = spaceUrl.replace(/\/+$/, '')
      const normalizedApiName = apiName.startsWith('/') ? apiName : `/${apiName}`
      endpoints.add(`${normalizedBase}/run${normalizedApiName}`)
      endpoints.add(`${normalizedBase}/api${normalizedApiName}`)
      endpoints.add(`${normalizedBase}/run/predict`)
      endpoints.add(`${normalizedBase}/api/predict`)
    }

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
    usagePattern: 'Light' | 'Moderate' | 'Heavy'
    buildQuality: number
    condition: number
    priceRetentionRatio: number
    userLifespan: number
  }) => ({
    data: [
      input.productType,
      input.brand,
      input.buildQuality,
      input.usagePattern,
      input.condition,
      input.priceRetentionRatio,
      input.userLifespan,
    ],
  })

  const buildClientPayload = (input: {
    productType: string
    brand: string
    usagePattern: 'Light' | 'Moderate' | 'Heavy'
    buildQuality: number
    condition: number
    priceRetentionRatio: number
    userLifespan: number
  }): ClientPayload => ({
    product_type: input.productType,
    brand: input.brand,
    build_quality: input.buildQuality,
    usage_pattern: input.usagePattern,
    condition: input.condition,
    price_retention_ratio: input.priceRetentionRatio,
    user_lifespan: input.userLifespan,
  })

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
      usagePattern: form.usagePattern || 'Moderate',
      buildQuality: Number(form.buildQuality || '3'),
      condition: Number(form.condition || '3'),
      priceRetentionRatio: 0.3,
      userLifespan: Number(form.userLifespan || '5'),
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

    if (
      !form.productType.trim() ||
      !form.brand.trim() ||
      !form.usagePattern ||
      !form.buildQuality ||
      !form.condition ||
      !form.userLifespan ||
      !form.expiryYears ||
      !form.usedDuration ||
      !form.originalPrice ||
      !form.currentPrice
    ) {
      setError('Please fill all fields before analysis.')
      return
    }

    const buildQuality = Number(form.buildQuality)
    const condition = Number(form.condition)
    const userLifespan = Number(form.userLifespan)
    const expiryYears = Number(form.expiryYears)
    const usedDuration = Number(form.usedDuration)
    const originalPrice = Number(form.originalPrice)
    const currentPrice = Number(form.currentPrice)

    if (
      Number.isNaN(buildQuality) ||
      Number.isNaN(condition) ||
      Number.isNaN(userLifespan) ||
      Number.isNaN(expiryYears) ||
      Number.isNaN(usedDuration) ||
      Number.isNaN(originalPrice) ||
      Number.isNaN(currentPrice)
    ) {
      setError('Please enter valid numeric values.')
      return
    }

    if (buildQuality < 1 || buildQuality > 5 || condition < 1 || condition > 5) {
      setError('Build Quality and Condition must be between 1 and 5.')
      return
    }

    const eps = 1e-6

    const priceRetentionRatio = currentPrice / (originalPrice + eps)

    const parsedInput = {
      usagePattern: form.usagePattern,
      buildQuality,
      condition,
      userLifespan,
      expiryYears,
      usedDuration,
      originalPrice,
      currentPrice,
    } as const

    const payload = buildPayload({
      productType: form.productType.trim(),
      brand: form.brand.trim(),
      usagePattern: form.usagePattern,
      buildQuality,
      condition,
      priceRetentionRatio,
      userLifespan,
    })

    const clientPayload = buildClientPayload({
      productType: form.productType.trim(),
      brand: form.brand.trim(),
      usagePattern: form.usagePattern,
      buildQuality,
      condition,
      priceRetentionRatio,
      userLifespan,
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

      const managementStatus = classifyEwaste(parsedInput)
      const status = managementStatus === 'Recycle' ? 'READY' : 'NOT READY'
      const confidence =
        managementStatus === 'Recycle'
          ? '88.00'
          : managementStatus === 'Refurbish'
            ? '64.00'
            : '24.00'

      setResult({
        status,
        probability: confidence,
        explanation:
          managementStatus === 'Recycle'
            ? 'Device appears near end-of-life based on value loss, condition, and usage stress.'
            : managementStatus === 'Refurbish'
              ? 'Device is stressed but still suitable for refurbishment before recycling.'
              : 'Device still has usable life and is not currently e-waste ready.',
        recommendation:
          managementStatus === 'Recycle'
            ? 'Send to authorized e-waste recycling collection.'
            : managementStatus === 'Refurbish'
              ? 'Repair/refurbish and reassess later.'
              : 'Continue using and monitor performance over time.',
      })
    } catch (error) {
      console.error('API error:', error)
      setConnectionStatus('failed')

      const managementStatus = classifyEwaste(parsedInput)
      const status = managementStatus === 'Recycle' ? 'READY' : 'NOT READY'
      const confidence =
        managementStatus === 'Recycle'
          ? '88.00'
          : managementStatus === 'Refurbish'
            ? '64.00'
            : '24.00'

      setResult({
        status,
        probability: confidence,
        explanation:
          managementStatus === 'Recycle'
            ? 'Live API failed. Local heuristic says the device is near end-of-life (dispose path likely).' 
            : managementStatus === 'Refurbish'
              ? 'Live API failed. Local heuristic suggests refurbishment before disposal.'
              : 'Live API failed. Local heuristic suggests the device can be kept for now.',
        recommendation:
          managementStatus === 'Recycle'
            ? 'Check API URL/server. Meanwhile, use certified e-waste disposal channels.'
            : managementStatus === 'Refurbish'
              ? 'Check API URL/server. Meanwhile, repair/refurbish and reassess later.'
              : 'Check API URL/server. Meanwhile, continue use and monitor condition.',
      })

      const reason = formatUnknownError(error)
      setConnectionMessage(
        `Connected Space may be running, but prediction failed: ${getPredictionErrorHint(reason)}`
      )
      setError('Remote model call failed during prediction. Showing local fallback recommendation. Check Space logs for stack trace.')
    } finally {
      setIsLoading(false)
    }
  }

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
          </div>

          <div className="field field-span-2">
            <label>Visual Selector</label>
            <div className="carousel-grid">
              <div className="carousel-card">
                <p className="carousel-title">Product Preview</p>
                <div className="carousel-viewport">
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
                  <div
                    className={`carousel-track ${carouselSpin.productType}`}
                    aria-live="polite"
                  >
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
                            event.currentTarget.src =
                              '/placeholders/products/_placeholder.svg'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="carousel-caption">{productValueForCarousel}</p>
              </div>

              <div className="carousel-card">
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
                  <div
                    className={`carousel-track ${carouselSpin.brand}`}
                    aria-live="polite"
                  >
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
            <label htmlFor="currentPrice">Current Price</label>
            <input
              id="currentPrice"
              type="number"
              min={0}
              step="0.01"
              name="currentPrice"
              placeholder="e.g. 18000"
              onChange={handleChange}
              className="input"
              value={form.currentPrice}
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

          <div className="field">
            <label htmlFor="expiryYears">Expiry Years</label>
            <input
              id="expiryYears"
              type="number"
              min={0}
              step="0.1"
              name="expiryYears"
              placeholder="e.g. 6"
              onChange={handleChange}
              className="input"
              value={form.expiryYears}
            />
          </div>

          <div className="field">
            <label htmlFor="userLifespan">User Lifespan</label>
            <input
              id="userLifespan"
              type="number"
              min={0}
              step="0.1"
              name="userLifespan"
              placeholder="e.g. 5"
              onChange={handleChange}
              className="input"
              value={form.userLifespan}
            />
          </div>

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
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default App
