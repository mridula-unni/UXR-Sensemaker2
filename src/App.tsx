/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Edit2,
  Sparkles,
  Loader2,
  Target,
  Frown,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Star,
  Copy,
  Globe,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Phase, AppState, StickyNote, Cluster, Persona, ChatMessage, TestPlan, Assessment, ConceptIdea, PersonaEvaluation } from './types';
import {
  mentorRigorCheck,
  generatePersonas,
  personaChat,
  scanForBias,
  simulateTestResults,
  generateInitialInsights,
  suggestThemeNames,
  suggestStickyInsights,
  suggestConcepts,
  personaEvaluateWebsite,
  evalPersonaChat
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
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(phase === 'evaluative' ? [
                  { label: 'Eval Coverage', ...lastAssessment.data_utilization },
                  { label: 'Issue Severity', ...lastAssessment.thematic_quality },
                  { label: 'Actionability', ...lastAssessment.system_alignment },
                  { label: 'Method Rigor', ...lastAssessment.bias }
                ] : phase === 'generative' ? [
                  { label: 'Data Grounding', ...lastAssessment.data_utilization },
                  { label: 'Concept Quality', ...lastAssessment.thematic_quality },
                  { label: 'Persona Alignment', ...lastAssessment.system_alignment },
                  { label: 'Blind Spots', ...lastAssessment.bias }
                ] : [
                  { label: 'Data Utilization', ...lastAssessment.data_utilization },
                  { label: 'Thematic Quality', ...lastAssessment.thematic_quality },
                  { label: 'System Alignment', ...lastAssessment.system_alignment },
                  { label: 'Bias', ...lastAssessment.bias }
                ]).map((cat, i) => (
                  <div key={i} className={cn(
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

              {/* Follow-Up Studies */}
              {lastAssessment.followUpStudies && lastAssessment.followUpStudies.length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Search className="w-3 h-3 text-indigo-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Suggested Follow-Up Studies</span>
                  </div>
                  <div className="space-y-2">
                    {lastAssessment.followUpStudies.map((study, i) => (
                      <div key={i} className="bg-white rounded-lg p-2.5 border border-indigo-100 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded shrink-0 uppercase">
                            {study.method}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 font-semibold">
                          Gap: {study.gap}
                        </p>
                        <p className="text-[11px] text-zinc-600 leading-relaxed">
                          {study.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    concepts: [],
    chatHistories: {},
    testPlan: { scenarios: [], tasks: [], questions: [] },
    evaluativeUrl: "",
    personaEvaluations: [],
    evalChatHistories: {},
    mentorMessages: [{ role: 'mentor', content: "Welcome! Upload your UX research data to begin the Exploratory phase.", timestamp: Date.now() }],
    rigorCheckPassed: false
  });

  const [isScanning, setIsScanning] = useState(false);
  const [biasResults, setBiasResults] = useState<Record<number, { biased: boolean, suggestions: string[] }>>({});
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCheckingRigor, setIsCheckingRigor] = useState(false);
  const [isGeneratingPersonas, setIsGeneratingPersonas] = useState(false);
  const [expandedPersonaId, setExpandedPersonaId] = useState<string | null>(null);
  const [personaChatInputs, setPersonaChatInputs] = useState<Record<string, string>>({});

  const handleScanBias = async (index: number, text: string) => {
    if (!text.trim()) return;
    setIsScanning(true);
    try {
      const result = await scanForBias(text);
      setBiasResults(prev => ({ ...prev, [index]: result }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulateResults = async () => {
    setIsSimulating(true);
    try {
      const topConcept = [...state.concepts].sort((a, b) => a.rank - b.rank)[0];
      const conceptStr = topConcept ? `${topConcept.name}: ${topConcept.text}` : "";
      const result = await simulateTestResults(state.testPlan, state.personas, conceptStr);
      setSimulationResult(result || "No results generated.");
    } catch (error) {
      console.error(error);
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

## Concepts (Ranked)
${[...state.concepts].sort((a, b) => a.rank - b.rank).map((c, i) => `${i + 1}. **${c.name}**: ${c.text}${c.notes ? `\n   Notes: ${c.notes}` : ''}`).join("\n")}

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

  const [themeSuggestions, setThemeSuggestions] = useState<{ name: string; reason: string }[]>([]);
  const [stickySuggestions, setStickySuggestions] = useState<{ content: string; type: string }[]>([]);
  const [isLoadingThemeSuggestions, setIsLoadingThemeSuggestions] = useState(false);
  const [isLoadingStickySuggestions, setIsLoadingStickySuggestions] = useState(false);
  const [mentorConceptSuggestions, setMentorConceptSuggestions] = useState<string[]>([]);
  const [isLoadingConceptSuggestions, setIsLoadingConceptSuggestions] = useState(false);

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

  const handleGetThemeSuggestions = async () => {
    if (state.stickies.length === 0) return;
    setIsLoadingThemeSuggestions(true);
    try {
      const suggestions = await suggestThemeNames(
        state.stickies.map(s => ({ content: s.content, type: s.type })),
        state.clusters.map(c => c.name)
      );
      setThemeSuggestions(suggestions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingThemeSuggestions(false);
    }
  };

  const handleGetStickySuggestions = async () => {
    if (state.rawCSVData.length === 0) return;
    setIsLoadingStickySuggestions(true);
    try {
      const suggestions = await suggestStickyInsights(
        state.rawCSVData,
        state.stickies.map(s => s.content),
        state.clusters.map(c => c.name)
      );
      setStickySuggestions(suggestions);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingStickySuggestions(false);
    }
  };

  const addSuggestedSticky = (content: string, type: string) => {
    const newSticky: StickyNote = {
      id: `suggested-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      content,
      type: type as 'qualitative' | 'quantitative',
      x: Math.random() * 400 + 300,
      y: Math.random() * 300 + 100
    };
    setState(prev => ({ ...prev, stickies: [...prev.stickies, newSticky] }));
    setStickySuggestions(prev => prev.filter(s => s.content !== content));
  };

  const addSuggestedTheme = (name: string) => {
    const colors = ['red', 'blue', 'green', 'purple'];
    const newCluster: Cluster = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      color: colors[state.clusters.length % colors.length]
    };
    setState(prev => ({ ...prev, clusters: [...prev.clusters, newCluster] }));
    setThemeSuggestions(prev => prev.filter(s => s.name !== name));
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
          // Fallback: extract meaningful text responses (skip short/date/name-like columns)
          const isSubstantiveValue = (val: string) => {
            if (!val || val.trim().length < 15) return false;
            if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val.trim())) return false;
            if (/^\d+(\.\d+)?$/.test(val.trim())) return false;
            return true;
          };
          const isQuantitativeKey = (key: string) =>
            /score|rate|rating|rank|scale|number|count|percent|satisfaction/i.test(key);

          const fallbackStickies: StickyNote[] = [];
          const seen = new Set<string>();

          for (const row of data.slice(0, 30)) {
            for (const [key, value] of Object.entries(row)) {
              const strVal = String(value).trim();
              if (isQuantitativeKey(key) && strVal.length > 0 && !seen.has(strVal)) {
                seen.add(strVal);
                fallbackStickies.push({
                  id: `fb-${fallbackStickies.length}-${Date.now()}`,
                  content: `${key}: ${strVal}`,
                  type: 'quantitative',
                  x: Math.random() * 500 + 100,
                  y: Math.random() * 300 + 100
                });
              } else if (isSubstantiveValue(strVal) && !seen.has(strVal)) {
                seen.add(strVal);
                fallbackStickies.push({
                  id: `fb-${fallbackStickies.length}-${Date.now()}`,
                  content: strVal,
                  type: 'qualitative',
                  x: Math.random() * 500 + 100,
                  y: Math.random() * 300 + 100
                });
              }
              if (fallbackStickies.length >= 20) break;
            }
            if (fallbackStickies.length >= 20) break;
          }

          // Stagger fallback stickies the same way: 4 initial, rest every 20s
          const initialFallback = fallbackStickies.slice(0, 4);
          const remainingFallback = fallbackStickies.slice(4);

          setState(prev => ({
            ...prev,
            rawCSVData: data,
            stickies: [...prev.stickies, ...initialFallback],
            mentorMessages: [...prev.mentorMessages, { role: 'mentor', content: "AI analysis unavailable — check that your GEMINI_API_KEY is set in .env. Showing selected survey responses to get you started. I'll add more every 20 seconds.", timestamp: Date.now() }]
          }));

          remainingFallback.forEach((sticky, index) => {
            setTimeout(() => {
              setState(prev => ({
                ...prev,
                stickies: [...prev.stickies, sticky]
              }));
            }, (index + 1) * 20000);
          });
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
      const phase = state.currentPhase;

      let data: any;
      if (phase === 'generative') {
        data = {
          clusters: state.clusters.map(c => c.name),
          personas: state.personas.map(p => ({ name: p.name, role: p.role, goals: p.goals, frustrations: p.frustrations })),
          concepts: [...state.concepts].sort((a, b) => a.rank - b.rank).map(c => ({ rank: c.rank, name: c.name, text: c.text, notes: c.notes })),
          chatHistories: Object.fromEntries(
            Object.entries(state.chatHistories).map(([pid, msgs]: [string, ChatMessage[]]) => {
              const persona = state.personas.find(p => p.id === pid);
              return [persona?.name || pid, msgs.map(m => ({ role: m.role, content: m.content }))];
            })
          )
        };
      } else if (phase === 'evaluative') {
        data = {
          url: state.evaluativeUrl,
          personas: state.personas.map(p => ({ name: p.name, role: p.role, goals: p.goals, frustrations: p.frustrations })),
          evaluations: state.personaEvaluations.map(e => {
            const persona = state.personas.find(p => p.id === e.personaId);
            return {
              personaName: persona?.name,
              satisfactionScore: e.satisfactionScore,
              summary: e.summary,
              topIssues: e.topIssues,
              positives: e.positives,
              heuristicAvg: e.heuristics?.length ? (e.heuristics.reduce((s, h) => s + h.score, 0) / e.heuristics.length).toFixed(1) : null
            };
          }),
          interviewHistories: Object.fromEntries(
            Object.entries(state.evalChatHistories).map(([pid, msgs]: [string, ChatMessage[]]) => {
              const persona = state.personas.find(p => p.id === pid);
              return [persona?.name || pid, msgs.map(m => ({ role: m.role, content: m.content }))];
            })
          ),
          testPlan: state.testPlan
        };
      } else {
        data = {
          stickies: state.stickies,
          clusters: state.clusters,
          testPlan: state.testPlan
        };
      }

      const result = await mentorRigorCheck(state.currentPhase, data);
      const newMentorMessages: ChatMessage[] = [];

      if (result.revealedInsights && result.revealedInsights.length > 0) {
        if (phase === 'generative') {
          setMentorConceptSuggestions(result.revealedInsights.map((insight: any) => insight.content));
          newMentorMessages.push({
            role: 'mentor',
            content: `I have ${result.revealedInsights.length} concept suggestion${result.revealedInsights.length > 1 ? 's' : ''} based on gaps I see. Use the sparkle button next to "New Concept" to add them one at a time.`,
            timestamp: Date.now()
          });
          setState(prev => ({
            ...prev,
            rigorCheckPassed: result.passed,
            lastAssessment: result,
            mentorMessages: [...prev.mentorMessages, ...newMentorMessages]
          }));
        } else if (phase === 'evaluative') {
          newMentorMessages.push({
            role: 'mentor',
            content: `I found ${result.revealedInsights.length} usability issue${result.revealedInsights.length > 1 ? 's' : ''} that the persona evaluations may have missed:\n${result.revealedInsights.map((i: any) => `• ${i.content}`).join('\n')}`,
            timestamp: Date.now()
          });
          setState(prev => ({
            ...prev,
            rigorCheckPassed: result.passed,
            lastAssessment: result,
            mentorMessages: [...prev.mentorMessages, ...newMentorMessages]
          }));
        } else {
          const newStickies: StickyNote[] = result.revealedInsights.map((insight: any, i: number) => ({
            id: `revealed-${Date.now()}-${i}`,
            content: insight.content,
            type: insight.type,
            x: 100 + (i * 20),
            y: 100 + (i * 20)
          }));
          newMentorMessages.push({
            role: 'mentor',
            content: `I've discovered some insights that weren't represented in your map. I've added them as new stickies for you to consider.`,
            timestamp: Date.now()
          });
          setState(prev => ({
            ...prev,
            stickies: [...prev.stickies, ...newStickies],
            rigorCheckPassed: result.passed,
            lastAssessment: result,
            mentorMessages: [...prev.mentorMessages, ...newMentorMessages]
          }));
        }
      } else {
        const messages: Record<string, { passed: string; failed: string }> = {
          exploratory: {
            passed: "Excellent work! Your synthesis is rigorous and well-grounded.",
            failed: "I've reviewed your map. Check the criteria below for areas of improvement."
          },
          generative: {
            passed: "Your concept ranking is well-reasoned and grounded in persona feedback. Great work!",
            failed: "I've reviewed your concepts and ranking. Check the criteria below — consider having more persona conversations or revising your ranking."
          },
          evaluative: {
            passed: "Strong evaluative work! Your persona evaluations are thorough and the issues identified are actionable.",
            failed: "I've reviewed your evaluation. Check the criteria below — consider interviewing more personas or digging deeper into contradictory scores."
          }
        };
        const msg = messages[phase] || messages.exploratory;

        setState(prev => ({
          ...prev,
          rigorCheckPassed: result.passed,
          lastAssessment: result,
          mentorMessages: [...prev.mentorMessages, {
            role: 'mentor',
            content: result.passed ? msg.passed : msg.failed,
            timestamp: Date.now()
          }]
        }));
      }
    } catch (error) {
      console.error(error);
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
      setState(prev => ({ ...prev, currentPhase: 'generative', rigorCheckPassed: false, lastAssessment: undefined, mentorMessages: [{ role: 'mentor', content: "Welcome to the Generative phase! Create concepts, chat with personas to test your ideas, then run a rigor check.", timestamp: Date.now() }] }));
    } else if (state.currentPhase === 'generative') {
      setState(prev => ({ ...prev, currentPhase: 'evaluative', rigorCheckPassed: false, lastAssessment: undefined, mentorMessages: [{ role: 'mentor', content: "Welcome to the Evaluative phase! Build your test plan and run simulations.", timestamp: Date.now() }] }));
    }
  };

  const handleGeneratePersonas = async () => {
    setIsGeneratingPersonas(true);
    try {
      const clustersText = state.clusters.map(c => c.name);
      const existingNames = state.personas.map(p => p.name);
      const rawPersonas = await generatePersonas(clustersText, existingNames);
      const personas = rawPersonas.map((p: any) => ({ ...p, id: p.id || `persona-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` }));
      setState(prev => ({ ...prev, personas: [...prev.personas, ...personas] }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handleAddPersonaFromTheme = async (cluster: Cluster) => {
    setIsGeneratingPersonas(true);
    try {
      const existingNames = state.personas.map(p => p.name);
      const rawPersonas = await generatePersonas([cluster.name], existingNames);
      const personas = rawPersonas.map((p: any) => ({ ...p, id: p.id || `persona-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` }));
      setState(prev => ({ ...prev, personas: [...prev.personas, ...personas] }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingPersonas(false);
    }
  };

  const handlePersonaChat = async (persona: Persona) => {
    const input = personaChatInputs[persona.id]?.trim();
    if (!input) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    const existingHistory = state.chatHistories[persona.id] || [];
    const newHistory = [...existingHistory, userMsg];

    setState(prev => ({ ...prev, chatHistories: { ...prev.chatHistories, [persona.id]: newHistory } }));
    setPersonaChatInputs(prev => ({ ...prev, [persona.id]: "" }));

    try {
      const conceptsSummary = [...state.concepts].sort((a, b) => a.rank - b.rank)
        .map(c => `"${c.name}": ${c.text}`).join("\n");
      const response = await personaChat(persona, conceptsSummary, newHistory);
      setState(prev => ({
        ...prev,
        chatHistories: { ...prev.chatHistories, [persona.id]: [...newHistory, { role: 'persona', content: response || "...", timestamp: Date.now() }] }
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [expandedEvalPersonaId, setExpandedEvalPersonaId] = useState<string | null>(null);
  const [evalChatInputs, setEvalChatInputs] = useState<Record<string, string>>({});

  const handleRunEvaluations = async () => {
    if (!state.evaluativeUrl.trim() || state.personas.length === 0) return;
    setIsEvaluating(true);
    const topConcept = [...state.concepts].sort((a, b) => a.rank - b.rank)[0];
    const conceptStr = topConcept ? `${topConcept.name}: ${topConcept.text}` : "";

    const evaluations: PersonaEvaluation[] = [];
    for (const persona of state.personas) {
      try {
        const result = await personaEvaluateWebsite(persona, state.evaluativeUrl, conceptStr);
        evaluations.push({ personaId: persona.id, ...result });
      } catch (error) {
        console.error(`Evaluation failed for ${persona.name}:`, error);
      }
    }

    setState(prev => ({ ...prev, personaEvaluations: evaluations }));
    setIsEvaluating(false);
  };

  const handleEvalChat = async (persona: Persona) => {
    const input = evalChatInputs[persona.id]?.trim();
    if (!input) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    const existingHistory = state.evalChatHistories[persona.id] || [];
    const newHistory = [...existingHistory, userMsg];

    setState(prev => ({ ...prev, evalChatHistories: { ...prev.evalChatHistories, [persona.id]: newHistory } }));
    setEvalChatInputs(prev => ({ ...prev, [persona.id]: "" }));

    try {
      const evaluation = state.personaEvaluations.find(e => e.personaId === persona.id);
      const response = await evalPersonaChat(persona, evaluation || {}, state.evaluativeUrl, newHistory);
      setState(prev => ({
        ...prev,
        evalChatHistories: { ...prev.evalChatHistories, [persona.id]: [...newHistory, { role: 'persona', content: response || "...", timestamp: Date.now() }] }
      }));
    } catch (error) {
      console.error(error);
    }
  };

  // --- Render Phases ---

  const renderExploratory = () => (
    <div className="flex-1 flex overflow-hidden relative bg-zinc-50/30">
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
                        onClick={() => { setIsAddingCluster(false); setThemeSuggestions([]); }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleGetThemeSuggestions}
                        disabled={isLoadingThemeSuggestions || state.stickies.length === 0}
                        className="p-1.5 text-indigo-500 hover:text-indigo-700 disabled:text-zinc-300 transition-colors"
                        title="Get AI theme suggestions"
                      >
                        {isLoadingThemeSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setIsAddingCluster(true); setStickySuggestions([]); }}
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
                        onClick={() => { setIsAddingSticky(false); setStickySuggestions([]); }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleGetStickySuggestions}
                        disabled={isLoadingStickySuggestions || state.rawCSVData.length === 0}
                        className="p-1.5 text-indigo-500 hover:text-indigo-700 disabled:text-zinc-300 transition-colors"
                        title="Suggest missing insights"
                      >
                        {isLoadingStickySuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setIsAddingSticky(true); setThemeSuggestions([]); }}
                      className="px-4 py-2 bg-white border border-zinc-200 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> New Sticky
                    </button>
                  )}
                </div>

                {/* AI Theme Suggestions Dropdown */}
                {themeSuggestions.length > 0 && (
                  <div className="bg-white border border-indigo-200 rounded-lg shadow-lg p-3 max-w-sm animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Suggested Themes
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {themeSuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { addSuggestedTheme(s.name); setNewClusterName(""); }}
                          className="text-left p-2 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all group"
                        >
                          <span className="text-sm font-semibold text-zinc-800 group-hover:text-indigo-700">{s.name}</span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{s.reason}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Sticky Suggestions Dropdown */}
                {stickySuggestions.length > 0 && (
                  <div className="bg-white border border-indigo-200 rounded-lg shadow-lg p-3 max-w-md animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Missing Insights
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {stickySuggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => addSuggestedSticky(s.content, s.type)}
                          className="text-left p-2 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all group"
                        >
                          <span className={cn(
                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                            s.type === 'quantitative' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          )}>{s.type}</span>
                          <p className="text-sm text-zinc-700 mt-1 group-hover:text-indigo-700">{s.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
    <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {state.personas.map((p, idx) => {
            const avatarColors = [
              'from-violet-400 to-indigo-400',
              'from-pink-400 to-rose-400',
              'from-emerald-400 to-teal-400',
              'from-amber-400 to-orange-400',
              'from-cyan-400 to-blue-400',
              'from-fuchsia-400 to-purple-400'
            ];
            const avatarGradient = avatarColors[idx % avatarColors.length];
            const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const isExpanded = expandedPersonaId === p.id;
            const chatHistory = state.chatHistories[p.id] || [];
            const chatInputValue = personaChatInputs[p.id] || "";

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={cn(
                  "rounded-2xl transition-all relative overflow-hidden",
                  isExpanded
                    ? "ring-2 ring-indigo-500 ring-offset-2 shadow-xl shadow-indigo-100/50 col-span-1 md:col-span-2 xl:col-span-2"
                    : "shadow-sm hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                {/* Colored header strip */}
                <div className={cn("h-2 bg-gradient-to-r", avatarGradient)} />

                <div className="bg-white">
                  <div className={cn(
                    isExpanded ? "flex flex-col lg:flex-row" : ""
                  )}>
                    {/* Persona info side */}
                    <div className={cn(
                      "p-5 space-y-3",
                      isExpanded ? "lg:w-1/2 lg:border-r lg:border-zinc-100" : ""
                    )}>
                      {/* Avatar + Name row */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md",
                          avatarGradient
                        )}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base text-zinc-900">{p.name}</h3>
                          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{p.role}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPersonaId(isExpanded ? null : p.id);
                          }}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors shrink-0",
                            isExpanded
                              ? "bg-indigo-100 text-indigo-600"
                              : "hover:bg-zinc-100 text-zinc-400 hover:text-indigo-500"
                          )}
                          title={isExpanded ? "Close chat" : "Open chat"}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bio */}
                      <p className="text-[12px] text-zinc-500 leading-relaxed">
                        {p.bio}
                      </p>

                      {/* Goals */}
                      <div className="bg-emerald-50/70 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Target className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Goals</span>
                        </div>
                        <ul className="space-y-1">
                          {p.goals.map((g, i) => (
                            <li key={i} className="text-[11px] text-emerald-800 flex items-start gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Frustrations */}
                      <div className="bg-rose-50/70 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Frown className="w-3 h-3 text-rose-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Frustrations</span>
                        </div>
                        <ul className="space-y-1">
                          {p.frustrations.map((f, i) => (
                            <li key={i} className="text-[11px] text-rose-800 flex items-start gap-1.5">
                              <AlertCircle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Click hint (only when collapsed) */}
                      {!isExpanded && (
                        <button
                          onClick={() => setExpandedPersonaId(p.id)}
                          className="w-full text-[10px] text-zinc-400 text-center pt-1 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Chat with {p.name.split(' ')[0]}
                        </button>
                      )}
                    </div>

                    {/* Inline chat side (only when expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="lg:w-1/2 flex flex-col border-t lg:border-t-0 border-zinc-100"
                        >
                          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                            <div className={cn(
                              "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold",
                              avatarGradient
                            )}>
                              {initials}
                            </div>
                            <span className="text-xs font-semibold text-zinc-600">Chat with {p.name.split(' ')[0]}</span>
                            {chatHistory.length > 0 && (
                              <span className="text-[10px] text-zinc-400 ml-auto">{chatHistory.length} messages</span>
                            )}
                          </div>

                          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px] max-h-[320px] bg-white">
                            {chatHistory.length === 0 && (
                              <div className="flex items-center justify-center h-full text-zinc-300 text-xs text-center p-4">
                                {state.concepts.length > 0
                                  ? `Pitch your concept to ${p.name.split(' ')[0]} and get their feedback`
                                  : "Add a concept below first, then chat here"}
                              </div>
                            )}
                            {chatHistory.map((msg, i) => (
                              <div key={i} className={cn(
                                "max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed",
                                msg.role === 'user'
                                  ? "ml-auto bg-indigo-600 text-white rounded-br-sm"
                                  : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
                              )}>
                                {msg.content}
                              </div>
                            ))}
                          </div>

                          <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex gap-2">
                            <input
                              value={chatInputValue}
                              onChange={(e) => setPersonaChatInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handlePersonaChat(p)}
                              placeholder={`Ask ${p.name.split(' ')[0]} something...`}
                              className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                            />
                            <button
                              onClick={() => handlePersonaChat(p)}
                              disabled={!chatInputValue.trim()}
                              className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition-all"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Add Persona from Theme card */}
          {state.clusters.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-5 flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-zinc-700">Add Persona from Theme</h3>
                <p className="text-[11px] text-zinc-400 mt-1">Pick a theme to generate a persona for</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {state.clusters.map(c => {
                  const themeColors: Record<string, string> = {
                    red: 'hover:border-red-400 hover:text-red-600 hover:bg-red-50',
                    blue: 'hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50',
                    green: 'hover:border-green-400 hover:text-green-600 hover:bg-green-50',
                    purple: 'hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50'
                  };
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleAddPersonaFromTheme(c)}
                      disabled={isGeneratingPersonas}
                      className={cn(
                        "px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50 shadow-sm",
                        themeColors[c.color] || 'hover:border-indigo-400 hover:text-indigo-600'
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {isGeneratingPersonas && (
                <div className="flex items-center gap-2 text-[11px] text-indigo-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating...
                </div>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* HMW Prompts + Concept Ideas */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Concept Ideas
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newConcept: ConceptIdea = {
                  id: `concept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  name: `Concept ${String.fromCharCode(65 + state.concepts.length)}`,
                  text: "",
                  rank: state.concepts.length + 1,
                  notes: ""
                };
                setState(prev => ({ ...prev, concepts: [...prev.concepts, newConcept] }));
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Concept
            </button>
            <button
              onClick={async () => {
                if (mentorConceptSuggestions.length > 0) {
                  // Pop one from the queue
                  const suggestion = mentorConceptSuggestions[0];
                  const newConcept: ConceptIdea = {
                    id: `suggested-concept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: `Concept ${String.fromCharCode(65 + state.concepts.length)}`,
                    text: suggestion,
                    rank: state.concepts.length + 1,
                    notes: "AI-suggested concept"
                  };
                  setState(prev => ({ ...prev, concepts: [...prev.concepts, newConcept] }));
                  setMentorConceptSuggestions(prev => prev.slice(1));
                } else {
                  // Fetch new suggestions
                  setIsLoadingConceptSuggestions(true);
                  try {
                    const suggestions = await suggestConcepts(
                      state.clusters.map(c => c.name),
                      state.personas,
                      state.concepts.map(c => `${c.name}: ${c.text}`)
                    );
                    if (suggestions.length > 0) {
                      // Add the first one immediately, queue the rest
                      const newConcept: ConceptIdea = {
                        id: `suggested-concept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        name: `Concept ${String.fromCharCode(65 + state.concepts.length)}`,
                        text: suggestions[0],
                        rank: state.concepts.length + 1,
                        notes: "AI-suggested concept"
                      };
                      setState(prev => ({ ...prev, concepts: [...prev.concepts, newConcept] }));
                      setMentorConceptSuggestions(suggestions.slice(1));
                    }
                  } catch (error) {
                    console.error(error);
                  } finally {
                    setIsLoadingConceptSuggestions(false);
                  }
                }
              }}
              disabled={isLoadingConceptSuggestions || (state.clusters.length === 0 && state.personas.length === 0)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md text-sm font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all"
              title={mentorConceptSuggestions.length > 0 ? "Add next AI suggestion" : "Get AI concept suggestions"}
            >
              {isLoadingConceptSuggestions
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              {mentorConceptSuggestions.length > 0
                ? `Add Suggestion (${mentorConceptSuggestions.length})`
                : "Suggest"}
            </button>
          </div>
        </div>

        {/* HMW Inspiration Prompts */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-2.5 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" /> "How Might We..." Prompts for Inspiration
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "How might we use this to improve healthcare access?",
              "How might we empower underserved communities?",
              "How might we reduce friction in everyday tasks?",
              "How might we build trust with first-time users?",
              "How might we make this accessible to non-technical users?",
              "How might we turn frustrations into moments of delight?",
              ...(state.clusters.length > 0
                ? state.clusters.map(c => `How might we address "${c.name}" more effectively?`)
                : [])
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => {
                  const newConcept: ConceptIdea = {
                    id: `concept-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: `Concept ${String.fromCharCode(65 + state.concepts.length)}`,
                    text: prompt + " ",
                    rank: state.concepts.length + 1,
                    notes: ""
                  };
                  setState(prev => ({ ...prev, concepts: [...prev.concepts, newConcept] }));
                }}
                className="text-[11px] px-3 py-1.5 bg-white border border-amber-200 rounded-full text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Concept Cards */}
        {state.concepts.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center text-zinc-400 text-sm">
            No concepts yet. Click "New Concept" or pick a prompt above to start ideating.
          </div>
        ) : (
          <div className="space-y-3">
            {[...state.concepts].sort((a, b) => a.rank - b.rank).map((concept) => (
              <motion.div
                key={concept.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white border rounded-xl overflow-hidden transition-all",
                  concept.rank === 1
                    ? "border-amber-300 ring-1 ring-amber-200 shadow-md"
                    : "border-zinc-200 shadow-sm"
                )}
              >
                <div className="flex items-stretch">
                  {/* Rank column */}
                  <div className={cn(
                    "flex flex-col items-center justify-center px-3 py-4 border-r gap-1",
                    concept.rank === 1
                      ? "bg-amber-50 border-amber-200"
                      : "bg-zinc-50 border-zinc-200"
                  )}>
                    <button
                      onClick={() => {
                        if (concept.rank <= 1) return;
                        setState(prev => ({
                          ...prev,
                          concepts: prev.concepts.map(c => {
                            if (c.id === concept.id) return { ...c, rank: c.rank - 1 };
                            if (c.rank === concept.rank - 1) return { ...c, rank: c.rank + 1 };
                            return c;
                          })
                        }));
                      }}
                      disabled={concept.rank <= 1}
                      className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                      concept.rank === 1
                        ? "bg-amber-400 text-white"
                        : "bg-zinc-200 text-zinc-600"
                    )}>
                      {concept.rank === 1 ? <Star className="w-3.5 h-3.5" /> : concept.rank}
                    </div>
                    <button
                      onClick={() => {
                        if (concept.rank >= state.concepts.length) return;
                        setState(prev => ({
                          ...prev,
                          concepts: prev.concepts.map(c => {
                            if (c.id === concept.id) return { ...c, rank: c.rank + 1 };
                            if (c.rank === concept.rank + 1) return { ...c, rank: c.rank - 1 };
                            return c;
                          })
                        }));
                      }}
                      disabled={concept.rank >= state.concepts.length}
                      className="p-0.5 text-zinc-400 hover:text-indigo-600 disabled:opacity-20 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 space-y-2">
                    {/* Concept name */}
                    <div className="flex items-center gap-2">
                      <input
                        value={concept.name}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          concepts: prev.concepts.map(c => c.id === concept.id ? { ...c, name: e.target.value } : c)
                        }))}
                        className={cn(
                          "font-bold text-sm px-2 py-1 rounded-md border focus:ring-2 focus:ring-indigo-500 focus:outline-none w-48",
                          concept.rank === 1
                            ? "border-amber-300 bg-amber-50 text-amber-800"
                            : "border-zinc-200 bg-zinc-50 text-zinc-800"
                        )}
                        placeholder="Name this concept..."
                      />
                      <span className="text-[10px] text-zinc-300 italic">
                        Mention "{concept.name}" in persona chats to discuss it
                      </span>
                    </div>
                    <textarea
                      value={concept.text}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        concepts: prev.concepts.map(c => c.id === concept.id ? { ...c, text: e.target.value } : c)
                      }))}
                      placeholder="Describe your concept idea..."
                      className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none min-h-[60px]"
                    />
                    <textarea
                      value={concept.notes}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        concepts: prev.concepts.map(c => c.id === concept.id ? { ...c, notes: e.target.value } : c)
                      }))}
                      placeholder="Notes from persona conversations, reasoning for ranking..."
                      className="w-full p-2 border border-zinc-100 rounded-lg text-[11px] text-zinc-500 focus:ring-1 focus:ring-indigo-400 focus:outline-none resize-none min-h-[36px] bg-zinc-50/50"
                    />
                  </div>

                  {/* Delete */}
                  <div className="flex items-start p-3">
                    <button
                      onClick={() => {
                        const removedRank = concept.rank;
                        setState(prev => ({
                          ...prev,
                          concepts: prev.concepts
                            .filter(c => c.id !== concept.id)
                            .map(c => c.rank > removedRank ? { ...c, rank: c.rank - 1 } : c)
                        }));
                      }}
                      className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {state.concepts.length > 0 && (
          <p className="text-[11px] text-zinc-400 text-center">
            Use the arrows to rank concepts. Chat with personas above to test ideas, then note what you learned.
          </p>
        )}
      </section>
    </div>
  );

  const renderEvaluative = () => {
    const avatarColors = [
      'from-violet-400 to-indigo-400',
      'from-pink-400 to-rose-400',
      'from-emerald-400 to-teal-400',
      'from-amber-400 to-orange-400',
      'from-cyan-400 to-blue-400',
      'from-fuchsia-400 to-purple-400'
    ];

    const scoreColor = (score: number, max: number) => {
      const pct = score / max;
      if (pct >= 0.8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
      if (pct >= 0.6) return "text-amber-600 bg-amber-50 border-amber-200";
      return "text-red-600 bg-red-50 border-red-200";
    };

    return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-8">
      {/* Website Evaluation Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Persona Website Evaluation
          </h2>
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-zinc-200 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-50"
          >
            <Download className="w-4 h-4" /> Export Brief
          </button>
        </div>

        {/* URL Input */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
              <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                value={state.evaluativeUrl}
                onChange={(e) => setState(prev => ({ ...prev, evaluativeUrl: e.target.value }))}
                placeholder="Enter website URL to evaluate (e.g., https://example.com)"
                className="flex-1 text-sm focus:outline-none"
              />
              {state.evaluativeUrl && (
                <a href={state.evaluativeUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-indigo-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <button
              onClick={handleRunEvaluations}
              disabled={isEvaluating || !state.evaluativeUrl.trim() || state.personas.length === 0}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {isEvaluating ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</> : "Run Evaluation"}
            </button>
          </div>
          {state.personas.length === 0 && (
            <p className="text-[11px] text-amber-600">Generate personas in the Generative phase first.</p>
          )}
          {isEvaluating && (
            <div className="flex items-center gap-2 text-xs text-indigo-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Evaluating with {state.personas.length} persona{state.personas.length !== 1 ? 's' : ''}... This may take a moment.
            </div>
          )}
        </div>

        {/* Evaluation Results */}
        {state.personaEvaluations.length > 0 && (
          <div className="space-y-4">
            {/* Average score summary */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {(state.personaEvaluations.reduce((sum, e) => sum + e.satisfactionScore, 0) / state.personaEvaluations.length).toFixed(1)}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Avg Satisfaction</div>
              </div>
              <div className="flex-1 flex flex-wrap gap-2">
                {state.personaEvaluations.map((evalResult) => {
                  const persona = state.personas.find(p => p.id === evalResult.personaId);
                  const pIdx = state.personas.findIndex(p => p.id === evalResult.personaId);
                  return (
                    <div key={evalResult.personaId} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-zinc-200 text-xs">
                      <div className={cn("w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[8px] font-bold", avatarColors[pIdx % avatarColors.length])}>
                        {persona?.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <span className="font-medium text-zinc-700">{persona?.name.split(' ')[0]}</span>
                      <span className={cn("font-bold px-1.5 py-0.5 rounded border text-[10px]", scoreColor(evalResult.satisfactionScore, 10))}>
                        {evalResult.satisfactionScore}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual persona evaluation cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {state.personaEvaluations.map((evalResult) => {
                const persona = state.personas.find(p => p.id === evalResult.personaId);
                if (!persona) return null;
                const pIdx = state.personas.findIndex(p => p.id === evalResult.personaId);
                const avatarGradient = avatarColors[pIdx % avatarColors.length];
                const initials = persona.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const isExpanded = expandedEvalPersonaId === evalResult.personaId;
                const evalChatHistory = state.evalChatHistories[persona.id] || [];
                const evalChatInput = evalChatInputs[persona.id] || "";

                return (
                  <motion.div
                    key={evalResult.personaId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "bg-white border rounded-2xl overflow-hidden transition-all",
                      isExpanded ? "col-span-1 xl:col-span-2 ring-2 ring-indigo-500 ring-offset-2 shadow-xl" : "shadow-sm hover:shadow-md"
                    )}
                  >
                    <div className={cn("h-1.5 bg-gradient-to-r", avatarGradient)} />

                    <div className={cn(isExpanded ? "flex flex-col lg:flex-row" : "")}>
                      {/* Evaluation info */}
                      <div className={cn("p-5 space-y-3", isExpanded ? "lg:w-1/2 lg:border-r lg:border-zinc-100" : "")}>
                        {/* Header */}
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md", avatarGradient)}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-zinc-900">{persona.name}</h3>
                            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{persona.role}</p>
                          </div>
                          <div className={cn("text-2xl font-bold px-3 py-1 rounded-lg border", scoreColor(evalResult.satisfactionScore, 10))}>
                            {evalResult.satisfactionScore}<span className="text-xs font-normal opacity-60">/10</span>
                          </div>
                          <button
                            onClick={() => setExpandedEvalPersonaId(isExpanded ? null : evalResult.personaId)}
                            className={cn("p-1.5 rounded-lg transition-colors shrink-0", isExpanded ? "bg-indigo-100 text-indigo-600" : "hover:bg-zinc-100 text-zinc-400 hover:text-indigo-500")}
                            title={isExpanded ? "Close interview" : "Interview this persona"}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Summary */}
                        <p className="text-[12px] text-zinc-600 leading-relaxed">{evalResult.summary}</p>

                        {/* Issues & Positives side by side */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-red-50/70 rounded-lg p-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 flex items-center gap-1 mb-1.5">
                              <AlertCircle className="w-3 h-3" /> Top Issues
                            </span>
                            <ul className="space-y-1">
                              {evalResult.topIssues?.map((issue, i) => (
                                <li key={i} className="text-[11px] text-red-800">{issue}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-emerald-50/70 rounded-lg p-2.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 mb-1.5">
                              <CheckCircle2 className="w-3 h-3" /> Positives
                            </span>
                            <ul className="space-y-1">
                              {evalResult.positives?.map((pos, i) => (
                                <li key={i} className="text-[11px] text-emerald-800">{pos}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Heuristic scores */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Heuristic Scores</span>
                          <div className="grid grid-cols-2 gap-1">
                            {evalResult.heuristics?.map((h, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px]" title={h.comment}>
                                <div className="flex gap-px">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <div key={n} className={cn("w-2 h-2 rounded-sm", n <= h.score ? "bg-indigo-500" : "bg-zinc-200")} />
                                  ))}
                                </div>
                                <span className="text-zinc-600 truncate">{h.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {!isExpanded && (
                          <button
                            onClick={() => setExpandedEvalPersonaId(evalResult.personaId)}
                            className="w-full text-[10px] text-zinc-400 text-center pt-1 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Interview {persona.name.split(' ')[0]} about their evaluation
                          </button>
                        )}
                      </div>

                      {/* Inline chat (expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="lg:w-1/2 flex flex-col border-t lg:border-t-0 border-zinc-100"
                          >
                            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                              <div className={cn("w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[9px] font-bold", avatarGradient)}>
                                {initials}
                              </div>
                              <span className="text-xs font-semibold text-zinc-600">Interview {persona.name.split(' ')[0]}</span>
                              {evalChatHistory.length > 0 && (
                                <span className="text-[10px] text-zinc-400 ml-auto">{evalChatHistory.length} messages</span>
                              )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px] max-h-[320px] bg-white">
                              {evalChatHistory.length === 0 && (
                                <div className="flex items-center justify-center h-full text-zinc-300 text-xs text-center p-4">
                                  Ask {persona.name.split(' ')[0]} about their {evalResult.satisfactionScore}/10 score, specific issues, or what would improve their experience
                                </div>
                              )}
                              {evalChatHistory.map((msg, i) => (
                                <div key={i} className={cn(
                                  "max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed",
                                  msg.role === 'user' ? "ml-auto bg-indigo-600 text-white rounded-br-sm" : "bg-zinc-100 text-zinc-800 rounded-bl-sm"
                                )}>
                                  {msg.content}
                                </div>
                              ))}
                            </div>
                            <div className="p-2.5 bg-zinc-50 border-t border-zinc-100 flex gap-2">
                              <input
                                value={evalChatInput}
                                onChange={(e) => setEvalChatInputs(prev => ({ ...prev, [persona.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleEvalChat(persona)}
                                placeholder={`Ask about their evaluation...`}
                                className="flex-1 px-3 py-1.5 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                              />
                              <button
                                onClick={() => handleEvalChat(persona)}
                                disabled={!evalChatInput.trim()}
                                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 transition-all"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Test Plan Builder (existing) */}
      <section className="space-y-6 pt-4 border-t border-zinc-200">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-indigo-600" />
          Test Plan Builder
        </h2>
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
  };

  return (
    <div className="flex h-screen bg-white text-zinc-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar Navigation */}
      <div className="w-20 border-r border-zinc-200 flex flex-col items-center py-8 space-y-8 bg-zinc-50">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Layout className="w-6 h-6" />
        </div>
        
        <nav className="flex-1 flex flex-col space-y-4">
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'exploratory', rigorCheckPassed: false, lastAssessment: undefined, mentorMessages: [{ role: 'mentor', content: "Switched to Exploratory phase. Run a rigor check when you're ready.", timestamp: Date.now() }] }))}
            className={cn(
              "p-3 rounded-xl transition-all",
              state.currentPhase === 'exploratory' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Search className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'generative', rigorCheckPassed: false, lastAssessment: undefined, mentorMessages: [{ role: 'mentor', content: "Switched to Generative phase. Create concepts and chat with personas, then run a rigor check.", timestamp: Date.now() }] }))}
            className={cn(
              "p-3 rounded-xl transition-all",
              state.currentPhase === 'generative' ? "bg-white shadow-sm text-indigo-600 ring-1 ring-zinc-200" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <Brain className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setState(prev => ({ ...prev, currentPhase: 'evaluative', rigorCheckPassed: false, lastAssessment: undefined, mentorMessages: [{ role: 'mentor', content: "Switched to Evaluative phase. Build your test plan and run simulations.", timestamp: Date.now() }] }))}
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
