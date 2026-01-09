'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalContent,
  Button,
  Label,
  Icon,
  cn,
} from '@maatwork/ui';
import { createFeedback } from '@/lib/api';

interface FeedbackModalProps {
  className?: string;
}

type FeedbackType = 'feedback' | 'feature_request' | 'bug';

const feedbackTypeLabels: Record<FeedbackType, { label: string; emoji: string }> = {
  feedback: { label: 'Comentario', emoji: '💬' },
  feature_request: { label: 'Sugerencia', emoji: '💡' },
  bug: { label: 'Reportar Bug', emoji: '🐛' },
};

export function FeedbackButton({ className }: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('feedback');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim() || content.length < 10) {
      setError('El mensaje debe tener al menos 10 caracteres');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createFeedback({ type, content });

      if (!response.success) {
        throw new Error(response.error || 'Error al enviar feedback');
      }

      setIsSuccess(true);
      setContent('');
      setType('feedback');

      // Close modal after showing success
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setIsSuccess(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium',
          'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary',
          'hover:from-primary/20 hover:to-secondary/20 hover:shadow-sm',
          'transition-all duration-200',
          'border border-primary/20',
          className
        )}
        aria-label="Enviar feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal */}
      <Modal
        open={isOpen}
        onOpenChange={handleClose}
        title="💡 ¡Tu opinión nos importa!"
        description="Ayúdanos a mejorar MaatWork con tus comentarios y sugerencias."
        size="md"
      >
        <div className="mt-4 space-y-4">
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-text">¡Gracias por tu feedback!</h3>
              <p className="text-text-secondary mt-2">Tu mensaje ha sido recibido.</p>
            </div>
          ) : (
            <>
              {/* Type Selector */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">Tipo de mensaje</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(feedbackTypeLabels) as FeedbackType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        'border',
                        type === t
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-surface-subtle border-border text-text-secondary hover:border-primary/50'
                      )}
                    >
                      {feedbackTypeLabels[t].emoji} {feedbackTypeLabels[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">Tu mensaje</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Cuéntanos qué te gustaría ver en MaatWork..."
                  className={cn(
                    'w-full h-32 px-4 py-3 rounded-xl',
                    'bg-surface border border-border',
                    'text-text placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'resize-none transition-all duration-200'
                  )}
                  maxLength={2000}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-text-muted">Mínimo 10 caracteres</span>
                  <span className="text-xs text-text-muted">{content.length}/2000</span>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!isSuccess && (
          <ModalFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || content.length < 10}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Feedback
                </>
              )}
            </Button>
          </ModalFooter>
        )}
      </Modal>
    </>
  );
}
