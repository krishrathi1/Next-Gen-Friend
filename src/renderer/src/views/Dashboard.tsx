import { useEffect, useCallback, useRef, useState } from 'react'
import Sphere from '@renderer/components/Sphere'
import {
  RiCpuLine,
  RiCameraLine,
  RiTerminalBoxLine,
  RiSwapBoxLine,
  RiLayoutGridLine,
  RiMicLine,
  RiMicOffLine,
  RiPhoneFill,
  RiHistoryLine,
  RiPulseLine,
  RiWifiLine,
  RiServerLine
} from 'react-icons/ri'
import { FaMemory } from 'react-icons/fa6'
import { GiTinker } from 'react-icons/gi'
import { HiComputerDesktop } from 'react-icons/hi2'
import * as faceapi from 'face-api.js'
import { VisionMode } from '@renderer/IndexRoot'

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

interface DashboardViewProps {
  props: IrisProps
  stats: any
  chatHistory: any[]
  onVisionClick: () => void
}

const glassPanel =
  'bg-[#09090e]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.4)]'

export default function DashboardView({ props, stats, chatHistory, onVisionClick }: DashboardViewProps) {
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
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const faceScanInterval = useRef<NodeJS.Timeout | null>(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatHistory])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ])
        setModelsLoaded(true)
      } catch (e) {}
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
          const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })
          const detection = await faceapi
            .detectSingleFace(video, options)
            .withFaceExpressions()
            .withAgeAndGender()
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
            const expressions = detection.expressions
            const domExp = Object.keys(expressions).reduce((a, b) =>
              expressions[a] > expressions[b] ? a : b
            )
            const gender = detection.gender === 'male' ? 'M' : 'F'
            const age = Math.round(detection.age)
            const labelText = ` ${gender} · ${age} · ${domExp.toUpperCase()} `
            ctx.fillStyle = 'rgba(7,7,15,0.9)'
            ctx.fillRect(mirroredX, y - 28, width, 22)
            ctx.fillStyle = '#a78bfa'
            ctx.font = 'bold 11px "JetBrains Mono", monospace'
            ctx.fillText(labelText, mirroredX + 4, y - 12)
          } else {
            ctx.fillStyle = 'rgba(52, 211, 153, 0.7)'
            ctx.font = 'bold 11px "JetBrains Mono", monospace'
            ctx.fillText('SCANNING...', 12, 24)
          }
        } catch (e) {}
      }, 250)
    } else {
      if (faceScanInterval.current) clearInterval(faceScanInterval.current)
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
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
    [activeStream, isVideoOn, visionMode]
  )

  const setMobileVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && activeStream && isVideoOn) {
        node.srcObject = activeStream
        node.onloadedmetadata = () => node.play().catch(() => {})
      }
    },
    [activeStream, isVideoOn, visionMode]
  )

  const toggleSource = () => {
    if (!isSystemActive) return
    const nextMode = visionMode === 'camera' ? 'screen' : 'camera'
    startVision(nextMode)
  }

  const systemMetrics = [
    {
      icon: <RiCpuLine />,
      label: 'CPU',
      val: isSystemActive && stats ? `${stats.cpu}%` : '--',
      color: 'text-blue-400'
    },
    {
      icon: <FaMemory />,
      label: 'RAM',
      val: isSystemActive && stats ? `${stats.memory.usedPercentage}%` : '--',
      color: 'text-violet-400'
    },
    {
      icon: <GiTinker />,
      label: 'TEMP',
      val: isSystemActive && stats ? `${stats.temperature}°` : '--',
      color: 'text-amber-400'
    },
    {
      icon: <HiComputerDesktop />,
      label: 'OS',
      val: isSystemActive && stats ? `${stats.os.type}` : '--',
      color: 'text-emerald-400'
    }
  ]

  return (
    <div className="flex-1 p-3 grid grid-cols-12 gap-3 h-full overflow-hidden relative animate-in fade-in zoom-in duration-300 w-full">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex col-span-3 flex-col gap-3 h-full z-40">

        {/* Vision Feed Card */}
        <div className={`${glassPanel} h-[200px] shrink-0 flex flex-col overflow-hidden relative group`}>
          {/* Feed header badge */}
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
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-20"
            />
            {!isVideoOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-700">
                <RiCameraLine size={22} />
                <span className="text-[9px] font-mono tracking-widest">NO SIGNAL</span>
              </div>
            )}
          </div>
        </div>

        {/* Neural Uplink Status */}
        <div className={`${glassPanel} shrink-0 p-4`}>
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              <RiPulseLine
                size={12}
                className={isSystemActive ? 'text-violet-500 animate-pulse' : 'text-zinc-700'}
              />
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">WSS LATENCY</p>
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
                <RiWifiLine size={12} className={isSystemActive ? 'text-violet-500' : 'text-zinc-600'} />
                {isSystemActive ? '24ms' : '--'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 font-mono tracking-widest mb-0.5">HOST NODE</p>
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1 justify-end">
                {isSystemActive ? 'GEM-V2.5' : 'LOCAL'} <RiServerLine size={12} className="text-zinc-600" />
              </span>
            </div>
          </div>
          <div className="w-full h-[2px] bg-black/60 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full bg-violet-600/60 rounded-full transition-all duration-700 ${isSystemActive ? 'w-full animate-pulse' : 'w-0'}`}
            />
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className={`${glassPanel} flex-1 p-4 flex flex-col gap-3 min-h-0`}>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase border-b border-white/[0.05] pb-2.5">
            <RiLayoutGridLine size={12} />
            Core Metrics
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {systemMetrics.map((m, i) => (
              <div
                key={i}
                className="bg-white/[0.02] hover:bg-white/[0.04] rounded-xl p-3 flex flex-col justify-between border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 cursor-default"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm ${m.color}`}>{m.icon}</span>
                  <span className="text-[8px] font-mono text-zinc-600 tracking-widest">{m.label}</span>
                </div>
                <span className={`text-base font-bold ${m.color} tabular-nums`}>{m.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CENTER PANEL ── */}
      <div className="col-span-12 lg:col-span-6 relative flex flex-col items-center justify-center">
        {/* Mobile PiP video */}
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

        {/* 3D Sphere */}
        <div
          className={`w-[58vh] h-[58vh] max-w-full transition-all duration-1000 ${isSystemActive ? 'opacity-100 scale-100' : 'opacity-70 scale-90 grayscale'}`}
        >
          <Sphere />
        </div>

        {/* Control Dock */}
        <div className="absolute bottom-8 z-50">
          <div className="relative flex items-center gap-2 px-5 py-3 bg-[#09090e]/90 backdrop-blur-xl border border-white/[0.07] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
            {/* Camera / Vision toggle */}
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

            {/* Divider */}
            <div className="w-px h-6 bg-white/[0.06]" />

            {/* Main call button */}
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
              {isSystemActive && (
                <div className="absolute inset-0 rounded-xl animate-pulse-ring pointer-events-none" />
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-white/[0.06]" />

            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              title={isMicMuted ? 'Unmute' : 'Mute'}
              className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isMicMuted
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25'
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/15'
              }`}
            >
              {isMicMuted ? <RiMicOffLine size={18} /> : <RiMicLine size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Transcript ── */}
      <div className="hidden lg:flex col-span-3 flex-col overflow-hidden h-full z-40">
        <div className={`${glassPanel} h-full p-4 flex flex-col`}>
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3 mb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-zinc-500 uppercase">
              <RiTerminalBoxLine size={12} />
              Transcript
            </span>
            <span className="text-[9px] font-mono text-violet-500/40 tracking-widest">LIVE</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-small min-h-0">
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
                    {msg.parts && msg.parts[0] ? msg.parts[0].text : msg.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
