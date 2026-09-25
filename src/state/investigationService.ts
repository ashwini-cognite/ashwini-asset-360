import { createContext, useContext } from 'react';

import type { InvestigationService } from '../services/cdfInvestigationService';

export const ServiceContext = createContext<InvestigationService | undefined>(undefined);

export function useInvestigationService(): InvestigationService {
  const service = useContext(ServiceContext);
  if (!service) throw new Error('Investigation service is unavailable.');
  return service;
}
