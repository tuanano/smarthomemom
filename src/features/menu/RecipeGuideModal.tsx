import { useState, useEffect } from 'react';
import { X, ChefHat, Loader } from 'lucide-react';
import { getCookingGuide } from '../../core/gemini';

interface Props {
  dishName: string;
  onClose: () => void;
}

const LOADING_STEPS = [
  '🔍 Đang tìm công thức...',
  '📝 Đang soạn hướng dẫn...',
  '✨ Sắp xong rồi...',
];

function InlineLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

function GuideContent({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        return (
          <p key={i} style={{ margin: 0, fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            <InlineLine text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

export default function RecipeGuideModal({ dishName, onClose }: Props) {
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    const lsKey = `recipe_guide::${dishName}`;
    let cancelled = false;

    const cached = localStorage.getItem(lsKey);
    if (cached) {
      setGuide(cached);
      setLoading(false);
      return;
    }

    getCookingGuide(dishName).then(text => {
      if (cancelled) return;
      localStorage.setItem(lsKey, text);
      setGuide(text);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [dishName]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLoadingStep(s => (s + 1) % LOADING_STEPS.length), 2000);
    return () => clearInterval(id);
  }, [loading]);

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="slide-up"
        style={{
          width: '100%', maxWidth: '480px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '20px 20px 0 0',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
          maxHeight: '75vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <ChefHat size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{dishName}</h3>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', flexShrink: 0 }}
          >
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '13px', fontWeight: 600 }}>
              <Loader size={14} className="spin" />
              {LOADING_STEPS[loadingStep]}
            </div>
            {[90, 60, 100, 75, 55, 80].map((w, i) => (
              <div key={i} className="skeleton" style={{
                height: '13px', width: `${w}%`,
                backgroundColor: 'var(--bg-grey)', borderRadius: '4px',
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        )}

        {!loading && guide && (
          <div className="slide-up">
            <GuideContent text={guide} />
          </div>
        )}
      </div>
    </div>
  );
}
