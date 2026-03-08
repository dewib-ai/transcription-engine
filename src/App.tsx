import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, FileAudio, FileVideo, Copy, Loader2, AlertCircle, Check, FileText, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Format = 'Markdown' | 'Plain Text';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [format, setFormat] = useState<Format | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleTranscribe = async () => {
    if (!file || !format) return;

    setIsTranscribing(true);
    setError('');
    setResult('');
    setStep(3);

    try {
      const promptText = `You are a High-Fidelity Local Media Transcriber. Your purpose is to convert uploaded audio or video files into a 100% accurate text record.

Task: Transcribe the uploaded media file word-for-word. Do not summarize, do not "clean" the speech, and do not add any introductory or concluding remarks.

Formatting Rules:
1. Format Selection: The requested format is ${format}.
   - If Markdown: Use bolding for speaker names and clear headers.
   - If Plain Text: Provide raw text only, removing all Markdown syntax (no asterisks or hashes).
2. Multiple Speakers: 
   - If Markdown: [HH:MM:SS] **Speaker Name**: "Spoken text..."
   - If Plain Text: [HH:MM:SS] Speaker Name: "Spoken text..."
3. Single Speaker: Provide the text as a continuous block. Do not include timestamps or speaker labels for single-speaker content.
4. Accuracy: Transcribe every word exactly as heard. If a word is 100% indistinguishable, use [inaudible hh:mm:ss].

Constraints:
- Strictly No Meta-Talk: Do not add any of your own commentary (e.g., "Here is your transcript"). Output ONLY the transcribed text.
- Strict Verbatim: Do not correct grammar or remove fillers. Transcribe exactly "as is."`;

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      
      const contents = [
        {
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            },
            { text: promptText }
          ]
        }
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: contents,
      });

      setResult(response.text || 'No transcription generated.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during transcription. The file might be too large.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setStep(1);
    setFormat(null);
    setFile(null);
    setResult('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30 py-12">
      <div className="max-w-4xl mx-auto p-6 lg:p-12">
        <header className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">High-Fidelity Transcriber</h1>
          <p className="text-zinc-400">100% accurate, strict verbatim local media transcription.</p>
        </header>
        
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-sm min-h-[400px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col justify-center"
              >
                <h2 className="text-xl font-medium mb-8 flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold">1</span>
                  Select Output Format
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                  {[
                    { id: 'Markdown', icon: FileText, desc: 'Formatted text with bolding and structure' },
                    { id: 'Plain Text', icon: AlignLeft, desc: 'Raw unformatted text' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setFormat(f.id as Format); setStep(2); }}
                      className="flex flex-col items-start p-6 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
                    >
                      <f.icon className="w-8 h-8 mb-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <span className="font-medium text-lg mb-2">{f.id}</span>
                      <span className="text-sm text-zinc-500 leading-relaxed">{f.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-medium flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold">2</span>
                    Upload your media
                  </h2>
                  <button onClick={() => setStep(1)} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                    &larr; Back to Format
                  </button>
                </div>

                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors cursor-pointer flex-1 flex flex-col items-center justify-center min-h-[200px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="audio/*,video/*"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      {file.type.startsWith('video') ? <FileVideo className="w-12 h-12 text-emerald-400 mb-4" /> : <FileAudio className="w-12 h-12 text-emerald-400 mb-4" />}
                      <span className="font-medium text-zinc-200 text-lg">{file.name}</span>
                      <span className="text-sm text-zinc-500 mt-2">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-zinc-500 mb-4" />
                      <span className="font-medium text-zinc-300 mb-2 text-lg">Click or drag to upload</span>
                      <span className="text-sm text-zinc-500">Supports Audio and Video files (Max ~20MB)</span>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleTranscribe}
                    disabled={!file}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Start Transcription
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-medium flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-bold">3</span>
                    Transcription Result
                  </h2>
                  {!isTranscribing && (
                    <button onClick={reset} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                      Start Over
                    </button>
                  )}
                </div>

                {isTranscribing ? (
                  <div className="flex flex-col items-center justify-center py-20 flex-1">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6" />
                    <p className="text-zinc-300 font-medium text-lg animate-pulse">Processing media and transcribing...</p>
                    <p className="text-sm text-zinc-500 mt-3">This may take a few moments depending on the media length.</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-start gap-4 flex-1">
                    <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-red-400 font-medium mb-2 text-lg">Transcription Failed</h3>
                      <p className="text-red-300/80">{error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                        <span className="px-3 py-1 bg-zinc-950 rounded-full text-xs font-medium text-zinc-400 border border-zinc-800">
                          Format: {format}
                        </span>
                        {file && (
                          <span className="px-3 py-1 bg-zinc-950 rounded-full text-xs font-medium text-zinc-400 border border-zinc-800 truncate max-w-[200px]">
                            File: {file.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg border border-zinc-700"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Output'}
                      </button>
                    </div>
                    
                    <div className="bg-black border border-zinc-700 rounded-xl p-6 overflow-x-auto flex-1 min-h-[300px] shadow-inner">
                      <pre className="text-base text-zinc-50 font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {result}
                      </pre>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
