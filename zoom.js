/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
document.querySelectorAll('.zoom-instrumento').forEach(section => {
  const viewport = section.querySelector('.escala-ventana');
  const canvas = viewport.querySelector('canvas');
  const output = section.querySelector('.zoom-nivel');
  const track = section.querySelector('.zoom-recorrido');
  const range = track.querySelector('input');
  const verticalRange = track.querySelector('[data-zoom-vertical]');
  const less = section.querySelector('[data-zoom="menos"]');
  const more = section.querySelector('[data-zoom="mas"]');
  let zoom = 1;
  const vertical = section.dataset.zoomEje === 'vertical';

  function syncScroll() {
    const limit = vertical ? viewport.scrollHeight - viewport.clientHeight : viewport.scrollWidth - viewport.clientWidth;
    const position = vertical ? viewport.scrollTop : viewport.scrollLeft;
    range.value = limit > 0 ? position / limit * 100 : 0;
    if (verticalRange) {
      const verticalLimit = viewport.scrollHeight - viewport.clientHeight;
      verticalRange.value = verticalLimit > 0 ? viewport.scrollTop / verticalLimit * 100 : 0;
    }
  }

  function setZoom(next) {
    // Keep the same part of the scale in the middle of the viewport.
    const center = (viewport.scrollLeft + viewport.clientWidth / 2) / canvas.offsetWidth;
    const centerY = zoom === 1 && vertical
      ? (70 + Number(document.getElementById('posicion').value) * 60) / canvas.height
      : (viewport.scrollTop + viewport.clientHeight / 2) / canvas.offsetHeight;
    const verticalCenter = (viewport.scrollTop + viewport.clientHeight / 2) / canvas.offsetHeight;
    zoom = Math.max(1, Math.min(4, next));
    canvas.style.width = `${zoom * 100}%`;
    viewport.scrollLeft = zoom === 1 ? 0 : center * canvas.offsetWidth - viewport.clientWidth / 2;
    if (vertical) viewport.scrollTop = zoom === 1 ? 0 : centerY * canvas.offsetHeight - viewport.clientHeight / 2;
    if (verticalRange) {
      viewport.scrollTop = zoom === 1 ? 0 : verticalCenter * canvas.offsetHeight - viewport.clientHeight / 2;
    }
    output.textContent = `${Math.round(zoom * 100)} %`;
    less.disabled = zoom === 1;
    more.disabled = zoom === 4;
    track.hidden = zoom === 1;
    syncScroll();
  }

  less.addEventListener('click', () => setZoom(zoom - .5));
  more.addEventListener('click', () => setZoom(zoom + .5));
  section.querySelector('[data-zoom="restablecer"]').addEventListener('click', () => setZoom(1));
  range.addEventListener('input', () => {
    if (vertical) {
      viewport.scrollTop = Number(range.value) / 100 * (viewport.scrollHeight - viewport.clientHeight);
    } else {
      viewport.scrollLeft = Number(range.value) / 100 * (viewport.scrollWidth - viewport.clientWidth);
    }
  });
  if (verticalRange) verticalRange.addEventListener('input', () => {
    viewport.scrollTop = Number(verticalRange.value) / 100 * (viewport.scrollHeight - viewport.clientHeight);
  });
  viewport.addEventListener('scroll', syncScroll, { passive: true });
  window.addEventListener('resize', syncScroll);
  setZoom(1);
});
