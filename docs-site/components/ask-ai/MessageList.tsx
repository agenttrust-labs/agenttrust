'use client';

import { useState, type JSX } from 'react';
import type { UIMessage } from 'ai';
import { Copy, RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-react';
import styles from './AskAI.module.css';

export interface MessageListProps {
  isBusy: boolean;
  messages: UIMessage[];
  onRegenerate: (messageId: string) => void;
}

function textFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function MessageList({
  isBusy,
  messages,
  onRegenerate,
}: MessageListProps): JSX.Element {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({});

  async function handleCopy(message: UIMessage): Promise<void> {
    const text = textFromMessage(message);
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  return (
    <div className={styles.messages} role="log" aria-live="polite">
      {messages.map((message) => {
        const text = textFromMessage(message);
        const isAssistant = message.role === 'assistant';

        return (
          <div className={styles.message} data-role={message.role} key={message.id}>
            <div className={styles.messageLabel}>
              {message.role === 'user' ? 'You' : 'AgentTrust'}
            </div>
            <p>{text}</p>
            {isAssistant ? (
              <div className={styles.responseActions} aria-label="Assistant response actions" role="group">
                <button
                  aria-label="Vote that response was good"
                  aria-pressed={votes[message.id] === 'up'}
                  onClick={() => setVotes((current) => ({ ...current, [message.id]: 'up' }))}
                  type="button"
                >
                  <ThumbsUp aria-hidden="true" size={14} />
                </button>
                <button
                  aria-label="Vote that response was not good"
                  aria-pressed={votes[message.id] === 'down'}
                  onClick={() => setVotes((current) => ({ ...current, [message.id]: 'down' }))}
                  type="button"
                >
                  <ThumbsDown aria-hidden="true" size={14} />
                </button>
                <button
                  aria-label={copiedMessageId === message.id ? 'Copied response' : 'Copy chat response'}
                  onClick={() => void handleCopy(message)}
                  type="button"
                >
                  <Copy aria-hidden="true" size={14} />
                </button>
                <button
                  aria-label="Reload last chat"
                  disabled={isBusy}
                  onClick={() => onRegenerate(message.id)}
                  type="button"
                >
                  <RefreshCw aria-hidden="true" size={14} />
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
