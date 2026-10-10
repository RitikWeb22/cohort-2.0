import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, UserPlus, ArrowRight, Loader2, Zap } from 'lucide-react';
import { useQuickModalStore } from '../../store/useQuickModalStore';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../lib/api';
import { getProfessionConfig } from '../../config/professions';
import { getClientSubscription } from '../../lib/subscription';

export function NewProjectModal() {
  const { isOpen, activeTab, closeModal, openModal } = useQuickModalStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const profConfig = getProfessionConfig(user?.field);

  const [existingClients, setExistingClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [projectType, setProjectType] = useState(profConfig.categories[0]?.id || 'custom-web-apps');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const sub = getClientSubscription(user);
  const clientLimit = sub.effectivePlan === 'free' ? 2 : sub.effectivePlan === 'solo' ? 10 : Infinity;

  useEffect(() => {
    if (isOpen) {
      if (profConfig?.categories?.length > 0) {
        setProjectType(profConfig.categories[0].id);
      }
      api.getClients().then((res) => {
        if (res?.clients) {
          setExistingClients(res.clients);
          if (res.clients.length > 0) {
            setSelectedClientId(res.clients[0].id);
          } else {
            setSelectedClientId('new');
          }
        }
      }).catch(() => {});
    }
  }, [isOpen, user?.field]);

  if (!isOpen || activeTab !== 'quick_project') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectBrief.trim()) {
      setError('Please provide client requirements, email, chat, or project brief');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      let clientId = selectedClientId === 'new' ? null : selectedClientId;

      // Create new client if 'new' is selected and name provided
      if (selectedClientId === 'new' && clientName.trim()) {

        const clientRes = await api.createClient({
          name: clientName,
          company: clientName,
          email: clientEmail,
          status: 'lead',
        });
        if (clientRes?.client) {
          clientId = clientRes.client.id;
        }
      }

      // 2. Run AI Requirement Analysis
      const analysisRes = await api.createAnalysis({
        rawText: projectBrief,
        clientId,
        projectType,
      });

      closeModal();
      setClientName('');
      setClientEmail('');
      setProjectBrief('');

      if (analysisRes?.analysis?.id) {
        navigate(`/analyzer?id=${analysisRes.analysis.id}`);
      } else {
        navigate('/analyzer');
      }
    } catch (err) {
      setError(err.message || 'Failed to start project analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-charcoal-200 shadow-modal w-full max-w-xl overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between bg-charcoal-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-charcoal-900">New Client Project</h2>
                <span className="text-[10px] text-brand-700 font-semibold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                  {profConfig.shortName}
                </span>
              </div>
              <p className="text-xs text-charcoal-500">
                Ingest {profConfig.shortName.toLowerCase()} brief, extract scope & estimate quotation
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="p-1 rounded-lg text-charcoal-400 hover:text-charcoal-600 hover:bg-charcoal-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Client Assignment
            </label>
            {existingClients.length > 0 ? (
              <div className="space-y-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="input-field text-xs font-medium"
                >
                  {existingClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''}
                    </option>
                  ))}
                  <option value="new">
                    + Add New Client {isFreePlan && existingClients.length >= 2 ? '(Free Limit: 2/2 Reached)' : ''}
                  </option>
                </select>

                {selectedClientId === 'new' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                        New Client Name *
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="e.g. Apex Digital or Sarah Jenkins"
                        className="input-field text-xs"
                        required={selectedClientId === 'new'}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                        Client Email
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                    Client / Company Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Digital or Sarah Jenkins"
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-charcoal-600 mb-1">
                    Client Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@company.com"
                    className="input-field text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-charcoal-700">
                Project Category
              </label>
              <span className="text-[10px] text-brand-700 font-semibold bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                {profConfig.badge}
              </span>
            </div>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              className="input-field text-xs bg-white font-medium"
            >
              {profConfig.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-charcoal-700">
                Paste any client message (email, chat, call notes)
              </label>
              <span className="text-[11px] text-charcoal-400">Untrusted text sanitized</span>
            </div>
            <textarea
              rows={5}
              value={projectBrief}
              onChange={(e) => setProjectBrief(e.target.value)}
              placeholder={profConfig.placeholderBrief || "Paste raw conversation, email thread, call notes, or project brief here..."}
              className="input-field text-xs leading-relaxed font-sans"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-charcoal-100">
            <button
              type="button"
              onClick={closeModal}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run AI Requirement Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
