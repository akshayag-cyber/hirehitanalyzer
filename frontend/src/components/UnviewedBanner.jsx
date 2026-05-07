export default function UnviewedBanner({ count }) {
  if (count === 0) {
    return (
      <div className="px-4 py-3 text-sm text-center" style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)' }}>
        ✓ No unprocessed applications
      </div>
    );
  }

  return (
    <div className="px-4 py-3 text-sm text-center" style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
      ⚠ {count} of unprocessed applications
    </div>
  );
}
