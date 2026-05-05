'use client';

import type { JSX } from 'react';
import { Sparkles } from 'lucide-react';
import styles from './AskAI.module.css';

export interface AskButtonProps {
  onClick: () => void;
}

export function AskButton({ onClick }: AskButtonProps): JSX.Element {
  return (
    <button className={styles.prompt} type="button" onClick={onClick}>
      <Sparkles aria-hidden="true" size={16} strokeWidth={1.8} />
      <span>Ask a question...</span>
      <kbd>AI</kbd>
    </button>
  );
}
