import type { ReactNode } from 'react';

import type { InvestigationService } from '../services/cdfInvestigationService';

import { ServiceContext } from './investigationService';

export function InvestigationServiceProvider({
  service,
  children,
}: {
  service: InvestigationService;
  children: ReactNode;
}) {
  return <ServiceContext.Provider value={service}>{children}</ServiceContext.Provider>;
}
