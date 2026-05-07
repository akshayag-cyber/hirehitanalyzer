const PAGE_SIZE = 25;

function getPageNumbers(current, total) {
  if (total <= 0) return [];
  const set = new Set([1, total]);
  for (let p = Math.max(1, current - 2); p <= Math.min(total, current + 2); p++) {
    set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 2) result.push('...');
    else if (p - prev === 2) result.push(prev + 1);
    result.push(p);
    prev = p;
  }
  return result;
}

export { PAGE_SIZE };

export default function Pagination({ page, totalPages, totalItems, onPageChange, itemLabel = 'results' }) {
  if (totalPages <= 1 && totalItems <= PAGE_SIZE) return null;

  const from  = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to    = Math.min(page * PAGE_SIZE, totalItems);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mb-2">
          <PageBtn disabled={page === 1} onClick={() => onPageChange(page - 1)}>←</PageBtn>
          {pages.map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="w-8 text-center text-xs select-none"
                      style={{ color: 'var(--color-text-subtle)' }}>…</span>
              : <PageBtn key={p} active={p === page} onClick={() => onPageChange(p)}>{p}</PageBtn>
          )}
          <PageBtn disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>→</PageBtn>
        </div>
      )}
      <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
        Showing {from}–{to} of {totalItems} {itemLabel}
      </p>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 text-xs rounded-lg font-medium transition-all flex items-center justify-center"
      style={{
        background:  active   ? 'var(--color-primary)' : 'transparent',
        color:       active   ? '#fff'
                   : disabled ? 'var(--color-text-subtle)'
                   :            'var(--color-text-muted)',
        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        opacity: disabled ? 0.4 : 1,
        cursor:  disabled ? 'not-allowed' : 'pointer',
      }}>
      {children}
    </button>
  );
}
