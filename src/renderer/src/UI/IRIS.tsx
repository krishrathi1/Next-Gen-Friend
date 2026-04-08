import { useState, useEffect, Suspense, lazy, useRef } from 'react'
import {
  RiWifiLine,
  RiShieldFlashLine,
  RiLayoutGridLine,
  RiBrainLine,
  RiFolderOpenLine,
  RiPhoneLine,
  RiSettings4Line,
  RiBatteryChargeLine,
  RiCameraLine,
  RiComputerLine,
  RiCloseLine,
  RiImageLine
} from 'react-icons/ri'
import { getSystemStatus } from '@renderer/services/system-info'
import { getHistory } from '@renderer/services/iris-ai-brain'
import ViewSkeleton from '@renderer/components/ViewSkelrton'

import DashboardView from '../views/Dashboard'
import PhoneView from '../views/Phone'
import { VisionMode } from '@renderer/IndexRoot'

const WorkFlowEditorView = lazy(() => import('../views/WorkFlowEditor'))
const NotesView = lazy(() => import('../views/Notes'))
const SettingsView = lazy(() => import('../views/Settings'))
const GalleryView = lazy(() => import('../views/Gallery'))

interface EliProps {
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

const TABS = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: <RiLayoutGridLine size={14} /> },
  { id: 'Macros', label: 'Macros', icon: <RiBrainLine size={14} /> },
  { id: 'NOTES', label: 'Notes', icon: <RiFolderOpenLine size={14} /> },
  { id: 'GALLERY', label: 'Gallery', icon: <RiImageLine size={14} /> },
  { id: 'PHONE', label: 'Phone', icon: <RiPhoneLine size={14} /> },
  { id: 'SETTINGS', label: 'Settings', icon: <RiSettings4Line size={14} /> }
]

const glassPanel = 'bg-zinc-950/50 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-xl'

const ELI = (props: EliProps) => {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [stats, setStats] = useState<any>(null)
  const [time, setTime] = useState<Date>(new Date())
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [showSourceModal, setShowSourceModal] = useState(false)
  const lastHistorySigRef = useRef('')

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    const statsTimer = setInterval(() => {
      getSystemStatus().then(setStats)
    }, 2000)

    getSystemStatus().then(setStats)

    return () => {
      clearInterval(clockTimer)
      clearInterval(statsTimer)
    }
  }, [])

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getHistory()
      if (!Array.isArray(history)) return
      const trimmed = history.slice(-15)
      const signature = JSON.stringify(trimmed)
      if (signature !== lastHistorySigRef.current) {
        lastHistorySigRef.current = signature
        setChatHistory(trimmed)
      }
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 1200)
    return () => clearInterval(interval)
  }, [])

  const handleVisionClick = () => {
    if (props.isVideoOn) {
      props.stopVision()
    } else {
      setShowSourceModal(true)
    }
  }

  return (
    <div className="h-screen w-full bg-[#040407] text-zinc-100 font-sans overflow-hidden select-none flex flex-col relative pb-5">
      
      {/* ── Top Navigation Bar ── */}
      <div className="h-[52px] w-full flex items-center justify-between px-4 bg-[#07070d]/90 border-b border-white/[0.05] z-50 backdrop-blur-xl shrink-0">
        
        {/* Logo */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-7 h-7">
            <div className="absolute w-full h-full rounded-lg bg-violet-600/10 border border-violet-500/20" />
            <RiShieldFlashLine className="text-violet-400 relative z-10" size={16} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold tracking-[0.15em] text-[13px] text-white">ELI AI</span>
            <span className="text-[9px] font-medium text-violet-400/50 tracking-[0.2em] uppercase">
              Neural Interface
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="hidden md:flex gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative cursor-pointer px-4 py-1.5 text-[11px] font-semibold tracking-wide rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-violet-600/15 text-violet-300 border border-violet-500/20 shadow-[0_0_12px_rgba(124,58,237,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <span className={`transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-600'}`}>
                  {tab.icon}
                </span>
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-violet-500/60" />
                )}
              </button>
            )
          })}
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-violet-400/60">
            <RiWifiLine size={12} />
            <span className="hidden sm:block tracking-wide">LINKED</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-600">
            <RiBatteryChargeLine size={12} />
            <span>100%</span>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-hidden relative bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.04)_0%,transparent_60%)]">
        <div className={`absolute inset-0 ${activeTab === 'DASHBOARD' ? 'block' : 'hidden'}`}>
          <DashboardView
            props={props}
            stats={stats}
            chatHistory={chatHistory}
            onVisionClick={handleVisionClick}
          />
        </div>

        <div className={`absolute inset-0 ${activeTab === 'PHONE' ? 'block' : 'hidden'}`}>
          <PhoneView glassPanel={glassPanel} />
        </div>

        <Suspense fallback={<ViewSkeleton />}>
          {activeTab === 'Macros' && <WorkFlowEditorView />}
          {activeTab === 'NOTES' && <NotesView glassPanel={glassPanel} />}
          {activeTab === 'SETTINGS' && <SettingsView isSystemActive={props.isSystemActive} />}
          {activeTab === 'GALLERY' && <GalleryView />}
        </Suspense>
      </div>

      {/* ── Vision Source Modal ── */}
      {showSourceModal && (
        <div
          className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-float-up"
          onClick={() => setShowSourceModal(false)}
        >
          <div
            className={`${glassPanel} w-[380px] border-violet-500/15 flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)] rounded-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.7)]" />
                <span className="text-[11px] font-semibold tracking-widest text-violet-300 uppercase">
                  Select Vision Source
                </span>
              </div>
              <button
                onClick={() => setShowSourceModal(false)}
                className="cursor-pointer w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <RiCloseLine size={16} />
              </button>
            </div>

            {/* Modal Options */}
            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  props.startVision('camera')
                  setShowSourceModal(false)
                }}
                className="cursor-pointer group flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/[0.06] transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-900 border border-white/[0.06] group-hover:bg-violet-600 group-hover:border-violet-500/50 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] text-zinc-400 group-hover:text-white transition-all duration-200">
                  <RiCameraLine size={22} />
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-violet-300 tracking-wide transition-colors">
                  Camera Feed
                </span>
              </button>

              <button
                onClick={() => {
                  props.startVision('screen')
                  setShowSourceModal(false)
                }}
                className="cursor-pointer group flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/[0.06] transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-zinc-900 border border-white/[0.06] group-hover:bg-violet-600 group-hover:border-violet-500/50 group-hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] text-zinc-400 group-hover:text-white transition-all duration-200">
                  <RiComputerLine size={22} />
                </div>
                <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-violet-300 tracking-wide transition-colors">
                  Screen Share
                </span>
              </button>
            </div>

            <div className="px-4 pb-4">
              <p className="text-center text-[10px] text-zinc-600 font-mono tracking-wider">
                Select input source for neural visual processing
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ELI
