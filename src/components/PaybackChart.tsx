import type { CashflowPoint } from '../core/report.ts';

interface Props {
  points: CashflowPoint[];
}

const W = 600;
const H = 280;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

export function PaybackChart({ points }: Props) {
  if (points.length === 0) return null;

  const maxYear = points[points.length - 1].year;
  const nets = points.map((p) => p.net);
  const minNet = Math.min(...nets);
  const maxNet = Math.max(...nets);
  const range = maxNet - minNet || 1;

  const x = (year: number) => PAD.left + (year / maxYear) * plotW;
  const y = (net: number) => PAD.top + plotH - ((net - minNet) / range) * plotH;

  // Build line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.year).toFixed(1)},${y(p.net).toFixed(1)}`).join(' ');

  // Build fill path (area under/over the zero line)
  const zeroY = y(0);
  const fillPath = linePath + ` L${x(maxYear).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z`;

  // Find break-even year (where net crosses from negative to positive)
  let breakEvenYear: number | null = null;
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].net < 0 && points[i].net >= 0) {
      // Linear interpolation
      const frac = -points[i - 1].net / (points[i].net - points[i - 1].net);
      breakEvenYear = points[i - 1].year + frac * (points[i].year - points[i - 1].year);
      break;
    }
  }

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = niceStep(range, 5);
  const yStart = Math.floor(minNet / step) * step;
  for (let v = yStart; v <= maxNet + step * 0.5; v += step) {
    yTicks.push(v);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 mt-4" data-testid="payback-chart">
      <h2 className="text-xs uppercase tracking-wide text-muted mb-3">Payback timeline · ballpark</h2>
      {breakEvenYear === null ? (
        <p className="text-sm text-muted italic">No payback within {maxYear} years.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[600px]" role="img" aria-label="Payback chart">
          {/* Grid lines */}
          {yTicks.map((v) => (
            <line key={v} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#E6EBF0" strokeWidth={1} />
          ))}

          {/* Zero line */}
          {minNet < 0 && maxNet > 0 && (
            <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} stroke="#5B6B7C" strokeWidth={1} strokeDasharray="4 2" />
          )}

          {/* Area fill */}
          <path d={fillPath} fill={breakEvenYear !== null ? '#2E9E6B' : '#D1483B'} fillOpacity={0.1} />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#14304B" strokeWidth={2} />

          {/* Break-even marker */}
          {breakEvenYear !== null && (
            <>
              <line
                x1={x(breakEvenYear)}
                x2={x(breakEvenYear)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="#F2A900"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              <text
                x={x(breakEvenYear)}
                y={PAD.top - 6}
                textAnchor="middle"
                className="text-[11px] font-semibold"
                fill="#F2A900"
              >
                Break-even: {breakEvenYear.toFixed(1)} yrs
              </text>
            </>
          )}

          {/* X-axis labels */}
          {points
            .filter((p) => p.year % 5 === 0 || p.year === maxYear)
            .map((p) => (
              <text key={p.year} x={x(p.year)} y={H - PAD.bottom + 18} textAnchor="middle" className="text-[11px]" fill="#5B6B7C">
                {p.year}
              </text>
            ))}

          {/* X-axis title */}
          <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" className="text-[11px]" fill="#5B6B7C">
            Years
          </text>

          {/* Y-axis labels */}
          {yTicks.map((v) => (
            <text key={v} x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="text-[10px]" fill="#5B6B7C">
              ${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k
            </text>
          ))}

          {/* Data points */}
          {points.map((p) => (
            <circle key={p.year} cx={x(p.year)} cy={y(p.net)} r={3} fill="#14304B" />
          ))}
        </svg>
      )}
    </div>
  );
}

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let nice: number;
  if (norm <= 1.5) nice = 1;
  else if (norm <= 3.5) nice = 2;
  else if (norm <= 7.5) nice = 5;
  else nice = 10;
  return nice * pow;
}
