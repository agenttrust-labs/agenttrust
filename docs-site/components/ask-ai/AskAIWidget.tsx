'use client';

import type { JSX } from 'react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AskButton } from './AskButton';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

export function AskAIWidget(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen ? <AskButton onClick={() => setIsOpen(true)} /> : null}
      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
