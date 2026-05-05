'use client';

import type { JSX } from 'react';
import type { UIMessage } from 'ai';
import styles from './AskAI.module.css';

export interface MessageListProps {
  messages: UIMessage[];
}

function textFromMessage(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function MessageList({ messages }: MessageListProps): JSX.Element {
  return (
    <div className={styles.messages} role="log" aria-live="polite">
      {messages.map((message) => (
        <div className={styles.message} data-role={message.role} key={message.id}>
          <div className={styles.messageLabel}>
            {message.role === 'user' ? 'You' : 'AgentTrust'}
          </div>
          <p>{textFromMessage(message)}</p>
        </div>
      ))}
    </div>
  );
}
