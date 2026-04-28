import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  Legend, ScatterChart, Scatter, ZAxis, CartesianGrid
} from 'recharts';
import { 
  X, BarChart2, Database, Layers, Sparkles, 
  ArrowRight, Shield, Cpu, ExternalLink, Activity,
  Zap, Target, Globe
} from 'lucide-react';
import { speechModels, SpeechModel } from '../data/speechModels';
import collectedData from '../data/collected_speech_data.json';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: p.color || p.fill }}>
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SpeechComparisonWidget = () => {
  const [selectedModel, setSelectedModel] = useState<SpeechModel | null>(null);
  const [activeTab, setActiveTab] = useState<'performance' | 'raw_vs_ft' | 'cleaning' | 'details'>('performance');

  // Graph Data 1: Radar Chart (Capabilities)
  const radarData = speechModels.map(m => ({
    name: m.name.split(' ')[0],
    Accuracy: 10 - (m.wer_finetuned / 2),
    Latency: 10 - (m.latency_ms / 50),
    Versatility: m.versatility,
    Robustness: m.robustness,
    Throughput: 10 - (m.rtf * 10)
  }));

  // Graph Data 2: WER Comparison (Base vs Fine-tuned)
  const werData = speechModels.map(m => ({
    name: m.name.split(' ')[0],
    Base: m.wer_base,
    FineTuned: m.wer_finetuned
  }));

  // Graph Data 3: Latency vs Robustness Scatter
  const scatterData = speechModels.map(m => ({
    name: m.name,
    latency: m.latency_ms,
    robustness: m.robustness,
    size: m.sizeMB / 100
  }));

  const closeWidget = () => {
    window.dispatchEvent(new CustomEvent('speech-comparison-close'));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-4 z-50 flex flex-col bg-zinc-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-8 border-b border-white/5">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl shadow-lg shadow-violet-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Neural Speech Analytics</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">Production-Level Model Intelligence</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
            {(['performance', 'raw_vs_ft', 'cleaning', 'details'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                  activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab.replace(/_/g, ' ').toUpperCase()}
              </button>
            ))}
          </nav>
          <button 
            onClick={closeWidget}
            className="p-3 hover:bg-white/10 rounded-full transition-all text-zinc-500 hover:text-white border border-transparent hover:border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        <AnimatePresence mode="wait">
          {activeTab === 'performance' && (
            <motion.div 
              key="performance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-10"
            >
              {/* Radar Chart: Intelligence Profile */}
              <div className="lg:col-span-2 bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Target className="w-32 h-32 text-white" />
                </div>
                <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                  <Layers className="w-6 h-6 text-violet-400" /> Multi-Dimensional intelligence
                </h3>
                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="bold" />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} stroke="none" />
                      <Radar name="Nemotron" dataKey="Latency" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.4} />
                      <Radar name="Fish Speech" dataKey="Accuracy" stroke="#ec4899" fill="#ec4899" fillOpacity={0.4} />
                      <Radar name="Personal STT" dataKey="Versatility" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                      <Legend verticalAlign="bottom" height={36}/>
                      <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Research Insights Column */}
              <div className="space-y-8">
                <div className="bg-gradient-to-br from-violet-600/20 to-transparent p-8 rounded-[2rem] border border-violet-500/20">
                  <h4 className="text-sm font-black text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Real-time factor (RTF)
                  </h4>
                  <p className="text-zinc-400 text-xs leading-relaxed mb-6">
                    Measures the computational efficiency. RTF &lt; 1 means the model processes audio faster than it is spoken.
                  </p>
                  <div className="space-y-4">
                    {speechModels.map(m => (
                      <div key={m.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-white">
                          <span>{m.name}</span>
                          <span>{m.rtf}x</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(1 - m.rtf) * 100}%` }}
                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5">
                  <h4 className="text-sm font-black text-fuchsia-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Deployment Insight
                  </h4>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-xs text-zinc-400">
                      <div className="w-1 h-1 bg-fuchsia-500 rounded-full mt-1.5 shrink-0" />
                      <span><strong>Streaming:</strong> Nemotron achieves &lt;80ms latency for live voice agents.</span>
                    </li>
                    <li className="flex gap-3 text-xs text-zinc-400">
                      <div className="w-1 h-1 bg-fuchsia-500 rounded-full mt-1.5 shrink-0" />
                      <span><strong>Accuracy:</strong> Fish-Speech 1.5 reaches 96.5% accuracy (3.5% WER) in English benchmarks.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'raw_vs_ft' && (
            <motion.div 
              key="raw_vs_ft"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 gap-10"
            >
              <div className="bg-white/[0.03] p-10 rounded-[3rem] border border-white/5">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h3 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-yellow-400" /> Fine-tuning performance boost
                    </h3>
                    <p className="text-zinc-500 text-sm mt-2 font-medium">Word Error Rate (WER) comparison: Base Model vs. Fine-tuned optimization</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                      <div className="w-3 h-3 bg-zinc-700 rounded-sm" /> BASE
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-violet-500 rounded-sm" /> FINE-TUNED
                    </div>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={werData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} fontWeight="black" tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} unit="%" label={{ value: 'Word Error Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar dataKey="Base" fill="#3f3f46" radius={[6, 6, 0, 0]} barSize={50} />
                      <Bar dataKey="FineTuned" fill="url(#colorBvF)" radius={[6, 6, 0, 0]} barSize={50}>
                        <defs>
                          <linearGradient id="colorBvF" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                  {speechModels.map(m => (
                    <div key={m.id} className="bg-black/20 p-6 rounded-2xl border border-white/5">
                      <h4 className="text-white font-black text-sm mb-2">{m.name}</h4>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Efficiency Gain</p>
                          <p className="text-2xl font-black text-green-400">+{Math.round((m.wer_base - m.wer_finetuned) / m.wer_base * 100)}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Final WER</p>
                          <p className="text-xl font-black text-white">{m.wer_finetuned}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'cleaning' && (
            <motion.div 
              key="cleaning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10"
            >
              <div className="bg-white/[0.03] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                  <Database className="w-64 h-64 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                  <Activity className="w-8 h-8 text-blue-400" /> Data extraction pipeline
                </h3>
                <div className="grid grid-cols-1 gap-8">
                  {collectedData.map((data, idx) => (
                    <div key={idx} className="bg-black/40 p-8 rounded-3xl border border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-8 relative">
                      <div className="absolute top-4 right-8 text-[8px] font-black text-zinc-700 tracking-[0.5em] uppercase">Step {idx + 1}</div>
                      <div>
                        <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Database className="w-4 h-4" /> Raw Scraped Source
                        </h4>
                        <div className="text-[11px] leading-relaxed text-zinc-500 bg-black/40 p-6 rounded-2xl italic border border-white/5 h-[160px] overflow-y-auto">
                          {data.raw_data}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Target className="w-4 h-4" /> Structured Analytics
                        </h4>
                        <pre className="text-[10px] font-mono text-blue-100/70 bg-blue-900/20 p-6 rounded-2xl border border-blue-500/10 h-[160px] overflow-y-auto">
                          {JSON.stringify(data.structured_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-6xl mx-auto space-y-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {speechModels.map((model) => (
                  <div key={model.id} className="bg-white/[0.03] p-8 rounded-[2.5rem] border border-white/5 group hover:border-violet-500/30 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        model.category === 'ASR' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {model.category}
                      </span>
                      <Shield className="w-4 h-4 text-zinc-600" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2 italic">{model.name}</h4>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-6">{model.author}</p>
                    
                    <div className="space-y-3 mb-8">
                      {model.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <div className="w-1 h-1 bg-violet-500 rounded-full" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">WER Optimized</p>
                        <p className="text-lg font-black text-white">{model.wer_finetuned}%</p>
                      </div>
                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <p className="text-[8px] text-zinc-600 uppercase font-black mb-1">Latency</p>
                        <p className="text-lg font-black text-white">{model.latency_ms}ms</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-zinc-900/50 border-t border-white/5 flex justify-between items-center px-12">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
            <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Intelligence Sync Active</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Datasets: LibriSpeech | CommonVoice | Custom Private</span>
        </div>
        <div className="flex items-center gap-6">
           <div className="text-[10px] text-zinc-500 font-mono italic">
             COMPUTED BY ELI-AI NEURAL ENGINE V2.0
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SpeechComparisonWidget;
