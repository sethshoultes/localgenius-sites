/**
 * SiteEditor — Zero-CMS editing via natural language.
 *
 * The entire premise: a business owner should never need to understand what
 * a "section" is, what a "field" is, or where anything "lives" in their site.
 * They should just say what they want and see it happen.
 *
 * Interaction model:
 *   1. Owner types a request in plain language
 *   2. We show them AI is processing (specific, not generic)
 *   3. We confirm what changed with a before/after preview
 *   4. One click to accept. One click to undo. Nothing else.
 *
 * What this is NOT:
 *   - A CMS with sections and fields
 *   - A form with inputs for each piece of content
 *   - A drag-and-drop page builder
 *   - Anything with a learning curve
 *
 * Design intent:
 *   The input is the product. Keep it front and center.
 *   The before/after preview builds confidence — they can see exactly what changed.
 *   Every word in the UI should sound like a helpful person, not software.
 */

'use client';

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteEditorProps {
  /** The business name — used in placeholder text */
  businessName: string;
  /** Theme — affects visual treatment */
  theme: 'craft' | 'professional';
  /** Called when owner submits an edit request. Returns the AI's change summary. */
  onEditRequest: (prompt: string) => Promise<EditResult>;
  /** Called when owner accepts a change */
  onAcceptChange: (changeId: string) => Promise<void>;
  /** Called when owner undoes a change */
  onUndoChange: (changeId: string) => Promise<void>;
  /** Suggested prompts — shown as quick-tap chips when input is empty */
  suggestions?: string[];
}

export interface EditResult {
  changeId:    string;
  summary:     string;    // What the AI did, in plain language
  before:      string;    // The text/content before the change
  after:       string;    // The text/content after the change
  fieldLabel:  string;    // Human-readable name of what changed ("Your tagline", "Monday hours")
  accepted?:   boolean;
}

type EditorState =
  | { kind: 'idle' }
  | { kind: 'processing'; prompt: string }
  | { kind: 'preview'; result: EditResult }
  | { kind: 'accepting' }
  | { kind: 'accepted'; summary: string }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// Hoisted static data — never re-created on render (rendering-hoist-jsx)
// ---------------------------------------------------------------------------

const DEFAULT_CRAFT_SUGGESTIONS: string[] = [
  'Update my hours for the weekend',
  'Make my tagline more inviting',
  'Add a note about parking',
  'Change my phone number',
  'Update tonight\'s specials',
];

const DEFAULT_PROFESSIONAL_SUGGESTIONS: string[] = [
  'Update my office hours',
  'Add a new service I offer',
  'Change my response time guarantee',
  'Update my phone number',
  'Add a testimonial',
];

// Processing messages — rotate through these to feel alive, not mechanical
const PROCESSING_MESSAGES: string[] = [
  'Reading your request...',
  'Finding the right section...',
  'Making the change...',
  'Double-checking it looks right...',
];

// ---------------------------------------------------------------------------
// Hook: useThemeColors
// Derives and memoizes all theme-dependent colors in one place
// (rerender-dependencies — primitive dep, stable output object)
// ---------------------------------------------------------------------------

function useThemeColors(theme: 'craft' | 'professional') {
  return useMemo(() => ({
    accentColor:      theme === 'craft' ? '#d97706' : '#1d4ed8',
    accentColorHover: theme === 'craft' ? '#b45309' : '#1e40af',
    bgBase:           theme === 'craft' ? '#fafaf9' : '#f8fafc',
    bgSurface:        '#ffffff',
    textPrimary:      theme === 'craft' ? '#1c1917' : '#0f172a',
    textSecondary:    theme === 'craft' ? '#57534e' : '#475569',
    textTertiary:     theme === 'craft' ? '#a8a29e' : '#94a3b8',
    borderDefault:    theme === 'craft' ? '#e7e5e4' : '#e2e8f0',
    borderFocus:      theme === 'craft' ? '#d97706' : '#1d4ed8',
    successColor:     '#16a34a',
    successBg:        '#f0fdf4',
    errorColor:       '#dc2626',
    errorBg:          '#fef2f2',
  }), [theme]);
}

// ---------------------------------------------------------------------------
// Hook: useProcessingMessage
// Cycles through processing messages to feel like real work is happening
// ---------------------------------------------------------------------------

function useProcessingMessage(isProcessing: boolean): string {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isProcessing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIndex(0);
      return;
    }

    intervalRef.current = setInterval(() => {
      // Use functional setState to avoid stale closure (rerender-functional-setstate)
      setIndex(prev => (prev + 1) % PROCESSING_MESSAGES.length);
    }, 1800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isProcessing]);

  return PROCESSING_MESSAGES[index];
}

// ---------------------------------------------------------------------------
// Sub-component: SuggestionChips
// Shown when input is empty — make it easy to start
// Defined outside parent to avoid inline component penalty (rerender-no-inline-components)
// ---------------------------------------------------------------------------

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  accentColor: string;
  borderColor: string;
  textSecondary: string;
}

function SuggestionChips({
  suggestions,
  onSelect,
  accentColor,
  borderColor,
  textSecondary,
}: SuggestionChipsProps) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      borderTop: `1px solid ${borderColor}`,
    }}>
      <span style={{
        fontSize: '0.75rem',
        color: textSecondary,
        alignSelf: 'center',
        marginRight: '0.25rem',
        whiteSpace: 'nowrap',
      }}>
        Try:
      </span>
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            border: `1px solid ${borderColor}`,
            background: 'white',
            color: textSecondary,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease, color 0.15s ease',
            lineHeight: '1',
          }}
          onMouseEnter={e => {
            const btn = e.currentTarget;
            btn.style.borderColor = accentColor;
            btn.style.color = accentColor;
          }}
          onMouseLeave={e => {
            const btn = e.currentTarget;
            btn.style.borderColor = borderColor;
            btn.style.color = textSecondary;
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: BeforeAfterPreview
// Shows exactly what changed — builds confidence before accepting
// Defined outside parent (rerender-no-inline-components)
// ---------------------------------------------------------------------------

interface BeforeAfterPreviewProps {
  result: EditResult;
  colors: ReturnType<typeof useThemeColors>;
  onAccept: () => void;
  onUndo: () => void;
  isAccepting: boolean;
}

function BeforeAfterPreview({
  result,
  colors,
  onAccept,
  onUndo,
  isAccepting,
}: BeforeAfterPreviewProps) {
  return (
    <div style={{
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
    }}>
      {/* What changed */}
      <div style={{
        fontSize: '0.875rem',
        fontWeight: '600',
        color: colors.textPrimary,
      }}>
        {result.summary}
      </div>

      {/* Field label */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '600',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: colors.textTertiary,
      }}>
        {result.fieldLabel}
      </div>

      {/* Before/After */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.5rem',
      }}>
        {/* Before */}
        <div style={{
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#dc2626',
            marginBottom: '0.375rem',
          }}>
            Before
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#7f1d1d',
            lineHeight: '1.5',
            wordBreak: 'break-word',
          }}>
            {result.before || <em style={{ opacity: 0.6 }}>Empty</em>}
          </div>
        </div>

        {/* After */}
        <div style={{
          padding: '0.75rem',
          borderRadius: '0.5rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
        }}>
          <div style={{
            fontSize: '0.6875rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#16a34a',
            marginBottom: '0.375rem',
          }}>
            After
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#14532d',
            lineHeight: '1.5',
            wordBreak: 'break-word',
          }}>
            {result.after}
          </div>
        </div>
      </div>

      {/* Accept / Undo */}
      <div style={{
        display: 'flex',
        gap: '0.625rem',
      }}>
        <button
          onClick={onAccept}
          disabled={isAccepting}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.625rem',
            border: 'none',
            background: isAccepting ? '#9ca3af' : colors.accentColor,
            color: 'white',
            fontSize: '0.9375rem',
            fontWeight: '600',
            cursor: isAccepting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s ease',
          }}
        >
          {isAccepting ? 'Saving...' : 'Save change'}
        </button>
        <button
          onClick={onUndo}
          disabled={isAccepting}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.625rem',
            border: `1.5px solid ${colors.borderDefault}`,
            background: 'white',
            color: colors.textSecondary,
            fontSize: '0.9375rem',
            fontWeight: '500',
            cursor: isAccepting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={e => {
            if (!isAccepting) e.currentTarget.style.borderColor = colors.errorColor;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = colors.borderDefault;
          }}
        >
          Undo
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ProcessingState
// Shows what the AI is doing — feels like craft, not computation
// ---------------------------------------------------------------------------

interface ProcessingStateProps {
  prompt: string;
  message: string;
  accentColor: string;
  textSecondary: string;
  borderColor: string;
}

function ProcessingState({
  prompt,
  message,
  accentColor,
  textSecondary,
  borderColor,
}: ProcessingStateProps) {
  return (
    <div style={{
      padding: '1rem',
      borderTop: `1px solid ${borderColor}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
    }}>
      {/* Spinner */}
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: `2.5px solid ${accentColor}`,
        borderTopColor: 'transparent',
        flexShrink: 0,
        marginTop: '2px',
        animation: 'spin 0.7s linear infinite',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* The submitted prompt — echoed back */}
        <div style={{
          fontSize: '0.875rem',
          fontStyle: 'italic',
          color: textSecondary,
          marginBottom: '0.375rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          "{prompt}"
        </div>
        {/* Current processing step */}
        <div style={{
          fontSize: '0.875rem',
          color: accentColor,
          fontWeight: '500',
          animation: 'fadeIn 0.3s ease',
        }}>
          {message}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component: SiteEditor
// ---------------------------------------------------------------------------

export function SiteEditor({
  businessName,
  theme,
  onEditRequest,
  onAcceptChange,
  onUndoChange,
  suggestions,
}: SiteEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>({ kind: 'idle' });
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colors = useThemeColors(theme);
  const isProcessing = editorState.kind === 'processing';
  const processingMessage = useProcessingMessage(isProcessing);

  const activeSuggestions = useMemo(
    () => suggestions ?? (theme === 'craft' ? DEFAULT_CRAFT_SUGGESTIONS : DEFAULT_PROFESSIONAL_SUGGESTIONS),
    [suggestions, theme]
  );

  const showSuggestions = editorState.kind === 'idle' && inputValue.trim() === '';

  // Auto-resize textarea as content grows (rerender-move-effect-to-event — DOM
  // measurement in response to input change, not a side effect)
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    setInputValue(textarea.value);
  }, []);

  // Refocus textarea after accepted change — keep the owner in flow
  useEffect(() => {
    if (editorState.kind === 'accepted') {
      const timer = setTimeout(() => {
        setEditorState({ kind: 'idle' });
        setInputValue('');
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.focus();
        }
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [editorState.kind]);

  const handleSubmit = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isProcessing) return;

    setEditorState({ kind: 'processing', prompt });

    try {
      const result = await onEditRequest(prompt);
      setEditorState({ kind: 'preview', result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setEditorState({ kind: 'error', message });
    }
  }, [inputValue, isProcessing, onEditRequest]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Clear error on any key press
    if (editorState.kind === 'error') {
      setEditorState({ kind: 'idle' });
    }
  }, [handleSubmit, editorState.kind]);

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  }, []);

  const handleAccept = useCallback(async () => {
    if (editorState.kind !== 'preview') return;
    const { result } = editorState;
    setEditorState({ kind: 'accepting' });
    try {
      await onAcceptChange(result.changeId);
      setEditorState({ kind: 'accepted', summary: result.summary });
    } catch {
      setEditorState({ kind: 'error', message: 'Could not save the change. Please try again.' });
    }
  }, [editorState, onAcceptChange]);

  const handleUndo = useCallback(async () => {
    if (editorState.kind !== 'preview') return;
    const { result } = editorState;
    try {
      await onUndoChange(result.changeId);
    } finally {
      setEditorState({ kind: 'idle' });
      setInputValue('');
    }
  }, [editorState, onUndoChange]);

  const isInputDisabled = editorState.kind === 'processing' || editorState.kind === 'accepting';

  // Placeholder rotates based on business name
  const placeholder = `Tell me what to update on ${businessName}'s site...`;

  return (
    <div
      role="region"
      aria-label="Site editor"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Input card */}
      <div style={{
        borderRadius: '1rem',
        border: `1.5px solid ${isFocused ? colors.borderFocus : colors.borderDefault}`,
        background: colors.bgSurface,
        boxShadow: isFocused
          ? `0 0 0 3px ${colors.accentColor}22`
          : '0 1px 3px 0 rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}>
        {/* Textarea */}
        <div style={{ padding: '1rem 1rem 0.5rem' }}>
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isInputDisabled}
            placeholder={placeholder}
            rows={1}
            aria-label="Edit request"
            aria-describedby={editorState.kind === 'error' ? 'editor-error' : undefined}
            style={{
              width: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '1rem',
              color: isInputDisabled ? colors.textTertiary : colors.textPrimary,
              lineHeight: '1.6',
              fontFamily: 'inherit',
              padding: '0',
              boxSizing: 'border-box',
              minHeight: '28px',
            }}
          />
        </div>

        {/* Submit row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 1rem',
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: colors.textTertiary,
          }}>
            Press Enter to update
          </span>
          <button
            onClick={handleSubmit}
            disabled={isInputDisabled || inputValue.trim() === ''}
            aria-label="Submit edit request"
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: inputValue.trim() === '' || isInputDisabled
                ? colors.borderDefault
                : colors.accentColor,
              color: inputValue.trim() === '' || isInputDisabled
                ? colors.textTertiary
                : 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: inputValue.trim() === '' || isInputDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            Update
          </button>
        </div>

        {/* Suggestion chips — only shown when idle and input is empty */}
        {showSuggestions && (
          <SuggestionChips
            suggestions={activeSuggestions}
            onSelect={handleSuggestionSelect}
            accentColor={colors.accentColor}
            borderColor={colors.borderDefault}
            textSecondary={colors.textSecondary}
          />
        )}
      </div>

      {/* State panels — rendered below the input card */}

      {/* Processing */}
      {editorState.kind === 'processing' && (
        <div style={{
          marginTop: '0.75rem',
          borderRadius: '0.75rem',
          border: `1px solid ${colors.borderDefault}`,
          background: colors.bgSurface,
          overflow: 'hidden',
        }}>
          <ProcessingState
            prompt={editorState.prompt}
            message={processingMessage}
            accentColor={colors.accentColor}
            textSecondary={colors.textSecondary}
            borderColor="transparent"
          />
        </div>
      )}

      {/* Preview — before/after */}
      {(editorState.kind === 'preview' || editorState.kind === 'accepting') && (
        <div style={{
          marginTop: '0.75rem',
          borderRadius: '0.75rem',
          border: `1px solid ${colors.borderDefault}`,
          background: colors.bgSurface,
          overflow: 'hidden',
        }}>
          <BeforeAfterPreview
            result={(editorState as { kind: 'preview'; result: EditResult }).result}
            colors={colors}
            onAccept={handleAccept}
            onUndo={handleUndo}
            isAccepting={editorState.kind === 'accepting'}
          />
        </div>
      )}

      {/* Accepted confirmation */}
      {editorState.kind === 'accepted' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '0.75rem',
            borderRadius: '0.75rem',
            border: `1px solid #bbf7d0`,
            background: '#f0fdf4',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
          }}
        >
          <span style={{ fontSize: '1.125rem' }} aria-hidden="true">
            ✓
          </span>
          <span style={{
            fontSize: '0.9375rem',
            fontWeight: '500',
            color: '#14532d',
          }}>
            Done. {editorState.summary}
          </span>
        </div>
      )}

      {/* Error state */}
      {editorState.kind === 'error' && (
        <div
          id="editor-error"
          role="alert"
          style={{
            marginTop: '0.75rem',
            borderRadius: '0.75rem',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
          }}
        >
          <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }} aria-hidden="true">
            !
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.9375rem',
              fontWeight: '500',
              color: '#7f1d1d',
              marginBottom: '0.375rem',
            }}>
              {editorState.message}
            </div>
            <button
              onClick={() => setEditorState({ kind: 'idle' })}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '0',
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SiteEditor;
