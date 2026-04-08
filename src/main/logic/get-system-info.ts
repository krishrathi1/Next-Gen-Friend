import { IpcMain } from 'electron'
import os from 'os'
import { exec } from 'child_process'

const runCommand = (cmd: string): Promise<string> => {
  return new Promise((resolve) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
      if (error) {
      }
      resolve(stdout ? stdout.trim() : '')
    })
  })
}

let cpuLastSnapshot = os.cpus()
let cachedTemperatureC: number | null = null
let cachedTemperatureAt = 0

const getSystemTemperature = async (): Promise<number | null> => {
  const now = Date.now()
  if (now - cachedTemperatureAt < 10000) {
    return cachedTemperatureC
  }

  cachedTemperatureAt = now
  if (os.platform() !== 'win32') {
    cachedTemperatureC = null
    return cachedTemperatureC
  }

  // Try CIM first (modern), then WMI (legacy)
  const command =
    'powershell "$t = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue; if($t){$t.CurrentTemperature} else {(Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace root/wmi).CurrentTemperature}"'
  
  const output = await runCommand(command)
  const lines = output.split('\n').filter(l => l.trim())
  const rawValue = lines.length > 0 ? Number(lines[0]) : NaN

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    // Last resort: If we absolutely can't get it, but CPU is high, maybe mock a reasonable range (35-65) 
    // to keep the UI alive, but let's try to stay honest for now.
    // If it's still null, we'll try a different common thermal zone property
    cachedTemperatureC = null
    return cachedTemperatureC
  }

  cachedTemperatureC = Math.round(rawValue / 10 - 273.15)
  return cachedTemperatureC
}

function getSystemCpuUsage() {
  const cpus = os.cpus()
  let idle = 0
  let total = 0
  for (let i = 0; i < cpus.length; i++) {
    const cpu = cpus[i]
    const prevCpu = cpuLastSnapshot[i]
    let currentTotal = 0
    for (const type in cpu.times) currentTotal += cpu.times[type]
    let prevTotal = 0
    for (const type in prevCpu.times) prevTotal += prevCpu.times[type]
    idle += cpu.times.idle - prevCpu.times.idle
    total += currentTotal - prevTotal
  }
  cpuLastSnapshot = cpus
  return total === 0 ? '0.0' : (((total - idle) / total) * 100).toFixed(1)
}

async function getGpuUsage() {
  try {
    const cmd = `powershell "((Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples | Measure-Object -Property CookedValue -Sum).Sum"`
    const output = await runCommand(cmd)
    const val = parseFloat(output)
    return isNaN(val) ? '0.0' : val.toFixed(1)
  } catch {
    return '0.0'
  }
}

export default function registerSystemHandlers(ipcMain: IpcMain) {

  ipcMain.removeHandler('get-installed-apps')
  ipcMain.handle('get-installed-apps', async () => {
    try {
      if (os.platform() !== 'win32') return []

      const cmd = `powershell "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json -Depth 1"`

      const jsonOutput = await runCommand(cmd)

      if (!jsonOutput) return []

      let rawData
      try {
        rawData = JSON.parse(jsonOutput)
      } catch (parseError) {
        return []
      }

      const appsArray = Array.isArray(rawData) ? rawData : [rawData]

      return appsArray
        .filter((a: any) => a && a.Name && a.AppID) 
        .map((a: any) => ({
          name: a.Name.trim(),
          id: a.AppID.trim()
        }))
        .sort((a, b) => a.name.localeCompare(b.name)) 
    } catch (e) {
      return []
    }
  })

  ipcMain.removeHandler('get-system-stats')
  ipcMain.handle('get-system-stats', async () => {
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    
    // Fetch dynamic stats in parallel
    const [temperature, gpu] = await Promise.all([
      getSystemTemperature(),
      getGpuUsage()
    ])

    return {
      cpu: getSystemCpuUsage(),
      gpu,
      memory: {
        total: (totalMem / 1024 ** 3).toFixed(1) + ' GB',
        free: (freeMem / 1024 ** 3).toFixed(1) + ' GB',
        usedPercentage: (((totalMem - freeMem) / totalMem) * 100).toFixed(1)
      },
      temperature,
      os: {
        type: 'Windows 11',
        uptime: (os.uptime() / 3600).toFixed(1) + 'h'
      }
    }
  })

  ipcMain.removeHandler('get-drives')
  ipcMain.handle('get-drives', async () => {
    try {
      const cmd = `powershell "Get-PSDrive -PSProvider FileSystem | Select-Object Name, @{N='FreeGB';E={[math]::round($_.Free/1GB, 2)}}, @{N='TotalGB';E={[math]::round(($_.Used + $_.Free)/1GB, 2)}} | ConvertTo-Json"`
      const output = await runCommand(cmd)
      return output ? JSON.parse(output) : []
    } catch (e) {
      return []
    }
  })
}
