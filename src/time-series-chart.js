const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULTS = {
  colors: {
    area: "#f7df57",
    spline: "#478c2f",
    line: "#8b37dd",
    bar: "#536ce8",
  },
  padding: { top: 18, right: 18, bottom: 38, left: 52 },
  yTicks: 5,
};

const svgEl = (name, attrs = {}) => {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
};

const asTime = (value) => value instanceof Date ? value.getTime() : new Date(value).getTime();
const compactNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function smoothPath(points) {
  if (points.length < 2) return points.length ? `M${points[0][0]},${points[0][1]}` : "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const before = points[index - 1] ?? previous;
    const after = points[index + 2] ?? point;
    const tension = 0.16;
    const c1x = previous[0] + (point[0] - before[0]) * tension;
    const c1y = previous[1] + (point[1] - before[1]) * tension;
    const c2x = point[0] - (after[0] - previous[0]) * tension;
    const c2y = point[1] - (after[1] - previous[1]) * tension;
    return `${path} C${c1x},${c1y} ${c2x},${c2y} ${point[0]},${point[1]}`;
  }, `M${points[0][0]},${points[0][1]}`);
}

export class TimeSeriesChart {
  constructor(target, options = {}) {
    this.host = typeof target === "string" ? document.querySelector(target) : target;
    if (!this.host) throw new Error("Chart target was not found");
    this.options = { ...DEFAULTS, ...options, padding: { ...DEFAULTS.padding, ...options.padding } };
    this.series = [];
    this.activeIndex = null;
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(this.host);
    this.host.addEventListener("pointerleave", () => this.hideTooltip());
  }

  setData(series) {
    if (!Array.isArray(series) || series.length !== 4) {
      throw new Error("TimeSeriesChart expects exactly four series");
    }
    const types = new Set(series.map((item) => item.type));
    ["area", "spline", "line", "bar"].forEach((type) => {
      if (!types.has(type)) throw new Error(`Missing required series type: ${type}`);
    });
    const length = series[0].data.length;
    if (!length || series.some((item) => item.data.length !== length)) {
      throw new Error("All series must contain the same non-zero number of points");
    }
    this.series = series.map((item) => ({
      ...item,
      color: item.color ?? this.options.colors[item.type],
      data: item.data.map((point) => ({ x: asTime(point.x), y: Number(point.y) })),
    }));
    this.render();
    return this;
  }

  render() {
    if (!this.series.length) return;
    const width = Math.max(this.host.clientWidth, 320);
    const height = Math.max(this.host.clientHeight, 260);
    const p = this.options.padding;
    const innerWidth = width - p.left - p.right;
    const innerHeight = height - p.top - p.bottom;
    const allValues = this.series.flatMap((item) => item.data.map((point) => point.y));
    const maxValue = Math.max(...allValues, 1);
    const ceiling = maxValue * 1.14;
    const dates = this.series[0].data.map((point) => point.x);
    const stepX = dates.length > 1 ? innerWidth / (dates.length - 1) : 0;
    const x = (index) => p.left + index * stepX;
    const y = (value) => p.top + innerHeight - (value / ceiling) * innerHeight;

    this.host.replaceChildren();
    this.svg = svgEl("svg", { class: "ts-chart", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "График четырёх временных рядов" });
    const defs = svgEl("defs");
    const gradient = svgEl("linearGradient", { id: "area-gradient", x1: "0", y1: "0", x2: "0", y2: "1" });
    gradient.append(svgEl("stop", { offset: "0%", "stop-color": this.series.find((s) => s.type === "area").color, "stop-opacity": ".52" }));
    gradient.append(svgEl("stop", { offset: "100%", "stop-color": this.series.find((s) => s.type === "area").color, "stop-opacity": ".14" }));
    const clipPath = svgEl("clipPath", { id: "plot-clip" });
    clipPath.append(svgEl("rect", { x: p.left, y: p.top, width: innerWidth, height: innerHeight }));
    defs.append(gradient, clipPath);
    this.svg.append(defs);

    for (let tick = 0; tick <= this.options.yTicks; tick += 1) {
      const tickY = p.top + (innerHeight / this.options.yTicks) * tick;
      this.svg.append(svgEl("line", { class: "ts-grid", x1: p.left, x2: width - p.right, y1: tickY, y2: tickY }));
      const label = svgEl("text", { x: p.left - 12, y: tickY + 4, "text-anchor": "end" });
      label.textContent = compactNumber.format(ceiling * (1 - tick / this.options.yTicks));
      this.svg.append(label);
    }

    dates.forEach((date, index) => {
      const label = svgEl("text", { x: x(index), y: height - 10, "text-anchor": "middle" });
      label.textContent = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
      this.svg.append(label);
    });

    this.svg.append(svgEl("line", { class: "ts-axis", x1: p.left, x2: width - p.right, y1: p.top + innerHeight, y2: p.top + innerHeight }));
    const plot = svgEl("g", { "clip-path": "url(#plot-clip)" });

    const areaSeries = this.series.find((item) => item.type === "area");
    const areaPoints = areaSeries.data.map((point, index) => [x(index), y(point.y)]);
    const areaPath = `${areaPoints.map((point, index) => `${index ? "L" : "M"}${point[0]},${point[1]}`).join(" ")} L${x(dates.length - 1)},${p.top + innerHeight} L${x(0)},${p.top + innerHeight} Z`;
    plot.append(svgEl("path", { d: areaPath, fill: "url(#area-gradient)" }));

    const barSeries = this.series.find((item) => item.type === "bar");
    const barWidth = Math.min(22, Math.max(8, stepX * 0.24));
    barSeries.data.forEach((point, index) => {
      plot.append(svgEl("rect", { x: x(index) - barWidth / 2, y: y(point.y), width: barWidth, height: Math.max(2, p.top + innerHeight - y(point.y)), rx: 2, fill: barSeries.color, opacity: ".92" }));
    });

    ["spline", "line"].forEach((type) => {
      const current = this.series.find((item) => item.type === type);
      const points = current.data.map((point, index) => [x(index), y(point.y)]);
      const d = type === "spline" ? smoothPath(points) : points.map((point, index) => `${index ? "L" : "M"}${point[0]},${point[1]}`).join(" ");
      plot.append(svgEl("path", { d, fill: "none", stroke: current.color, "stroke-width": type === "spline" ? 4 : 2, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      points.forEach((point, index) => {
        plot.append(svgEl(type === "line" ? "rect" : "circle", type === "line"
          ? { x: point[0] - 4, y: point[1] - 4, width: 8, height: 8, fill: current.color }
          : { cx: point[0], cy: point[1], r: 2.5, fill: "#fff", stroke: current.color, "stroke-width": 1.5 }));
      });
    });

    this.hoverLine = svgEl("line", { class: "ts-hover-line", y1: p.top, y2: p.top + innerHeight, visibility: "hidden" });
    plot.append(this.hoverLine);
    this.markerLayer = svgEl("g");
    plot.append(this.markerLayer);
    this.svg.append(plot);

    const hitArea = svgEl("rect", { class: "ts-hit-area", x: p.left, y: p.top, width: innerWidth, height: innerHeight, fill: "transparent", tabindex: "0", "aria-label": "Наведите или используйте стрелки для просмотра значений" });
    const chooseIndex = (event) => {
      const rect = this.svg.getBoundingClientRect();
      const localX = ((event.clientX - rect.left) / rect.width) * width;
      this.showIndex(Math.max(0, Math.min(dates.length - 1, Math.round((localX - p.left) / stepX))), { width, height, x, y });
    };
    hitArea.addEventListener("pointermove", chooseIndex);
    hitArea.addEventListener("pointerdown", chooseIndex);
    hitArea.addEventListener("focus", () => this.showIndex(this.activeIndex ?? 0, { width, height, x, y }));
    hitArea.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      this.showIndex(Math.max(0, Math.min(dates.length - 1, (this.activeIndex ?? 0) + delta)), { width, height, x, y });
    });
    this.svg.append(hitArea);

    this.tooltip = document.createElement("div");
    this.tooltip.className = "ts-tooltip";
    this.tooltip.setAttribute("role", "status");
    this.host.append(this.svg, this.tooltip);
  }

  showIndex(index, scale) {
    this.activeIndex = index;
    const { width, height, x, y } = scale;
    const pointX = x(index);
    this.hoverLine.setAttribute("x1", pointX);
    this.hoverLine.setAttribute("x2", pointX);
    this.hoverLine.setAttribute("visibility", "visible");
    this.markerLayer.replaceChildren();
    this.series.forEach((item) => {
      const pointY = y(item.data[index].y);
      this.markerLayer.append(svgEl("circle", { class: "ts-marker", cx: pointX, cy: pointY, r: 5, fill: item.color, stroke: "#fff", "stroke-width": 2 }));
    });

    const date = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(this.series[0].data[index].x);
    const tooltipOrder = ["area", "bar", "spline", "line"];
    const tooltipSeries = [...this.series].sort((a, b) => tooltipOrder.indexOf(a.type) - tooltipOrder.indexOf(b.type));
    this.tooltip.innerHTML = `<div class="ts-tooltip__date">${date}</div>${tooltipSeries.map((item) => `<div class="ts-tooltip__row"><span class="ts-tooltip__dot" style="background:${item.color}"></span><span>${item.name}:</span><span class="ts-tooltip__value">${item.formatter ? item.formatter(item.data[index].y) : compactNumber.format(item.data[index].y)}</span></div>`).join("")}`;
    this.tooltip.dataset.visible = "true";
    const tooltipWidth = this.tooltip.offsetWidth || 212;
    const tooltipHeight = this.tooltip.offsetHeight || 124;
    let left = (pointX / width) * this.host.clientWidth + 18;
    if (left + tooltipWidth > this.host.clientWidth) left = (pointX / width) * this.host.clientWidth - tooltipWidth - 18;
    const anchorY = Math.min(...this.series.map((item) => y(item.data[index].y)));
    const top = Math.max(8, Math.min(this.host.clientHeight - tooltipHeight - 8, (anchorY / height) * this.host.clientHeight - 18));
    this.tooltip.style.left = `${Math.max(8, left)}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.dataset.visible = "false";
    this.hoverLine?.setAttribute("visibility", "hidden");
    this.markerLayer?.replaceChildren();
  }

  destroy() {
    this.resizeObserver.disconnect();
    this.host.replaceChildren();
  }
}
