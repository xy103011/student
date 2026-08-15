export default function Avatar({ name, color, size = 'sm' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const cls = size === 'lg' ? 'avatar avatar-lg' : 'avatar';
  return (
    <span className={cls} style={{ background: color || '#6366f1' }}>
      {initial}
    </span>
  );
}
