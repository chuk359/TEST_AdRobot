# Four-series chart

Интерактивный SVG-график для четырёх синхронных time-series: `area`, `spline`, `line` и `bar`. Без runtime-зависимостей.

## Запуск

```bash
npm run dev
```

Откройте [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Инициализация

Добавьте контейнер и подключите стили:

```html
<link rel="stylesheet" href="./styles.css" />
<div id="chart" class="chart-host"></div>
```

Передайте ровно четыре последовательности одинаковой длины — по одной каждого типа:

```js
import { TimeSeriesChart } from "./src/time-series-chart.js";

const chart = new TimeSeriesChart("#chart", {
  // Необязательно: переопределение палитры
  colors: {
    area: "#f7df57",
    spline: "#478c2f",
    line: "#8b37dd",
    bar: "#536ce8",
  },
});

chart.setData([
  {
    name: "Cost",
    type: "area",
    data: [
      { x: "2026-06-10", y: 2.04 },
      { x: "2026-06-11", y: 28.2 },
    ],
  },
  {
    name: "ROI confirmed",
    type: "spline",
    data: [
      { x: "2026-06-10", y: 72 },
      { x: "2026-06-11", y: 24 },
    ],
  },
  {
    name: "Conversions",
    type: "line",
    data: [
      { x: "2026-06-10", y: 0 },
      { x: "2026-06-11", y: 22 },
    ],
  },
  {
    name: "CPA",
    type: "bar",
    data: [
      { x: "2026-06-10", y: 0.68 },
      { x: "2026-06-11", y: 1.1 },
    ],
  },
]);
```

Каждая точка — объект `{ x, y }`, где `x` принимает `Date` или дату, которую понимает `new Date(...)`, а `y` — число. Метод `setData(...)` можно вызывать повторно для обновления данных. `destroy()` удаляет график и отключает наблюдение за размером.

Для форматирования значения конкретной серии передайте `formatter(value)` рядом с `name`, `type` и `data`.

## Сборка

```bash
npm run build
```

Статические файлы появятся в `dist/`.
