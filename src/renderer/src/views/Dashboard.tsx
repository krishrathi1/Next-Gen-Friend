import { Component, ErrorInfo, ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Sphere from '@renderer/components/Sphere'
import {
  RiCameraLine,
  RiCpuLine,
  RiHistoryLine,
  RiLayoutGridLine,
  RiMicLine,
  RiMicOffLine,
  RiPhoneFill,
  RiPulseLine,
  RiServerLine,
  RiSwapBoxLine,
  RiTerminalBoxLine,
  RiWifiLine
} from 'react-icons/ri'
import { FaMemory } from 'react-icons/fa6'
import { GiTinker } from 'react-icons/gi'
import { HiComputerDesktop } from 'react-icons/hi2'
import * as faceapi from 'face-api.js'
import { VisionMode } from '@renderer/IndexRoot'
import { DriveInfo, SystemStats } from '@renderer/services/system-info'

interface IrisProps {
  isSystemActive: boolean
  toggleSystem: () => void
  isMicMuted: boolean
  toggleMic: () => void
  isVideoOn: boolean
  visionMode: VisionMode
  startVision: (mode: 'camera' | 'screen') => void
  stopVision: () => void
  activeStream: MediaStream | null
}

type TranscriptMessage = {
  role: string
  content?: string
  parts?: Array<{ text?: string }>
  timestamp?: string
}

interface DashboardViewProps {
  props: IrisProps
  stats: SystemStats | null
  networkRttMs: number | null
  networkDownlinkMbps: number | null
  networkType: string
  drives: DriveInfo[]
  cpuHistory: number[]
  ramHistory: number[]
  chatHistory: TranscriptMessage[]
  isTyping: boolean
  onVisionClick: () => void
}

type MetricCard = {
  icon: ReactNode
  label: string
  val: string
  color: string
  percent: number | null
}

const glassPanel =
  'bg-[#09090e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]'

const getMessageText = (msg: TranscriptMessage): string => {
  if (typeof msg.content === 'string' && msg.content.trim()) return msg.content
  if (Array.isArray(msg.parts) && msg.parts[0]?.text) return msg.parts[0].text
  return ''
}

const AudioWaveform = ({ isActive }: { isActive: boolean }) => {
  const baseHeights = [5, 9, 12, 8, 6]
  return (
    <div className="ml-1 hidden sm:flex items-center gap-[2px] h-4">
      {baseHeights.map((h, i) => (
        <div
          key={i}
          className={`w-[2px] rounded-full bg-violet-400 ${isActive ? 'animate-pulse' : 'opacity-40'}`}
          style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

const Sparkline = ({ data, colorClass, label }: { data: number[]; colorClass: string; label: string }) => {
  const points =
    data.length > 1
      ? data
          .map((value, idx) => {
            const x = (idx / (data.length - 1)) * 100
            const y = 100 - Math.max(0, Math.min(100, value))
            return `${x},${y}`
          })
          .join(' ')
      : ''

  const gradientId = useMemo(
    () => `grad-${label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
    [label]
  )

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[9px] font-mono tracking-widest text-zinc-500">{label}</span>
        <span className={`text-[10px] font-semibold tabular-nums ${colorClass}`}>
          {data.length ? `${data[data.length - 1].toFixed(1)}%` : '--'}
        </span>
      </div>
      <svg viewBox="0 0 100 100" className="h-12 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points && <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradientId})`} className={colorClass} />}
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" className={colorClass} />
      </svg>
    </div>
  )
}

class DashboardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/5 text-xs text-red-300">
          Visualization unavailable
        </div>
      )
    }
    return this.props.children
  }
}

function DashboardView({
  props,
  stats,
  networkRttMs,
  networkDownlinkMbps,
  networkType,
  drives,
  cpuHistory,
  ramHistory,
  chatHistory,
  isTyping,
  onVisionClick
}: DashboardViewProps) {
  const {
    isSystemActive,
    isVideoOn,
    visionMode,
    startVision,
    activeStream,
    toggleMic,
    toggleSystem,
    isMicMuted
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceScanInterval = useRef<NodeJS.Timeout | null>(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [modelLoadError, setModelLoadError] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'metrics' | 'transcript'>('metrics')

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ top: mobileScrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [chatHistory, isTyping, mobilePanel])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ])
        setModelsLoaded(true)
        setModelLoadError(null)
      } catch {
        setModelLoadError('Vision models unavailable')
      }
    }
    loadModels()
  }, [])

  useEffect(() => {
    if (isVideoOn && visionMode === 'camera' && modelsLoaded && videoElementRef.current && canvasRef.current) {
      if (faceScanInterval.current) clearInterval(faceScanInterval.current)
      faceScanInterval.current = setInterval(async () => {
        const video = videoElementRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState !== 4 || video.videoWidth === 0) return

        try {
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw
            canvas.height = vh
          }

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 })
          const detection = await faceapi.detectSingleFace(video, options).withFaceExpressions().withAgeAndGender()
          ctx.clearRect(0, 0, vw, vh)

          if (detection) {
            const { x, y, width, height } = detection.detection.box
            const mirroredX = vw - x - width
            ctx.strokeStyle = '#7c3aed'
            ctx.lineWidth = 3
            const l = 20
            ctx.beginPath()
            ctx.moveTo(mirroredX, y + l)
            ctx.lineTo(mirroredX, y)
            ctx.lineTo(mirroredX + l, y)
            ctx.moveTo(mirroredX + width - l, y)
            ctx.lineTo(mirroredX + width, y)
            ctx.lineTo(mirroredX + width, y + l)
            ctx.moveTo(mirroredX, y + height - l)
            ctx.lineTo(mirroredX, y + height)
            ctx.lineTo(mirroredX + l, y + height)
            ctx.moveTo(mirroredX + width - l, y + height)
            ctx.lineTo(mirroredX + width, y + height)
            ctx.lineTo(mirroredX + width, y + height - l)
            ctx.stroke()
          }
        } catch {
          // Keep feed resilient if a single frame fails.
        }
      }, 450)
    } else {
      if (faceScanInterval.current) clearInterval(faceScanInterval.current)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }

    return () => {
      if (faceScanInterval.current) clearInterval(faceScanInterval.current)
    }
  }, [isVideoOn, visionMode, modelsLoaded])

  const setVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node
      if (node && activeStream && isVideoOn) {
        node.srcObject = activeStream
        node.onloadedmetadata = () => node.play().catch(() => {})
      }
    },
    [activeStream, isVideoOn]
  )

  const setMobileVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && activeStream && isVideoOn) {
        node.srcObject = activeStream
        node.onloadedmetadata = () => node.play().catch(() => {})
      }
    },
    [activeStream, isVideoOn]
  )

  const toggleSource = () => {
    if (!isSystemActive) return
    startVision(visionMode === 'camera' ? 'screen' : 'camera')
  }

  const systemMetrics: MetricCard[] = [
    {
      icon: <RiCpuLine />,
      label: 'CPU',
      val: isSystemActive && stats ? `${stats.cpu}%` : '--',
      color: 'text-blue-400',
      percent: isSystemActive && stats ? Number(stats.cpu) : null
    },
    {
      icon: <FaMemory />,
      label: 'RAM',
      val: isSystemActive && stats ? `${stats.memory.usedPercentage}%` : '--',
      color: 'text-violet-400',
      percent: isSystemActive && stats ? Number(stats.memory.usedPercentage) : null
    },
    {
      icon: <GiTinker />,
      label: 'TEMP',
      val: isSystemActive && stats && stats.temperature !== null ? `${stats.temperature}deg` : '--',
      color: 'text-amber-400',
      percent:
        isSystemActive && stats && stats.temperature !== null
          ? Math.max(0, Math.min(100, (stats.temperature / 100) * 100))
          : null
    },
    {
      icon: <HiComputerDesktop />,
      label: 'OS',
      val: isSystemActive && stats ? `${stats.os.type} ${stats.os.uptime}` : '--',
      color: 'text-emerald-400',
      percent: null
    }
  ]

  const transcriptContent = (
    <>
      {chatHistory.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2.5 opacity-40">
          <RiHistoryLine size={28} />
          <span className="text-[9px] tracking-[0.2em] uppercase font-mono">No data stream</span>
        </div>
      ) : (
        chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[95%] py-2 px-3 rounded-xl text-[11px] leading-relaxed font-medium transition-all ${
                msg.role === 'user'
                  ? 'bg-violet-600/15 border border-violet-500/20 text-violet-100/90 rounded-br-sm'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 rounded-bl-sm'
              }`}
            >
              {getMessageText(msg)}
            </div>
            <span className="mt-1 text-[9px] font-mono text-zinc-600">
              {msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : ''}
            </span>
          </div>
        ))
      )}
      {isTyping && (
        <div className="flex items-start">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className="flex-1 p-3 grid grid-cols-12 gap-3 h-full overflow-hidden relative animate-in fade-in zoom-in duration-300 w-full">
      <div className="hidden lg:flex col-span-3 flex-col gap-3 h-full z-40">
        <div className={`${glassPanel} h-[200px] shrink-0 flex flex-col overflow-hidden relative group`}>
          <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 border border-white/[0.06]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isVideoOn ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-zinc-600'} ${isVideoOn ? 'animate-pulse' : ''}`}
            />
            <span className={`text-[9px] font-semibold tracking-widest ${isVideoOn ? 'text-red-400' : 'text-zinc-600'}`}>
              {isVideoOn ? (visionMode === 'screen' ? 'SCREEN' : 'OPTICAL') : 'OFFLINE'}
            </span>
          </div>

          {isVideoOn && (
            <button
              onClick={toggleSource}
              title="Toggle camera/screen"
              className="absolute top-2 right-2 z-30 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-sm border border-white/[0.08] text-zinc-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all duration-150 flex items-center justify-center"
            >
              <RiSwapBoxLine size={13} />
            </button>
          )}

          <div
            className={`w-full h-full rounded-xl overflow-hidden bg-black/40 relative border border-white/[0.04] transition-opacity duration-500 ${isVideoOn ? 'opacity-100' : 'opacity-25'}`}
          >
            <video
              key={visionMode}
              ref={setVideoRef}
              className={`absolute inset-0 w-full h-full object-cover ${visionMode === 'camera' ? '-scale-x-100' : ''}`}
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20" />
            <div
              className="absolute inset-0 pointer-events-none z-10 opacity-[0.06]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)'
              }}
            />
            {isVideoOn && visionMode === 'camera' && !modelsLoaded && !modelLoadError && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-[10px] font-mono tracking-widest text-violet-300">
                Loading vision models...
              </div>
            )}
            {modelLoadError && visionMode === 'camera' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-[10px] font-mono tracking-widest text-red-300">
                {modelLoadError}
              </div>
            )}
            {!isVideoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-700">
                <RiCameraLine size={22} />
                <span className="text-[9px] font-mono tracking-widest">NO SIGNAL</span>
              </div>
            )}
          </div>
        </div>

        <div className={`${glassPanel} shrink-0 p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              <RiPulseLine size={12} className={isSystemActive ? 'text-violet-500 animate-pulse' : 'text-zinc-700'} />
              Neural Uplink
            </span>
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                isSystemActive
                  ? 'text-violet-400 bg-violet-500/10 border border-violet-500/20'
                  : 'text-zinc-600 bg-zinc-800/50 border border-zinc-700/30'
              }`}
            >
              {isSystemActive ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">LATENCY</p>
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <RiWifiLine size={12} className={isSystemActive ? 'text-violet-500' : 'text-zinc-600'} />
                {isSystemActive ? (networkRttMs ? `${networkRttMs}ms` : '--') : '--'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">DOWNLINK</p>
              <span className="text-xs font-semibold text-zinc-300">
                {networkDownlinkMbps ? `${networkDownlinkMbps.toFixed(1)} Mbps` : '--'}
              </span>
            </div>
            <div>
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">UPLINK</p>
              <span className="text-xs font-semibold text-zinc-300">--</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">TYPE</p>
              <span className="text-xs font-semibold text-zinc-300 uppercase">
                {networkType} <RiServerLine size={12} className="inline text-zinc-600" />
              </span>
            </div>
          </div>

          <div className="flex items-end gap-0.5 mt-3">
            {[1, 2, 3, 4, 5].map((bar) => (
              <div
                key={bar}
                className={`w-2 rounded-sm transition-all duration-500 ${isSystemActive ? 'bg-violet-500' : 'bg-zinc-700'}`}
                style={{ height: `${bar * 4}px`, opacity: isSystemActive ? 1 : 0.3 }}
              />
            ))}
            <span className="ml-2 text-[9px] font-mono text-zinc-600">{isSystemActive ? 'STRONG' : 'NO SIGNAL'}</span>
          </div>
        </div>

        <div className={`${glassPanel} p-3.5 shrink-0`}>
          <div className="mb-2 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">Live Metrics</div>
          <div className="grid grid-cols-1 gap-2">
            <Sparkline data={cpuHistory} colorClass="text-blue-400" label="CPU Trend" />
            <Sparkline data={ramHistory} colorClass="text-violet-400" label="RAM Trend" />
          </div>
        </div>

        <div className={`${glassPanel} flex-1 p-4 flex flex-col gap-3 min-h-0`}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase border-b border-white/[0.05] pb-2.5">
            <RiLayoutGridLine size={12} />
            Core Metrics
          </div>
          <div className="grid grid-cols-2 gap-2">
            {systemMetrics.map((m, i) => {
              const fillClass = m.color.replace('text-', 'bg-')
              const percent = m.percent !== null && Number.isFinite(m.percent) ? Math.max(0, Math.min(100, m.percent)) : 0
              return (
                <div
                  key={i}
                  className="bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-3 flex flex-col justify-between border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 cursor-default"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-sm ${m.color}`}>{m.icon}</span>
                    <span className="text-[8px] font-mono text-zinc-600 tracking-widest">{m.label}</span>
                  </div>
                  <span className={`text-base font-bold ${m.color} tabular-nums`}>{m.val}</span>
                  <div className="w-full h-[2px] bg-black/40 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${fillClass}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5 min-h-0 flex-1 overflow-y-auto">
            <div className="mb-2 text-[9px] font-mono tracking-widest text-zinc-500">DISK USAGE</div>
            <div className="space-y-2">
              {drives.length === 0 && <div className="text-[10px] text-zinc-600">No drive telemetry</div>}
              {drives.slice(0, 4).map((drive) => {
                const used = Math.max(0, drive.TotalGB - drive.FreeGB)
                const usedPct = drive.TotalGB > 0 ? Math.round((used / drive.TotalGB) * 100) : 0
                return (
                  <div key={String(drive.Name)}>
                    <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>{drive.Name}:\\</span>
                      <span className="tabular-nums">{usedPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-black/60">
                      <div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${usedPct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 relative flex flex-col items-center justify-center">
        <div
          className={`lg:hidden absolute top-3 right-3 w-28 h-20 ${glassPanel} z-50 overflow-hidden ${isVideoOn ? 'block' : 'hidden'}`}
        >
          <video
            ref={setMobileVideoRef}
            className={`w-full h-full object-cover ${visionMode === 'camera' ? '-scale-x-100' : ''}`}
            autoPlay
            playsInline
            muted
          />
        </div>

        <div
          className={`w-[58vh] h-[58vh] max-w-full transition-all duration-1000 ${isSystemActive ? 'opacity-100 scale-100' : 'opacity-70 scale-90 grayscale'}`}
        >
          <DashboardErrorBoundary>
            <Sphere />
          </DashboardErrorBoundary>
        </div>

        <div className="absolute bottom-32 lg:bottom-8 z-50">
          <div className="relative flex items-center gap-2 px-5 py-3 bg-[#09090e]/90 backdrop-blur-xl border border-white/[0.07] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            <button
              onClick={onVisionClick}
              title={isVideoOn ? 'Stop vision' : 'Start vision'}
              className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isVideoOn
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                  : 'text-zinc-500 border border-transparent hover:bg-white/[0.06] hover:text-zinc-300'
              }`}
            >
              {isVideoOn ? <RiSwapBoxLine size={18} /> : <RiCameraLine size={18} />}
            </button>

            <div className="w-px h-6 bg-white/[0.06]" />

            <button onClick={toggleSystem} className="relative group mx-1">
              <div
                className={`cursor-pointer w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                  isSystemActive
                    ? 'bg-violet-600 border-violet-500/50 text-white shadow-[0_0_24px_rgba(124,58,237,0.5)] hover:bg-violet-500'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
              >
                <RiPhoneFill size={20} className={isSystemActive ? 'animate-pulse' : ''} />
              </div>
              {isSystemActive && <div className="absolute inset-0 rounded-xl animate-pulse-ring pointer-events-none" />}
            </button>

            <div className="w-px h-6 bg-white/[0.06]" />

            <button
              onClick={toggleMic}
              title={isMicMuted ? 'Unmute (Space)' : 'Mute (Space)'}
              className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isMicMuted
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/15'
              }`}
            >
              {isMicMuted ? <RiMicOffLine size={18} /> : <RiMicLine size={18} />}
            </button>

            <AudioWaveform isActive={isSystemActive && !isMicMuted} />
          </div>
        </div>

        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
          <div className={`${glassPanel} p-2.5`}>
            <div className="mb-2 flex items-center gap-2">
              <button
                onClick={() => setMobilePanel('metrics')}
                className={`px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wider ${
                  mobilePanel === 'metrics'
                    ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30'
                    : 'bg-white/[0.03] text-zinc-500 border border-white/[0.06]'
                }`}
              >
                Metrics
              </button>
              <button
                onClick={() => setMobilePanel('transcript')}
                className={`px-3 py-1 rounded-lg text-[10px] font-semibold tracking-wider ${
                  mobilePanel === 'transcript'
                    ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30'
                    : 'bg-white/[0.03] text-zinc-500 border border-white/[0.06]'
                }`}
              >
                Transcript
              </button>
            </div>

            {mobilePanel === 'metrics' ? (
              <div className="grid grid-cols-2 gap-2">
                <Sparkline data={cpuHistory} colorClass="text-blue-400" label="CPU" />
                <Sparkline data={ramHistory} colorClass="text-violet-400" label="RAM" />
              </div>
            ) : (
              <div ref={mobileScrollRef} className="max-h-40 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
                {transcriptContent}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex col-span-3 flex-col overflow-hidden h-full z-40">
        <div className={`${glassPanel} h-full p-4 flex flex-col`}>
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              <RiTerminalBoxLine size={12} />
              Transcript
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-violet-500/40 tracking-widest">
              <span className={`w-1 h-1 rounded-full bg-violet-500 ${chatHistory.length > 0 ? 'animate-pulse' : 'opacity-30'}`} />
              LIVE
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none min-h-0">
            {transcriptContent}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardView)
