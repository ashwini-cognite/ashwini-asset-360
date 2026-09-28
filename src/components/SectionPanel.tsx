import { Badge } from '@cognite/aura/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeaderCenter,
  CardHeaderEnd,
  CardTitle,
} from '@cognite/aura/components/card';
import type { ReactNode } from 'react';

export function SectionPanel({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardHeaderCenter>
          <CardTitle as="h2">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeaderCenter>
        {count !== undefined ? (
          <CardHeaderEnd>
            <Badge variant="secondary">{count}</Badge>
          </CardHeaderEnd>
        ) : null}
      </CardHeader>
      <CardContent className="w-full items-stretch">{children}</CardContent>
    </Card>
  );
}
