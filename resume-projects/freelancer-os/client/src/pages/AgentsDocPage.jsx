import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Download,
  Copy,
  Check,
  Sparkles,
  FileCode,
  ShieldCheck,
  FolderGit2,
  RefreshCw,
  ExternalLink,
  Lock,
  Zap
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useQuickModalStore } from '../store/useQuickModalStore';
import { getProfessionConfig } from '../config/professions';
import { getClientSubscription } from '../lib/subscription';

export function AgentsDocPage() {
  const { user } = useAuthStore();
  const { openModal } = useQuickModalStore();
  const profConfig = getProfessionConfig(user?.field);
  const docName = profConfig.artifactName || 'AGENTS.md';

  const [projects, setProjects] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedSource, setSelectedSource] = useState('latest');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isLocked = false;

  useEffect(() => {
    async function init() {
      try {
        const [pRes, aRes] = await Promise.all([
          api.getProjects(),
          api.getAnalyses(),
        ]);

        const projs = pRes?.projects || [];
        const ans = aRes?.analyses || [];
        setProjects(projs);
        setAnalyses(ans);

        if (projs.length > 0) {
          setSelectedSource(`proj:${projs[0].id}`);
          generateDoc({ projectId: projs[0].id });
        } else if (ans.length > 0) {
          setSelectedSource(`analysis:${ans[0].id}`);
          generateDoc({ analysisId: ans[0].id });
        } else {
          setSelectedSource('default');
          generateDoc({});
        }
      } catch (err) {
        console.error('Failed to load projects/analyses for instructions:', err);
        generateDoc({});
      }
    }
    init();
  }, []);

  const generateDoc = async (payload = {}) => {
    try {
      setIsGenerating(true);
      setErrorMsg(null);
      const res = await api.generateAgentsDoc(payload);
      if (res?.markdown) {
        setMarkdownContent(res.markdown);
      }
    } catch (err) {
      console.error('Failed to generate instructions document:', err);
      setErrorMsg(err.message || 'Failed to generate document');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSourceSelect = (e) => {
    const val = e.target.value;
    setSelectedSource(val);
    if (val.startsWith('proj:')) {
      generateDoc({ projectId: val.replace('proj:', '') });
    } else if (val.startsWith('analysis:')) {
      generateDoc({ analysisId: val.replace('analysis:', '') });
    } else {
      generateDoc({});
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', docName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-charcoal-200/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-brand">Key Differentiator</span>
            <span className="badge-neutral text-[10px]">{profConfig.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal-900 mt-1">
            Client-Specific {docName} Generator
          </h1>
          <p className="text-sm text-charcoal-500">
            {profConfig.instructionsDocType} tailored to the client's approved scope.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`btn-secondary text-xs flex items-center gap-1.5 ${isLocked ? 'border-amber-300 text-amber-800 bg-amber-50/50' : ''}`}
          >
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            ) : copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{isLocked ? (sub.isExpired ? 'Copy (Plan Expired)' : 'Copy (Unlock Pro)') : copied ? 'Copied to Clipboard' : `Copy ${docName}`}</span>
          </button>
          <button
            onClick={handleDownload}
            className={`btn-primary text-xs flex items-center gap-1.5 ${isLocked ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isLocked ? (sub.isExpired ? `Download (Renew Plan)` : `Download ${docName} (Pro)`) : `Download ${docName}`}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs sm:text-sm">
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="card-premium p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FolderGit2 className="w-5 h-5 text-brand-600 shrink-0" />
          <span className="text-xs font-bold text-charcoal-700">Source Scope:</span>
          <select
            value={selectedSource}
            onChange={handleSourceSelect}
            className="input-field text-xs py-1.5 w-72"
          >
            {projects.length > 0 && (
              <optgroup label="Active Projects">
                {projects.map(p => (
                  <option key={p.id} value={`proj:${p.id}`}>{p.title}</option>
                ))}
              </optgroup>
            )}
            {analyses.length > 0 && (
              <optgroup label="AI Scoped Requirements">
                {analyses.map(a => (
                  <option key={a.id} value={`analysis:${a.id}`}>{a.projectTitle}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Workspace Defaults">
              <option value="default">Workspace Platform Template</option>
            </optgroup>
          </select>
        </div>

        <button
          onClick={() => {
            if (selectedSource.startsWith('proj:')) {
              generateDoc({ projectId: selectedSource.replace('proj:', '') });
            } else if (selectedSource.startsWith('analysis:')) {
              generateDoc({ analysisId: selectedSource.replace('analysis:', '') });
            } else {
              generateDoc({});
            }
          }}
          disabled={isGenerating}
          className="btn-ghost text-xs flex items-center gap-1.5 text-brand-700 hover:bg-brand-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>Regenerate Document</span>
        </button>
      </div>

      {/* Markdown Document Studio */}
      <div className="card-premium overflow-hidden border-charcoal-200">
        <div className="bg-charcoal-50 px-6 py-3 border-b border-charcoal-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-charcoal-700">
            <FileCode className="w-4 h-4 text-charcoal-500" />
            <span>AGENTS.md</span>
          </div>
          <span className="text-[11px] text-charcoal-500 font-mono">
            {markdownContent.length} bytes • Markdown format
          </span>
        </div>

        <div className="p-6 bg-white overflow-x-auto">
          <pre className="font-mono text-xs text-charcoal-800 leading-relaxed whitespace-pre-wrap select-text">
            {markdownContent || 'Loading generated instructions...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
