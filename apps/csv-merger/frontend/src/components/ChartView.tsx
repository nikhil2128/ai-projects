import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import { BarChart3, ArrowLeft, RotateCcw, TrendingUp } from "lucide-react";
import { MergeResult, ChartSuggestion } from "../types";
import { suggestCharts } from "../chartSuggester";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
];

interface ChartViewProps {
  result: MergeResult;
  onBack: () => void;
  onReset: () => void;
}

export function ChartView({ result, onBack, onReset }: ChartViewProps) {
  const charts = useMemo(() => suggestCharts(result), [result]);

  if (charts.length === 0) {
    return (
      <div className="charts-section">
        <div className="charts-header">
          <div className="charts-header__left">
            <BarChart3 size={28} className="chart-icon" />
            <div>
              <h2 className="section-title">Data Insights</h2>
              <p className="section-subtitle">
                No chart suggestions available for this dataset.
              </p>
            </div>
          </div>
          <div className="charts-header__actions">
            <button className="btn btn--secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              Back to Results
            </button>
            <button className="btn btn--secondary" onClick={onReset}>
              <RotateCcw size={16} />
              Start Over
            </button>
          </div>
        </div>

        <div className="charts-empty">
          <TrendingUp size={48} className="charts-empty__icon" />
          <h3 className="charts-empty__title">No Charts Available</h3>
          <p className="charts-empty__text">
            Charts work best with a mix of numeric and categorical columns. This
            dataset may not have enough variety for automatic chart generation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-section">
      <div className="charts-header">
        <div className="charts-header__left">
          <BarChart3 size={28} className="chart-icon" />
          <div>
            <h2 className="section-title">Data Insights</h2>
            <p className="section-subtitle">
              {charts.length} chart{charts.length !== 1 ? "s" : ""} generated
              from your merged data
            </p>
          </div>
        </div>
        <div className="charts-header__actions">
          <button className="btn btn--secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Results
          </button>
          <button className="btn btn--secondary" onClick={onReset}>
            <RotateCcw size={16} />
            Start Over
          </button>
        </div>
      </div>

      <div className="alert alert--info">
        <TrendingUp size={16} />
        <span>
          Charts are generated from the first {result.previewRows.length} rows
          of merged data ({result.totalRows.toLocaleString()} total rows).
        </span>
      </div>

      <div className="charts-grid">
        {charts.map((chart) => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </div>
    </div>
  );
}

function ChartCard({ chart }: { chart: ChartSuggestion }) {
  return (
    <div
      className={`chart-card ${chart.type === "line" ? "chart-card--wide" : ""}`}
    >
      <div className="chart-card__header">
        <h3 className="chart-card__title">{chart.title}</h3>
        <p className="chart-card__description">{chart.description}</p>
      </div>
      <div className="chart-card__body">{renderChart(chart)}</div>
    </div>
  );
}

function renderChart(chart: ChartSuggestion): React.ReactNode {
  switch (chart.type) {
    case "bar":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chart.data}
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey={chart.xKey}
              tick={{ fontSize: 12 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            {chart.yKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={chart.yLabels[i]}
                fill={COLORS[i % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case "line":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chart.data}
            margin={{ top: 10, right: 20, left: 10, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey={chart.xKey}
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
              }}
            />
            <Legend wrapperStyle={{ paddingTop: 10 }} />
            {chart.yKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={chart.yLabels[i]}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case "pie":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chart.data}
              dataKey={chart.yKeys[0]}
              nameKey={chart.xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              paddingAngle={2}
              label={({ name, percent }: { name: string; percent: number }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {chart.data.map((_, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={COLORS[i % COLORS.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case "scatter":
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey={chart.xKey}
              name={chart.xLabel}
              tick={{ fontSize: 12 }}
              label={{
                value: chart.xLabel,
                position: "insideBottom",
                offset: -5,
                style: { fontSize: 12, fill: "#64748b" },
              }}
            />
            <YAxis
              dataKey={chart.yKeys[0]}
              name={chart.yLabels[0]}
              tick={{ fontSize: 12 }}
              label={{
                value: chart.yLabels[0],
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 12, fill: "#64748b" },
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
              }}
            />
            <Scatter
              name={chart.title}
              data={chart.data}
              fill={COLORS[0]}
              fillOpacity={0.7}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    default:
      return null;
  }
}
