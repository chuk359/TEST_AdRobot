import { TimeSeriesChart } from "./time-series-chart.js";

const dates = ["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"];

const chart = new TimeSeriesChart("#chart");

chart.setData([
  {
    name: "Cost",
    type: "area",
    data: dates.map((x, index) => ({ x, y: [2.04, 28.2, 44.36, 55.65, 66.4][index] })),
  },
  {
    name: "ROI confirmed",
    type: "spline",
    data: dates.map((x, index) => ({ x, y: [72, 24, 21, 6, 41][index] })),
  },
  {
    name: "Conversions",
    type: "line",
    data: dates.map((x, index) => ({ x, y: [0, 22, 26, 52, 70][index] })),
  },
  {
    name: "CPA",
    type: "bar",
    data: dates.map((x, index) => ({ x, y: [0.68, 1.1, 1.23, 0.79, 1.42][index] })),
  },
]);
