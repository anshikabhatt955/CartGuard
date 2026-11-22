import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Lock,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';

const FALLBACK_LEADERBOARD = [
  { domain: '127.0.0.1', category: 'Mock Airline Checkout', trust_score: 5, grade: 'D', risk_label: 'Severe CCPA Traps Detected', total_reports: 13, top_violation: 'Basket Sneaking', crowd_alerts_count: 3 },
  { domain: 'shopquick.in', category: 'Fashion & Electronics', trust_score: 18, grade: 'D', risk_label: 'Severe CCPA Traps Detected', total_reports: 7, top_violation: 'Subscription Trap', crowd_alerts_count: 2 },
  { domain: 'busexpress.in', category: 'Interstate Bus Booking', trust_score: 24, grade: 'D', risk_label: 'High Dark Pattern Frequency', total_reports: 8, top_violation: 'Basket Sneaking', crowd_alerts_count: 2 },
  { domain: 'flyfast.in', category: 'Airline Booking (OTA)', trust_score: 26, grade: 'D', risk_label: 'High Dark Pattern Frequency', total_reports: 8, top_violation: 'Drip Pricing', crowd_alerts_count: 2 },
  { domain: 'ticketfest.in', category: 'Concerts & Cinema Tickets', trust_score: 38, grade: 'D', risk_label: 'High Dark Pattern Frequency', total_reports: 6, top_violation: 'False Urgency', crowd_alerts_count: 2 },
  { domain: 'cleandeal.in', category: 'Verified Compliant Merchant', trust_score: 96, grade: 'A', risk_label: 'Low Risk / CCPA Compliant', total_reports: 1, top_violation: 'False Urgency', crowd_alerts_count: 0 }
];

const FALLBACK_STATS = {
  total_reports: 43,
  total_domains_tracked: 6,
  pattern_frequency: [
    { pattern_type: 'false_urgency', official_name: 'False Urgency', count: 14, section: 'CCPA Sec 5' },
    { pattern_type: 'basket_sneaking', official_name: 'Basket Sneaking', count: 11, section: 'CCPA Sec 6' },
    { pattern_type: 'drip_pricing', official_name: 'Drip Pricing', count: 10, section: 'CCPA Sec 7' },
    { pattern_type: 'subscription_trap', official_name: 'Subscription Trap', count: 5, section: 'CCPA Sec 9' },
    { pattern_type: 'confirm_shaming', official_name: 'Confirm Shaming', count: 3, section: 'CCPA Sec 8' }
  ],
  severity_distribution: { HIGH: 37, MEDIUM: 5, LOW: 1 },
  recent_feed: [
    { domain: '127.0.0.1', official_name: 'Basket Sneaking', ccpa_section: 'CCPA Guidelines 2023, Section 6', severity: 'HIGH', evidence_text: 'Pre-ticked Travel Insurance ₹99 and Carbon Offset ₹29', created_at: '2026-11-21 19:42:10' },
    { domain: '127.0.0.1', official_name: 'False Urgency', ccpa_section: 'CCPA Guidelines 2023, Section 5', severity: 'HIGH', evidence_text: 'Timer reset on refresh: 04:59 countdown', created_at: '2026-11-21 19:42:10' },
    { domain: '127.0.0.1', official_name: 'Drip Pricing', ccpa_section: 'CCPA Guidelines 2023, Section 7', severity: 'HIGH', evidence_text: 'Convenience Fee ₹450 revealed only on final card screen', created_at: '2026-11-21 19:42:10' },
    { domain: 'flyfast.in', official_name: 'Drip Pricing', ccpa_section: 'CCPA Guidelines 2023, Section 7', severity: 'HIGH', evidence_text: 'Convenience surcharge ₹399 added on payment page', created_at: '2026-11-21 18:20:00' },
    { domain: 'shopquick.in', official_name: 'Subscription Trap', ccpa_section: 'CCPA Guidelines 2023, Section 9', severity: 'HIGH', evidence_text: 'VIP Express 15-day free trial auto-bills ₹499/mo', created_at: '2026-11-21 17:15:00' }
  ]
};

const SEVERITY_COLORS = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#10B981'
};

export default function App() {
  const [leaderboard, setLeaderboard] = useState(FALLBACK_LEADERBOARD);
  const [stats, setStats] = useState(FALLBACK_STATS);
  const [loading, setLoading] = useState(false);
  const [filterPattern, setFilterPattern] = useState('ALL');
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lbRes, stRes] = await Promise.all([
        fetch(`${API_BASE}/leaderboard`),
        fetch(`${API_BASE}/stats`)
      ]);
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        if (lbData.worst_domains?.length > 0) setLeaderboard(lbData.worst_domains);
      }
      if (stRes.ok) {
        const stData = await stRes.json();
        setStats(stData);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('API connection offline, using pre-seeded telemetry data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const severityData = Object.entries(stats.severity_distribution || {}).map(([name, value]) => ({
    name: `${name} Severity`,
    value
  }));

  const filteredFeed = (stats.recent_feed || []).filter(item => {
    if (filterPattern === 'ALL') return true;
    return item.official_name.toUpperCase().includes(filterPattern.toUpperCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Privacy Guarantee Header Bar */}
      <div className="bg-emerald-950 text-emerald-200 text-xs px-4 py-2 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              <strong>100% On-Device Auditing Guarantee:</strong> All DOM pattern evaluations execute locally inside user browsers. No payment details, card credentials, or personal data are collected or retained.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-mono">CCPA Guidelines 2023</span>
            <span className="bg-emerald-800 text-white px-2 py-0.5 rounded font-mono text-[10px]">v1.0 Live</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">CartGuard</h1>
                <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded border border-slate-300">
                  CCPA Watchdog
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous Consumer Protection & Dark Pattern Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Telemetry</span>
            </button>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Updated: {lastRefreshed}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total CCPA Violations</span>
              <span className="p-2 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.total_reports}</span>
              <span className="text-xs text-red-600 font-semibold">+100% on-device</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Documented deceptive patterns</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Domains Audited</span>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">{stats.total_domains_tracked}</span>
              <span className="text-xs text-slate-500 font-medium">OTA, Retail & Ticketing</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Major Indian e-commerce sites</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Most Prevalent Trap</span>
              <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-lg font-bold text-slate-900">False Urgency</span>
              <span className="text-xs text-amber-600 font-bold">Sec 5</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Artificial countdown resets & scarcity</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disarmed Basket Savings</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Shield className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">₹177 - ₹800</span>
              <span className="text-xs text-emerald-700 font-semibold">per session</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Via 1-click De-Trap Engine</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pattern Frequency Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  CCPA 2023 Dark Pattern Frequency
                </h2>
                <p className="text-xs text-slate-500">Breakdown by official guideline sections</p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                Verified Reports
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.pattern_frequency || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="official_name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity Distribution Donut */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Severity Breakdown
              </h2>
              <p className="text-xs text-slate-500">Legal exposure under Consumer Protection Act</p>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name.includes('HIGH') ? SEVERITY_COLORS.HIGH : entry.name.includes('MEDIUM') ? SEVERITY_COLORS.MEDIUM : SEVERITY_COLORS.LOW}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Worst Domains Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>Domain Leaderboard</span>
                <span className="text-xs font-normal text-slate-500 lowercase">(ranked by lowest trust score)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Calculated autonomously from severity and volume of CCPA infractions</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-700 rounded-full border border-red-200">
              CCPA Enforcement Target
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Rank & Domain</th>
                  <th className="px-6 py-3">Industry Category</th>
                  <th className="px-6 py-3 text-center">Trust Score</th>
                  <th className="px-6 py-3">Top Violation</th>
                  <th className="px-6 py-3 text-center">Crowd Reports</th>
                  <th className="px-6 py-3 text-center">Community Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leaderboard.map((site, idx) => (
                  <tr key={site.domain} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3.5 font-medium text-slate-900 flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold">{site.domain}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{site.risk_label}</div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                      {site.category}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                          site.trust_score < 40
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : site.trust_score < 70
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {site.trust_score}/100 ({site.grade})
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {site.top_violation}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-center font-bold text-slate-800">
                      {site.total_reports} flagged
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {site.crowd_alerts_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="w-3 h-3" />
                          <span>{site.crowd_alerts_count} Crowd Alerts</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Low Volume</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Violations Feed & Evidence Log */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Live Evidence Telemetry Feed
              </h2>
              <p className="text-xs text-slate-500">Quoted element evidence captured on-device across Indian checkouts</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'URGENCY', 'SNEAKING', 'DRIP', 'SUBSCRIPTION'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterPattern(cat)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition ${
                    filterPattern === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-150">
            {filteredFeed.map((item, idx) => (
              <div key={idx} className="p-4 sm:px-6 hover:bg-slate-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{item.domain}</span>
                      <span className="text-[10px] text-slate-400">• {item.created_at}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.severity === 'HIGH'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>{item.official_name}</span>
                      <span className="text-slate-400 font-normal">({item.ccpa_section})</span>
                    </div>
                    <div className="font-mono text-xs bg-slate-100 text-slate-700 p-2 rounded border border-slate-200 mt-1.5">
                      "{item.evidence_text}"
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-500 space-y-2">
        <p>
          <b>CartGuard CCPA Audit System</b> • Developed for Makers Need More (MnM) 48-Hour Hackathon on Unstop
        </p>
        <p>
          Designed by <b>Anshika Bhatt & Akshat Negi</b> • Fully mapped to Consumer Protection (Dark Patterns) Guidelines, 2023
        </p>
        <p className="text-[11px] text-slate-400">
          Privacy Policy: On-device client audit engine. No credentials, card numbers, or personal data collected.
        </p>
      </footer>
    </div>
  );
}
