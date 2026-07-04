import type { Plan } from '../core/report.ts';

export function exportJson(plan: Plan): void {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `your-local-hero-plan-${plan.postcode}-${plan.generatedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
