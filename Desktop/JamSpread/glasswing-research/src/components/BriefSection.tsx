interface Props {
  title: string;
  content: string;
  icon?: string;
  variant?: 'default' | 'warning' | 'positive';
}

const BORDER_COLORS = {
  default: 'var(--accent)',
  warning: 'var(--accent-red)',
  positive: 'var(--accent-green)',
};

export default function BriefSection({ title, content, icon, variant = 'default' }: Props) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${BORDER_COLORS[variant]}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className="text-sm">{icon}</span>}
        <h3
          className="text-xs uppercase tracking-widest"
          style={{
            color: BORDER_COLORS[variant],
            fontFamily: 'var(--font-jetbrains)',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}
      >
        {content}
      </p>
    </div>
  );
}
