'use strict';

const positive = '+';
const negative = '−';
const maximumNodes = 8;
const maximumResistors = 16;
const examples = {
  serie: [[positive, 'A', 100], ['A', negative, 200]],
  paralelo: [[positive, negative, 100], [positive, negative, 200]],
  mixto: [[positive, 'A', 100], ['A', negative, 200], ['A', negative, 300]]
};

function solveCircuit(nodes, resistors, voltage) {
  const adjacent = new Map(nodes.map(node => [node, []]));
  for (const { from, to } of resistors) {
    adjacent.get(from).push(to);
    adjacent.get(to).push(from);
  }

  function reachable(start) {
    const visited = new Set([start]);
    for (const node of visited) {
      for (const neighbor of adjacent.get(node)) visited.add(neighbor);
    }
    return visited;
  }

  const fromPositive = reachable(positive);
  const fromNegative = reachable(negative);
  const closed = fromPositive.has(negative);
  const unknowns = nodes.filter(node => node !== positive && node !== negative &&
    fromPositive.has(node) && closed);
  const indices = new Map(unknowns.map((node, index) => [node, index]));
  const size = unknowns.length;
  const matrix = unknowns.map(() => Array(size + 1).fill(0));

  // Solve for normalized potentials, where the positive terminal is at 1 V.
  for (const { from, to, resistance } of resistors) {
    const conductance = 1 / resistance;
    for (const [node, neighbor] of [[from, to], [to, from]]) {
      const row = matrix[indices.get(node)];
      if (!row) continue;
      row[indices.get(node)] += conductance;
      if (indices.has(neighbor)) row[indices.get(neighbor)] -= conductance;
      if (neighbor === positive) row[size] += conductance;
    }
  }

  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    }
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    for (let index = column; index <= size; index++) matrix[column][index] /= divisor;
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let index = column; index <= size; index++) {
        matrix[row][index] -= factor * matrix[column][index];
      }
    }
  }

  const potentials = new Map(nodes.map(node =>
    [node, fromPositive.has(node) && !fromNegative.has(node) ? 1 : 0]));
  potentials.set(positive, 1);
  for (const [node, index] of indices) potentials.set(node, matrix[index][size]);

  let inputConductance = 0;
  const readings = resistors.map(({ from, to, resistance }) => {
    const drop = potentials.get(from) - potentials.get(to);
    const unitCurrent = drop / resistance;
    // Summing dissipated power at 1 V gives the input conductance.
    inputConductance += drop * unitCurrent;
    return { voltage: drop * voltage, current: unitCurrent * voltage,
      power: drop * unitCurrent * voltage ** 2 };
  });
  return { closed, equivalent: closed ? 1 / inputConductance : Infinity,
    current: inputConductance * voltage, power: inputConductance * voltage ** 2, readings };
}

const byId = id => document.getElementById(id);
const source = byId('fuente');
const resistorRows = byId('resistencias');
const nodeControls = byId('nodos');
const canvas = byId('diagrama');
const ctx = canvas.getContext('2d');
const flowCanvas = byId('flujo-corriente');
const flowContext = flowCanvas.getContext('2d');
const animateCurrent = byId('animar-corriente');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let flowSegments = [];
let animationFrame = 0;
const formatter = new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 5 });
const scientific = new Intl.NumberFormat('es-AR', { notation: 'scientific', maximumSignificantDigits: 4 });
let intermediate = [];
let resistors = [];
let nextResistor = 1;

function allNodes() {
  return [positive, ...intermediate, negative];
}

function display(value) {
  if (value === Infinity) return '∞';
  const absolute = Math.abs(value);
  if (absolute > 0 && (absolute < 0.0001 || absolute >= 1e7)) return scientific.format(value);
  return formatter.format(value || 0);
}

function element(tag, label) {
  const result = document.createElement(tag);
  if (label !== undefined) result.textContent = label;
  return result;
}

function button(label, accessibleLabel, action) {
  const control = element('button', label);
  control.type = 'button';
  control.setAttribute('aria-label', accessibleLabel);
  control.addEventListener('click', action);
  return control;
}

function renderNodes() {
  nodeControls.replaceChildren();
  for (const node of intermediate) {
    const used = resistors.some(({ from, to }) => from === node || to === node);
    const remove = button(node + ' ×', 'Quitar nodo ' + node, () => {
      intermediate = intermediate.filter(candidate => candidate !== node);
      renderEditor();
      byId('agregar-nodo').focus();
    });
    remove.disabled = used;
    remove.title = used ? 'Desconectá las resistencias de este nodo para quitarlo' : 'Quitar nodo ' + node;
    nodeControls.append(remove);
  }
}

function renderEditor() {
  renderNodes();
  resistorRows.replaceChildren();
  for (const resistor of resistors) {
    const row = resistorRows.insertRow();
    const label = element('th', 'R' + resistor.id);
    label.scope = 'row';
    row.append(label);

    for (const [key, other, name] of [['from', 'to', 'Desde'], ['to', 'from', 'Hasta']]) {
      const select = element('select');
      select.setAttribute('aria-label', name + ' de ' + label.textContent);
      for (const node of allNodes()) select.add(new Option(node, node));
      select.value = resistor[key];
      select.addEventListener('change', () => {
        // Swap ends if the selected node already occupies the opposite terminal.
        if (select.value === resistor[other]) {
          resistor[other] = resistor[key];
          row.querySelectorAll('select')[key === 'from' ? 1 : 0].value = resistor[other];
        }
        resistor[key] = select.value;
        renderNodes();
        refresh();
      });
      row.insertCell().append(select);
    }

    const value = element('input');
    value.type = 'number';
    value.min = '0.001';
    value.max = '1000000000';
    value.step = 'any';
    value.required = true;
    value.value = resistor.value;
    value.setAttribute('aria-label', 'Valor en ohmios de ' + label.textContent);
    value.addEventListener('input', () => {
      resistor.value = value.value;
      refresh();
    });
    row.insertCell().append(value);
    row.insertCell().append(button('Quitar', 'Quitar ' + label.textContent, () => {
      resistors = resistors.filter(candidate => candidate !== resistor);
      renderEditor();
      byId('agregar-resistencia').focus();
    }));
  }

  byId('agregar-nodo').disabled = intermediate.length >= maximumNodes;
  byId('agregar-resistencia').disabled = resistors.length >= maximumResistors;
  refresh();
}

function paintCurrent(time = 0) {
  flowContext.clearRect(0, 0, flowCanvas.width, flowCanvas.height);
  flowContext.fillStyle = '#a23c00';
  const moving = animateCurrent.checked && !reducedMotion.matches;
  for (const { x, y, dx, dy, length } of flowSegments) {
    const middle = length / 2;
    // A fixed arrow remains visible when animation is off.
    flowContext.beginPath();
    flowContext.moveTo(x + dx * (middle + 5), y + dy * (middle + 5));
    flowContext.lineTo(x + dx * (middle - 5) - dy * 4, y + dy * (middle - 5) + dx * 4);
    flowContext.lineTo(x + dx * (middle - 5) + dy * 4, y + dy * (middle - 5) - dx * 4);
    flowContext.fill();
    if (!moving) continue;
    const spacing = Math.min(length - 8, 34);
    for (let position = 4 + (time * .05) % spacing; position < length - 4; position += spacing) {
      flowContext.beginPath();
      flowContext.arc(x + dx * position, y + dy * position, 2.5, 0, Math.PI * 2);
      flowContext.fill();
    }
  }
  if (moving && flowSegments.length) animationFrame = requestAnimationFrame(paintCurrent);
}

function restartCurrent() {
  cancelAnimationFrame(animationFrame);
  paintCurrent();
}

function drawCircuit(result) {
  const nodes = allNodes();
  const width = 80 + (nodes.length - 1) * 120;
  const height = 115 + Math.max(resistors.length, 1) * 58;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  flowCanvas.width = canvas.width;
  flowCanvas.height = canvas.height;
  flowCanvas.style.width = canvas.style.width;
  flowCanvas.style.height = canvas.style.height;
  flowContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  flowSegments = [];
  ctx.strokeStyle = '#314986';
  ctx.fillStyle = '#314986';
  ctx.lineWidth = 2;
  ctx.font = '600 14px system-ui';
  ctx.textAlign = 'center';

  function line(...points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
  }

  const tolerance = (result?.current ?? 0) * Number.EPSILON * 16;
  function markFlow(x1, y1, x2, y2, current) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (Math.abs(current) <= tolerance || length < 16) return;
    const forward = current > 0;
    const direction = forward ? 1 : -1;
    flowSegments.push({ x: forward ? x1 : x2, y: forward ? y1 : y2,
      dx: direction * (x2 - x1) / length, dy: direction * (y2 - y1) / length, length });
  }

  const x = node => 40 + nodes.indexOf(node) * 120;
  const bottom = height - 47;
  for (const node of nodes) {
    ctx.fillText(node, x(node), 23);
    const end = node === positive || node === negative ? bottom : bottom - 20;
    line([x(node), 32], [x(node), end]);
    // Each junction subtracts the signed current leaving the rail through its branch.
    let down = 0;
    let start = 32;
    resistors.forEach(({ from, to }, index) => {
      if (node !== from && node !== to) return;
      const y = 68 + index * 58;
      markFlow(x(node), start, x(node), y, down);
      const current = result?.readings[index].current ?? 0;
      down -= node === from ? current : -current;
      start = y;
    });
    if (node === positive || node === negative) {
      markFlow(x(node), start, x(node), end, node === positive ? -(result?.current ?? 0) : (result?.current ?? 0));
    }
  }

  function junction(position, y) {
    ctx.beginPath();
    ctx.arc(position, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  resistors.forEach(({ id, from, to }, index) => {
    const y = 68 + index * 58;
    const left = Math.min(x(from), x(to));
    const right = Math.max(x(from), x(to));
    const current = (result?.readings[index].current ?? 0) * (x(from) < x(to) ? 1 : -1);
    line([left, y], [left + 34, y]);
    markFlow(left, y, left + 34, y, current);
    markFlow(left + 34, y, left + 86, y, current);
    ctx.strokeRect(left + 34, y - 9, 52, 18);
    ctx.fillText('R' + id, left + 60, y - 15);
    // Gaps at crossed rails show that the resistor is connected only at its ends.
    let start = left + 86;
    for (let crossing = left + 120; crossing < right; crossing += 120) {
      line([start, y], [crossing - 6, y]);
      markFlow(start, y, crossing - 6, y, current);
      start = crossing + 6;
    }
    line([start, y], [right, y]);
    markFlow(start, y, right, y, current);
    junction(left, y);
    junction(right, y);
  });

  const battery = x(positive) + 57;
  line([x(positive), bottom], [battery, bottom]);
  line([battery, bottom - 14], [battery, bottom + 14]);
  line([battery + 9, bottom - 8], [battery + 9, bottom + 8]);
  line([battery + 9, bottom], [x(negative), bottom]);
  const returnCurrent = -(result?.current ?? 0);
  markFlow(x(positive), bottom, battery, bottom, returnCurrent);
  markFlow(battery + 9, bottom, x(negative), bottom, returnCurrent);
  ctx.fillText(source.validity.valid ? display(source.valueAsNumber) + ' V' : 'Fuente', battery + 4, height - 13);
  restartCurrent();
}

function refresh() {
  const invalidResistance = [...resistorRows.querySelectorAll('input')].some(input => !input.validity.valid);
  const result = source.validity.valid && !invalidResistance
    ? solveCircuit(allNodes(), resistors.map(resistor => ({ ...resistor, resistance: Number(resistor.value) })), source.valueAsNumber)
    : null;
  drawCircuit(result);
  byId('equivalente').textContent = result ? display(result.equivalent) + ' Ω' : '—';
  byId('corriente').textContent = result ? display(result.current) + ' A' : '—';
  byId('potencia').textContent = result ? display(result.power) + ' W' : '—';
  const status = byId('estado');
  let message = 'Circuito cerrado.';
  if (!source.validity.valid) message = 'Ingresá una tensión entre 0 y 1.000 V.';
  else if (invalidResistance) message = 'Cada resistencia debe estar entre 0,001 Ω y 1.000.000.000 Ω.';
  else if (!result.closed) message = 'Circuito abierto. No hay un camino entre los bornes de la fuente.';
  if (status.textContent !== message) status.textContent = message;

  const readings = byId('lecturas');
  readings.replaceChildren();
  resistors.forEach(({ id }, index) => {
    const row = readings.insertRow();
    const header = element('th', 'R' + id);
    header.scope = 'row';
    row.append(header);
    for (const quantity of ['voltage', 'current', 'power']) {
      row.insertCell().textContent = result ? display(result.readings[index][quantity]) : '—';
    }
  });
}

function loadExample(example) {
  const components = examples[example];
  intermediate = [...new Set(components.flatMap(([from, to]) => [from, to]))]
    .filter(node => node !== positive && node !== negative);
  nextResistor = 1;
  resistors = components.map(([from, to, value]) => ({ id: nextResistor++, from, to, value }));
  renderEditor();
}

animateCurrent.addEventListener('change', restartCurrent);
reducedMotion.addEventListener('change', restartCurrent);
source.required = true;
source.addEventListener('input', refresh);
for (const control of document.querySelectorAll('[data-example]')) {
  control.addEventListener('click', () => loadExample(control.dataset.example));
}
byId('agregar-nodo').addEventListener('click', () => {
  const name = [...'ABCDEFGH'].find(node => !intermediate.includes(node));
  intermediate.push(name);
  intermediate.sort();
  renderEditor();
  if (byId('agregar-nodo').disabled) byId('agregar-resistencia').focus();
});
byId('agregar-resistencia').addEventListener('click', () => {
  resistors.push({ id: nextResistor++, from: positive, to: negative, value: 100 });
  renderEditor();
  resistorRows.lastElementChild.querySelector('select').focus();
});
loadExample('mixto');
