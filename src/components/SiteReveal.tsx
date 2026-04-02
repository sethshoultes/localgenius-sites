/**
 * SiteReveal — The moment that matters most.
 *
 * When a business owner first sees their generated website, that's the product.
 * Everything else we build is in service of this 8-second window.
 *
 * States:
 *   building   → Animated progress with real-feeling step messages
 *   revealing  → The site fades in with a confident, unhurried entrance
 *   revealed   → Live URL displayed, CTAs offered, pride delivered
 *
 * Design intent:
 * - The loading state should feel like something real is being crafted, not
 *   processed. Use specific step messages ("Writing your menu descriptions...")
 *   not generic ones ("Loading...").
 * - The reveal animation is a single, confident fade-up — not a cascade of
 *   micro-animations. Let the site speak.
 * - The URL is the trophy. Display it large, copiable, shareable.
 * - "Looks right!" and "Fix something" are the only choices. Don't offer
 *   12 options. Two choices. One decision.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteRevealProps {
  /** The business name — shown during loading and after reveal */
  businessName: string;
  /** The live URL of the generated site */
  siteUrl: string;
  /** Theme — affects the accent color in the reveal */
  theme: 'craft' | 'professional';
  /** Called when owner clicks "Looks right!" */
  onApprove: () => void;
  /** Called when owner clicks "Fix something" */
  onRequestEdit: () => void;
  /** Override the build steps (useful for testing) */
  buildSteps?: BuildStep[];
  /** For embedding the generated site in an iframe */
  previewMode?: 'iframe' | 'screenshot';
  /** Screenshot URL (used when previewMode = 'screenshot') */
  screenshotUrl?: string;
}

export interface BuildStep {
  message: string;
  durationMs: number;
}

type RevealState = 'building' | 'transitioning' | 'revealed';

// ---------------------------------------------------------------------------
// Default build steps — written to feel real, not generic
// ---------------------------------------------------------------------------

const DEFAULT_CRAFT_STEPS: BuildStep[] = [
  { message: 'Reading your business details...',          durationMs: 800  },
  { message: 'Choosing your color palette...',            durationMs: 900  },
  { message: 'Writing your hero headline...',             durationMs: 1100 },
  { message: 'Crafting your About section...',            durationMs: 1200 },
  { message: 'Formatting your menu...',                   durationMs: 1000 },
  { message: 'Setting your hours and location...',        durationMs: 700  },
  { message: 'Optimizing for mobile...',                  durationMs: 800  },
  { message: 'Publishing to your custom domain...',       durationMs: 1400 },
  { message: 'Your site is almost ready...',              durationMs: 600  },
];

const DEFAULT_PROFESSIONAL_STEPS: BuildStep[] = [
  { message: 'Reading your business profile...',          durationMs: 800  },
  { message: 'Establishing your visual identity...',      durationMs: 900  },
  { message: 'Writing your headline...',                  durationMs: 1100 },
  { message: 'Describing your services...',               durationMs: 1200 },
  { message: 'Building your credibility section...',      durationMs: 1000 },
  { message: 'Generating your FAQ...',                    durationMs: 900  },
  { message: 'Setting up your contact form...',           durationMs: 700  },
  { message: 'Publishing to your custom domain...',       durationMs: 1400 },
  { message: 'Your site is almost ready...',              durationMs: 600  },
];

// ---------------------------------------------------------------------------
// Utility: sum of step durations for progress calculation
// ---------------------------------------------------------------------------

function totalDuration(steps: BuildStep[]): number {
  return steps.reduce((acc, s) => acc + s.durationMs, 0);
}

// ---------------------------------------------------------------------------
// Sub-component: BuildingState
// ---------------------------------------------------------------------------

interface BuildingStateProps {
  businessName: string;
  theme: 'craft' | 'professional';
  steps: BuildStep[];
  onComplete: () => void;
}

function BuildingState({ businessName, theme, steps, onComplete }: BuildingStateProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Stable ref for onComplete — prevents stale closure without adding it to deps
  // (rerender-dependencies, advanced-event-handler-refs)
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Memoize total so it isn't recomputed on every render (rerender-dependencies)
  const total = useMemo(() => totalDuration(steps), [steps]);

  useEffect(() => {
    let stepIndex = 0;
    let elapsedMs = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    function advanceStep() {
      if (cancelled) return;

      if (stepIndex >= steps.length) {
        setProgress(100);
        timeoutId = setTimeout(() => {
          if (!cancelled) onCompleteRef.current();
        }, 300);
        return;
      }

      setCurrentStepIndex(stepIndex);
      elapsedMs += steps[stepIndex].durationMs;
      setProgress(Math.round((elapsedMs / total) * 100));

      timeoutId = setTimeout(() => {
        stepIndex++;
        advanceStep();
      }, steps[stepIndex].durationMs);
    }

    advanceStep();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // steps and total are stable for the lifetime of this component instance;
  // onComplete is handled via ref above — intentionally excluded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, total]);

  const accentColor = theme === 'craft' ? '#d97706' : '#1d4ed8';
  const currentMessage = steps[currentStepIndex]?.message ?? 'Finishing up...';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: theme === 'craft'
          ? 'linear-gradient(135deg, #fafaf9 0%, #fef3c7 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #dbeafe 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Wordmark */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: accentColor,
          marginBottom: '0.5rem',
        }}>
          LocalGenius
        </div>
        <div style={{
          fontSize: '1.125rem',
          fontWeight: '500',
          color: theme === 'craft' ? '#292524' : '#0f172a',
        }}>
          Building <strong>{businessName}</strong>
        </div>
      </div>

      {/* Animated orb */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: `conic-gradient(${accentColor} ${progress}%, ${theme === 'craft' ? '#e7e5e4' : '#e2e8f0'} 0%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        position: 'relative',
        transition: 'background 0.3s ease',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: theme === 'craft' ? '#fafaf9' : '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: '700',
          color: accentColor,
        }}>
          {progress}%
        </div>
      </div>

      {/* Step message */}
      <div
        key={currentStepIndex}
        style={{
          fontSize: '1rem',
          color: theme === 'craft' ? '#57534e' : '#475569',
          textAlign: 'center',
          maxWidth: '320px',
          lineHeight: '1.5',
          animation: 'fadeInUp 0.3s ease both',
        }}
      >
        {currentMessage}
      </div>

      {/* Progress bar */}
      <div style={{
        width: '280px',
        height: '4px',
        borderRadius: '9999px',
        background: theme === 'craft' ? '#e7e5e4' : '#e2e8f0',
        marginTop: '2rem',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          borderRadius: '9999px',
          background: accentColor,
          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: RevealedState
// ---------------------------------------------------------------------------

interface RevealedStateProps {
  businessName: string;
  siteUrl:      string;
  theme:        'craft' | 'professional';
  previewMode:  'iframe' | 'screenshot';
  screenshotUrl?: string;
  onApprove:    () => void;
  onRequestEdit: () => void;
  isAnimating:  boolean;
}

function RevealedState({
  businessName,
  siteUrl,
  theme,
  previewMode,
  screenshotUrl,
  onApprove,
  onRequestEdit,
  isAnimating,
}: RevealedStateProps) {
  const [urlCopied, setUrlCopied] = useState(false);

  // Memoize theme-derived values — theme is a string primitive so this is
  // cheap but prevents object churn on every render (rerender-dependencies)
  const colors = useMemo(() => ({
    accentColor:      theme === 'craft' ? '#d97706' : '#1d4ed8',
    accentColorHover: theme === 'craft' ? '#b45309' : '#1e40af',
    textPrimary:      theme === 'craft' ? '#1c1917' : '#0f172a',
    textSecondary:    theme === 'craft' ? '#57534e' : '#475569',
    bgBase:           theme === 'craft' ? '#fafaf9' : '#f8fafc',
    borderColor:      theme === 'craft' ? '#e7e5e4' : '#e2e8f0',
  }), [theme]);

  const { accentColor, accentColorHover, textPrimary, textSecondary, bgBase, borderColor } = colors;

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = siteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2500);
    }
  }, [siteUrl]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: bgBase,
        opacity: isAnimating ? 0 : 1,
        transform: isAnimating ? 'translateY(16px)' : 'translateY(0)',
        transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        borderBottom: `1px solid ${borderColor}`,
        background: 'white',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        {/* Wordmark */}
        <div style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: accentColor,
        }}>
          LocalGenius
        </div>

        {/* URL pill — the trophy */}
        <button
          onClick={handleCopyUrl}
          title="Click to copy your site URL"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            border: `1.5px solid ${accentColor}`,
            background: urlCopied ? accentColor : 'white',
            color: urlCopied ? 'white' : accentColor,
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
            maxWidth: '340px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexShrink: 1,
          }}
        >
          <span style={{ fontSize: '0.75rem' }}>
            {urlCopied ? '✓' : '⬡'}
          </span>
          <span style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {urlCopied ? 'Copied!' : siteUrl.replace(/^https?:\/\//, '')}
          </span>
        </button>

        {/* Open in tab */}
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.875rem',
            fontWeight: '500',
            color: textSecondary,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Open in new tab
        </a>
      </div>

      {/* Site preview */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#f1f5f9',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {previewMode === 'iframe' ? (
          <iframe
            src={siteUrl}
            title={`${businessName} website preview`}
            style={{
              flex: 1,
              width: '100%',
              border: 'none',
              minHeight: '500px',
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : screenshotUrl ? (
          <img
            src={screenshotUrl}
            alt={`${businessName} website preview`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        ) : (
          // Placeholder when no preview is available
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            color: textSecondary,
            fontSize: '0.875rem',
          }}>
            Preview loading...
          </div>
        )}
      </div>

      {/* Decision bar — the most important UI in the product */}
      <div style={{
        borderTop: `1px solid ${borderColor}`,
        background: 'white',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        {/* Context */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: textPrimary,
            marginBottom: '0.25rem',
          }}>
            This is <strong>{businessName}</strong> online.
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: textSecondary,
            maxWidth: '380px',
          }}>
            Take 30 seconds to review. You can always update it later — but most people publish as-is.
          </div>
        </div>

        {/* CTAs */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '480px',
        }}>
          {/* Primary: approve */}
          <button
            onClick={onApprove}
            style={{
              flex: '1 1 200px',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: accentColor,
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.15s ease, transform 0.1s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.background = accentColorHover;
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.background = accentColor;
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Looks right!
          </button>

          {/* Secondary: edit */}
          <button
            onClick={onRequestEdit}
            style={{
              flex: '1 1 200px',
              padding: '0.875rem 1.5rem',
              borderRadius: '0.75rem',
              border: `1.5px solid ${borderColor}`,
              background: 'white',
              color: textPrimary,
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, transform 0.1s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.borderColor = accentColor;
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.borderColor = borderColor;
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            Fix something
          </button>
        </div>

        {/* Reassurance */}
        <div style={{
          fontSize: '0.75rem',
          color: textSecondary,
          opacity: 0.7,
          textAlign: 'center',
        }}>
          Changes take effect instantly. You can update your site anytime from your dashboard.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component: SiteReveal
// ---------------------------------------------------------------------------

export function SiteReveal({
  businessName,
  siteUrl,
  theme,
  onApprove,
  onRequestEdit,
  buildSteps,
  previewMode = 'iframe',
  screenshotUrl,
}: SiteRevealProps) {
  const [state, setState] = useState<RevealState>('building');
  const [isAnimating, setIsAnimating] = useState(true);

  const steps = buildSteps ?? (
    theme === 'craft' ? DEFAULT_CRAFT_STEPS : DEFAULT_PROFESSIONAL_STEPS
  );

  const handleBuildComplete = useCallback(() => {
    // Brief transitioning state so the fade animation has somewhere to come from
    setState('transitioning');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setState('revealed');
        // Start the reveal animation
        setTimeout(() => setIsAnimating(false), 50);
      });
    });
  }, []);

  if (state === 'building') {
    return (
      <BuildingState
        businessName={businessName}
        theme={theme}
        steps={steps}
        onComplete={handleBuildComplete}
      />
    );
  }

  if (state === 'transitioning') {
    return (
      <div style={{
        minHeight: '100vh',
        background: theme === 'craft' ? '#fafaf9' : '#f8fafc',
      }} />
    );
  }

  return (
    <RevealedState
      businessName={businessName}
      siteUrl={siteUrl}
      theme={theme}
      previewMode={previewMode}
      screenshotUrl={screenshotUrl}
      onApprove={onApprove}
      onRequestEdit={onRequestEdit}
      isAnimating={isAnimating}
    />
  );
}

export default SiteReveal;
