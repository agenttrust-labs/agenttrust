import type { JSX } from 'react';
import { PROGRAM_IDS } from '@/lib/constants';

export function ProgramIdsTable(): JSX.Element {
  return (
    <div className="program-id-table" role="region" aria-label="Devnet program IDs">
      <div className="program-id-row">
        <span>policy_vault</span>
        <code>{PROGRAM_IDS.devnet.policyVault}</code>
      </div>
      <div className="program-id-row">
        <span>trustgate</span>
        <code>{PROGRAM_IDS.devnet.trustgate}</code>
      </div>
      <div className="program-id-row">
        <span>validation_registry</span>
        <code>{PROGRAM_IDS.devnet.validationRegistry}</code>
      </div>
    </div>
  );
}
