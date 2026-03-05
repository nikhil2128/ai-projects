import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { computeAnalytics, getAggregateAnalytics } from "../data/mock";
import StatCard from "../components/StatCard";
import {
  MousePointerClick,
  Users,
  FileText,
  Activity,
  Globe,
  ArrowUpRight,
  ExternalLink,
  Circle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const websiteIds = useMemo(() => user?.websites.map((w) => w.id) || [], [user]);

  const aggregate = useMemo(() => getAggregateAnalytics(websiteIds), [websiteIds]);
  const perSite = useMemo(
    () => (user?.websites || []).map((ws) => ({ website: ws, analytics: computeAnalytics(ws.id) })),
    [user]
  );

  const chartData = useMemo(
    () =>
      aggregate.clicksOverTime.map((p) => ({
        date: p.bucket,
        label: format(parseISO(p.bucket), "MMM d"),
        clicks: p.count,
      })),
    [aggregate]
  );

  const avgClicksPerDay = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((s, d) => s + d.clicks, 0);
    return Math.round(total / chartData.length);
  }, [chartData]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of all your websites' performance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clicks"
          value={aggregate.totalClicks}
          icon={<MousePointerClick className="w-5 h-5" />}
          trend={perSite.length > 0 ? perSite[0].analytics.clicksTrend : 0}
        />
        <StatCard
          label="Unique Sessions"
          value={aggregate.totalSessions}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Pages Tracked"
          value={aggregate.totalPages}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Avg. Clicks / Day"
          value={avgClicksPerDay}
          icon={<Activity className="w-5 h-5" />}
          subtitle="Last 30 days"
        />
      </div>

      {/* Clicks over time chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Clicks Over Time</h2>
            <p className="text-sm text-gray-500">All websites combined — last 30 days</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                interval={Math.floor(chartData.length / 7)}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "13px",
                }}
                labelFormatter={(label) => `Date: ${label}`}
                formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#clickGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-website cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Websites</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {perSite.map(({ website, analytics }) => (
            <Link
              key={website.id}
              to={`/website/${website.id}`}
              className="card p-5 hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-700">
                    {website.favicon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                      {website.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Globe className="w-3 h-3" />
                      {website.domain}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle
                    className={`w-2 h-2 fill-current ${
                      website.status === "active" ? "text-emerald-500" : "text-amber-400"
                    }`}
                  />
                  <span className="text-xs text-gray-500 capitalize">{website.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {analytics.totalClicks.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Clicks</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{analytics.uniqueSessions}</div>
                  <div className="text-xs text-gray-500">Sessions</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{analytics.bounceRate}%</div>
                  <div className="text-xs text-gray-500">Bounce rate</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View details <ArrowUpRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent activity across all websites */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Latest clicks across all websites</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-3 text-left font-medium">Time</th>
                <th className="px-6 py-3 text-left font-medium">Website</th>
                <th className="px-6 py-3 text-left font-medium">Page</th>
                <th className="px-6 py-3 text-left font-medium">Element</th>
                <th className="px-6 py-3 text-left font-medium">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {perSite
                .flatMap(({ website, analytics }) =>
                  analytics.recentClicks.slice(0, 5).map((click) => ({
                    ...click,
                    websiteName: website.name,
                    domain: website.domain,
                  }))
                )
                .sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime())
                .slice(0, 15)
                .map((click) => {
                  const url = new URL(click.pageUrl);
                  return (
                    <tr key={click.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {format(new Date(click.eventTime), "MMM d, HH:mm")}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {click.websiteName}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-600">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{url.pathname}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono">
                          {click.elementTag}
                        </span>
                        {click.elementText && (
                          <span className="ml-2 text-gray-500 text-xs">"{click.elementText}"</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                        ({click.xPos}, {click.yPos})
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
