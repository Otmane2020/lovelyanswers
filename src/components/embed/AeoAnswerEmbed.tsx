"use client";
/**
 * AEO Answer Embed Component
 * 
 * This component can be copied into any React/Lovable/Bolt project
 * to automatically display published AEO answers.
 * 
 * INSTALLATION:
 * 1. Copy this file into your client project
 * 2. Add environment variables:
 *    - VITE_AEO_API_URL (URL of your AEO API)
 *    - VITE_AEO_PROJECT_ID (ID of your AEO project)
 * 3. Use the component: <AeoAnswerEmbed slug="your-question" />
 */

import { useEffect, useState } from 'react';

interface AeoAnswer {
  id: string;
  question: string;
  answer: string;
  slug: string;
  supporting_content?: {
    bullets?: string[];
    faq?: Array<{ q: string; a: string }>;
  };
  platforms?: string[];
  score?: number;
  published_at?: string;
  brand_name?: string;
  website_url?: string;
  jsonLd?: object;
}

interface AeoAnswerEmbedProps {
  slug: string;
  projectId?: string;
  apiUrl?: string;
  className?: string;
  showBranding?: boolean;
  showFaq?: boolean;
  showBullets?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export function AeoAnswerEmbed({
  slug,
  projectId = (process.env.NEXT_PUBLIC_AEO_PROJECT_ID ?? (import.meta as any).env?.VITE_AEO_PROJECT_ID),
  apiUrl = (process.env.NEXT_PUBLIC_AEO_API_URL ?? (import.meta as any).env?.VITE_AEO_API_URL) || 'https://pnohfokjlhpzrkczruju.supabase.co/functions/v1/get-public-answer',
  className = '',
  showBranding = true,
  showFaq = true,
  showBullets = true,
  theme = 'auto',
}: AeoAnswerEmbedProps) {
  const [answer, setAnswer] = useState<AeoAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnswer = async () => {
      if (!slug || !projectId) {
        setError('Missing slug or projectId');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}?slug=${encodeURIComponent(slug)}&projectId=${encodeURIComponent(projectId)}`);
        
        if (!response.ok) {
          throw new Error('Answer not found');
        }

        const data = await response.json();
        setAnswer(data);

        // Inject JSON-LD for SEO
        if (data.jsonLd) {
          const existingScript = document.getElementById(`aeo-jsonld-${slug}`);
          if (!existingScript) {
            const script = document.createElement('script');
            script.id = `aeo-jsonld-${slug}`;
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(data.jsonLd);
            document.head.appendChild(script);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load answer');
      } finally {
        setLoading(false);
      }
    };

    fetchAnswer();
  }, [slug, projectId, apiUrl]);

  // Cleanup JSON-LD on unmount
  useEffect(() => {
    return () => {
      const script = document.getElementById(`aeo-jsonld-${slug}`);
      if (script) script.remove();
    };
  }, [slug]);

  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const styles = {
    container: {
      padding: '1.5rem',
      borderRadius: '0.75rem',
      backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
      color: isDark ? '#e0e0e0' : '#1a1a2e',
      border: `1px solid ${isDark ? '#2d2d44' : '#e5e5e5'}`,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    question: {
      fontSize: '1.25rem',
      fontWeight: 600,
      marginBottom: '1rem',
      color: isDark ? '#ffffff' : '#1a1a2e',
    },
    answer: {
      fontSize: '1rem',
      lineHeight: 1.7,
      marginBottom: '1.5rem',
    },
    bulletList: {
      listStyle: 'none',
      padding: 0,
      margin: '1rem 0',
    },
    bulletItem: {
      display: 'flex',
      alignItems: 'flex-start',
      marginBottom: '0.5rem',
      padding: '0.5rem',
      backgroundColor: isDark ? '#252540' : '#f8f9fa',
      borderRadius: '0.5rem',
    },
    bulletIcon: {
      marginRight: '0.75rem',
      color: '#6366f1',
      flexShrink: 0,
    },
    faqSection: {
      marginTop: '1.5rem',
    },
    faqTitle: {
      fontSize: '1rem',
      fontWeight: 600,
      marginBottom: '0.75rem',
      color: isDark ? '#a0a0a0' : '#666',
    },
    faqItem: {
      marginBottom: '1rem',
      padding: '1rem',
      backgroundColor: isDark ? '#252540' : '#f8f9fa',
      borderRadius: '0.5rem',
    },
    faqQuestion: {
      fontWeight: 600,
      marginBottom: '0.5rem',
    },
    faqAnswer: {
      color: isDark ? '#b0b0b0' : '#555',
    },
    branding: {
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: `1px solid ${isDark ? '#2d2d44' : '#e5e5e5'}`,
      fontSize: '0.875rem',
      color: isDark ? '#888' : '#999',
    },
    loader: {
      display: 'flex',
      justifyContent: 'center',
      padding: '2rem',
    },
    error: {
      padding: '1rem',
      color: '#ef4444',
      textAlign: 'center' as const,
    },
  };

  if (loading) {
    return (
      <div style={{ ...styles.container, ...styles.loader }} className={className}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" />
        </svg>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !answer) {
    return (
      <div style={{ ...styles.container, ...styles.error }} className={className}>
        {error || 'Answer not available'}
      </div>
    );
  }

  const bullets = answer.supporting_content?.bullets || [];
  const faq = answer.supporting_content?.faq || [];

  return (
    <article style={styles.container} className={className}>
      <h2 style={styles.question}>{answer.question}</h2>
      
      <div style={styles.answer}>
        {answer.answer}
      </div>

      {showBullets && bullets.length > 0 && (
        <ul style={styles.bulletList}>
          {bullets.map((bullet, index) => (
            <li key={index} style={styles.bulletItem}>
              <span style={styles.bulletIcon}>✓</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {showFaq && faq.length > 0 && (
        <section style={styles.faqSection}>
          <h3 style={styles.faqTitle}>Frequently Asked Questions</h3>
          {faq.map((item, index) => (
            <div key={index} style={styles.faqItem}>
              <p style={styles.faqQuestion}>{item.q}</p>
              <p style={styles.faqAnswer}>{item.a}</p>
            </div>
          ))}
        </section>
      )}

      {showBranding && answer.brand_name && (
        <footer style={styles.branding}>
          Source: {answer.website_url ? (
            <a href={answer.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>
              {answer.brand_name}
            </a>
          ) : answer.brand_name}
        </footer>
      )}
    </article>
  );
}

export default AeoAnswerEmbed;
