(() => {
  const expandedOverviews = new WeakMap();

  function expandOverview(details) {
    const cardColumn = details.closest('.col');
    const row = cardColumn?.parentElement;

    if (!cardColumn || !row?.classList.contains('row')) return;

    const rowTop = cardColumn.getBoundingClientRect().top;
    const columnsInSameRow = Array.from(row.children).filter(column =>
      column.classList.contains('col') &&
      !column.classList.contains('movie-overview-row') &&
      Math.abs(column.getBoundingClientRect().top - rowTop) < 1
    );
    const lastColumn = columnsInSameRow[columnsInSameRow.length - 1] || cardColumn;

    const placeholder = document.createComment('movie overview position');
    details.parentNode.insertBefore(placeholder, details);

    const fullWidthRow = document.createElement('div');
    fullWidthRow.className = 'col-12 movie-overview-row';
    lastColumn.insertAdjacentElement('afterend', fullWidthRow);
    fullWidthRow.appendChild(details);

    expandedOverviews.set(details, { placeholder, fullWidthRow });
  }

  function collapseOverview(details) {
    const expanded = expandedOverviews.get(details);
    if (!expanded) return;

    expanded.placeholder.replaceWith(details);
    expanded.fullWidthRow.remove();
    expandedOverviews.delete(details);
  }

  document.querySelectorAll('.movie-card details').forEach(details => {
    details.classList.add('movie-overview');
    details.addEventListener('toggle', () => {
      if (details.open) {
        expandOverview(details);
      } else {
        collapseOverview(details);
      }
    });
  });
})();
