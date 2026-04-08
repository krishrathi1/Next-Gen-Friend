import { useState, useEffect, useRef } from 'react'
import {
  RiMicLine,
  RiMicOffLine,
  RiComputerLine,
  RiCameraLine,
  RiFullscreenLine,
  RiDragMove2Fill
} from 'react-icons/ri'
import { GiPowerButton } from 'react-icons/gi'
import { irisService } from '@renderer/services/Iris-voice-ai'
import { VisionMode } from '@renderer/IndexRoot'

interface OverlayProps {
  isSystemActive: boolean
  toggleSystem: () => void
  isMicMuted: boolean
  toggleMic: () => void
  isVideoOn: boolean
  visionMode: VisionMode
  startVision: (mode: 'camera' | 'screen') => void
  stopVision: () => void
}

const MiniOverlay = ({
  isSystemActive,
  toggleSystem,
  isMicMuted,
  toggleMic,
  isVideoOn,
  visionMode,
  startVision,
  stopVision
}: OverlayProps) => {
  const [isTalking, setIsTalking] = useState(false)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (isSystemActive && irisService.analyser) {
      analyzerRef.current = irisService.analyser
      dataArrayRef.current = new Uint8Array(irisService.analyser.frequencyBinCount)
      const checkAudio = () => {
        if (analyzerRef.current && dataArrayRef.current) {
          analyzerRef.current.getByteFrequencyData(dataArrayRef.current)
          const avg = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length
          setIsTalking(avg > 10)
        }
        if (isSystemActive) requestAnimationFrame(checkAudio)
      }
      checkAudio()
    } else {
      setIsTalking(false)
    }
  }, [isSystemActive])

  const handleVisionClick = (mode: 'camera' | 'screen') => {
    if (isVideoOn && visionMode === mode) {
      stopVision()
    } else {
      startVision(mode)
    }
  }

  const expand = () => {
    window.electron.ipcRenderer.send('toggle-overlay')
  }

  return (
    /*
     * FIX: Removed `backdrop-blur-2xl` — causes black-rectangle artifacts
     * in Electron transparent windows on Windows (Chromium compositing bug).
     * Removed `shadow-[0_8px_30px_...]` — window bounds == pill bounds so
     * the shadow had nowhere to render and showed as black blobs at the edges.
     * Background bumped to bg-zinc-950 (fully opaque) to compensate.
     */
    <div className="mini-overlay-shell drag-region relative w-full h-full flex items-center justify-between px-3 bg-zinc-950 rounded-[999px] border border-purple-700/40 overflow-hidden">

      {/* Left ambient glow */}
      <div className="pointer-events-none absolute inset-y-1 left-1 w-20 rounded-l-full bg-[radial-gradient(circle_at_left,rgba(168,85,247,0.22),transparent_70%)]" />
      {/* Right ambient glow */}
      <div className="pointer-events-none absolute inset-y-1 right-1 w-20 rounded-r-full bg-[radial-gradient(circle_at_right,rgba(45,212,191,0.15),transparent_70%)]" />

      {/* ── Left — Status dot + audio bars ── */}
      <div className="flex items-center gap-3 no-drag relative z-10">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
            isSystemActive
              ? isTalking
                ? 'border-purple-500 bg-purple-500/15 shadow-[0_0_14px_rgba(139,92,246,0.5)]'
                : 'border-purple-700/60 bg-purple-900/20'
              : 'border-zinc-700 bg-zinc-900'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              isSystemActive ? (isTalking ? 'bg-purple-300' : 'bg-purple-500') : 'bg-red-900'
            }`}
          />
        </div>

        {/* Audio level bars */}
        <div className="hidden sm:flex items-end gap-0.5 h-4">
          {[1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className={`w-1 rounded-full transition-all duration-300 ${
                isSystemActive ? 'bg-purple-500/80' : 'bg-zinc-700'
              }`}
              style={{
                height: isSystemActive ? `${6 + bar * (isTalking ? 2 : 1)}px` : '4px',
                opacity: isSystemActive ? 1 : 0.45
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Center — Controls ── */}
      <div className="flex items-center gap-2 no-drag relative z-10">
        {/* Mic */}
        <button
          onClick={toggleMic}
          disabled={!isSystemActive}
          className={`p-2.5 rounded-full transition-all duration-200 ml-1 hover:scale-105 active:scale-95 ${
            !isSystemActive
              ? 'opacity-30'
              : isMicMuted
                ? 'text-red-500 bg-red-500/10'
                : 'text-purple-400 bg-purple-700/20'
          }`}
        >
          {isMicMuted ? <RiMicOffLine size={18} /> : <RiMicLine size={18} />}
        </button>

        {/* Power */}
        <button
          onClick={toggleSystem}
          className={`p-3 rounded-full border transition-all duration-500 mx-1 hover:scale-105 active:scale-95 ${
            isSystemActive
              ? 'bg-purple-700/25 border-purple-500 text-purple-300'
              : 'bg-zinc-800 border-zinc-600 text-zinc-500 hover:text-red-400'
          }`}
        >
          <GiPowerButton size={20} className={isSystemActive ? 'animate-pulse' : ''} />
        </button>

        {/* Camera */}
        <button
          onClick={() => handleVisionClick('camera')}
          disabled={!isSystemActive}
          title="Toggle Camera"
          className={`p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
            !isSystemActive
              ? 'opacity-30'
              : isVideoOn && visionMode === 'camera'
                ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <RiCameraLine size={18} />
        </button>

        {/* Screen */}
        <button
          onClick={() => handleVisionClick('screen')}
          disabled={!isSystemActive}
          title="Toggle Screen"
          className={`p-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${
            !isSystemActive
              ? 'opacity-30'
              : isVideoOn && visionMode === 'screen'
                ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <RiComputerLine size={18} />
        </button>
      </div>

      {/* ── Right — Expand + Drag ── */}
      <div className="pl-3 border-l border-purple-800/20 no-drag flex items-center gap-2 relative z-10">
        <button
          onClick={expand}
          title="Expand"
          className="p-2 rounded-full text-zinc-500 hover:text-purple-400 hover:bg-purple-800/10 transition-all duration-150"
        >
          <RiFullscreenLine size={16} />
        </button>
        <div className="drag-region cursor-move text-purple-800/40">
          <RiDragMove2Fill size={14} />
        </div>
      </div>
    </div>
  )
}

export default MiniOverlay
