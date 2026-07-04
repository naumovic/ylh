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

  const breakEven = plan.recommended.savingPerYear > 0
    ? plan.recommended.cost / plan.recommended.savingPerYear
    : null;

  if (breakEven !== null && isFinite(breakEven) && breakEven > 0 && breakEven <= 15) {
    // Draw a simple bar chart
    const barW = cw;
    const barH = 18;
    needSpace(barH + 10);

    doc.setFillColor('#F7F9FB');
    doc.roundedRect(margin, cy, barW, barH, 1, 1, 'F');

    // The filled portion to break-even (light red tint)
    const beRatio = Math.min(breakEven / 15, 1);
    const filledW = barW * beRatio;
    doc.setFillColor(245, 220, 218);
    doc.rect(margin, cy, filledW, barH, 'F');

    // Green portion after break-even (light green tint)
    doc.setFillColor(220, 240, 230);
    doc.rect(margin + filledW, cy, barW - filledW, barH, 'F');

    // Break-even line
    doc.setDrawColor(AMBER);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 1], 0);
    doc.line(margin + filledW, cy, margin + filledW, cy + barH);
    doc.setLineDashPattern([], 0);

    // Labels
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(AMBER);
    doc.text(`Break-even: ${breakEven.toFixed(1)} yrs`, margin + filledW, cy - 2, { align: 'center' });

    doc.setTextColor(MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text('0', margin, cy + barH + 4);
    doc.text('15 yrs', margin + barW, cy + barH + 4, { align: 'right' });

    cy += barH + 10;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(MUTED);
    doc.text('No payback within 15 years.', margin, cy);
    cy += 6;
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
