// React 19 type compatibility for recharts class components
import type { ComponentType } from "react";

declare module "recharts" {
  export const XAxis: ComponentType<any>;
  export const YAxis: ComponentType<any>;
  export const Tooltip: ComponentType<any>;
  export const Legend: ComponentType<any>;
  export const Bar: ComponentType<any>;
  export const Line: ComponentType<any>;
  export const Pie: ComponentType<any>;
  export const Cell: ComponentType<any>;
  export const Scatter: ComponentType<any>;
  export const CartesianGrid: ComponentType<any>;
}
