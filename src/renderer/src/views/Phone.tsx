import { useState, useEffect, useRef } from 'react'
import { FaAndroid } from 'react-icons/fa6'
import {
  RiLinkM,
  RiWifiLine,
  RiSmartphoneLine,
  RiSignalWifi3Line,
  RiBattery2ChargeLine,
  RiDatabase2Line,
  RiShutDownLine,
  RiCameraLensLine,
  RiLockPasswordLine,
  RiSunLine,
  RiTerminalBoxLine,
  RiHome5Line,
  RiHistoryLine,
  RiAddLine
} from 'react-icons/ri'

const PhoneView = ({ glassPanel }: { glassPanel?: string }) => {
  const [ip, setIp] = useState(() => localStorage.getItem('iris_adb_ip') || '')
  const [port, setPort] = useState(() => localStorage.getItem('iris_adb_port') || '5555')
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [uiMode, setUiMode] = useState<'history' | 'manual'>('history')
  const [errorMsg, setErrorMsg] = useState('')
  const [deviceHistory, setDeviceHistory] = useState<any[]>([])

  const screenRef = useRef<HTMLImageElement>(null)
  const isStreaming = useRef(false)
  const knownNotifs = useRef<string[]>([])
  const hasAutoConnected = useRef(false)

  const [telemetry, setTelemetry] = useState({
    model: 'UNKNOWN DEVICE',
    os: 'ANDROID --',
    battery: { level: 0, isCharging: false, temp: '0.0' },
    storage: { used: '0 GB', total: '0 GB TOTAL', percent: 0 }
  })

  useEffect(() => {
    window.electron.ipcRenderer.invoke('adb-get-history').then((data) => {
      setDeviceHistory(data)
      if (data.length > 0 && !hasAutoConnected.current) {
        hasAutoConnected.current = true
        const lastDevice = data[data.length - 1]
        if (lastDevice && lastDevice.ip) {
          setIp(lastDevice.ip)
          setPort(lastDevice.port)
          connectToDevice(lastDevice.ip, lastDevice.port)
        }
      }
    })
  }, [])

  const checkNotifications = async () => {
    try {
      const res = await window.electron.ipcRenderer.invoke('adb-get-notifications')
      if (res.success && res.data) {
        const currentNotifs: string[] = res.data
        if (knownNotifs.current.length === 0) {
          knownNotifs.current = currentNotifs
          return
        }
        const newNotifs = currentNotifs.filter((n) => !knownNotifs.current.includes(n))
        if (newNotifs.length > 0) {
          window.dispatchEvent(
            new CustomEvent('ai-force-speak', {
              detail: `System Alert: The user just received a new mobile notification. Announce it out loud briefly: "${newNotifs[0]}"`
            })
          )
          knownNotifs.current = currentNotifs
        }
      }
    } catch (e) {}
  }

  const connectToDevice = async (targetIp: string, targetPort: string) => {
    if (!targetIp || !targetPort) return setErrorMsg('IP and Port are required.')
    setStatus('connecting')
    setErrorMsg('')
    try {
      const res = await window.electron.ipcRenderer.invoke('adb-connect', { ip: targetIp, port: targetPort })
      if (res.success) {
        setStatus('connected')
        isStreaming.current = true
        fetchTelemetry()
        startScreenStream()
      } else {
        setStatus('idle')
        setErrorMsg('Device offline. Is Wi-Fi on and screen unlocked?')
      }
    } catch (e) {
      setStatus('idle')
      setErrorMsg('Electron IPC Error.')
    }
  }

  const handleManualConnect = () => {
    localStorage.setItem('iris_adb_ip', ip)
    localStorage.setItem('iris_adb_port', port)
    connectToDevice(ip, port)
  }

  const handleDisconnect = async () => {
    isStreaming.current = false
    try {
      await window.electron.ipcRenderer.invoke('adb-disconnect')
    } catch (e) {}
    setStatus('idle')
    if (screenRef.current) screenRef.current.src = ''
  }

  const executeQuickCommand = async (action: 'camera' | 'wake' | 'lock' | 'home') => {
    try {
      await window.electron.ipcRenderer.invoke('adb-quick-action', { action })
    } catch (e) {}
  }

  const fetchTelemetry = async () => {
    try {
      const res = await window.electron.ipcRenderer.invoke('adb-telemetry')
      if (res.success) setTelemetry(res.data)
    } catch (e) {}
  }

  const startScreenStream = async () => {
    if (!isStreaming.current) return
    try {
      const res = await window.electron.ipcRenderer.invoke('adb-screenshot')
      if (res.success && res.image && screenRef.current) {
        screenRef.current.src = res.image
      }
    } catch (e) {}
    if (isStreaming.current) requestAnimationFrame(startScreenStream)
  }

  useEffect(() => {
    let interval: any
    if (status === 'connected') {
      interval = setInterval(() => {
        fetchTelemetry()
        checkNotifications()
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [status])

  /* ── DEVICE HISTORY VIEW ── */
  if (status !== 'connected' && uiMode === 'history') {
    return (
      <div className="flex-1 flex flex-col items-center justify-start pt-12 p-8 bg-[#040407] min-h-screen text-zinc-100 overflow-y-auto scrollbar-small animate-in fade-in duration-300">
        <div className="w-full max-w-5xl flex flex-col items-center">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-14">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-5">
              <RiHistoryLine className="text-violet-400" size={26} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Device Archive</h1>
            <p className="text-[11px] text-zinc-500 font-mono tracking-widest mt-2 uppercase">
              Select a target device for uplink
            </p>
          </div>

          {/* Device Cards */}
          <div className="flex flex-wrap justify-center gap-8">
            {deviceHistory.map((dev, i) => (
              <button
                key={i}
                onClick={() => connectToDevice(dev.ip, dev.port)}
                className="w-52 h-[420px] bg-[#0a0a0f] border-[6px] border-[#1a1a22] hover:border-violet-800/40 rounded-[2.8rem] relative flex flex-col p-1.5 group transition-all duration-400 shadow-2xl hover:shadow-[0_0_48px_rgba(124,58,237,0.15)]"
              >
                {/* Notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a22] rounded-full z-20 group-hover:bg-violet-900/50 transition-colors" />

                <div className="flex-1 bg-gradient-to-b from-[#111118] to-[#09090e] rounded-[2.3rem] overflow-hidden flex flex-col items-center justify-center p-6 relative">
                  <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/[0.06] transition-all duration-400 rounded-[2.3rem]" />
                  <RiSmartphoneLine
                    size={56}
                    className="text-zinc-700 group-hover:text-violet-500 mb-5 transition-all duration-400"
                  />
                  <h3 className="text-[13px] font-bold text-white mb-2 tracking-wide text-center z-10 truncate w-full px-2">
                    {dev.model}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-600 group-hover:text-violet-400/70 z-10 transition-colors">
                    <RiWifiLine size={10} /> {dev.ip}:{dev.port}
                  </div>
                  <div className="mt-7 px-6 py-2 border border-zinc-700/60 group-hover:border-violet-500/50 group-hover:bg-violet-600 text-zinc-500 group-hover:text-white font-semibold text-[10px] tracking-widest rounded-full transition-all duration-300 z-10">
                    {status === 'connecting' && ip === dev.ip ? 'LINKING...' : 'CONNECT'}
                  </div>
                </div>
              </button>
            ))}

            {/* Add New Device */}
            <button
              onClick={() => setUiMode('manual')}
              className="w-52 h-[420px] bg-transparent border-[3px] border-dashed border-zinc-800 hover:border-violet-500/40 rounded-[2.8rem] flex flex-col items-center justify-center group transition-all duration-300 hover:bg-violet-600/[0.03]"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#0d0d14] group-hover:bg-violet-600 flex items-center justify-center text-zinc-600 group-hover:text-white transition-all duration-300 border border-zinc-800 group-hover:border-violet-500/50 mb-4">
                <RiAddLine size={26} />
              </div>
              <span className="text-[11px] font-semibold text-zinc-600 group-hover:text-violet-400 tracking-wide transition-colors">
                New Device
              </span>
            </button>
          </div>

          {errorMsg && (
            <div className="mt-10 p-4 bg-red-500/8 border border-red-500/20 text-red-400 font-mono text-[11px] rounded-xl">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ── MANUAL CONNECT VIEW ── */
  if (status !== 'connected' && uiMode === 'manual') {
    return (
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 p-8 bg-[#040407] min-h-screen text-zinc-100 animate-in fade-in duration-300">
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Card Header */}
          <div className="p-5 bg-[#0d0d14] border border-white/[0.06] rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                <FaAndroid className="text-violet-400" size={18} />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-white">Connect Device</h2>
                <p className="text-[9px] text-violet-400/60 font-mono tracking-wider">WIRELESS ADB</p>
              </div>
            </div>
            {deviceHistory.length > 0 && (
              <button
                onClick={() => setUiMode('history')}
                className="text-[10px] font-semibold tracking-widest text-violet-400 hover:text-violet-300 bg-violet-500/8 hover:bg-violet-500/15 px-3 py-1.5 border border-violet-500/20 rounded-lg transition-all"
              >
                ARCHIVE
              </button>
            )}
          </div>

          {/* Form */}
          <div className="p-6 bg-[#0d0d14] border border-white/[0.06] rounded-2xl flex flex-col gap-5">
            {errorMsg && (
              <div className="p-3 bg-red-500/8 border border-red-500/20 text-red-400 text-[11px] rounded-xl font-mono">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 tracking-widest mb-2 block uppercase font-mono">
                IP Address
              </label>
              <div className="flex items-center bg-[#040407] border border-white/[0.07] rounded-xl px-4 py-3 focus-within:border-violet-500/40 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] transition-all">
                <RiWifiLine className="text-violet-500 mr-3" size={16} />
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.1.xxx"
                  className="bg-transparent border-none outline-none text-[13px] text-zinc-200 w-full font-mono placeholder:text-zinc-700"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 tracking-widest mb-2 block uppercase font-mono">
                Port
              </label>
              <div className="flex items-center bg-[#040407] border border-white/[0.07] rounded-xl px-4 py-3 focus-within:border-violet-500/40 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)] transition-all">
                <RiLinkM className="text-violet-500 mr-3" size={16} />
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="5555"
                  className="bg-transparent border-none outline-none text-[13px] text-zinc-200 w-full font-mono placeholder:text-zinc-700"
                />
              </div>
            </div>
            <button
              onClick={handleManualConnect}
              disabled={status === 'connecting'}
              className="w-full py-3 bg-violet-600/15 border border-violet-500/25 hover:bg-violet-600/25 hover:border-violet-500/40 text-violet-300 font-semibold rounded-xl tracking-wide transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none"
            >
              {status === 'connecting' ? 'Connecting...' : 'Connect Securely'}
            </button>
          </div>
        </div>

        {/* Phone Mockup */}
        <div className="w-full lg:w-auto flex justify-center py-4">
          <div className="w-64 h-[500px] bg-[#09090e] rounded-[3rem] border-8 border-[#1a1a22] shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1a22] rounded-b-2xl z-20" />
            <div className="flex-1 bg-gradient-to-b from-violet-950/20 to-black p-6 flex flex-col items-center justify-center">
              <RiSmartphoneLine size={52} className="text-violet-900/60 animate-pulse" />
              <p className="text-[9px] font-mono text-violet-900/60 mt-4 tracking-widest">AWAITING TARGET</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── CONNECTED VIEW ── */
  return (
    <div className="flex-1 flex flex-col lg:flex-row items-start justify-center gap-8 p-8 bg-[#040407] min-h-screen animate-in fade-in duration-300 overflow-y-auto scrollbar-small">
      {/* Telemetry */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
            <RiSmartphoneLine className="text-violet-400" size={18} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-white tracking-wide">{telemetry.model}</h2>
            <p className="text-[9px] text-zinc-600 font-mono tracking-widest uppercase">{telemetry.os}</p>
          </div>
        </div>

        <div className="flex justify-between text-[9px] font-mono border-b border-white/[0.05] pb-3">
          <span className="text-cyan-500/80">UPTIME: LIVE</span>
          <span className="text-amber-500/80">TEMP: {telemetry.battery.temp}°C</span>
        </div>

        {/* Metric Cards */}
        {[
          {
            label: 'NETWORK',
            icon: <RiSignalWifi3Line className="text-violet-400" />,
            value: 'ACTIVE',
            sub: 'TCP/IP BRIDGE',
            bar: null
          },
          {
            label: 'BATTERY',
            icon: <RiBattery2ChargeLine className="text-emerald-400" />,
            value: `${telemetry.battery.level}%`,
            sub: telemetry.battery.isCharging ? 'CHARGING' : 'DISCHARGING',
            bar: { pct: telemetry.battery.level, color: 'bg-emerald-500' }
          },
          {
            label: 'STORAGE',
            icon: <RiDatabase2Line className="text-amber-400" />,
            value: telemetry.storage.used,
            sub: telemetry.storage.total,
            bar: { pct: telemetry.storage.percent, color: 'bg-amber-500' }
          }
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-5 hover:border-violet-500/20 transition-all duration-200"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-bold text-zinc-600 tracking-widest">{card.label}</span>
              <span className="text-base">{card.icon}</span>
            </div>
            <h4 className="text-2xl font-bold text-white leading-none mb-1">{card.value}</h4>
            <span className="text-[9px] font-mono text-zinc-600">{card.sub}</span>
            {card.bar && (
              <div className="w-full bg-zinc-900 rounded-full h-1 overflow-hidden mt-3">
                <div
                  className={`${card.bar.color} h-1 rounded-full transition-all duration-500`}
                  style={{ width: `${card.bar.pct}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Phone Screen */}
      <div className="flex justify-center shrink-0">
        <div className="w-72 h-[580px] bg-black rounded-[3rem] border-10 border-[#1a1a1a] shadow-[0_0_60px_rgba(124,58,237,0.08)] relative overflow-hidden flex flex-col">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-7 bg-[#111] rounded-full z-20 flex items-center justify-end px-3 gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500/40" />
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          </div>
          <img ref={screenRef} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]" />
        </div>
      </div>

      {/* Controls */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-5 h-full">
          <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <RiTerminalBoxLine className="text-violet-400" size={15} />
            </div>
            <div>
              <h3 className="text-[12px] font-semibold text-white tracking-wide">System Controls</h3>
              <span className="text-[9px] text-violet-400/50 font-mono">UPLINK SECURED</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { action: 'camera' as const, icon: <RiCameraLensLine size={22} />, label: 'Camera' },
              { action: 'lock' as const, icon: <RiLockPasswordLine size={22} />, label: 'Lock' },
              { action: 'wake' as const, icon: <RiSunLine size={22} />, label: 'Wake' },
              { action: 'home' as const, icon: <RiHome5Line size={22} />, label: 'Home' }
            ].map(({ action, icon, label }) => (
              <button
                key={action}
                onClick={() => executeQuickCommand(action)}
                className="group flex flex-col items-center justify-center gap-2.5 py-5 bg-white/[0.02] border border-white/[0.05] hover:border-violet-500/25 hover:bg-violet-500/[0.05] rounded-2xl transition-all duration-200"
              >
                <span className="text-zinc-600 group-hover:text-violet-400 transition-colors">{icon}</span>
                <span className="text-[10px] font-semibold text-zinc-500 group-hover:text-zinc-300 tracking-wide transition-colors">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-violet-500/[0.04] border border-violet-500/10 rounded-xl">
            <p className="text-[9px] text-violet-400/50 font-mono leading-relaxed text-center">
              IRIS neural voice interface active. Command execution ready.
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full py-3.5 bg-red-500/8 hover:bg-red-500 text-red-400 hover:text-white font-semibold rounded-xl tracking-wide transition-all duration-300 border border-red-500/20 hover:border-red-500 flex items-center justify-center gap-2.5 mt-auto"
          >
            <RiShutDownLine size={16} /> Disconnect
          </button>
        </div>
      </div>
    </div>
  )
}

export default PhoneView
