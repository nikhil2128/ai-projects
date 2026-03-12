import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "../lib/recharts";
import type { ChartData } from "../types";

const COLORS = [
  "#818cf8",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#34d399",
  "#38bdf8",
  "#fbbf24",
  "#f87171",
  "#2dd4bf",
  "#c084fc",
];

interface ChartViewProps {
  chart: ChartData;
}

export function ChartView({ chart }: ChartViewProps) {
  const { type, title, description, data } = chart;

  const transformedData = data.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    data.datasets.forEach((ds) => {
      point[ds.label] = ds.data[i] ?? 0;
    });
    return point;
  });

  const renderChart = () => {
    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              {data.datasets.map((ds, idx) => (
                <Bar
                  key={ds.label}
                  dataKey={ds.label}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              {data.datasets.map((ds, idx) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={transformedData}
                dataKey={data.datasets[0]?.label ?? "value"}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }: { name: string; percent: number }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#475569" }}
              >
                {transformedData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={COLORS[idx % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={transformedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend wrapperStyle={{ color: "#94a3b8" }} />
              {data.datasets.map((ds, idx) => (
                <Area
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={transformedData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              {data.datasets.map((ds, idx) => (
                <Radar
                  key={ds.label}
                  name={ds.label}
                  dataKey={ds.label}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.2}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-slate-400">Unsupported chart type</p>;
    }
  };

  return (
    <div className="glass-card rounded-xl p-5">
      <h4 className="text-white font-semibold mb-1">{title}</h4>
      <p className="text-slate-400 text-sm mb-4">{description}</p>
      {renderChart()}
    </div>
  );
}
