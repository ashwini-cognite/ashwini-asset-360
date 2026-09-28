import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useInvestigationService } from './investigationService';

describe(useInvestigationService.name, () => {
  it('throws when the service provider is missing', () => {
    function Probe() {
      useInvestigationService();
      return null;
    }
    expect(() => render(<Probe />)).toThrow('Investigation service is unavailable.');
  });
});
