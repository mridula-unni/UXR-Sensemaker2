/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import { 
  Layout, 
  Search, 
  Brain, 
  MessageSquare, 
  ClipboardCheck, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Download,
  FileText,
  Trash2,
  Plus,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Phase, AppState, StickyNote, Cluster, Persona, ChatMessage, TestPlan, Assessment } from './types';
import { 
  mentorRigorCheck, 
  generatePersonas, 
  personaChat, 
  scanForBias,
  simulateTestResults,
  generateInitialInsights
} from './services/geminiService';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';

// --- Components ---

interface StickyNoteProps {
  key?: any;
  note: StickyNote;
  onDragEnd: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  cluster?: Cluster;
  onClick?: () => void;
}

const StickyNoteComponent = ({ note, onDragEnd, onDelete, cluster, onClick }: StickyNoteProps) => {
  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => onDragEnd(note.id, info.point.x, info.point.y)}
      onClick={onClick}
      initial={{ x: note.x, y: note.y, opacity: 0, scale: 0.8 }}
      animate={{ x: note.x, y: note.y, opacity: 1, scale: 1 }}
      className={cn(
        "absolute w-44 min-h-44 p-4 shadow-md cursor-grab active:cursor-grabbing flex flex-col justify-between transition-all hover:shadow-xl rounded-sm group",
        note.type === 'qualitative' ? "bg-amber-100 border-amber-200" : "bg-blue-100 border-blue-200",
        "border",
        cluster && "ring-2 ring-offset-2",
        cluster?.color === 'red' && "ring-red-400",
        cluster?.color === 'blue' && "ring-blue-400",
        cluster?.color === 'green' && "ring-green-400",
        cluster?.color === 'purple' && "ring-purple-400"
      )}
      style={{ zIndex: cluster ? 10 : 1 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
          note.type === 'qualitative' ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"
        )}>
          {note.type}
        </div>
        <div className="flex items-center gap-1.5">
          {cluster && (
            <div className={cn(
              "w-2 h-2 rounded-full",
              cluster.color === 'red' ? "bg-red-500" : 
              cluster.color === 'blue' ? "bg-blue-500" : 
              cluster.color === 'green' ? "bg-green-500" : "bg-purple-500"
            )} />
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded transition-opacity text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className={cn(
        "flex-1 leading-relaxed text-zinc-800 font-medium mb-2",
        note.content.length > 300 ? "text-[10px]" : note.content.length > 150 ? "text-[11px]" : "text-xs"
      )}>
        {note.content}
      </div>
      {cluster && (
        <div className="mt-auto pt-2 border-t border-black/5 text-[10px] font-bold uppercase truncate text-zinc-500">
          Theme: {cluster.name}
        </div>
      )}
    </motion.div>
  );
};

const ThemeZone = ({ 
  cluster, 
  stickies, 
  onRename, 
  onDelete,
  isActive,
  onClick
}: { 
  cluster: Cluster, 
  stickies: StickyNote[], 
  onRename: (id: string) => void,
  onDelete: (id: string) => void,
  isActive: boolean,
  onClick: () => void,
  key?: any
}) => {
  const colorMap: any = {
    red: 'border-red-200 bg-red-50/30 ring-red-500',
    blue: 'border-blue-200 bg-blue-50/30 ring-blue-500',
    green: 'border-green-200 bg-green-50/30 ring-green-500',
    purple: 'border-purple-200 bg-purple-50/30 ring-purple-500'
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex-shrink-0 w-full h-auto rounded-xl border-2 border-dashed p-3 flex flex-col gap-2 transition-all cursor-pointer",
        isActive ? "ring-2 border-transparent" : "border-zinc-200 bg-zinc-50/20 hover:bg-zinc-100/30",
        isActive && (colorMap[cluster.color] || "border-indigo-200 bg-indigo-50/30 ring-indigo-500")
      )}
    >
      <div className="flex items-center justify-between group">
        <h3 className="font-bold text-[10px] uppercase tracking-wider truncate flex-1">
          {cluster.name}
        </h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onRename(cluster.id); }}
            className="p-1 text-zinc-400 hover:text-zinc-600"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(cluster.id); }}
            className="p-1 text-zinc-400 hover:text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      <div className="space-y-1.5">
        {stickies.length === 0 ? (
          <div className="py-4 flex items-center justify-center text-[9px] text-zinc-400 italic text-center px-2">
            Select this zone and click stickies to assign
          </div>
        ) : (
          stickies.map(s => (
            <div 
              key={s.id} 
              className={cn(
                "p-1.5 rounded border text-[9px] shadow-sm",
                s.type === 'qualitative' ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
              )}
            >
              {s.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const MethodsMentor = ({ 
  messages, 
  onCheckRigor, 
  isChecking, 
  passed, 
  phase,
  onClose,
  lastAssessment
}: { 
  messages: ChatMessage[], 
  onCheckRigor: () => void, 
  isChecking: boolean, 
  passed: boolean,
  phase: Phase,
  onClose: () => void,
  lastAssessment?: Assessment
}) => {
  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-lg">Methods Mentor</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <Plus className="w-5 h-5 rotate-45 text-zinc-400" />
        </button>
      </div>
      
      <div className="flex gap-8 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 rounded-xl border border-zinc-100 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">No mentor feedback yet. Run a rigor check to get started.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg text-sm",
                  msg.role === 'mentor' ? "bg-white text-indigo-900 border border-indigo-100 shadow-sm" : "bg-indigo-600 text-white"
                )}>
                  {msg.content}
                </div>
              ))
            )}
            {isChecking && (
              <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold animate-pulse">
                <Brain className="w-3 h-3" />
                Evaluating rigor...
              </div>
            )}
          </div>

          {lastAssessment && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'data_utilization', label: 'Data Utilization', ...lastAssessment.data_utilization },
                { id: 'thematic_quality', label: 'Thematic Quality', ...lastAssessment.thematic_quality },
                { id: 'system_alignment', label: 'System Alignment', ...lastAssessment.system_alignment },
                { id: 'bias', label: 'Bias', ...lastAssessment.bias }
              ].map((cat) => (
                <div key={cat.id} className={cn(
                  "p-2 rounded-lg border text-[10px] flex flex-col gap-1",
                  cat.passed ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}>
                  <div className="flex items-center justify-between font-bold uppercase tracking-wider">
                    <span className={cat.passed ? "text-green-700" : "text-red-700"}>{cat.label}</span>
                    {cat.passed ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                  </div>
                  <p className="text-zinc-600 leading-tight">{cat.feedback_string}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-72 space-y-6">
          <div className="p-6 bg-white border border-zinc-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
              <span className="text-zinc-400">Rigor Status</span>
              {passed ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passed
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              The Methods Mentor evaluates your synthesis based on research best practices. 
              Pass all checks to unlock the next phase.
            </p>

            <button
              onClick={onCheckRigor}
              disabled={isChecking || passed}
              className={cn(
                "w-full py-3 rounded-lg text-sm font-bold transition-all shadow-lg",
                passed 
                  ? "bg-green-500 text-white cursor-default shadow-green-100" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-indigo-100"
              )}
            >
              {passed ? "Rigor Check Passed" : "Run Rigor Check"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [state, setState] = useState<AppState>({
    currentPhase: 'exploratory',
    rawCSVData: [],
    stickies: [],
    clusters: [],
    personas: [],
    conceptPitch: "",
    chatHistory: [],
    testPlan: { scenarios: [], tasks: [], questions: [] },
    mentorMessages: [{ role: 'mentor', content: "Welcome! Upload your UX research data to begin the Exploratory phase.", timestamp: Date.now() }],
    rigorCheckPassed: false
  });

  const [isScanning, setIsScanning] = useState(false);
  const [biasResults, setBiasResults] = useState<Record<number, { biased: boolean, suggestions: string[] }>>({});
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCheckingRigor, setIsCheckingRigor] = useState(false);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [chatInput, setChatInput] = useState("");

  const handleScanBias = async (index: number, text: string) => {
    if (!text.trim()) return;
    setIsScanning(true);
    try {
      const result = await scanForBias(text);
      setBiasResults(prev => ({ ...prev, [index]: result }));
    } catch (error: any) {
      console.error(error);
      // Silent fail for bias scan to not interrupt workflow, but log it
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateResults = async () => {
    setIsSimulating(true);
    try {
      const result = await simulateTestResults(state.testPlan, state.personas, state.conceptPitch);
      setSimulationResult(result || "No results generated.");
    } catch (error: any) {
      console.error(error);
      setSimulationResult(`Error: ${error.message || "Failed to simulate results."}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExport = () => {
    const content = `
# UX Sensemaker: Design Strategy Brief

## Research Synthesis
Themes identified: ${state.clusters.map(c => c.name).join(", ")}

## Personas
${state.personas.map(p => `### ${p.name} (${p.role})\n${p.bio}\n- Goals: ${p.goals.join(", ")}\n- Frustrations: ${p.frustrations.join(", ")}`).join("\n\n")}

## Proposed Concept
${state.conceptPitch}

## Usability Test Plan
### Scenarios
${state.testPlan.scenarios.map(s => `- ${s}`).join("\n")}

### Tasks
${state.testPlan.tasks.map(t => `- ${t}`).join("\n")}

## Synthetic Test Results
${simulationResult || "Not simulated yet."}
    `;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ux-sensemaker-brief.md';
    a.click();
  };

  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const [isAddingCluster, setIsAddingCluster] = useState(false);
  const [isAddingSticky, setIsAddingSticky] = useState(false);
  const [newStickyContent, setNewStickyContent] = useState("");
  const [newClusterName, setNewClusterName] = useState("");

  const addSticky = () => {
    if (!newStickyContent.trim()) return;
    const newSticky: StickyNote = {
      id: `manual-${Date.now()}`,
      content: newStickyContent,
      type: 'qualitative',
      x: 400,
      y: 300
    };
    setState(prev => ({ ...prev, stickies: [...prev.stickies, newSticky] }));
    setNewStickyContent("");
    setIsAddingSticky(false);
  };
  const [zoom, setZoom] = useState(1);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    setIsGeneratingInsights(true);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const data = results.data as any[];
        try {
          const insights = await generateInitialInsights(data);
          const newStickies: StickyNote[] = insights.map((insight: any, i: number) => ({
            id: `insight-${i}-${Date.now()}`,
            content: insight.content,
            type: insight.type as 'qualitative' | 'quantitative',
            x: Math.random() * 400 + 300,
            y: Math.random() * 300 + 100
          }));

          // Initial 4 stickies
          const initialStickies = newStickies.slice(0, 4);
          const remainingStickies = newStickies.slice(4);

          setState(prev => ({
            ...prev,
            rawCSVData: data,
            stickies: [...prev.stickies, ...initialStickies],
            mentorMessages: [...prev.mentorMessages, { 
              role: 'mentor', 
              content: `I've analyzed your data. I've placed 4 initial insights on the board. I'll be populating the rest every 20 seconds to give you space to think.`, 
              timestamp: Date.now() 
            }]
          }));

          // Staggered appearance for the rest
          remainingStickies.forEach((sticky, index) => {
            setTimeout(() => {
              setState(prev => ({
                ...prev,
                stickies: [...prev.stickies, sticky]
              }));
            }, (index + 1) * 20000); // 20 seconds between each sticky
          });

        } catch (error) {
          console.error(error);
          // Fallback to raw data if AI fails
          const fallbackStickies: StickyNote[] = data.slice(0, 15).flatMap((row, i) => {
            return Object.entries(row).slice(0, 2).map(([key, value], j) => ({
              id: `${i}-${j}-${Date.now()}`,
              content: String(value),
              type: (key.toLowerCase().includes('score') || key.toLowerCase().includes('rate') ? 'quantitative' : 'qualitative') as 'quantitative' | 'qualitative',
              x: Math.random() * 600 + 50,
              y: Math.random() * 400 + 50
            }));
          }).filter(s => s.content.trim().length > 0);
          
          setState(prev => ({
            ...prev,
            rawCSVData: data,
            stickies: fallbackStickies,
            mentorMessages: [...prev.mentorMessages, { role: 'mentor', content: "AI analysis failed, showing raw data samples instead.", timestamp: Date.now() }]
          }));
        } finally {
          setIsGeneratingInsights(false);
        }
      }
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/csv': ['.csv'] },
    multiple: false
  } as any);

  const handleDragEnd = (id: string, x: number, y: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relativeX = (x - rect.left) / zoom;
    const relativeY = (y - rect.top) / zoom;

    setState(prev => {
      const sticky = prev.stickies.find(s => s.id === id);
      if (!sticky) return prev;
      
      return {
        ...prev,
        stickies: prev.stickies.map(s => s.id === id ? { ...s, x: relativeX, y: relativeY } : s)
      };
    });
  };

  const deleteSticky = (id: string) => {
    setState(prev => ({
      ...prev,
      stickies: prev.stickies.filter(s => s.id !== id)
    }));
  };

  const deleteCluster = (id: string) => {
    setState(prev => ({
      ...prev,
      clusters: prev.clusters.filter(c => c.id !== id),
      stickies: prev.stickies.map(s => s.clusterId === id ? { ...s, clusterId: undefined } : s)
    }));
  };

  const renameCluster = (id: string) => {
    const newName = prompt("Enter new theme name:");
    if (!newName) return;
    setState(prev => ({
      ...prev,
      clusters: prev.clusters.map(c => c.id === id ? { ...c, name: newName } : c)
    }));
  };

  const assignToCluster = (stickyId: string, clusterId: string) => {
    setState(prev => ({
      ...prev,
      stickies: prev.stickies.map(s => s.id === stickyId ? { ...s, clusterId } : s)
    }));
  };

  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);

  const handleStickyClick = (id: string) => {
    if (state.currentPhase === 'exploratory' && activeClusterId) {
      assignToCluster(id, activeClusterId);
    }
  };

  const handleCheckRigor = async () => {
    setIsCheckingRigor(true);
    try {
      const result = await mentorRigorCheck(state.currentPhase, {
        stickies: state.stickies,
        clusters: state.clusters,
        concept: state.conceptPitch,
        testPlan: state.testPlan
      });

      const newMentorMessages: ChatMessage[] = [];
      
      if (result.revealedInsights && result.revealedInsights.length > 0) {
        newMentorMessages.push({
          role: 'mentor',
          content: `I've discovered some insights that weren't represented in your map. I've added them as new stickies for you to consider.`,
          timestamp: Date.now()
        });

        const newStickies: StickyNote[] = result.revealedInsights.map((insight: any, i: number) => ({
          id: `revealed-${Date.now()}-${i}`,
          content: insight.content,
          type: insight.type,
          x: 100 + (i * 20),
          y: 100 + (i * 20)
        }));

        setState(prev => ({
          ...prev,
          stickies: [...prev.stickies, ...newStickies],
          rigorCheckPassed: result.passed,
          lastAssessment: result,
          mentorMessages: [...prev.mentorMessages, ...newMentorMessages]
        }));
      } else {
        setState(prev => ({
          ...prev,
          rigorCheckPassed: result.passed,
          lastAssessment: result,
          mentorMessages: [...prev.mentorMessages, { 
            role: 'mentor', 
            content: result.passed ? "Excellent work! Your synthesis is rigorous and well-grounded." : "I've reviewed your map. Check the criteria below for areas of improvement.", 
            timestamp: Date.now() 
          }]
        }));
      }
    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        mentorMessages: [...prev.mentorMessages, { 
          role: 'mentor', 
          content: `Error: ${error.message || "I encountered an issue checking your work. Please try again."}`, 
          timestamp: Date.now() 
        }]
      }));
      setIsMentorOpen(true);
    } finally {
      setIsCheckingRigor(false);
    }
  };

  const addCluster = () => {
    if (!newClusterName.trim()) return;
    const colors = ['red', 'blue', 'green', 'purple'];
    const newCluster: Cluster = {
      id: Math.random().toString(36).substr(2, 9),
      name: newClusterName,
      color: colors[state.clusters.length % colors.length]
    };
    setState(prev => ({ ...prev, clusters: [...prev.clusters, newCluster] }));
    setNewClusterName("");
    setIsAddingCluster(false);
  };

  const nextPhase = () => {
    if (state.currentPhase === 'exploratory') {
      setState(prev => ({ ...prev, currentPhase: 'generative', rigorCheckPassed: false }));
    } else if (state.currentPhase === 'generative') {
      setState(prev => ({ ...prev, currentPhase: 'evaluative', rigorCheckPassed: false }));
    }
  };

  const handleGeneratePersonas = async () => {
    setIsGeneratingPersonas(true);
    try {
      const clustersText = state.clusters.map(c => c.name);
      const personas = await generatePersonas(clustersText);
      setState(prev => ({ ...prev, personas: [...prev.personas, ...personas] }));
    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        mentorMessages: [...prev.mentorMessages, { 
          role: 'mentor', 
          content: `Persona Generation Error: ${error.message || "Failed to generate personas."}`, 
          timestamp: Date.now() 
        }]
      }));
      setIsMentorOpen(true);
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handleAddPersonaFromTheme = async (cluster: Cluster) => {
    setIsGeneratingPersonas(true);
    try {
      const personas = await generatePersonas([cluster.name]);
      setState(prev => ({ ...prev, personas: [...prev.personas, ...personas] }));
    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        mentorMessages: [...prev.mentorMessages, { 
          role: 'mentor', 
          content: `Persona Generation Error: ${error.message || "Failed to generate persona for this theme."}`, 
          timestamp: Date.now() 
        }]
      }));
      setIsMentorOpen(true);
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handlePersonaChat = async () => {
    if (!activePersona || !chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    const newHistory = [...state.chatHistory, userMsg];
    
    setState(prev => ({ ...prev, chatHistory: newHistory }));
    setChatInput("");

    try {
      const response = await personaChat(activePersona, state.conceptPitch, newHistory);
      setState(prev => ({
        ...prev,
        chatHistory: [...newHistory, { role: 'persona', content: response || "...", timestamp: Date.now() }]
      }));
    } catch (error: any) {
      console.error(error);
      setState(prev => ({
        ...prev,
        chatHistory: [...newHistory, { role: 'persona', content: `Error: ${error.message || "I'm having trouble responding right now."}`, timestamp: Date.now() }]
      }));
    }
  };

  // --- Render Phases ---

  const renderExploratory = () => (
    <div key="exploratory" className="flex-1 flex overflow-hidden relative bg-zinc-50/30">
      {state.stickies.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div 
            {...getRootProps()} 
            className={cn(
              "w-full max-w-xl p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer",
              isDragActive ? "border-indigo-500 bg-indigo-50" : "border-zinc-300 hover:border-indigo-400"
            )}
          >
            <input {...getInputProps()} />
            {isGeneratingInsights ? (
              <div className="flex flex-col items-center gap-4">
                <Brain className="w-12 h-12 text-indigo-600 animate-pulse" />
                <h3 className="text-lg font-medium text-zinc-900">Synthesizing Insights...</h3>
                <p className="text-sm text-zinc-500 text-center">Our AI is reading your data to generate meaningful starting points.</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-zinc-400 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900">Upload Research Data</h3>
                <p className="text-sm text-zinc-500 text-center mt-2">
                  Drag and drop a CSV file. We'll generate AI insights to help you start your synthesis.
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Zoom Controls */}
            <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full border border-zinc-200 shadow-lg">
              <button 
                onClick={() => setZoom(prev => Math.max(0.2, prev - 0.1))}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                title="Zoom Out"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold w-10 text-center text-zinc-500">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                title="Zoom In"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-200 mx-1" />
              <button 
                onClick={() => setZoom(1)}
                className="text-[10px] font-bold px-2 hover:text-indigo-600 transition-colors"
              >
                RESET
              </button>
            </div>

            {/* Canvas Area */}
            <div 
              ref={canvasRef}
              className="flex-1 relative overflow-hidden bg-zinc-50/50"
            >
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                <div className="flex gap-2">
                  {isAddingCluster ? (
                    <div className="flex items-center gap-2 bg-white p-2 border border-zinc-200 rounded-lg shadow-lg animate-in slide-in-from-left-2">
                      <input 
                        autoFocus
                        value={newClusterName}
                        onChange={(e) => setNewClusterName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCluster()}
                        placeholder="Theme name..."
                        className="text-sm px-2 py-1 border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
                      />
                      <button 
                        onClick={addCluster}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsAddingCluster(false)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingCluster(true)}
                      className="px-4 py-2 bg-white border border-zinc-200 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> New Theme
                    </button>
                  )}

                  {isAddingSticky ? (
                    <div className="flex items-center gap-2 bg-white p-2 border border-zinc-200 rounded-lg shadow-lg animate-in slide-in-from-left-2">
                      <input 
                        autoFocus
                        value={newStickyContent}
                        onChange={(e) => setNewStickyContent(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSticky()}
                        placeholder="Sticky content..."
                        className="text-sm px-2 py-1 border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 w-40"
                      />
                      <button 
                        onClick={addSticky}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setIsAddingSticky(false)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingSticky(true)}
                      className="px-4 py-2 bg-white border border-zinc-200 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> New Sticky
                    </button>
                  )}
                </div>
                
                {activeClusterId && (
                  <div className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-pulse shadow-sm">
                    Click stickies to assign to theme
                  </div>
                )}
              </div>

              {/* Zoomable Content */}
              <motion.div 
                className="w-full h-full origin-top-left"
                animate={{ scale: zoom }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                {state.stickies.map(s => (
                  <StickyNoteComponent 
                    key={s.id} 
                    note={s} 
                    onDragEnd={handleDragEnd}
                    onDelete={deleteSticky}
                    onClick={() => handleStickyClick(s.id)}
                    cluster={state.clusters.find(c => c.id === s.clusterId)}
                  />
                ))}
              </motion.div>
            </div>
          </div>

          {/* Themes Sidebar */}
          <div className="w-72 border-l border-zinc-200 bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Themes</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 bg-zinc-200 rounded-full text-zinc-600">
                {state.clusters.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {state.clusters.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-zinc-400" />
                  </div>
                  <p className="text-xs text-zinc-400 italic">Create a theme to start grouping insights.</p>
                </div>
              ) : (
                state.clusters.map(cluster => (
                  <ThemeZone 
                    key={cluster.id}
                    cluster={cluster}
                    stickies={state.stickies.filter(s => s.clusterId === cluster.id)}
                    onRename={renameCluster}
                    onDelete={deleteCluster}
                    isActive={activeClusterId === cluster.id}
                    onClick={() => setActiveClusterId(activeClusterId === cluster.id ? null : cluster.id)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderGenerative = () => (
    <div key="generative" className="flex-1 flex flex-col p-8 overflow-y-auto space-y-8">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600" />
            Persona Generation
          </h2>
          <button 
            onClick={handleGeneratePersonas}
            disabled={isGeneratingPersonas}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isGeneratingPersonas ? "Generating..." : "Generate from Themes"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.personas.map(p => (
            <motion.div 
              key={p.id} 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActivePersona(p)}
              className={cn(
                "p-6 border-2 rounded-2xl cursor-pointer transition-all relative overflow-hidden group",
                activePersona?.id === p.id 
                  ? "border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100" 
                  : "border-zinc-100 bg-white hover:border-indigo-200 hover:shadow-md"
              )}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-xl text-zinc-900">{p.name}</h3>
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">{p.role}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-sm text-zinc-600 leading-relaxed italic">"{p.bio}"</p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Goals</h4>
                    <ul className="space-y-1">
                      {p.goals.map((g, i) => (
                        <li key={i} className="text-[11px] text-zinc-700 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Frustrations</h4>
                    <ul className="space-y-1">
                      {p.frustrations.map((f, i) => (
                        <li key={i} className="text-[11px] text-zinc-700 flex items-start gap-1.5">
                          <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {state.clusters.length > 0 && (
            <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 bg-zinc-50/50">
              <div className="w-12 h-12 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-400">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Add Persona from Theme</h3>
                <p className="text-xs text-zinc-500 mt-1">Generate a persona specifically for a theme.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {state.clusters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAddPersonaFromTheme(c)}
                    disabled={isGeneratingPersonas}
                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-[10px] font-bold uppercase tracking-wider hover:border-indigo-500 hover:text-indigo-600 transition-all disabled:opacity-50"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Concept Pitch
          </h2>
          <textarea
            value={state.conceptPitch}
            onChange={(e) => setState(prev => ({ ...prev, conceptPitch: e.target.value }))}
            placeholder="Describe your proposed solution here..."
            className="w-full h-64 p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
          />
        </div>

        <div className="space-y-4 flex flex-col h-[400px]">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Persona Feedback
          </h2>
          <div className="flex-1 border border-zinc-200 rounded-xl bg-zinc-50 overflow-hidden flex flex-col">
            {!activePersona ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm p-8 text-center">
                Select a persona above to start pitching your concept.
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {state.chatHistory.map((msg, i) => (
                    <div key={i} className={cn(
                      "max-w-[80%] p-3 rounded-xl text-sm",
                      msg.role === 'user' ? "ml-auto bg-indigo-600 text-white" : "bg-white border border-zinc-200 text-zinc-800"
                    )}>
                      {msg.content}
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-white border-t border-zinc-200 flex gap-2">
                  <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePersonaChat()}
                    placeholder={`Chat with ${activePersona.name}...`}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    onClick={handlePersonaChat}
                    className="p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  const renderEvaluative = () => (
    <div key="evaluative" className="flex-1 flex flex-col p-8 overflow-y-auto space-y-8">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Test Plan Builder
          </h2>
          <button 
            onClick={handleExport}
            className="px-4 py-2 border border-zinc-200 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-50"
          >
            <Download className="w-4 h-4" /> Export Brief
          </button>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Scenarios</h3>
            <div className="space-y-2">
              {state.testPlan.scenarios.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    value={s}
                    onChange={(e) => {
                      const newScenarios = [...state.testPlan.scenarios];
                      newScenarios[i] = e.target.value;
                      setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, scenarios: newScenarios } }));
                    }}
                    className="flex-1 p-2 border border-zinc-200 rounded-md text-sm"
                  />
                  <button 
                    onClick={() => {
                      const newScenarios = state.testPlan.scenarios.filter((_, idx) => idx !== i);
                      setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, scenarios: newScenarios } }));
                    }}
                    className="p-2 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, scenarios: [...prev.testPlan.scenarios, ""] } }))}
                className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Scenario
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Tasks & Bias Scanner</h3>
            <div className="space-y-6">
              {state.testPlan.tasks.map((t, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      value={t}
                      onChange={(e) => {
                        const newTasks = [...state.testPlan.tasks];
                        newTasks[i] = e.target.value;
                        setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, tasks: newTasks } }));
                      }}
                      onBlur={() => handleScanBias(i, t)}
                      className="flex-1 p-2 border border-zinc-200 rounded-md text-sm"
                      placeholder="e.g., Try to find the checkout button..."
                    />
                    <button 
                      onClick={() => {
                        const newTasks = state.testPlan.tasks.filter((_, idx) => idx !== i);
                        setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, tasks: newTasks } }));
                      }}
                      className="p-2 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {biasResults[i]?.biased && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md text-xs text-red-800 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Potential Leading Question
                      </div>
                      <p className="opacity-80">Suggestions: {biasResults[i].suggestions.join(", ")}</p>
                    </div>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setState(prev => ({ ...prev, testPlan: { ...prev.testPlan, tasks: [...prev.testPlan.tasks, ""] } }))}
                className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Simulation Engine</h3>
              <button 
                onClick={handleSimulateResults}
                disabled={isSimulating || state.testPlan.tasks.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSimulating ? "Simulating..." : "Run Synthetic Test"}
              </button>
            </div>
            {simulationResult && (
              <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-xl text-sm prose prose-indigo max-w-none">
                <div className="whitespace-pre-wrap text-zinc-700 leading-relaxed">
                  {simulationResult}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex h-screen bg-white text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar Navigation */}
      <div className="w-20 border-r border-zinc-200 flex flex-col items-center py-8 space-y-8 bg-zinc-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Layout className="w-6 h-6" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'exploratory' }))}
            className={cn(
              "p-3 rounded-xl transition-all",
              state.currentPhase === 'exploratory' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Search className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'generative' }))}
            className={cn(
              "p-3 rounded-xl transition-all",
              state.currentPhase === 'generative' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Brain className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'evaluative' }))}
            className={cn(
              "p-3 rounded-xl transition-all",
              state.currentPhase === 'evaluative' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <ClipboardCheck className="w-6 h-6" />
          </button>
        </nav>
      </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {/* Header */}
            <header className="h-16 border-b border-zinc-200 px-8 flex items-center justify-between bg-white z-40">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Phase {state.currentPhase === 'exploratory' ? '01' : state.currentPhase === 'generative' ? '02' : '03'}</span>
                <h1 className="text-lg font-semibold capitalize">{state.currentPhase}</h1>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Methods Mentor Toggle */}
                <button 
                  onClick={() => setIsMentorOpen(!isMentorOpen)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                    isMentorOpen 
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm" 
                      : "bg-white text-zinc-500 border-zinc-200 hover:border-indigo-300"
                  )}
                >
                  <Brain className="w-4 h-4" />
                  Methods Mentor
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    state.rigorCheckPassed ? "bg-green-500" : "bg-amber-500"
                  )} />
                </button>

                <div className="flex items-center gap-1">
                  <div className={cn("w-2 h-2 rounded-full", state.currentPhase === 'exploratory' ? "bg-indigo-600" : "bg-zinc-200")} />
                  <div className={cn("w-2 h-2 rounded-full", state.currentPhase === 'generative' ? "bg-indigo-600" : "bg-zinc-200")} />
                  <div className={cn("w-2 h-2 rounded-full", state.currentPhase === 'evaluative' ? "bg-indigo-600" : "bg-zinc-200")} />
                </div>
                {state.rigorCheckPassed && state.currentPhase !== 'evaluative' && (
                  <button 
                    onClick={nextPhase}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                  >
                    Next Phase <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>

            {/* Methods Mentor Dropdown */}
            <AnimatePresence>
              {isMentorOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="absolute top-16 left-0 right-0 z-50 bg-white border-b border-zinc-200 shadow-2xl overflow-hidden"
                >
                  <div className="max-w-4xl mx-auto p-6">
                    <MethodsMentor 
                      messages={state.mentorMessages}
                      onCheckRigor={handleCheckRigor}
                      isChecking={isCheckingRigor}
                      passed={state.rigorCheckPassed}
                      phase={state.currentPhase}
                      onClose={() => setIsMentorOpen(false)}
                      lastAssessment={state.lastAssessment}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Phase Content */}
            <main className="flex-1 flex min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state.currentPhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex min-w-0 overflow-hidden"
                >
                  {state.currentPhase === 'exploratory' && renderExploratory()}
                  {state.currentPhase === 'generative' && renderGenerative()}
                  {state.currentPhase === 'evaluative' && renderEvaluative()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
    </div>
  );
}
