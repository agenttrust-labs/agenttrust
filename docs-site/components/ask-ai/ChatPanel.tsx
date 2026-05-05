'use client';

import type { FormEvent, JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { Send, X } from 'lucide-react';
import { ASK_AI_SUGGESTIONS } from '@/data/ask-ai-suggestions';
import type { InitialQuestion } from './AskAIWidget';
import { MessageList } from './MessageList';
import { SuggestionChip } from './SuggestionChip';
import styles from './AskAI.module.css';

export interface ChatPanelProps {
  initialQuestion: InitialQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onInitialQuestionHandled: (id: number) => void;
}

export default function ChatPanel({
  initialQuestion,
  isOpen,
  onClose,
  onInitialQuestionHandled,
}: ChatPanelProps): JSX.Element | null {
  const [input, setInput] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const handledInitialQuestionRef = useRef<number | null>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/ask' }), []);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });
  const isBusy = status === 'submitted' || status === 'streaming';

  const sendQuestion = useCallback(
    async (question: string): Promise<void> => {
      const text = question.trim();
      if (!text || text.length > 500) return;
      await sendMessage({ text });
    },
    [sendMessage],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !initialQuestion || handledInitialQuestionRef.current === initialQuestion.id) return;

    handledInitialQuestionRef.current = initialQuestion.id;
    onInitialQuestionHandled(initialQuestion.id);
    void sendQuestion(initialQuestion.text);
  }, [initialQuestion, isOpen, onInitialQuestionHandled, sendQuestion]);

  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = input.trim();
    if (!text || text.length > 500 || isBusy) return;
    setInput('');
    void sendQuestion(text);
  }

  return (
    <aside className={styles.panel} aria-label="Ask AgentTrust docs">
      <header className={styles.panelHeader}>
        <div>
          <strong>Ask AgentTrust docs</strong>
          <span>Answers are constrained to the current docs.</span>
        </div>
        <button className={styles.iconButton} type="button" aria-label="Close Ask AI" onClick={onClose}>
          <X aria-hidden="true" size={18} />
        </button>
      </header>

      <div className={styles.panelBody}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <p>Start with a docs question.</p>
            <div className={styles.suggestionGrid}>
              {ASK_AI_SUGGESTIONS.map((question) => (
                <SuggestionChip
                  key={question}
                  question={question}
                  onSelect={(nextQuestion) => {
                    void sendQuestion(nextQuestion);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        {error ? <p className={styles.error}>{error.message}</p> : null}
      </div>

      <form className={styles.form} ref={formRef} onSubmit={handleSubmit}>
        <textarea
          aria-label="Ask a question"
          maxLength={500}
          placeholder="Ask a question..."
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        {isBusy ? (
          <button type="button" onClick={() => void stop()}>
            Stop
          </button>
        ) : (
          <button type="submit" aria-label="Send question" disabled={!input.trim()}>
            <Send aria-hidden="true" size={16} />
          </button>
        )}
      </form>
    </aside>
  );
}
