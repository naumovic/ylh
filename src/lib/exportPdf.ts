import jsPDF from 'jspdf';
import type { Plan } from '../core/report.ts';

const NAVY = '#14304B';
const MUTED = '#5B6B7C';
const AMBER = '#F2A900';
const HAIRLINE = '#E6EBF0';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
const pb = (y: number) => (!isFinite(y) || y <= 0 ? '—' : y.toFixed(1) + ' yrs');

export function exportPdf(plan: Plan): void {
  const doc = buildPlanPdf(plan);
  doc.save(`your-local-hero-plan-${plan.postcode}-${plan.generatedAt.slice(0, 10)}.pdf`);
}

/** The plan PDF as raw base64 (no data: prefix) — for emailing via /api/unlock. */
export function planPdfBase64(plan: Plan): string {
  const uri = buildPlanPdf(plan).output('datauristring');
  return uri.slice(uri.indexOf(',') + 1);
}

function buildPlanPdf(plan: Plan): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 18;
  const cw = pw - margin * 2;
  let cy = margin;

  const addPage = () => { doc.addPage(); cy = margin; };
  const needSpace = (h: number) => { if (cy + h > 280) addPage(); };

  // — Header —
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Local Hero', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Honest solar, EV & battery advice', margin, 18);
  doc.setFontSize(8);
  doc.text(`${plan.state} ${plan.postcode}  ·  Generated ${plan.generatedAt.slice(0, 10)}`, margin, 24);
  cy = 36;

  // — Headline —
  doc.setTextColor(NAVY);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommended next move', margin, cy);
  cy += 7;
  doc.setFontSize(11);
  doc.text(plan.headline, margin, cy);
  cy += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  const reasonLines = doc.splitTextToSize(plan.recommended.reason, cw);
  doc.text(reasonLines, margin, cy);
  cy += reasonLines.length * 4 + 4;

  // — Winner stats (if not "do nothing") —
  if (plan.recommended.key !== 'nothing') {
    needSpace(14);
    doc.setDrawColor(HAIRLINE);
    doc.setFillColor('#F7F9FB');
    doc.roundedRect(margin, cy, cw, 12, 2, 2, 'FD');
    doc.setTextColor(NAVY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const statY = cy + 8;
    doc.text(`Cost: ${fmt(plan.recommended.cost)}`, margin + 4, statY);
    doc.text(`Saving/yr: ${plan.recommended.savingPerYear > 0 ? fmt(plan.recommended.savingPerYear) : '—'}`, margin + 50, statY);
    doc.text(`Payback: ${pb(plan.recommended.paybackYears)}`, margin + 105, statY);
    cy += 18;
  }

  // — Scenario comparison table —
  needSpace(30);
  doc.setTextColor(NAVY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Scenario comparison', margin, cy);
  cy += 6;

  // Table header
  doc.setFillColor(NAVY);
  doc.rect(margin, cy, cw, 7, 'F');
  doc.setTextColor('#FFFFFF');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Scenario', margin + 3, cy + 5);
  doc.text('Cost', margin + 100, cy + 5, { align: 'right' });
  doc.text('Saving/yr', margin + 130, cy + 5, { align: 'right' });
  doc.text('Payback', margin + cw - 3, cy + 5, { align: 'right' });
  cy += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  for (const row of plan.scenarios) {
    needSpace(8);
    doc.setFillColor(plan.scenarios.indexOf(row) % 2 === 0 ? '#FFFFFF' : '#F7F9FB');
    doc.rect(margin, cy, cw, 7, 'F');
    doc.setTextColor(NAVY);
    doc.text(row.name, margin + 3, cy + 5);
    doc.setTextColor(MUTED);
    doc.text(row.cost > 0 ? fmt(row.cost) : '—', margin + 100, cy + 5, { align: 'right' });
    doc.text(row.saving > 0 ? fmt(row.saving) : '—', margin + 130, cy + 5, { align: 'right' });
    doc.text(pb(row.paybackYears), margin + cw - 3, cy + 5, { align: 'right' });
    cy += 7;
  }
  cy += 6;

  // — Payback chart (simple text representation in PDF) —
  needSpace(30);
  doc.setTextColor(NAVY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Payback timeline', margin, cy);
  cy += 6;

  // Break-even year via the same zero-crossing interpolation as the on-screen
  // PaybackChart, so the PDF and the web view agree.
  const points = plan.cashflow;
  const maxYear = points.length ? points[points.length - 1].year : 15;
  let breakEvenYear: number | null = null;
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].net < 0 && points[i].net >= 0) {
      const frac = -points[i - 1].net / (points[i].net - points[i - 1].net);
      breakEvenYear = points[i - 1].year + frac * (points[i].year - points[i - 1].year);
      break;
    }
  }

  if (breakEvenYear === null) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED);
    doc.text(`No payback within ${maxYear} years.`, margin, cy);
    cy += 6;
  } else {
    // Full cumulative-net line chart (mirrors src/components/PaybackChart.tsx).
    const chartH = 52;
    needSpace(chartH + 4);
    const padL = 20, padR = 3, padT = 6, padB = 12;
    const plotX0 = margin + padL;
    const plotX1 = margin + cw - padR;
    const plotY0 = cy + padT;
    const plotY1 = cy + chartH - padB;

    const nets = points.map((p) => p.net);
    const minNet = Math.min(...nets);
    const maxNet = Math.max(...nets);
    const range = maxNet - minNet || 1;

    const X = (year: number) => plotX0 + (year / maxYear) * (plotX1 - plotX0);
    const Y = (net: number) => plotY1 - ((net - minNet) / range) * (plotY1 - plotY0);

    // Y gridlines + $k labels
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const step = niceStep(range, 4);
    for (let v = Math.floor(minNet / step) * step; v <= maxNet + step * 0.5; v += step) {
      const gy = Y(v);
      if (gy < plotY0 - 0.5 || gy > plotY1 + 0.5) continue;
      doc.setDrawColor(HAIRLINE);
      doc.setLineWidth(0.2);
      doc.line(plotX0, gy, plotX1, gy);
      doc.setTextColor(MUTED);
      doc.text(`$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`, plotX0 - 2, gy + 1, { align: 'right' });
    }

    const P = points.map((p) => ({ x: X(p.year), y: Y(p.net) }));
    const zeroY = Y(0);

    // Light-green area under the line down to the zero baseline
    const area: [number, number][] = [];
    for (let i = 1; i < P.length; i++) area.push([P[i].x - P[i - 1].x, P[i].y - P[i - 1].y]);
    area.push([0, zeroY - P[P.length - 1].y]);
    area.push([P[0].x - P[P.length - 1].x, 0]);
    doc.setFillColor(220, 240, 230);
    doc.lines(area, P[0].x, P[0].y, [1, 1], 'F', true);

    // Dashed zero baseline (only when the line spans negative→positive)
    if (minNet < 0 && maxNet > 0) {
      doc.setDrawColor(MUTED);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(plotX0, zeroY, plotX1, zeroY);
      doc.setLineDashPattern([], 0);
    }

    // The cumulative-net line + data points
    const seg: [number, number][] = [];
    for (let i = 1; i < P.length; i++) seg.push([P[i].x - P[i - 1].x, P[i].y - P[i - 1].y]);
    doc.setDrawColor(NAVY);
    doc.setLineWidth(0.7);
    doc.lines(seg, P[0].x, P[0].y, [1, 1], 'S');
    doc.setFillColor(NAVY);
    for (const pt of P) doc.circle(pt.x, pt.y, 0.6, 'F');

    // Amber break-even marker + label
    const beX = X(breakEvenYear);
    doc.setDrawColor(AMBER);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 1.5], 0);
    doc.line(beX, plotY0, beX, plotY1);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(AMBER);
    const labelX = Math.min(Math.max(beX, plotX0 + 15), plotX1 - 15);
    doc.text(`Break-even: ${breakEvenYear.toFixed(1)} yrs`, labelX, cy + 3, { align: 'center' });

    // X-axis year labels + title
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED);
    for (const p of points) {
      if (p.year % 5 === 0 || p.year === maxYear) {
        doc.text(String(p.year), X(p.year), plotY1 + 5, { align: 'center' });
      }
    }
    doc.text('Years', (plotX0 + plotX1) / 2, plotY1 + 10, { align: 'center' });

    cy += chartH + 4;
  }

  // — Cashflow table —
  needSpace(20);
  doc.setTextColor(NAVY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Cumulative net by year', margin, cy);
  cy += 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  const cfLine = plan.cashflow
    .filter((p) => p.year % 3 === 0 || p.year === 15)
    .map((p) => `Yr ${p.year}: ${fmt(p.net)}`)
    .join('   ');
  doc.text(cfLine, margin, cy);
  cy += 8;

  // — Rebates & rates —
  needSpace(20);
  doc.setTextColor(NAVY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Rebates & rates', margin, cy);
  cy += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  const rebateLines = doc.splitTextToSize(plan.rebatesNote, cw);
  doc.text(rebateLines, margin, cy);
  cy += rebateLines.length * 3.5 + 6;

  // — Checklist —
  needSpace(20);
  doc.setTextColor(NAVY);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Before you commit: checklist', margin, cy);
  cy += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  for (const item of plan.checklist) {
    needSpace(10);
    doc.setTextColor(AMBER);
    doc.text('▸', margin, cy);
    doc.setTextColor(NAVY);
    const itemLines = doc.splitTextToSize(item, cw - 6);
    doc.text(itemLines, margin + 5, cy);
    cy += itemLines.length * 3.5 + 2;
  }
  cy += 4;

  // — Disclaimer —
  needSpace(14);
  doc.setDrawColor(HAIRLINE);
  doc.line(margin, cy, margin + cw, cy);
  cy += 5;
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'italic');
  const discLines = doc.splitTextToSize(plan.disclaimer, cw);
  doc.text(discLines, margin, cy);

  return doc;
}

/** "Nice" axis step (1/2/5 × 10ⁿ) for ~targetTicks gridlines. Mirrors PaybackChart. */
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
