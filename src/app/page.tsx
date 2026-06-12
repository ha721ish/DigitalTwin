"use client";

import React, { useState, useEffect } from "react";

interface Twin {
  id: string;
  name: string;
  tone: "Professional" | "Casual" | "Witty";
  knowledgeBase: string;
  createdAt: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  isParsing?: boolean;
  error?: string;
}

interface Message {
  id: string;
  sender: "user" | "twin";
  text: string;
  timestamp: Date;
}

export default function CreatorDashboard() {
  // Form State
  const [name, setName] = useState("");
  const [tone, setTone] = useState<"Professional" | "Casual" | "Witty">("Professional");
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const [errors, setErrors] = useState<{ name?: string; knowledgeBase?: string }>({});

  // File Upload State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Application State
  const [twins, setTwins] = useState<Twin[]>([]);
  const [selectedTwinId, setSelectedTwinId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load twins from localStorage on mount
  useEffect(() => {
    const savedTwins = localStorage.getItem("expert_twins");
    if (savedTwins) {
      try {
        const parsed = JSON.parse(savedTwins) as Twin[];
        setTwins(parsed);
        if (parsed.length > 0) {
          setSelectedTwinId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load twins from local storage", e);
      }
    }
  }, []);

  // Save twins to localStorage when twins state changes
  const saveTwins = (updatedTwins: Twin[]) => {
    setTwins(updatedTwins);
    localStorage.setItem("expert_twins", JSON.stringify(updatedTwins));
  };

  // Find active twin
  const activeTwin = twins.find((t) => t.id === selectedTwinId) || null;

  // Initialize chat when selected twin changes
  useEffect(() => {
    if (activeTwin) {
      const greetingText =
        activeTwin.tone === "Professional"
          ? `Hello, I am ${activeTwin.name}. I have been synthesized with my creator's knowledge base. How may I assist you with professional inquiries today?`
          : activeTwin.tone === "Witty"
          ? `Behold! The digital clone of ${activeTwin.name} is online. Ask me anything, though my answers might be slightly smarter than my creator's!`
          : `Hey! I'm ${activeTwin.name}'s twin. Let's chat! What's on your mind?`;

      setChatMessages([
        {
          id: "greeting",
          sender: "twin",
          text: greetingText,
          timestamp: new Date(),
        },
      ]);
    } else {
      setChatMessages([]);
    }
  }, [selectedTwinId, activeTwin]);

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setFileError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const filesArray = Array.from(files);
    const validTypes = [".txt", ".md", ".pdf"];

    filesArray.forEach(async (file) => {
      const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!validTypes.includes(extension)) {
        setFileError(`Unsupported file format: ${file.name}. Only .txt, .md, and .pdf are allowed.`);
        return;
      }

      // Check if file already added
      if (uploadedFiles.some((f) => f.name === file.name)) {
        setFileError(`File "${file.name}" has already been uploaded.`);
        return;
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: extension,
        content: "",
        isParsing: extension === ".pdf",
      };

      // Add to state immediately
      setUploadedFiles((prev) => [...prev, newFile]);

      if (extension === ".txt" || extension === ".md") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, content, isParsing: false } : f))
          );
        };
        reader.onerror = () => {
          setFileError(`Failed to read file: ${file.name}`);
          setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
        };
        reader.readAsText(file);
      } else if (extension === ".pdf") {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/extract-pdf", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Failed to extract text from PDF");
          }

          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, content: data.text, isParsing: false } : f
            )
          );
        } catch (err: any) {
          console.error("PDF parsing error:", err);
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, error: err.message || "Failed to parse PDF", isParsing: false }
                : f
            )
          );
        }
      }
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Combine manual textarea text with file contents
  const getCombinedKnowledge = () => {
    let combined = knowledgeBase.trim();
    uploadedFiles.forEach((file) => {
      if (file.content) {
        combined += `\n\n[File Content: ${file.name}]\n${file.content}`;
      }
    });
    return combined;
  };

  // Form Validation
  const validateForm = () => {
    const newErrors: { name?: string; knowledgeBase?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Expert name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const combined = getCombinedKnowledge();
    if (!combined.trim()) {
      newErrors.knowledgeBase = "Knowledge base text or uploaded files are required";
    } else if (combined.trim().length < 20) {
      newErrors.knowledgeBase = "Combined knowledge base must be at least 20 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission / Generate Twin
  const handleGenerateTwin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsGenerating(true);

    // Simulate synthesis delay for premium feel
    setTimeout(() => {
      const newTwin: Twin = {
        id: `twin-${Date.now()}`,
        name: name.trim(),
        tone,
        knowledgeBase: getCombinedKnowledge(),
        createdAt: new Date().toLocaleString(),
      };

      const updatedTwins = [newTwin, ...twins];
      saveTwins(updatedTwins);
      setSelectedTwinId(newTwin.id);

      // Reset form
      setName("");
      setTone("Professional");
      setKnowledgeBase("");
      setUploadedFiles([]); // Clear uploaded files
      setFileError(null);   // Clear file errors
      setIsGenerating(false);

      setSuccessMessage(`Successfully synthesized digital twin: ${newTwin.name}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 1800);
  };

  // Handle deleting a twin
  const handleDeleteTwin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = twins.filter((t) => t.id !== id);
    saveTwins(updated);
    if (selectedTwinId === id) {
      setSelectedTwinId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Handle Sending Chat Messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim() || !activeTwin) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: currentMessage.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const originalInput = currentMessage;
    setCurrentMessage("");
    setIsTyping(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: originalInput,
          name: activeTwin.name,
          tone: activeTwin.tone,
          knowledgeBase: activeTwin.knowledgeBase,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI twin");
      }

      // Check if server is running in fallback mode
      setIsFallbackMode(!!data.fallback);

      const twinMsg: Message = {
        id: `msg-twin-${Date.now()}`,
        sender: "twin",
        text: data.response,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, twinMsg]);
    } catch (err: any) {
      console.error("Chat API error:", err);
      setErrorMsg(err.message || "Failed to connect to the twin server.");
      
      // Post the error message in the chat feed
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "twin",
          text: `⚠️ Error: ${err.message || "Failed to connect to the digital twin server."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-950/15 blur-[120px] pointer-events-none" />

      {/* Navbar Header */}
      <header className="border-b border-zinc-900 py-5 px-6 md:px-12 flex justify-between items-center bg-[#070708]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="font-mono font-bold text-black text-lg">ET</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Expert Twin
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">DIGITAL TWIN ENGINE v1.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Side: Creator Form (5 Columns) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass p-6 md:p-8 rounded-2xl glow-purple relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent pointer-events-none" />
            
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Creator Dashboard
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Synthesize a cognitive digital replica by setting your tone and uploading your knowledge base.
            </p>

            <form onSubmit={handleGenerateTwin} className="flex flex-col gap-5">
              {/* Expert Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase" htmlFor="expert-name">
                  Expert Name
                </label>
                <input
                  id="expert-name"
                  type="text"
                  placeholder="e.g., Dr. Aris Thorne"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className={`w-full px-4 py-3 rounded-xl bg-zinc-900/60 border ${
                    errors.name ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-purple-500"
                  } text-white text-sm placeholder-zinc-500 focus:outline-none transition-colors duration-200`}
                  disabled={isGenerating}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Tone of Voice */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase" htmlFor="tone-select">
                  Tone of Voice
                </label>
                <div className="relative">
                  <select
                    id="tone-select"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800 focus:border-purple-500 text-white text-sm focus:outline-none appearance-none cursor-pointer transition-colors duration-200"
                    disabled={isGenerating}
                  >
                    <option value="Professional">👔 Professional — Structured, formal, precise</option>
                    <option value="Casual">☕ Casual — Conversational, friendly, accessible</option>
                    <option value="Witty">✨ Witty — Clever, engaging, humorous</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Knowledge Base */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase" htmlFor="knowledge-base">
                    Knowledge Base
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {knowledgeBase.length} chars
                  </span>
                </div>
                <textarea
                  id="knowledge-base"
                  placeholder="Paste articles, documents, or personal write-ups. The digital twin will use this data to generate its answers (Min 20 characters)..."
                  value={knowledgeBase}
                  onChange={(e) => {
                    setKnowledgeBase(e.target.value);
                    if (errors.knowledgeBase) setErrors({ ...errors, knowledgeBase: undefined });
                  }}
                  className={`w-full h-44 px-4 py-3 rounded-xl bg-zinc-900/60 border ${
                    errors.knowledgeBase ? "border-red-500/50 focus:border-red-500" : "border-zinc-800 focus:border-purple-500"
                  } text-white text-sm placeholder-zinc-500 focus:outline-none transition-colors duration-200 resize-none custom-scrollbar`}
                  disabled={isGenerating}
                />
                {errors.knowledgeBase && <p className="text-red-400 text-xs mt-1">{errors.knowledgeBase}</p>}
              </div>

              {/* File Upload Zone */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-300 tracking-wider uppercase">
                  Training Materials
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`w-full p-6 rounded-xl border-2 border-dashed transition-all duration-200 text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    dragActive
                      ? "border-purple-500 bg-purple-950/10"
                      : "border-zinc-800 hover:border-purple-500/40 hover:bg-purple-950/5"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isGenerating}
                  />
                  <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-xs text-zinc-400 font-medium">
                    Drag & drop files here, or <span className="text-purple-400 hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono">Supports .txt, .md, .pdf</p>
                </div>
                {fileError && <p className="text-red-400 text-xs mt-1">{fileError}</p>}
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">
                    Uploaded Files ({uploadedFiles.length})
                  </h4>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex justify-between items-center p-2.5 rounded-lg bg-zinc-900/40 border text-xs transition-colors ${
                          file.error ? "border-red-900/50 bg-red-950/5" : "border-zinc-850 hover:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">
                            {file.isParsing ? (
                              <span className="block animate-spin text-sm">⏳</span>
                            ) : file.type === ".pdf" ? (
                              "📄"
                            ) : (
                              "📝"
                            )}
                          </span>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-medium text-zinc-300 truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              {file.isParsing ? (
                                <span className="text-purple-400">Extracting PDF text...</span>
                              ) : file.error ? (
                                <span className="text-red-400">{file.error}</span>
                              ) : (
                                `${(file.size / 1024).toFixed(1)} KB ${
                                  file.content ? `(${file.content.length} chars parsed)` : ""
                                }`
                              )}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition-colors flex-shrink-0 ml-2"
                          title="Remove File"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={isGenerating || uploadedFiles.some((f) => f.isParsing)}
                className="w-full mt-2 py-3.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Synthesizing Twin Neural Net...</span>
                  </>
                ) : uploadedFiles.some((f) => f.isParsing) ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Parsing Uploaded PDFs...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate Twin</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Toast Success Message */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2 animate-bounce">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
            </div>
          )}
        </section>

        {/* Right Side: Saved Twins & Sandbox (7 Columns) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {twins.length === 0 ? (
            /* Empty State */
            <div className="glass flex-1 flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-2xl min-h-[450px]">
              <div className="w-20 h-20 rounded-full bg-zinc-900/60 border border-zinc-800 flex items-center justify-center mb-6 glow-cyan">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Twins Synthesized Yet</h3>
              <p className="text-sm text-zinc-400 max-w-sm mb-6">
                Use the Creator Dashboard on the left to set up details and synthesize your first Digital Twin.
              </p>
              <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/40 px-3 py-1.5 rounded border border-zinc-800">
                AWAITING NEURAL SYNTHESIS...
              </div>
            </div>
          ) : (
            /* Dashboard Workspace */
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Twin List Carousel / Horizontal Scroll */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
                  Synthesized Digital Twins ({twins.length})
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar snap-x">
                  {twins.map((twin) => (
                    <div
                      key={twin.id}
                      onClick={() => setSelectedTwinId(twin.id)}
                      className={`flex-shrink-0 w-64 p-4 rounded-xl cursor-pointer snap-start transition-all duration-300 ${
                        selectedTwinId === twin.id
                          ? "bg-zinc-900 border-2 border-purple-500 shadow-md shadow-purple-500/5"
                          : "bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-xs font-bold text-purple-400">
                            {twin.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white truncate max-w-[140px]">
                              {twin.name}
                            </h4>
                            <span className="text-[10px] text-zinc-500 block font-mono">
                              {twin.tone} Tone
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteTwin(twin.id, e)}
                          title="Delete Twin"
                          className="p-1 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Snippet of Knowledge */}
                      <p className="text-xs text-zinc-400 line-clamp-2 bg-black/30 p-2 rounded border border-zinc-950 font-mono mb-2">
                        {twin.knowledgeBase}
                      </p>
                      
                      <div className="text-[9px] text-zinc-500 font-mono flex justify-between items-center">
                        <span>CREATED:</span>
                        <span>{twin.createdAt.split(",")[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Sandbox Console */}
              {activeTwin && (
                <div className="glass flex-1 rounded-2xl flex flex-col glow-cyan overflow-hidden min-h-[400px]">
                  {/* Chat Console Header */}
                  <div className="border-b border-zinc-900 px-5 py-4 bg-zinc-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Sandbox Chat: {activeTwin.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          STATUS: ACTIVE_SYNC | TONE: {activeTwin.tone.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 font-mono uppercase">
                      Memory Sandbox
                    </div>
                  </div>
                  
                  {/* Fallback Mode Warning Banner */}
                  {isFallbackMode && (
                    <div className="bg-amber-950/20 border-b border-amber-500/20 px-5 py-2 text.5 text-amber-400/90 flex items-center justify-between font-mono text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        API Key not set. Using local simulation fallback.
                      </span>
                      <span className="text-[9px] text-zinc-500 hidden sm:inline">Add key to .env.local and restart</span>
                    </div>
                  )}

                  {/* Messages Log */}
                  <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 max-h-[300px] min-h-[220px] custom-scrollbar bg-black/10">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                        }`}
                      >
                        <span className="text-[9px] text-zinc-500 mb-1 font-mono">
                          {msg.sender === "user" ? "YOU" : activeTwin.name.toUpperCase()}
                        </span>
                        <div
                          className={`p-3 rounded-2xl text-sm ${
                            msg.sender === "user"
                              ? "bg-purple-600/20 text-purple-100 border border-purple-500/20 rounded-tr-none"
                              : "bg-zinc-900/90 text-zinc-200 border border-zinc-800 rounded-tl-none"
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="self-start items-start flex flex-col max-w-[85%]">
                        <span className="text-[9px] text-zinc-500 mb-1 font-mono">
                          {activeTwin.name.toUpperCase()} IS TYPING
                        </span>
                        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 rounded-tl-none flex gap-1.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input Footer */}
                  <form onSubmit={handleSendMessage} className="border-t border-zinc-900 p-4 bg-zinc-950/60 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Ask ${activeTwin.name} something about their knowledge...`}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      disabled={isTyping}
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800 focus:border-cyan-500 text-white text-sm focus:outline-none transition-colors duration-200 placeholder-zinc-500"
                    />
                    <button
                      type="submit"
                      disabled={!currentMessage.trim() || isTyping}
                      className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 bg-[#030303]">
        <p>© 2026 Expert Twin Engine. Built client-side using Next.js & Tailwind CSS.</p>
      </footer>
    </div>
  );
}
