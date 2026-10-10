import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check, Sparkles, Filter, ShieldCheck } from 'lucide-react';

const CATEGORIES = [
  'All',
  'Payment',
  'Scope and changes',
  'Delivery and reviews',
  'Ownership and IP',
  'Third-party costs',
  'Support and warranty',
  'Legal',
];

export function StarterLibraryModal({
  isOpen,
  library = [],
  onClose,
  onAddClause,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [addingKey, setAddingKey] = useState(null);
  const [refundVariant, setRefundVariant] = useState('refundable'); // 'refundable' | 'non_refundable'

  const filteredItems = useMemo(() => {
    return library.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.body.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [library, selectedCategory, searchTerm]);

  if (!isOpen) return null;

  const handleAdd = async (item) => {
    setAddingKey(item.starterKey);
    try {
      await onAddClause(item.starterKey);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingKey(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1A2B]/40 backdrop-blur-xs animate-fade-in font-['Instrument_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[var(--line,#E8E0CF)] max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[var(--line,#E8E0CF)] flex items-center justify-between shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--cobalt,#0047AB)]" />
              <h2
                id="library-modal-title"
                className="text-[20px] font-bold text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]"
              >
                Add clauses from starter library
              </h2>
            </div>
            <p className="text-[13px] text-[var(--muted,#5B6676)] mt-0.5">
              14 professionally vetted, plain-English standard terms powered by smart variables.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-[var(--muted,#5B6676)] hover:text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)] rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Search & Category Filter Toolbar */}
        <div className="px-6 py-3 border-b border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/30 space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--muted,#5B6676)] absolute left-3.5 top-1/2 -translate-y-1/2 select-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search library clauses by name or terms..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[var(--line,#E8E0CF)] text-[14px] text-[var(--ink,#0E1A2B)] bg-white placeholder:text-[var(--muted,#5B6676)] outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 ${
                  selectedCategory === cat
                    ? 'bg-[var(--cobalt,#0047AB)] text-white'
                    : 'bg-white border border-[var(--line,#E8E0CF)] text-[var(--ink,#0E1A2B)] hover:bg-[var(--page,#FAF5EA)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Clause Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-[var(--muted,#5B6676)]">
              <p className="text-sm font-semibold">No library clauses match your search.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="mt-2 text-xs text-[var(--cobalt,#0047AB)] font-bold hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.starterKey}
                className="p-4 rounded-xl border border-[var(--line,#E8E0CF)] bg-white hover:border-[var(--cobalt,#0047AB)]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[15px] text-[var(--ink,#0E1A2B)] font-['Bricolage_Grotesque',sans-serif]">
                      {item.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--cobalt-tint,#E8F0FB)] text-[var(--cobalt,#0047AB)]">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted,#5B6676)] line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>

                <div className="shrink-0 flex items-center">
                  {item.isAdded ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--success-tint,#E7F6EC)] text-[var(--success,#067647)] border border-[var(--success,#067647)]/20">
                      <Check className="w-3.5 h-3.5" />
                      Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={addingKey === item.starterKey}
                      onClick={() => handleAdd(item)}
                      className="h-9 px-4 rounded-full text-xs font-semibold bg-[var(--cobalt,#0047AB)] hover:bg-[var(--cobalt-dark,#003A8C)] text-white transition-colors flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-[#0047AB]/40 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{addingKey === item.starterKey ? 'Adding...' : 'Add clause'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-[var(--line,#E8E0CF)] bg-[var(--page,#FAF5EA)]/40 flex items-center justify-between text-xs text-[var(--muted,#5B6676)] shrink-0">
          <span>{filteredItems.length} clauses available</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-[var(--ink,#0E1A2B)] bg-white border border-[var(--line,#E8E0CF)] rounded-lg hover:bg-[var(--page,#FAF5EA)] cursor-pointer"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
