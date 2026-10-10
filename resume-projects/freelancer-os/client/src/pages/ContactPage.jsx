import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  ArrowLeft,
  MessageSquare,
  Clock,
  MapPin,
  CheckCircle2,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { Logo } from '../components/common/Logo';
import { siteConfig } from '../config/site';

export function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate instantaneous dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background text-charcoal-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-charcoal-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <div className="h-4 w-px bg-charcoal-200" />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-mint">24/7 Support Desk</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        {/* Page Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Get in touch with the team</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-charcoal-900">
            We'd love to hear from you.
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 mt-3">
            Have a question about the AI Requirement Analyzer, need help setting up your smart floor pricing, or want to suggest a new feature?
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details & FAQs (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card-premium p-6 space-y-5">
              <h2 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-600" />
                <span>Contact Channels</span>
              </h2>

              <div className="space-y-4 text-xs sm:text-sm text-charcoal-700">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-charcoal-50/70 border border-charcoal-100">
                  <Mail className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-charcoal-900">Email Address</div>
                    <a
                      href={`mailto:${siteConfig.contactEmail || siteConfig.supportEmail}`}
                      className="text-brand-600 hover:underline font-mono text-xs"
                    >
                      {siteConfig.contactEmail || siteConfig.supportEmail}
                    </a>
                  </div>
                </div>

                {siteConfig.contactPhone && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-charcoal-50/70 border border-charcoal-100">
                    <Clock className="w-4 h-4 text-mint-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-charcoal-900">Phone Number</div>
                      <a
                        href={`tel:${siteConfig.contactPhone.replace(/\s+/g, '')}`}
                        className="text-charcoal-600 hover:underline font-mono text-xs"
                      >
                        {siteConfig.contactPhone}
                      </a>
                    </div>
                  </div>
                )}

                {siteConfig.contactAddress && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-charcoal-50/70 border border-charcoal-100">
                    <MapPin className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-charcoal-900">Registered Business Address</div>
                      <div className="text-charcoal-600 text-xs whitespace-pre-line">
                        {siteConfig.contactAddress}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick FAQ Highlights */}
            <div className="card-premium p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-charcoal-500" />
                <span>Frequently Asked</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold text-charcoal-900">How does the Smart Floor Pricing engine work?</div>
                  <div className="text-charcoal-500 mt-0.5">
                    Floorly calculates base labor and complexity factors while deterministically enforcing your minimum floor fee so you never quote at an unprofitable rate.
                  </div>
                </div>

                <div className="border-t border-charcoal-100 pt-3">
                  <div className="font-semibold text-charcoal-900">Is client data kept private?</div>
                  <div className="text-charcoal-500 mt-0.5">
                    Yes. We never train public AI models on your client briefs or project specifications.
                  </div>
                </div>

                <div className="border-t border-charcoal-100 pt-3">
                  <div className="font-semibold text-charcoal-900">What is an AGENTS.md file?</div>
                  <div className="text-charcoal-500 mt-0.5">
                    It's a comprehensive context doc you drop into coding agents (Cursor, Claude Code, Copilot) to execute the approved client scope with zero confusion.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="card-premium p-6 sm:p-8">
              {isSubmitted ? (
                <div className="text-center py-12 space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-mint-50 text-mint-600 border border-mint-200 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-charcoal-900">Message Received!</h3>
                  <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto">
                    Thank you for reaching out, <strong>{formData.name}</strong>. Our team has received your message and will reply to <span className="font-mono text-brand-700">{formData.email}</span> shortly.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', subject: 'general', message: '' });
                    }}
                    className="btn-secondary text-xs mt-4"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold text-charcoal-900">Send us a message</h2>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      Fill out the form below and we'll reply directly to your inbox.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-charcoal-700">Your Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Rivera"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-base text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-charcoal-700">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="alex@domain.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-base text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal-700">Topic</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="input-base text-xs bg-white"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="analyzer">AI Scoping & Requirements Feedback</option>
                      <option value="pricing">Smart Floor Pricing Assistance</option>
                      <option value="feature">Feature Request / Suggestion</option>
                      <option value="bug">Report a Bug</option>
                      <option value="partnership">Partnership & Media</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal-700">Your Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Tell us what's on your mind..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="input-base text-xs leading-relaxed"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer isPublic={true} />
    </div>
  );
}
