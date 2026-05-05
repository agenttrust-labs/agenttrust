import type { JSX } from 'react';
import { KANI_HARNESSES } from '@/lib/constants';

export function KaniProofBadge(): JSX.Element {
  return (
    <div className="kani-proof-badge">
      <div>
        <strong>5 / 5 invariants formally verified</strong>
        <p>PolicyVault safety properties are checked by Kani in CI.</p>
      </div>
      <ul>
        {KANI_HARNESSES.map((harness) => (
          <li key={harness}>
            <code>{harness}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
