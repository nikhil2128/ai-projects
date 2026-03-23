import { useMemo, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { computeAnalytics } from "../data/mock";
import StatCard from "../components/StatCard";
import {
  MousePointerClick,
  Users,
  FileText,
  Activity,
  ArrowLeft,
  Globe,
  Circle,
  ExternalLink,
  Percent,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { format, parseISO } from "date-fns";

const TABS = ["overview", "pages", "elements", "clicks"] as const;
type Tab = (typeof TABS)[number];

const BAR_COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe", "#e0e7ff"];

export default function WebsiteDetail() {
  const { websiteId } = useParams<{ websiteId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const website = user?.websites.find((w) => w.id === websiteId);
  const analytics = useMemo(() => (websiteId ? computeAnalytics(websiteId) : null), [websiteId]);

  if (!website || !analytics) {
    return <Navigate to="/" replace />;
  }

  const chartData = analytics.clicksOverTime.map((p) => ({
    date: p.bucket,
    label: format(parseISO(p.bucket), "MMM d"),
    clicks: p.count,
  }));

  const pageChartData = analytics.topPages.slice(0, 8).map((p) => {
    const url = new URL(p.pageUrl);
    return { name: url.pathname, clicks: p.totalClicks, sessions: p.uniqueSessions };
  });

  const elementChartData = analytics.topElements.slice(0, 8).map((e) => ({
    name: `${e.elementTag}${e.elementText ? ` "${e.elementText}"` : e.elementId ? ` #${e.elementId}` : ""}`,
    clicks: e.totalClicks,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/"
          className="mt-1 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-lg font-bold text-gray-700">
              {website.favicon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{website.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" />
                  {website.domain}
                </div>
                <div className="flex items-center gap-1">
                  <Circle
                    className={`w-2 h-2 fill-current ${
                      website.status === "active" ? "text-emerald-500" : "text-amber-400"
                    }`}
                  />
                  <span className="capitalize">{website.status}</span>
                </div>
                <span>Added {format(parseISO(website.addedAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Clicks"
          value={analytics.totalClicks}
          icon={<MousePointerClick className="w-5 h-5" />}
          trend={analytics.clicksTrend}
        />
        <StatCard
          label="Unique Sessions"
          value={analytics.uniqueSessions}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Pages Tracked"
          value={analytics.uniquePages}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Clicks / Session"
          value={analytics.avgClicksPerSession}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard
          label="Bounce Rate"
          value={`${analytics.bounceRate}%`}
          icon={<Percent className="w-5 h-5" />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Clicks over time */}
          <div className="card p-6 xl:col-span-2">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Clicks Over Time</h3>
            <p className="text-sm text-gray-500 mb-4">Daily click volume — last 30 days</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    interval={Math.floor(chartData.length / 7)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
                  />
                  <Area type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top pages bar chart */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Top Pages</h3>
            <p className="text-sm text-gray-500 mb-4">Most clicked pages</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageChartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
                  />
                  <Bar dataKey="clicks" radius={[0, 4, 4, 0]} barSize={20}>
                    {pageChartData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top elements bar chart */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Top Elements</h3>
            <p className="text-sm text-gray-500 mb-4">Most clicked elements</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={elementChartData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                    formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
                  />
                  <Bar dataKey="clicks" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pages" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Page URL</th>
                  <th className="px-6 py-3 text-right font-medium">Total Clicks</th>
                  <th className="px-6 py-3 text-right font-medium">Unique Sessions</th>
                  <th className="px-6 py-3 text-right font-medium">Clicks / Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.topPages.map((page) => {
                  const url = new URL(page.pageUrl);
                  const cps = page.uniqueSessions > 0 ? (page.totalClicks / page.uniqueSessions).toFixed(1) : "0";
                  return (
                    <tr key={page.pageUrl} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900">{url.pathname}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700">
                        {page.totalClicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700">{page.uniqueSessions}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-700">{cps}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "elements" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Element</th>
                  <th className="px-6 py-3 text-left font-medium">ID</th>
                  <th className="px-6 py-3 text-left font-medium">Class</th>
                  <th className="px-6 py-3 text-left font-medium">Text</th>
                  <th className="px-6 py-3 text-right font-medium">Total Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.topElements.map((el, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 bg-brand-50 text-brand-700 rounded text-xs font-mono font-medium">
                        {el.elementTag}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600 font-mono text-xs">{el.elementId || "—"}</td>
                    <td className="px-6 py-3 text-gray-600 font-mono text-xs">{el.elementClass || "—"}</td>
                    <td className="px-6 py-3 text-gray-600 text-xs">{el.elementText ? `"${el.elementText}"` : "—"}</td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-gray-900">
                      {el.totalClicks.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "clicks" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  <th className="px-6 py-3 text-left font-medium">Session</th>
                  <th className="px-6 py-3 text-left font-medium">Page</th>
                  <th className="px-6 py-3 text-left font-medium">Element</th>
                  <th className="px-6 py-3 text-left font-medium">Text</th>
                  <th className="px-6 py-3 text-left font-medium">Position</th>
                  <th className="px-6 py-3 text-left font-medium">Viewport</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.recentClicks.map((click) => {
                  const url = new URL(click.pageUrl);
                  return (
                    <tr key={click.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-xs">
                        {format(new Date(click.eventTime), "MMM d, HH:mm:ss")}
                      </td>
                      <td className="px-6 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                        {click.sessionId.slice(-8)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-gray-700 text-xs">{url.pathname}</span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                          {click.elementTag}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {click.elementText ? `"${click.elementText}"` : "—"}
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                        ({click.xPos}, {click.yPos})
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                        {click.viewportWidth}x{click.viewportHeight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
