'use client';

import type { FormEvent, JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { Maximize2, Send, X } from 'lucide-react';
import { AssistantSparkleIcon } from './AssistantSparkleIcon';
import type { InitialQuestion } from './AskAIWidget';
import { MessageList } from './MessageList';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

    const frame = requestAnimationFrame(() => textareaRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsExpanded(false);
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !initialQuestion || handledInitialQuestionRef.current === initialQuestion.id) return;

    handledInitialQuestionRef.current = initialQuestion.id;
    onInitialQuestionHandled(initialQuestion.id);
    void sendQuestion(initialQuestion.text);
  }, [initialQuestion, isOpen, onInitialQuestionHandled, sendQuestion]);

  if (!isOpen) return null;

  function handleClose(): void {
    setIsExpanded(false);
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const text = input.trim();
    if (!text || text.length > 500 || isBusy) return;
    setInput('');
    void sendQuestion(text);
  }

  return (
    <aside
      aria-label="Ask AgentTrust docs"
      className={styles.panel}
      data-expanded={isExpanded ? 'true' : 'false'}
    >
      <header className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <AssistantSparkleIcon className={styles.panelSparkleIcon} size={18} />
          <span>Assistant</span>
        </div>
        <div className={styles.panelActions}>
          <button
            aria-label="Expand assistant panel"
            aria-pressed={isExpanded}
            className={styles.iconButton}
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            <Maximize2 aria-hidden="true" size={14} />
          </button>
          <button
            aria-label="Close assistant panel"
            className={styles.iconButton}
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
      </header>

      <div className={styles.panelBody}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <p>Responses are generated using AI and may contain mistakes.</p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        {error ? <p className={styles.error}>{error.message}</p> : null}
      </div>

      <form className={styles.form} ref={formRef} onSubmit={handleSubmit}>
        <div className={styles.formShell}>
          <textarea
            aria-label="Ask a question..."
            maxLength={500}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder="Ask a question..."
            ref={textareaRef}
            value={input}
          />
          <div className={styles.formFooter}>
            <span aria-hidden="true" />
            {isBusy ? (
              <button className={styles.stopButton} type="button" onClick={() => void stop()}>
                Stop
              </button>
            ) : (
              <button
                aria-label="Send question"
                className={styles.sendButton}
                disabled={!input.trim()}
                type="submit"
              >
                <Send aria-hidden="true" size={14} />
              </button>
            )}
          </div>
        </div>
      </form>
    </aside>
  );
}
