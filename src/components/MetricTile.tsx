import { Card, CardContent } from '@cognite/aura/components/card';

const metricTone = {
  neutral: 'text-foreground',
  warning: 'text-warning-foreground',
  success: 'text-success-foreground',
  danger: 'text-destructive-foreground',
};

export type MetricTone = keyof typeof metricTone;

export function MetricTile({ label, value, tone }: { label: string; value: string; tone: MetricTone }) {
  return (
    <Card className="border border-border">
      <CardContent className="w-full">
        <dd className={`text-3xl font-semibold tracking-tight ${metricTone[tone]}`}>{value}</dd>
        <dt className="mt-1 text-sm text-muted-foreground">{label}</dt>
      </CardContent>
    </Card>
  );
}
