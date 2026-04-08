import React, { useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider
} from 'reactflow'
import { Tooltip } from 'react-tooltip'
import 'reactflow/dist/style.css'
import 'react-tooltip/dist/react-tooltip.css'
import ToolNode, { getIcon } from '../components/ToolNode'
import ParameterEditorDrawer from '../components/ParameterEditorDrawer'
import MacroManagementMenu from '../components/MacroManagementMenu'
import { RiSave3Line, RiLayoutColumnLine, RiLayoutColumnFill, RiAddLine, RiPlayFill, RiCheckLine } from 'react-icons/ri'

import { getMacroSequence } from '@renderer/code/macro-executor'
import {
  clickOnCoordinate,
  scrollScreen,
  setVolume,
  takeScreenshot
} from '@renderer/functions/keybaord-manager'
import { closeApp, openApp, performWebSearch } from '@renderer/functions/apps-manager-api'
import { scheduleWhatsAppMessage, sendWhatsAppMessage } from '@renderer/functions/whatsapp-manager-api'
import { runTerminal } from '@renderer/functions/coding-manager-api'
import { draftEmail, readEmails, sendEmail } from '@renderer/functions/gmail-manager-api'

const CATEGORIZED_TOOLS = {
  TRIGGERS: [
    { name: 'TRIGGER', description: 'Starts the workflow.', parameters: {} },
    { name: 'WAIT', description: 'Pauses execution.', parameters: { properties: { milliseconds: { type: 'NUMBER', description: 'Delay in ms (e.g. 2000)' } } } }
  ],
  SYSTEM: [
    { name: 'open_app', description: 'Launch desktop app.', parameters: { properties: { app_name: { type: 'STRING' } } } },
    { name: 'close_app', description: 'Force close an app.', parameters: { properties: { app_name: { type: 'STRING' } } } },
    { name: 'set_volume', description: 'Change system volume (0-100).', parameters: { properties: { level: { type: 'NUMBER' } } } }
  ],
  AUTOMATION: [
    { name: 'ghost_type', description: 'Type text via keyboard.', parameters: { properties: { text: { type: 'STRING' } } } },
    { name: 'press_shortcut', description: 'e.g. key: "c", modifiers: ["control"].', parameters: { properties: { key: { type: 'STRING' }, modifiers: { type: 'ARRAY', items: { type: 'STRING' } } } } },
    { name: 'click_on_screen', description: 'Click on specific X, Y coordinates.', parameters: { properties: { x: { type: 'NUMBER', description: 'X Coordinate (e.g. 960)' }, y: { type: 'NUMBER', description: 'Y Coordinate (e.g. 540)' } } } },
    { name: 'run_terminal', description: 'Execute CLI command.', parameters: { properties: { command: { type: 'STRING' }, path: { type: 'STRING' } } } }
  ],
  WEB_INTELLIGENCE: [
    { name: 'google_search', description: 'Open a URL or search.', parameters: { properties: { query: { type: 'STRING' } } } },
    { name: 'deep_research', description: 'AI Web scrape & Notion report.', parameters: { properties: { query: { type: 'STRING' } } } },
    { name: 'deploy_wormhole', description: 'Exposes local server port to the internet.', parameters: { properties: { port: { type: 'NUMBER', description: 'e.g. 3000' } } } },
    { name: 'close_wormhole', description: 'Closes the public wormhole.', parameters: {} }
  ],
  COMMUNICATION: [
    { name: 'send_email', description: 'Send an email instantly.', parameters: { properties: { to: { type: 'STRING' }, subject: { type: 'STRING' }, body: { type: 'STRING' } } } },
    { name: 'read_emails', description: 'Read latest unread emails.', parameters: { properties: { max_results: { type: 'NUMBER', description: 'Default is 5' } } } },
    { name: 'draft_email', description: 'Create an email draft.', parameters: { properties: { to: { type: 'STRING' }, subject: { type: 'STRING' }, body: { type: 'STRING' } } } }
  ],
  MOBILE_LINK: [
    { name: 'open_mobile_app', description: 'Requires Android package name.', parameters: { properties: { package_name: { type: 'STRING' } } } },
    { name: 'toggle_mobile_hardware', description: 'Toggle Wifi/Bluetooth.', parameters: { properties: { setting: { type: 'STRING' }, state: { type: 'BOOLEAN' } } } },
    { name: 'send_whatsapp', description: 'Send instant message.', parameters: { properties: { name: { type: 'STRING' }, message: { type: 'STRING' }, file_path: { type: 'STRING', description: 'Optional' } } } },
    { name: 'schedule_whatsapp', description: 'Schedule a WhatsApp message.', parameters: { properties: { name: { type: 'STRING' }, message: { type: 'STRING' }, delay_minutes: { type: 'NUMBER' }, file_path: { type: 'STRING', description: 'Optional' } } } }
  ]
}

const ALL_TOOLS = Object.values(CATEGORIZED_TOOLS).flat()
const nodeTypes = { customTool: ToolNode }

function Editor() {
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [workflowName, setWorkflowName] = useState('New IRIS Macro')
  const [description, setDescription] = useState('Custom Macro')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [saveFlash, setSaveFlash] = useState(false)

  const openParameterEditor = useCallback((nodeId: string) => setSelectedNodeId(nodeId), [])

  const loadMacroToCanvas = (macro: any) => {
    setWorkflowName(macro.name)
    setDescription(macro.description)
    const rehydratedNodes = (macro.nodes || []).map((node: any) => ({
      ...node,
      data: { ...node.data, openParameterEditor }
    }))
    setNodes(rehydratedNodes)
    setEdges(macro.edges || [])
    setIsSaved(true)
  }

  const resetCanvas = () => {
    setWorkflowName('New IRIS Macro')
    setDescription('Custom Macro')
    setNodes([])
    setEdges([])
    setIsSaved(false)
  }

  const updateNodeInputs = useCallback((nodeId: string, updatedInputs: any, updatedComment: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, inputs: updatedInputs, comment: updatedComment } }
        }
        return node
      })
    )
  }, [])

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), [])
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            animated: true,
            style: { stroke: '#7c3aed', strokeWidth: 2, filter: 'drop-shadow(0 0 4px rgba(124,58,237,0.6))' }
          },
          eds
        )
      ),
    []
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const toolName = event.dataTransfer.getData('application/reactflow')
      if (!toolName) return
      const toolSchema = ALL_TOOLS.find((t) => t.name === toolName)
      const position = { x: event.clientX - (isSidebarOpen ? 280 : 50), y: event.clientY - 100 }
      const newNode = {
        id: `${toolName}_${Date.now()}`,
        type: 'customTool',
        position,
        data: { tool: toolSchema, inputs: {}, comment: '', openParameterEditor }
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [openParameterEditor, isSidebarOpen]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const saveWorkflow = async () => {
    const sanitizedNodes = nodes.map((node) => {
      const cleanData = { ...node.data }
      delete cleanData.openParameterEditor
      return { ...node, data: cleanData }
    })
    try {
      const res = await (window as any).electron.ipcRenderer.invoke('save-workflow', {
        name: workflowName,
        description: description,
        nodes: sanitizedNodes,
        edges
      })
      if (res.success) {
        setIsSaved(true)
        setSaveFlash(true)
        setTimeout(() => setSaveFlash(false), 2000)
      }
    } catch (err) {}
  }

  const runMacroManually = async () => {
    await saveWorkflow()
    const macroRes = await getMacroSequence(workflowName)
    if (!macroRes.success) {
      alert(`❌ Execution Failed: ${macroRes.error}`)
      return
    }
    for (const step of macroRes.steps) {
      try {
        if (step.tool === 'TRIGGER' || step.tool === 'TRIGGER_VOICE') {
        } else if (step.tool === 'WAIT') {
          await new Promise((resolve) => setTimeout(resolve, Number(step.args.milliseconds) || 1000))
        } else if (step.tool === 'set_volume') {
          await setVolume(Number(step.args.level))
        } else if (step.tool === 'open_app') {
          await openApp(step.args.app_name)
        } else if (step.tool === 'close_app') {
          await closeApp(step.args.app_name)
        } else if (step.tool === 'send_whatsapp') {
          await sendWhatsAppMessage(step.args.name, step.args.message, step.args.file_path)
        } else if (step.tool === 'schedule_whatsapp') {
          await scheduleWhatsAppMessage(step.args.name, step.args.message, Number(step.args.delay_minutes), step.args.file_path)
        } else if (step.tool === 'google_search') {
          await performWebSearch(step.args.query)
        } else if (step.tool === 'run_terminal') {
          await runTerminal(step.args.command, step.args.path)
        } else if (step.tool === 'send_email') {
          await sendEmail(step.args.to, step.args.subject, step.args.body)
        } else if (step.tool === 'draft_email') {
          await draftEmail(step.args.to, step.args.subject, step.args.body)
        } else if (step.tool === 'read_emails') {
          await readEmails(Number(step.args.max_results) || 5)
        } else if (step.tool === 'deploy_wormhole') {
          await (window as any).electron.ipcRenderer.invoke('deploy-wormhole', Number(step.args.port))
        } else if (step.tool === 'close_wormhole') {
          await (window as any).electron.ipcRenderer.invoke('close-wormhole')
        } else if (step.tool === 'click_on_screen') {
          await clickOnCoordinate(Number(step.args.x), Number(step.args.y))
        } else if (step.tool === 'scroll_screen') {
          await scrollScreen(step.args.direction, Number(step.args.amount))
        } else if (step.tool === 'ghost_type') {
          await (window as any).electron.ipcRenderer.invoke('ghost-sequence', [{ type: 'type', text: step.args.text }])
        } else if (step.tool === 'press_shortcut') {
          let safeModifiers: string[] = []
          if (step.args.modifiers) {
            if (Array.isArray(step.args.modifiers)) {
              safeModifiers = step.args.modifiers
            } else if (typeof step.args.modifiers === 'string') {
              safeModifiers = step.args.modifiers.split(',').map((m: string) => m.trim()).filter(Boolean)
            }
          }
          await (window as any).electron.ipcRenderer.invoke('ghost-sequence', [{ type: 'press', key: step.args.key, modifiers: safeModifiers }])
        } else if (step.tool === 'take_screenshot') {
          await takeScreenshot()
        }
      } catch (stepError) {
        alert(`🔴 Macro Execution Halted! Failed at node: ${step.tool}`)
        break
      }
    }
  }

  return (
    <div className="flex h-full w-full bg-[#07070c] relative overflow-auto scrollbar-small">
      
      {/* ── Sidebar ── */}
      <div
        className={`fixed top-[52px] left-0 h-[calc(100vh-52px)] bg-[#0d0d14] border-r border-white/[0.05] flex flex-col gap-0 transition-all duration-300 ease-in-out z-40 mt-5 ${isSidebarOpen ? 'w-[268px] opacity-100' : 'w-0 opacity-0'}`}
      >
        {isSidebarOpen && (
          <div className="flex flex-col h-full overflow-auto scrollbar-small">
            {/* Sidebar Header */}
            <div className="px-4 py-4 border-b border-white/[0.05] shrink-0">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-violet-400/70 uppercase">
                Module Library
              </h2>
            </div>

            {/* Tool Categories */}
            <div className="p-3 flex flex-col gap-4 flex-1">
              {Object.entries(CATEGORIZED_TOOLS).map(([category, tools]) => (
                <div key={category}>
                  <h3 className="text-[9px] font-bold tracking-widest text-zinc-600 uppercase mb-2 px-1.5">
                    {category.replace(/_/g, ' ')}
                  </h3>
                  <div className="flex flex-col gap-1">
                    {tools.map((tool: any) => (
                      <div
                        key={tool.name}
                        className="flex items-center gap-2.5 p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-xl cursor-grab hover:border-violet-500/30 hover:bg-violet-500/[0.04] hover:border-l-[3px] hover:border-l-violet-500/50 transition-all duration-150 group"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('application/reactflow', tool.name)}
                      >
                        <div className="w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center border border-white/[0.05] shrink-0">
                          {getIcon(tool.name, 13)}
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-500 group-hover:text-zinc-200 tracking-wide transition-colors uppercase truncate">
                          {tool.name.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-50 bg-[#0d0d14] border border-white/[0.06] border-l-0 p-2 rounded-r-xl text-zinc-600 hover:text-violet-400 transition-all duration-150 hover:bg-violet-500/[0.06] ${isSidebarOpen ? 'left-[268px]' : 'left-0'}`}
      >
        {isSidebarOpen ? <RiLayoutColumnLine size={16} /> : <RiLayoutColumnFill size={16} />}
      </button>

      {/* ── Canvas Area ── */}
      <div
        className={`grow flex flex-col relative transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-[268px]' : 'ml-0'}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#0d0d14]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <button
            onClick={resetCanvas}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-600 hover:text-zinc-200 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-150 cursor-pointer"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="New Macro"
          >
            <RiAddLine size={15} />
          </button>

          <div className="w-px h-5 bg-white/[0.06]" />

          <MacroManagementMenu loadMacroToCanvas={loadMacroToCanvas} />

          <div className="w-px h-5 bg-white/[0.06]" />

          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent border-none outline-none text-[12px] text-zinc-200 font-semibold w-52 placeholder:text-zinc-700"
            placeholder="Macro name..."
          />

          <div className="w-px h-5 bg-white/[0.06]" />

          <button
            onClick={runMacroManually}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-violet-400 hover:bg-violet-600/15 hover:border-violet-500/30 text-[11px] font-semibold tracking-wide transition-all duration-150 cursor-pointer"
          >
            <RiPlayFill size={13} /> RUN
          </button>

          <button
            onClick={saveWorkflow}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer border ${
              saveFlash
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-violet-600/15 border-violet-500/25 text-violet-300 hover:bg-violet-600/25 hover:border-violet-500/40'
            }`}
          >
            {saveFlash ? <RiCheckLine size={13} /> : <RiSave3Line size={13} />}
            {saveFlash ? 'Saved' : 'Save'}
          </button>
        </div>

        {/* ReactFlow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          className="bg-[#07070c]"
        >
          <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
          <Controls className="react-flow__controls" />
        </ReactFlow>

        <Tooltip
          id="global-tooltip"
          place="top"
          style={{
            maxWidth: '220px',
            backgroundColor: '#0d0d14',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            fontSize: '11px',
            color: '#a1a1aa',
            zIndex: 100
          }}
        />

        {selectedNodeId && (
          <ParameterEditorDrawer
            nodeData={nodes.find((n) => n.id === selectedNodeId)}
            updateNodeInputs={updateNodeInputs}
            closeEditor={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function WorkFlowEditorView() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}
