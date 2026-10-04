/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const initial = { f: 20, r: 1, a: 90 };
  const state = { ...initial };
  const maxDistance = 20;
  const fields = [
    { key: 'f', label: 'Fuerza F (N)', min: 0, max: 50, step: 0.1 },
    { key: 'r', label: 'Distancia r (m)', min: 0, max: maxDistance, step: 0.01 },
    { key: 'a', label: 'Ángulo θ (°)', min: 0, max: 360, step: 1 }
  ];
  const fmt = n => (Math.abs(n) < 1e-9 ? 0 : n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const vector = letter => `<span class="simbolo-vector">${letter}</span>`;
  const versor = '<span class="simbolo-versor">k</span>';
  const calculate = ({ f, r, a }) => {
    const angle = a * Math.PI / 180;
    const fx = f * Math.cos(angle), fy = f * Math.sin(angle);
    const moment = r * fy;
    return { fx, fy, moment, d: r * Math.abs(Math.sin(angle)) };
  };
  $('controles').innerHTML = fields.map(({ key, label, min, max, step }) => `<fieldset class="fuerza" style="--color:#2563eb"><legend>${label}</legend><label class="campo" for="${key}">Valor<input id="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${state[key]}"></label><input id="${key}Range" type="range" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${state[key]}"></fieldset>`).join('');
  const svg = $('plano');
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  function actualizarZoom(valor) {
    zoom = Math.max(.5, Math.min(3, Math.round(valor * 100) / 100));
    const ancho = 700 / zoom, alto = 560 / zoom;
    svg.setAttribute('viewBox', `${350 - ancho / 2 + pan.x} ${280 - alto / 2 + pan.y} ${ancho} ${alto}`);
    $('zoomNivel').textContent = `${Math.round(zoom * 100)} %`;
    $('zoomAlejar').disabled = zoom <= .5;
    $('zoomAcercar').disabled = zoom >= 3;
  }
  $('zoomAlejar').addEventListener('click', () => actualizarZoom(zoom - .25));
  $('zoomAcercar').addEventListener('click', () => actualizarZoom(zoom + .25));
  function restablecerZoom() { pan = { x: 0, y: 0 }; actualizarZoom(1); }
  $('zoomRestablecer').addEventListener('click', restablecerZoom);
  actualizarZoom(1);
  const origin = { x: 170, y: 280 }, forceScale = 3.2;
  let lengthScale = 190;
  const line = (x1, y1, x2, y2, color, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${extra}/>`;
  const svgNotation = text => text.replace(/<span class="simbolo-(vector|versor)">(.*?)<\/span>/g, (_, kind, letter) =>
    `<tspan>${letter}</tspan><tspan dx="-0.65em" dy="-0.65em" font-size="0.8em">${kind === 'vector' ? '→' : '^'}</tspan><tspan dx="0.1em" dy="0.52em">&#8203;</tspan>`);
  const label = (x, y, text, color = '#536078') => `<text x="${x}" y="${y}" fill="${color}" class="etiqueta-angulo">${svgNotation(text)}</text>`;
  const arrow = (x1, y1, x2, y2, color, id) => line(x1, y1, x2, y2, color, `marker-end="url(#${id})"`);
  function render() {
    fields.forEach(({ key }) => { $(key).value = state[key]; $(key + 'Range').value = state[key]; });
    const c = calculate(state);
    const barLength = Math.max(2, Math.ceil(state.r / 2) * 2), tickStep = barLength / 4;
    lengthScale = 380 / barLength;
    $('longitudBarra').textContent = `Barra de ${fmt(barLength)} m`;
    const zero = Math.abs(c.moment) < 1e-9;
    const sense = zero ? 'Sin tendencia al giro' : c.moment > 0 ? `Antihorario (+${versor}, sale del plano)` : `Horario (−${versor}, entra al plano)`;
    $('resumen').innerHTML = `<div class="dato"><span>Momento vectorial ${vector('τ')} respecto de O</span><strong>${fmt(c.moment)} ${versor} N·m</strong></div><div class="dato"><span>Brazo perpendicular b</span><strong>${fmt(c.d)} m</strong></div><div class="dato"><span>Sentido de giro</span><strong>${sense}</strong></div>`;
    $('procedimiento').innerHTML = `<p><strong>${vector('τ')}<sub>O</sub> = ${vector('r')} × ${vector('F')} = (r F sen θ) ${versor} = (r F<sub>y</sub>) ${versor}</strong></p><p>Simplificación: como ${vector('r')} solo tiene componente en X, ${vector('r')} = r<sub>x</sub> <span class="simbolo-versor">i</span>, con r<sub>x</sub> = r; y ${vector('F')} está en el plano XY, ${vector('F')} = F<sub>x</sub> <span class="simbolo-versor">i</span> + F<sub>y</sub> <span class="simbolo-versor">j</span>. Por eso, ${vector('r')} × ${vector('F')} = ${vector('τ')}<sub>O</sub> = (r<sub>y</sub>·F<sub>z</sub> − r<sub>z</sub>·F<sub>y</sub>) <span class="simbolo-versor">i</span> + (r<sub>z</sub>·F<sub>x</sub> − r<sub>x</sub>·F<sub>z</sub>) <span class="simbolo-versor">j</span> + (r<sub>x</sub>·F<sub>y</sub> − r<sub>y</sub>·F<sub>x</sub>) ${versor}. Como r<sub>y</sub> = r<sub>z</sub> = F<sub>z</sub> = 0, solo queda (r<sub>x</sub> F<sub>y</sub>) ${versor} = (r F<sub>y</sub>) ${versor}.</p><p>F<sub>x</sub> = ${fmt(state.f)} cos(${fmt(state.a)}°) = ${fmt(c.fx)} N; F<sub>y</sub> = ${fmt(state.f)} sen(${fmt(state.a)}°) = ${fmt(c.fy)} N.</p><p>${vector('τ')}<sub>O</sub> = [${fmt(state.r)} × ${fmt(state.f)} × sen(${fmt(state.a)}°)] ${versor} = <strong>${fmt(c.moment)} ${versor} N·m</strong>.</p><p>b = r |sen θ| = ${fmt(c.d)} m; |τ<sub>O</sub>| = F b.</p><p>La componente paralela a la barra no produce momento. Para valores fijos de r y F, el módulo del momento es máximo a 90° y 270° y nulo a 0°, 180° y 360°.</p>`;
    const ax = origin.x + state.r * lengthScale, ay = origin.y;
    const rad = state.a * Math.PI / 180, ux = Math.cos(rad), uy = -Math.sin(rad);
    const tx = ax + c.fx * forceScale, ty = ay - c.fy * forceScale;
    let drawing = `<defs>${[['force', '#2563eb'], ['componentX', '#9333ea'], ['componentY', '#dc2626'], ['position', '#237548'], ['moment', '#314986']].map(([id, color]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`).join('')}</defs>`;
    drawing += line(40, ay, 650, ay, '#d5ddeb') + label(645, ay + 22, '+X') + line(origin.x, 45, origin.x, 515, '#d5ddeb') + label(origin.x + 10, 55, '+Y');
    drawing += `<rect x="${origin.x}" y="${ay - 8}" width="${barLength * lengthScale}" height="16" rx="8" fill="#dce4f1" stroke="#aab7cd"/>`;
    for (let i = 0; i <= barLength + 1e-9; i += tickStep) drawing += line(origin.x + i * lengthScale, ay + 9, origin.x + i * lengthScale, ay + 17, '#aab7cd') + label(origin.x + i * lengthScale - 10, ay + 36, `${fmt(i)} m`);
    if ($('auxiliares').checked) {
      // Projection of O onto the infinite line of action of F.
      const projection = (origin.x - ax) * ux;
      const hx = ax + projection * ux, hy = ay + projection * uy;
      drawing += line(ax - ux * 700, ay - uy * 700, ax + ux * 700, ay + uy * 700, '#2563eb', 'stroke-dasharray="7 6" opacity=".35"');
      drawing += line(origin.x, ay, hx, hy, '#c2410c', 'stroke-dasharray="5 4"')
        + label((origin.x + hx) / 2 - 20, (ay + hy) / 2 - 12, `b = ${fmt(c.d)} m`, '#c2410c');
      const vx = -uy, vy = ux, side = projection < 0 ? 1 : -1;
      drawing += `<path d="M${hx + side * ux * 10},${hy + side * uy * 10} l${vx * 10},${vy * 10} l${-side * ux * 10},${-side * uy * 10}" fill="none" stroke="#c2410c"/>`;
      // Both components start at the point where the force is applied.
      drawing += line(tx, ay, tx, ty, '#2563eb', 'stroke-dasharray="4 4" opacity=".4"')
        + line(ax, ty, tx, ty, '#2563eb', 'stroke-dasharray="4 4" opacity=".4"');
      if (Math.abs(c.fx) > 1e-9) drawing += arrow(ax, ay, tx, ay, '#9333ea', 'componentX');
      if (Math.abs(c.fy) > 1e-9) drawing += arrow(ax, ay, ax, ty, '#dc2626', 'componentY');
      drawing += label((ax + tx) / 2, ay - 14, `${vector('F')}x = ${fmt(c.fx)} N`, '#9333ea');
      drawing += label(ax + 12, (ay + ty) / 2 + (c.fy < 0 ? 16 : -6), `${vector('F')}y = ${fmt(c.fy)} N`, '#dc2626');
    }
    if (state.r > 0) drawing += arrow(origin.x, ay, ax, ay, '#237548', 'position') + label((origin.x + ax) / 2 - 20, ay - 18, `${vector('r')} = ${fmt(state.r)} m`, '#237548');
    if (state.a > 0 && state.a < 360) drawing += `<path d="M${ax + 32},${ay} A32 32 0 ${state.a > 180 ? 1 : 0} 0 ${ax + 32 * ux},${ay + 32 * uy}" fill="none" stroke="#2563eb"/>`;
    drawing += label(ax + 40, ay + 52, `θ = ${fmt(state.a)}°`, '#2563eb');
    if (state.f > 0) drawing += arrow(ax, ay, tx, ty, '#2563eb', 'force');
    drawing += `<circle cx="${origin.x}" cy="${ay}" r="${zero ? 9 : 18}" fill="${zero ? '#314986' : '#fff'}" stroke="#314986" stroke-width="3"/>`;
    if (!zero) {
      drawing += c.moment > 0
        ? `<circle cx="${origin.x}" cy="${ay}" r="4" fill="#314986"/>`
        : `<path d="M${origin.x - 8} ${ay - 8} L${origin.x + 8} ${ay + 8} M${origin.x - 8} ${ay + 8} L${origin.x + 8} ${ay - 8}" fill="none" stroke="#314986" stroke-width="3" stroke-linecap="round"/>`;
    }
    drawing += label(origin.x - 23, ay - 26, 'O · eje', '#314986');
    drawing += `<circle data-drag="r" class="punta" cx="${ax}" cy="${ay}" r="10" fill="#237548" fill-opacity=".18" stroke="#237548"/><circle data-drag="f" class="punta" cx="${tx}" cy="${ty}" r="9" fill="#2563eb" fill-opacity=".18" stroke="#2563eb"/>` + label(tx + 12, ty - 12, `F = ${fmt(state.f)} N`, '#2563eb');
    if (!zero) drawing += `<path d="M115 235 A65 65 0 1 0 115 325" fill="none" stroke="#314986" stroke-width="3" marker-end="url(#moment)" ${c.moment < 0 ? 'transform="translate(0 560) scale(1 -1)"' : ''}/>`;
    drawing += label(30, 465, `${vector('τ')} = ${fmt(c.moment)} ${versor} N·m · ${sense}`, '#314986') + label(30, 495, `Escala: ${fmt(lengthScale)} px/m · 3,2 px/N`);
    svg.innerHTML = `<title id="tituloPlano">Momento de una fuerza respecto de O</title><desc id="descripcionPlano">Fuerza de ${fmt(state.f)} N a ${fmt(state.r)} m del eje, ángulo de ${fmt(state.a)} grados. Momento ${fmt(c.moment)} newton metro en la dirección del versor k. ${sense.replace(/<[^>]*>/g, '')}.</desc>${drawing}`;
  }
  fields.forEach(field => [field.key, field.key + 'Range'].forEach(id => {
    $(id).addEventListener('input', event => {
      if (event.target.value.trim() === '' || !Number.isFinite(event.target.valueAsNumber)) return;
      state[field.key] = Math.min(field.max, Math.max(field.min, event.target.valueAsNumber)); render();
    });
    $(id).addEventListener('change', render);
  }));
  $('auxiliares').addEventListener('change', render);
  $('restablecer').addEventListener('click', () => { Object.assign(state, initial); $('auxiliares').checked = true; restablecerZoom(); render(); });
  const examples = { maximo: { f: 20, r: 1, a: 90 }, oblicuo: { f: 20, r: 1.5, a: 30 }, nulo: { f: 20, r: 1, a: 0 }, horario: { f: 20, r: 1, a: 270 } };
  document.querySelectorAll('[data-ejemplo]').forEach(button => button.addEventListener('click', () => { Object.assign(state, examples[button.dataset.ejemplo]); render(); }));
  let drag = null;
  svg.addEventListener('pointerdown', event => {
    const target = event.target.closest('[data-drag]');
    if (target) drag = { type: 'handle', kind: target.dataset.drag };
    else {
      const viewBox = svg.viewBox.baseVal, rect = svg.getBoundingClientRect();
      drag = { type: 'pan', x: event.clientX, y: event.clientY, viewX: viewBox.x, viewY: viewBox.y, width: viewBox.width, height: viewBox.height, rectWidth: rect.width, rectHeight: rect.height };
    }
    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    if (drag.type === 'pan') {
      pan = { x: drag.viewX - (event.clientX - drag.x) * drag.width / drag.rectWidth - (350 - drag.width / 2), y: drag.viewY - (event.clientY - drag.y) * drag.height / drag.rectHeight - (280 - drag.height / 2) };
      actualizarZoom(zoom);
      return;
    }
    const matrix = svg.getScreenCTM(); if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (drag.kind === 'r') state.r = Math.round(Math.min(maxDistance, Math.max(0, (point.x - origin.x) / lengthScale)) * 100) / 100;
    else { const dx = point.x - origin.x - state.r * lengthScale, dy = origin.y - point.y; state.f = Math.round(Math.min(50, Math.hypot(dx, dy) / forceScale) * 10) / 10; state.a = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360); }
    render();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => svg.addEventListener(name, () => { drag = null; }));
  render();
})();
