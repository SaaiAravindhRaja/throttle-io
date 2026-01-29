import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Shield,
  Zap,
  Globe,
  Bell,
  Key,
  Settings,
  ChevronRight,
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Terminal,
  Server,
  Clock,
  TrendingUp,
  Users,
  Lock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Mock data generator
const generateMockData = () => {
  const now = Date.now();
  const hourlyData = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now - i * 3600000);
    hourlyData.push({
      time: hour.getHours().toString().padStart(2, '0') + ':00',
      requests: Math.floor(Math.random() * 50000) + 10000,
      blocked: Math.floor(Math.random() * 2000) + 200
    });
  }
  return hourlyData;
};

const mockViolators = [
  { id: 1, identifier: '192.168.1.45', layer: 'ip', count: 2847, endpoint: '/api/v1/users', lastSeen: '2m ago' },
  { id: 2, identifier: 'th_live_x8k2...', layer: 'apiKey', count: 1523, endpoint: '/api/v1/data', lastSeen: '5m ago' },
  { id: 3, identifier: 'usr_92847', layer: 'user', count: 892, endpoint: '/api/v1/search', lastSeen: '1m ago' },
  { id: 4, identifier: '10.0.0.128', layer: 'ip', count: 654, endpoint: '/api/v1/auth', lastSeen: '12m ago' },
  { id: 5, identifier: 'th_live_m9p1...', layer: 'apiKey', count: 421, endpoint: '/api/v1/upload', lastSeen: '8m ago' }
];

const mockGeoData = [
  { region: 'US-EAST', requests: 45200, blocked: 1230 },
  { region: 'US-WEST', requests: 32100, blocked: 890 },
  { region: 'EU-WEST', requests: 28400, blocked: 620 },
  { region: 'APAC', requests: 18900, blocked: 340 },
  { region: 'SA', requests: 8200, blocked: 180 }
];

// Animated counter component
function AnimatedNumber({ value, duration = 500 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(start + (end - start) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return <span className="animate-counter">{display.toLocaleString()}</span>;
}

// Status indicator
function StatusIndicator({ status }) {
  const colors = {
    active: 'status-active',
    warning: 'status-warning',
    danger: 'status-danger'
  };

  return <div className={`status-dot ${colors[status]}`} />;
}

// Metric card
function MetricCard({ label, value, subvalue, icon: Icon, trend, status }) {
  return (
    <div className="card p-5 noise">
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-[var(--border)] bg-[var(--surface-0)] flex items-center justify-center">
            <Icon size={18} className="phosphor-dim" />
          </div>
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
        </div>
        {status && <StatusIndicator status={status} />}
      </div>
      <div className="relative z-10">
        <div className="text-3xl data-value phosphor mb-1">
          <AnimatedNumber value={value} />
        </div>
        {subvalue && (
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            {trend && (
              <span className={trend > 0 ? 'text-[var(--phosphor)]' : 'text-[var(--alert-red)]'}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
            {subvalue}
          </div>
        )}
      </div>
    </div>
  );
}

// Header component
function Header({ systemStatus }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface-0)]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--phosphor)] flex items-center justify-center animate-pulse-phosphor">
              <Zap size={16} className="text-[var(--phosphor)]" />
            </div>
            <div>
              <h1 className="display-text text-lg tracking-widest">THROTTLE<span className="phosphor">.IO</span></h1>
              <p className="text-[10px] text-[var(--text-tertiary)] tracking-widest">RATE CONTROL SYSTEM v1.0.0</p>
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <StatusIndicator status={systemStatus} />
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
              {systemStatus === 'active' ? 'All Systems Nominal' : 'System Alert'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">System Time</div>
            <div className="data-value text-sm phosphor-dim">
              {time.toLocaleTimeString('en-US', { hour12: false })}
              <span className="animate-blink">_</span>
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--border)]" />
          <div className="text-right">
            <div className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">UTC</div>
            <div className="data-value text-sm text-[var(--text-secondary)]">
              {time.toISOString().slice(11, 19)}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Navigation
function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'overview', label: 'Command', icon: Terminal },
    { id: 'projects', label: 'Projects', icon: Key },
    { id: 'rules', label: 'Rules', icon: Shield },
    { id: 'webhooks', label: 'Webhooks', icon: Bell },
    { id: 'geo', label: 'Geo', icon: Globe }
  ];

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-wider border-r border-[var(--border)] transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--surface-0)] text-[var(--phosphor)] border-b-2 border-b-[var(--phosphor)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

// Traffic chart
function TrafficChart({ data }) {
  return (
    <div className="card p-5 noise">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <Activity size={16} className="phosphor-dim" />
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Request Volume // 24H</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[var(--phosphor)]" />
            <span className="text-[var(--text-secondary)]">Requests</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[var(--alert-red)]" />
            <span className="text-[var(--text-secondary)]">Blocked</span>
          </div>
        </div>
      </div>
      <div className="h-64 relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="requestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--phosphor)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--phosphor)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--alert-red)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--alert-red)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="time" stroke="var(--border)" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
            <YAxis stroke="var(--border)" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 0,
                fontSize: 12
              }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="var(--phosphor)"
              strokeWidth={2}
              fill="url(#requestGradient)"
            />
            <Area
              type="monotone"
              dataKey="blocked"
              stroke="var(--alert-red)"
              strokeWidth={2}
              fill="url(#blockedGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Violators table
function ViolatorsTable({ violators }) {
  const layerColors = {
    ip: 'text-[var(--alert-amber)]',
    apiKey: 'text-[var(--phosphor)]',
    user: 'text-[#8b5cf6]'
  };

  return (
    <div className="card noise overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] relative z-10">
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="alert-glow" />
          <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Top Violators // Live</span>
        </div>
        <button className="btn text-xs py-1 px-3">View All</button>
      </div>
      <div className="relative z-10 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Identifier</th>
              <th>Endpoint</th>
              <th>Violations</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {violators.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className={`badge ${layerColors[v.layer]}`}>{v.layer}</span>
                </td>
                <td className="font-mono text-xs">{v.identifier}</td>
                <td className="text-[var(--text-secondary)]">{v.endpoint}</td>
                <td>
                  <span className={v.count > 1000 ? 'alert-glow' : v.count > 500 ? 'amber-glow' : ''}>
                    {v.count.toLocaleString()}
                  </span>
                </td>
                <td className="text-[var(--text-tertiary)]">{v.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Geographic distribution
function GeoDistribution({ data }) {
  const maxRequests = Math.max(...data.map((d) => d.requests));

  return (
    <div className="card p-5 noise">
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <Globe size={16} className="phosphor-dim" />
        <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">Geographic Distribution</span>
      </div>
      <div className="space-y-3 relative z-10">
        {data.map((region) => (
          <div key={region.region} className="flex items-center gap-4">
            <div className="w-20 text-xs font-mono text-[var(--text-secondary)]">{region.region}</div>
            <div className="flex-1 h-6 bg-[var(--surface-0)] border border-[var(--border)] relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[var(--phosphor-muted)]"
                style={{ width: `${(region.requests / maxRequests) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-[var(--alert-red)]"
                style={{ width: `${(region.blocked / maxRequests) * 100}%` }}
              />
            </div>
            <div className="w-24 text-right">
              <span className="data-value text-sm">{(region.requests / 1000).toFixed(1)}K</span>
              <span className="text-[var(--text-tertiary)] text-xs ml-2">
                ({((region.blocked / region.requests) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Projects panel
function ProjectsPanel() {
  const [projects, setProjects] = useState([
    {
      id: 'proj_1a2b3c4d5e6f',
      name: 'Production API',
      keys: {
        live: { key: 'th_live_x8k2m9p1n5j7h3g6', createdAt: Date.now() - 86400000 * 30 },
        test: { key: 'th_test_a1b2c3d4e5f6g7h8', createdAt: Date.now() - 86400000 * 30 }
      },
      plan: 'pro',
      requestsToday: 142847
    },
    {
      id: 'proj_7g8h9i0j1k2l',
      name: 'Staging',
      keys: {
        live: { key: 'th_live_q9w8e7r6t5y4u3i2', createdAt: Date.now() - 86400000 * 15 },
        test: { key: 'th_test_z0x9c8v7b6n5m4l3', createdAt: Date.now() - 86400000 * 15 }
      },
      plan: 'free',
      requestsToday: 8921
    }
  ]);
  const [showKey, setShowKey] = useState({});
  const [copied, setCopied] = useState(null);

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggleShowKey = (projectId, keyType) => {
    const keyId = `${projectId}-${keyType}`;
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-[var(--text-secondary)]">
          Project Registry // {projects.length} Active
        </h2>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus size={14} />
          New Project
        </button>
      </div>

      <div className="grid gap-4">
        {projects.map((project) => (
          <div key={project.id} className="card p-5 noise">
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Server size={16} className="phosphor-dim" />
                  <h3 className="font-semibold">{project.name}</h3>
                  <span className={`badge ${project.plan === 'pro' ? 'text-[var(--phosphor)]' : 'text-[var(--text-tertiary)]'}`}>
                    {project.plan}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] font-mono">{project.id}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--text-tertiary)] uppercase">Today</div>
                <div className="data-value text-lg phosphor-dim">{project.requestsToday.toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-3 relative z-10">
              {['live', 'test'].map((keyType) => {
                const keyData = project.keys[keyType];
                const keyId = `${project.id}-${keyType}`;
                const isVisible = showKey[keyId];
                const isCopied = copied === keyData.key;

                return (
                  <div key={keyType} className="flex items-center gap-3 p-3 bg-[var(--surface-0)] border border-[var(--border)]">
                    <div className={`w-2 h-2 ${keyType === 'live' ? 'bg-[var(--phosphor)]' : 'bg-[var(--alert-amber)]'}`} />
                    <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] w-12">{keyType}</span>
                    <div className="flex-1 font-mono text-sm">
                      {isVisible ? keyData.key : '•'.repeat(32)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleShowKey(project.id, keyType)}
                        className="p-2 hover:bg-[var(--surface-2)] transition-colors"
                      >
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => copyKey(keyData.key)}
                        className="p-2 hover:bg-[var(--surface-2)] transition-colors"
                      >
                        {isCopied ? <Check size={14} className="text-[var(--phosphor)]" /> : <Copy size={14} />}
                      </button>
                      <button className="p-2 hover:bg-[var(--surface-2)] transition-colors">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Rules configuration panel
function RulesPanel() {
  const [activeRule, setActiveRule] = useState('ip');
  const [rules, setRules] = useState({
    ip: { algorithm: 'sliding_window', limit: 100, window: 60000, burstAllowance: 20 },
    apiKey: { algorithm: 'token_bucket', capacity: 1000, refillRate: 16.67, window: 60000 },
    user: { algorithm: 'sliding_window', limit: 500, window: 60000, burstAllowance: 50 }
  });

  const algorithms = [
    { id: 'token_bucket', name: 'Token Bucket', desc: 'Smooth traffic, allows bursts' },
    { id: 'sliding_window', name: 'Sliding Window', desc: 'Precise, balanced memory' },
    { id: 'fixed_window', name: 'Fixed Window', desc: 'Simple, boundary spike risk' }
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1">
        <div className="card noise overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] relative z-10">
            <h3 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">Limiting Layers</h3>
          </div>
          <div className="relative z-10">
            {['ip', 'apiKey', 'user', 'endpoint'].map((layer) => (
              <button
                key={layer}
                onClick={() => setActiveRule(layer)}
                className={`w-full flex items-center justify-between px-4 py-3 border-b border-[var(--border)] transition-all ${
                  activeRule === layer
                    ? 'bg-[var(--surface-2)] border-l-2 border-l-[var(--phosphor)]'
                    : 'hover:bg-[var(--surface-1)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock size={14} className={activeRule === layer ? 'phosphor-dim' : 'text-[var(--text-tertiary)]'} />
                  <span className="text-sm uppercase tracking-wider">{layer}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="col-span-2">
        <div className="card p-5 noise">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <Shield size={16} className="phosphor-dim" />
            <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
              {activeRule} Layer Configuration
            </span>
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
                Algorithm
              </label>
              <div className="grid grid-cols-3 gap-3">
                {algorithms.map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => setRules((r) => ({ ...r, [activeRule]: { ...r[activeRule], algorithm: algo.id } }))}
                    className={`p-4 border text-left transition-all ${
                      rules[activeRule]?.algorithm === algo.id
                        ? 'border-[var(--phosphor)] bg-[var(--phosphor-glow)]'
                        : 'border-[var(--border)] hover:border-[var(--border-bright)]'
                    }`}
                  >
                    <div className="text-sm font-semibold mb-1">{algo.name}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{algo.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  {rules[activeRule]?.algorithm === 'token_bucket' ? 'Capacity' : 'Limit'}
                </label>
                <input
                  type="number"
                  value={rules[activeRule]?.limit || rules[activeRule]?.capacity || 100}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      [activeRule]: {
                        ...r[activeRule],
                        [rules[activeRule]?.algorithm === 'token_bucket' ? 'capacity' : 'limit']: parseInt(e.target.value)
                      }
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Window (ms)
                </label>
                <input
                  type="number"
                  value={rules[activeRule]?.window || 60000}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      [activeRule]: { ...r[activeRule], window: parseInt(e.target.value) }
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>

            {rules[activeRule]?.algorithm !== 'token_bucket' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Burst Allowance
                </label>
                <input
                  type="number"
                  value={rules[activeRule]?.burstAllowance || 0}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      [activeRule]: { ...r[activeRule], burstAllowance: parseInt(e.target.value) }
                    }))
                  }
                  className="w-full"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Extra requests allowed during traffic spikes
                </p>
              </div>
            )}

            {rules[activeRule]?.algorithm === 'token_bucket' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                  Refill Rate (tokens/sec)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rules[activeRule]?.refillRate || 1}
                  onChange={(e) =>
                    setRules((r) => ({
                      ...r,
                      [activeRule]: { ...r[activeRule], refillRate: parseFloat(e.target.value) }
                    }))
                  }
                  className="w-full"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button className="btn">Reset</button>
              <button className="btn btn-primary">Save Configuration</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Webhooks panel
function WebhooksPanel() {
  const [webhooks, setWebhooks] = useState([
    {
      id: 'wh_1',
      url: 'https://api.example.com/webhooks/throttle',
      events: ['threshold_reached', 'burst_detected'],
      enabled: true,
      lastDelivery: { status: 'success', timestamp: Date.now() - 300000 }
    }
  ]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] });

  const eventTypes = [
    { id: 'threshold_reached', label: 'Threshold Reached', desc: 'When violation count hits configured threshold' },
    { id: 'burst_detected', label: 'Burst Detected', desc: 'When sudden traffic spike is detected' },
    { id: 'key_rotated', label: 'Key Rotated', desc: 'When an API key is rotated' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wider text-[var(--text-secondary)]">
          Webhook Endpoints // {webhooks.length} Configured
        </h2>
        <button onClick={() => setShowNewForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus size={14} />
          Add Webhook
        </button>
      </div>

      {showNewForm && (
        <div className="card p-5 noise border-[var(--phosphor-muted)]">
          <div className="relative z-10 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Endpoint URL
              </label>
              <input
                type="url"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook((w) => ({ ...w, url: e.target.value }))}
                placeholder="https://your-api.com/webhook"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Events
              </label>
              <div className="space-y-2">
                {eventTypes.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-start gap-3 p-3 border border-[var(--border)] cursor-pointer hover:bg-[var(--surface-2)]"
                  >
                    <input
                      type="checkbox"
                      checked={newWebhook.events.includes(event.id)}
                      onChange={(e) =>
                        setNewWebhook((w) => ({
                          ...w,
                          events: e.target.checked
                            ? [...w.events, event.id]
                            : w.events.filter((id) => id !== event.id)
                        }))
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm">{event.label}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{event.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button onClick={() => setShowNewForm(false)} className="btn">
                Cancel
              </button>
              <button className="btn btn-primary">Create Webhook</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="card p-5 noise">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <StatusIndicator status={webhook.enabled ? 'active' : 'warning'} />
                  <code className="text-sm">{webhook.url}</code>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {webhook.events.map((event) => (
                    <span key={event} className="badge text-[var(--text-secondary)]">
                      {event}
                    </span>
                  ))}
                </div>
                {webhook.lastDelivery && (
                  <div className="text-xs text-[var(--text-tertiary)]">
                    Last delivery:{' '}
                    <span className={webhook.lastDelivery.status === 'success' ? 'phosphor-dim' : 'alert-glow'}>
                      {webhook.lastDelivery.status}
                    </span>{' '}
                    • {Math.round((Date.now() - webhook.lastDelivery.timestamp) / 60000)}m ago
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn text-xs py-1 px-3">Test</button>
                <button className="btn btn-danger text-xs py-1 px-3">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App
export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [trafficData, setTrafficData] = useState(generateMockData());
  const [metrics, setMetrics] = useState({
    requestsPerSecond: 847,
    totalRequests: 2847291,
    blockedRequests: 48291,
    activeProjects: 12
  });

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((m) => ({
        ...m,
        requestsPerSecond: Math.floor(Math.random() * 200) + 750,
        totalRequests: m.totalRequests + Math.floor(Math.random() * 50) + 10,
        blockedRequests: m.blockedRequests + Math.floor(Math.random() * 5)
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Refresh traffic data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficData(generateMockData());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header systemStatus="active" />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-6 grid-bg">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics row */}
            <div className="grid grid-cols-4 gap-4">
              <MetricCard
                label="Requests/sec"
                value={metrics.requestsPerSecond}
                subvalue="avg. last 5 min"
                icon={Zap}
                trend={12}
                status="active"
              />
              <MetricCard
                label="Total Requests"
                value={metrics.totalRequests}
                subvalue="last 24 hours"
                icon={Activity}
                trend={8}
              />
              <MetricCard
                label="Blocked"
                value={metrics.blockedRequests}
                subvalue={`${((metrics.blockedRequests / metrics.totalRequests) * 100).toFixed(2)}% block rate`}
                icon={Shield}
                status={metrics.blockedRequests > 50000 ? 'danger' : 'warning'}
              />
              <MetricCard
                label="Active Projects"
                value={metrics.activeProjects}
                subvalue="all healthy"
                icon={Server}
                status="active"
              />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <TrafficChart data={trafficData} />
              </div>
              <GeoDistribution data={mockGeoData} />
            </div>

            {/* Violators */}
            <ViolatorsTable violators={mockViolators} />
          </div>
        )}

        {activeTab === 'projects' && <ProjectsPanel />}
        {activeTab === 'rules' && <RulesPanel />}
        {activeTab === 'webhooks' && <WebhooksPanel />}
        {activeTab === 'geo' && (
          <div className="space-y-6">
            <h2 className="text-sm uppercase tracking-wider text-[var(--text-secondary)]">
              Geographic Rate Limiting
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <GeoDistribution data={mockGeoData} />
              <div className="card p-5 noise">
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <Settings size={16} className="phosphor-dim" />
                  <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">
                    Region-Specific Rules
                  </span>
                </div>
                <div className="space-y-3 relative z-10">
                  {mockGeoData.map((region) => (
                    <div key={region.region} className="flex items-center justify-between p-3 border border-[var(--border)]">
                      <span className="font-mono text-sm">{region.region}</span>
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-[var(--text-tertiary)]">
                          <span className="text-[var(--text-primary)]">100</span> req/min
                        </div>
                        <button className="text-xs text-[var(--phosphor-dim)] hover:text-[var(--phosphor)]">
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer status bar */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface-0)] px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[var(--phosphor)] animate-pulse" />
            <span className="text-[var(--text-tertiary)]">REDIS</span>
            <span className="phosphor-dim">CONNECTED</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-tertiary)]">Uptime:</span>
            <span className="text-[var(--text-secondary)]">14d 7h 23m</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
          <span>THROTTLE.IO</span>
          <span className="text-[var(--border-bright)]">//</span>
          <span>BUILD 2024.01.29</span>
        </div>
      </footer>
    </div>
  );
}
