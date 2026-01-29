import { useState } from 'react';
import { Zap, Shield, Globe, Bell, ArrowRight, Check } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Multiple Algorithms',
    desc: 'Token bucket, sliding window, and fixed window algorithms with configurable parameters.'
  },
  {
    icon: Shield,
    title: 'Multi-Layer Protection',
    desc: 'Stack rate limits by IP, API key, user ID, and endpoint for comprehensive protection.'
  },
  {
    icon: Globe,
    title: 'Geographic Rules',
    desc: 'Set different rate limits per region to handle traffic from different locations.'
  },
  {
    icon: Bell,
    title: 'Webhook Alerts',
    desc: 'Get notified when users hit rate limits or when anomalies are detected.'
  }
];

export function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState('');

  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 border-2 border-[var(--phosphor)] flex items-center justify-center animate-pulse-phosphor">
                <Zap size={24} className="text-[var(--phosphor)]" />
              </div>
            </div>
            <h1 className="display-text text-4xl md:text-5xl mb-4">
              THROTTLE<span className="phosphor">.IO</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">
              Distributed rate limiting service for modern APIs.
              Protect your infrastructure from abuse at any scale.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card p-6 noise"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="relative z-10">
                  <feature.icon size={24} className="phosphor-dim mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => setStep(1)}
              className="btn btn-primary text-base px-8 py-4 inline-flex items-center gap-3"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
            <p className="text-xs text-[var(--text-tertiary)] mt-4">
              No credit card required. Free tier includes 10,000 requests/day.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Step 1 of 2
            </div>
            <h2 className="text-2xl font-semibold mb-2">Create Your First Project</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              A project contains your API keys and rate limiting rules.
            </p>
          </div>

          <div className="card p-6 noise mb-6">
            <div className="relative z-10">
              <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My API"
                className="w-full"
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!projectName.trim()}
            className="btn btn-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 border-2 border-[var(--phosphor)] flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-[var(--phosphor)]" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">You're All Set!</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Your project "{projectName}" has been created.
            </p>
          </div>

          <div className="card p-6 noise mb-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                  Your API Key
                </span>
                <span className="badge text-[var(--phosphor)]">LIVE</span>
              </div>
              <div className="bg-[var(--surface-0)] border border-[var(--border)] p-3 font-mono text-sm break-all">
                th_live_{Math.random().toString(36).slice(2, 10)}...
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                This key will only be shown once. Copy it now.
              </p>
            </div>
          </div>

          <div className="card p-4 noise mb-6">
            <div className="relative z-10 text-xs">
              <div className="text-[var(--text-tertiary)] mb-2">Quick Start:</div>
              <code className="block bg-[var(--surface-0)] p-3 border border-[var(--border)] overflow-x-auto">
                curl -X POST https://api.throttle.io/v1/check \
                <br />
                &nbsp;&nbsp;-H "X-API-Key: th_live_xxx" \
                <br />
                &nbsp;&nbsp;-d '{`{"ip": "1.2.3.4"}`}'
              </code>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="btn btn-primary w-full py-4"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default Onboarding;
