'use strict';

const positive = '+';
const negative = '−';
const nodeNames = [...'ABCDEFGH'];
const maximumResistors = 16;
const commonFlowColor = '#a23c00';
const branchFlowColors = ['#0068a0', '#087443', '#932583', '#a62640',
  '#5342a6', '#796000', '#007577', '#944d21', '#344f77', '#606c24',
  '#9b405e', '#563a70', '#277a3c', '#00618a', '#744124', '#394d9c'];
const examples = {
  inicial: [[positive, negative, 100]],
  serie: [[positive, 'A', 100], ['A', negative, 200]],
  paralelo: [[positive, negative, 100], [positive, negative, 200]],
  mixto: [[positive, 'A', 100], ['A', negative, 200], ['A', negative, 300]]
};

function solveCircuit(nodes, resistors, voltage, internalResistance = 0) {
  const wires = resistors.filter(({ resistance }) => resistance === 0);
  if (!wires.length) return solveLoad(nodes, resistors, voltage, internalResistance);

  function connectedByWires(start, excluded) {
    const connected = new Set([start]);
    for (const node of connected) {
      for (const wire of wires) {
        if (wire === excluded) continue;
        if (wire.from === node) connected.add(wire.to);
        if (wire.to === node) connected.add(wire.from);
      }
    }
    return connected;
  }

  const terminals = connectedByWires(positive);
  const shortCircuit = terminals.has(negative);
  if (shortCircuit && internalResistance === 0) {
    return { shortCircuit: true, closed: true, equivalent: 0, current: null, power: null,
      readings: resistors.map(({ resistance }) => resistance === 0
        ? { voltage: 0, current: null, power: 0 }
        : { voltage: null, current: null, power: null }) };
  }

  const representatives = new Map();
  for (const node of [positive, negative, ...nodes]) {
    if (representatives.has(node)) continue;
    for (const member of connectedByWires(node)) representatives.set(member, node);
  }
  const loads = resistors.filter(({ resistance }) => resistance !== 0);
  const result = shortCircuit
    ? { shortCircuit, closed: true, equivalent: 0, terminalVoltage: 0,
      current: voltage / internalResistance, power: voltage ** 2 / internalResistance,
      readings: loads.map(() => ({ voltage: 0, current: 0, power: 0 })) }
    : solveLoad([...new Set(representatives.values())],
    loads.map(({ from, to, resistance }) => ({
      from: representatives.get(from), to: representatives.get(to), resistance
    })), voltage, internalResistance);

  const outgoing = new Map(nodes.map(node => [node, 0]));
  outgoing.set(positive, -result.current);
  outgoing.set(negative, result.current);
  const loadReadings = new Map(loads.map((load, index) => {
    const reading = result.readings[index];
    outgoing.set(load.from, outgoing.get(load.from) + reading.current);
    outgoing.set(load.to, outgoing.get(load.to) - reading.current);
    return [load, reading];
  }));
  result.readings = resistors.map(resistor => {
    if (loadReadings.has(resistor)) return loadReadings.get(resistor);
    const side = connectedByWires(resistor.from, resistor);
    // A wire in a loop has no unique current. Otherwise apply Kirchhoff's current law.
    const current = side.has(resistor.to) ? null
      : -[...side].reduce((sum, node) => sum + outgoing.get(node), 0);
    return { voltage: 0, current, power: 0 };
  });
  return result;
}

function solveLoad(nodes, resistors, voltage, internalResistance) {
  const normalized = solveResistiveCircuit(nodes, resistors, 1);
  const current = voltage / (normalized.equivalent + internalResistance);
  const terminalVoltage = voltage / (1 + normalized.current * internalResistance);
  return { ...normalized, current, terminalVoltage, power: voltage * current,
    readings: normalized.readings.map(reading => ({
      voltage: reading.voltage * terminalVoltage,
      current: reading.current * terminalVoltage,
      power: reading.power * terminalVoltage ** 2
    })) };
}

function solveResistiveCircuit(nodes, resistors, voltage) {
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
    if (from === to) continue;
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
const internalResistance = byId('resistencia-interna');
const resistorRows = byId('resistencias');
const nodeControls = byId('nodos');
const canvas = byId('diagrama');
const ctx = canvas.getContext('2d');
const viewport = canvas.closest('.lienzo');
const diagramView = viewport.closest('.vista-grafico');
let lastResult = null;
let diagramScale = 1;
const flowCanvas = byId('flujo-corriente');
const flowContext = flowCanvas.getContext('2d');
const animateCurrent = byId('animar-corriente');
const currentDirection = byId('sentido-corriente');
const conventionalDirection = byId('sentido-convencional');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let flowSegments = [];
let animationFrame = 0;
let flowStartTime = 0;
const formatter = new Intl.NumberFormat('es-AR', { maximumSignificantDigits: 5 });
const scientific = new Intl.NumberFormat('es-AR', { notation: 'scientific', maximumSignificantDigits: 4 });
let intermediate = [];
let resistors = [];
let nextResistor = 1;

function allNodes() {
  return [positive, ...intermediate, negative];
}

function seriesEnd(components) {
  const remaining = new Set(components);
  const visited = new Set([positive]);
  let node = positive;
  while (remaining.size) {
    const connected = [...remaining].filter(({ from, to }) => from === node || to === node);
    if (connected.length !== 1) return null;
    const edge = connected[0];
    remaining.delete(edge);
    node = edge.from === node ? edge.to : edge.from;
    if (node === negative) return remaining.size === 0 ? edge : null;
    if (visited.has(node)) return null;
    visited.add(node);
  }
  return null;
}

function availableSeriesNode() {
  return nodeNames.find(node => !resistors.some(({ from, to }) => from === node || to === node));
}

function updateAddButton() {
  const control = byId('agregar-resistencia');
  const seriesLimit = Boolean(seriesEnd(resistors)) && !availableSeriesNode();
  control.disabled = resistors.length >= maximumResistors || seriesLimit;
  control.title = seriesLimit ? 'Se alcanzó el límite de nodos para prolongar la serie' : '';
}

function display(value) {
  if (value === null) return '—';
  if (value === Infinity) return '∞';
  const absolute = Math.abs(value);
  if (absolute > 0 && (absolute < 0.1 || absolute > 100)) {
    const [mantissa, exponent] = scientific.format(value).split('E');
    const superscript = exponent.replace(/[0-9-]/g, character =>
      character === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[character]);
    return mantissa + ' · 10' + superscript;
  }
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
        updateAddButton();
        refresh();
      });
      row.insertCell().append(select);
    }

    const value = element('input');
    value.type = 'number';
    value.min = '0';
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

  byId('agregar-nodo').disabled = intermediate.length >= nodeNames.length;
  updateAddButton();
  refresh();
}

function getBranchColors(connections, tolerance) {
  const incoming = new Map();
  const outgoing = new Map();
  for (const connection of connections) {
    const { from, to, current } = connection;
    if (Math.abs(current) <= tolerance) continue;
    const start = current > 0 ? from : to;
    const end = current > 0 ? to : from;
    if (!outgoing.has(start)) outgoing.set(start, []);
    outgoing.get(start).push({ connection, end });
    incoming.set(end, (incoming.get(end) ?? 0) + 1);
  }

  const colors = new Map();
  let colorIndex = 0;
  for (const branches of outgoing.values()) {
    if (branches.length < 2) continue;
    for (const firstBranch of branches) {
      const color = branchFlowColors[colorIndex++ % branchFlowColors.length];
      let branch = firstBranch;
      while (branch && !colors.has(branch.connection)) {
        colors.set(branch.connection, color);
        const next = outgoing.get(branch.end);
        branch = incoming.get(branch.end) === 1 && next?.length === 1 ? next[0] : null;
      }
    }
  }
  return colors;
}

function paintCurrent(time = 0) {
  flowContext.save();
  flowContext.resetTransform();
  flowContext.clearRect(0, 0, flowCanvas.width, flowCanvas.height);
  flowContext.restore();
  const moving = animateCurrent.checked && !reducedMotion.matches;
  const electrons = currentDirection.checked;
  const elapsedSeconds = Math.max(0, time - flowStartTime) / 1000;
  flowContext.strokeStyle = '#fff';
  flowContext.lineWidth = 1.25;
  for (const { x, y, dx: conventionalDx, dy: conventionalDy, length, speed, color } of flowSegments) {
    const startX = electrons ? x + conventionalDx * length : x;
    const startY = electrons ? y + conventionalDy * length : y;
    const dx = electrons ? -conventionalDx : conventionalDx;
    const dy = electrons ? -conventionalDy : conventionalDy;
    flowContext.fillStyle = color;
    const middle = length / 2;
    const arrowX = startX + dx * middle;
    const arrowY = startY + dy * middle;
    // A fixed arrow remains visible when animation is off.
    flowContext.beginPath();
    flowContext.moveTo(arrowX + dx * 5, arrowY + dy * 5);
    flowContext.lineTo(arrowX - dx * 5 - dy * 4, arrowY - dy * 5 + dx * 4);
    flowContext.lineTo(arrowX - dx * 5 + dy * 4, arrowY - dy * 5 - dx * 4);
    flowContext.fill();
    if (!moving) continue;
    const spacing = Math.min(length - 10, 34);
    for (let position = 5 + (elapsedSeconds * speed) % spacing; position < length - 5; position += spacing) {
      const chargeX = startX + dx * position;
      const chargeY = startY + dy * position;
      flowContext.beginPath();
      flowContext.arc(chargeX, chargeY, 5, 0, Math.PI * 2);
      flowContext.fill();
      flowContext.beginPath();
      flowContext.moveTo(chargeX - 2.5, chargeY);
      flowContext.lineTo(chargeX + 2.5, chargeY);
      if (!electrons) {
        flowContext.moveTo(chargeX, chargeY - 2.5);
        flowContext.lineTo(chargeX, chargeY + 2.5);
      }
      flowContext.stroke();
    }
  }
  if (moving && flowSegments.length) animationFrame = requestAnimationFrame(paintCurrent);
}

function restartCurrent() {
  cancelAnimationFrame(animationFrame);
  flowStartTime = performance.now();
  paintCurrent(flowStartTime);
}

function getDiagramDimensions() {
  return {
    width: 80 + (allNodes().length - 1) * 120,
    height: 115 + Math.max(resistors.length, 1) * 58
  };
}

function getDiagramScale(width, height) {
  const availableWidth = viewport.clientWidth;
  if (diagramView.classList.contains('ampliada') && availableWidth && viewport.clientHeight) {
    return Math.min(availableWidth / width, viewport.clientHeight / height);
  }
  return Math.max(1, Math.min(1.65, availableWidth / width));
}

function drawCircuit(result) {
  if (result?.readings.some(({ current }) => current === null)) result = null;
  const nodes = allNodes();
  const { width, height } = getDiagramDimensions();
  diagramScale = getDiagramScale(width, height);
  const ratio = (window.devicePixelRatio || 1) * diagramScale;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = width * diagramScale + 'px';
  canvas.style.height = height * diagramScale + 'px';
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

  function drawResistor(left, right, y, height = 16) {
    ctx.strokeRect(left, y - height / 2, right - left, height);
  }

  function drawWireCrossing(position, y) {
    ctx.save();
    // Clear the rail around the bridge so the two wires read as separate paths.
    ctx.clearRect(position - 2, y - 10, 4, 12);
    ctx.beginPath();
    ctx.moveTo(position - 7, y);
    ctx.quadraticCurveTo(position, y - 14, position + 7, y);
    ctx.stroke();
    ctx.restore();
  }

  const tolerance = (result?.current ?? 0) * Number.EPSILON * 16;
  function markFlow(x1, y1, x2, y2, current, color = commonFlowColor) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (Math.abs(current) <= tolerance || length < 16) return;
    const forward = current > 0;
    const direction = forward ? 1 : -1;
    // Logarithmic scale keeps the wide range of currents readable on screen.
    const speed = 12 * Math.log1p(Math.abs(current) / 0.001);
    flowSegments.push({ x: forward ? x1 : x2, y: forward ? y1 : y2,
      dx: direction * (x2 - x1) / length, dy: direction * (y2 - y1) / length, length, speed, color });
  }

  const x = node => 40 + nodes.indexOf(node) * 120;
  const bottom = height - 47;
  const junctionKey = (node, y) => node + ':' + y;
  const resistorConnections = resistors.map(({ from, to }, index) => {
    const y = 68 + index * 58;
    return {
      from: junctionKey(from, y),
      to: junctionKey(to, y),
      current: result?.readings[index].current ?? 0
    };
  });
  const railConnections = [];
  function addRailConnection(node, start, end, current) {
    railConnections.push({ from: junctionKey(node, start), to: junctionKey(node, end),
      current, x: x(node), start, end });
  }

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
      addRailConnection(node, start, y, down);
      const { current } = resistorConnections[index];
      down -= node === from ? current : -current;
      start = y;
    });
    if (node === positive || node === negative) {
      addRailConnection(node, start, end, node === positive ? -(result?.current ?? 0) : (result?.current ?? 0));
    }
  }

  const branchColors = getBranchColors([...resistorConnections, ...railConnections], tolerance);
  for (const connection of railConnections) {
    const { x, start, end, current } = connection;
    markFlow(x, start, x, end, current, branchColors.get(connection));
  }

  function junction(position, y) {
    ctx.beginPath();
    ctx.arc(position, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  resistors.forEach(({ id, from, to, value }, index) => {
    const y = 68 + index * 58;
    const left = Math.min(x(from), x(to));
    const right = Math.max(x(from), x(to));
    const connection = resistorConnections[index];
    const current = connection.current * (x(from) < x(to) ? 1 : -1);
    const color = branchColors.get(connection);
    line([left, y], [left + 34, y]);
    markFlow(left, y, left + 34, y, current, color);
    markFlow(left + 34, y, left + 86, y, current, color);
    const isWire = value !== '' && Number(value) === 0;
    if (isWire) line([left + 34, y], [left + 86, y]);
    else drawResistor(left + 34, left + 86, y);
    ctx.fillText('R' + id + (isWire ? ' (0 Ω)' : ''), left + 60, y - 15);
    // Bridges keep the branch continuous at crossings without a junction.
    let start = left + 86;
    for (let crossing = left + 120; crossing < right; crossing += 120) {
      line([start, y], [crossing - 7, y]);
      markFlow(start, y, crossing - 7, y, current, color);
      drawWireCrossing(crossing, y);
      start = crossing + 7;
    }
    line([start, y], [right, y]);
    markFlow(start, y, right, y, current, color);
    junction(left, y);
    junction(right, y);
  });

  const showInternalResistance = internalResistance.validity.valid && internalResistance.valueAsNumber > 0;
  const battery = x(positive) + (showInternalResistance ? 28 : 57);
  line([x(positive), bottom], [battery, bottom]);
  line([battery, bottom - 14], [battery, bottom + 14]);
  line([battery + 9, bottom - 8], [battery + 9, bottom + 8]);
  if (showInternalResistance) {
    const left = battery + 17;
    const right = left + 22;
    line([battery + 9, bottom], [left, bottom]);
    drawResistor(left, right, bottom, 8);
    line([right, bottom], [x(negative), bottom]);
    ctx.fillText('r = ' + display(internalResistance.valueAsNumber) + ' Ω', (left + right) / 2, bottom - 14);
  } else {
    line([battery + 9, bottom], [x(negative), bottom]);
  }
  const returnCurrent = -(result?.current ?? 0);
  markFlow(x(positive), bottom, battery, bottom, returnCurrent);
  markFlow(battery + 9, bottom, x(negative), bottom, returnCurrent);
  ctx.fillText(source.validity.valid ? display(source.valueAsNumber) + ' V' : 'Fuente', battery + 4, height - 13);
  restartCurrent();
}

function refresh() {
  const invalidResistance = [...resistorRows.querySelectorAll('input')].some(input =>
    !input.validity.valid || (input.valueAsNumber > 0 && input.valueAsNumber < 0.001));
  const internalValue = internalResistance.valueAsNumber;
  const invalidInternal = !internalResistance.validity.valid || (internalValue > 0 && internalValue < 0.001);
  const result = source.validity.valid && !invalidResistance && !invalidInternal
    ? solveCircuit(allNodes(), resistors.map(resistor => ({ ...resistor, resistance: Number(resistor.value) })),
      source.valueAsNumber, internalValue)
    : null;
  lastResult = result;
  drawCircuit(result);
  byId('equivalente').textContent = result ? display(result.equivalent) + ' Ω' : '—';
  byId('tension-bornes').textContent = result?.terminalVoltage != null ? display(result.terminalVoltage) + ' V' : '—';
  byId('corriente').textContent = result?.current != null ? display(result.current) + ' A' : '—';
  byId('potencia').textContent = result?.power != null ? display(result.power) + ' W' : '—';
  const status = byId('estado');
  let message = 'Circuito cerrado.';
  if (!source.validity.valid) message = 'Ingresá una tensión entre 0 y 1.000 V.';
  else if (invalidInternal) message = 'Ingresá una resistencia interna de 0 Ω o entre 0,001 Ω y 1.000.000.000 Ω.';
  else if (invalidResistance) message = 'Ingresá 0 Ω o un valor entre 0,001 Ω y 1.000.000.000 Ω.';
  else if (result.shortCircuit) {
    message = 'Cortocircuito: los bornes de la fuente están unidos por un camino de 0 Ω. ';
    if (internalValue > 0) {
      message += 'La resistencia interna limita la corriente.';
      if (result.readings.some(({ current }) => current === null)) {
        message += ' La corriente en los lazos de 0 Ω queda indeterminada.';
      }
    } else message += source.valueAsNumber > 0
      ? 'La corriente crecería sin límite al acercarse a 0 Ω con una fuente ideal.'
      : 'Con una fuente ideal de 0 V, la corriente queda indeterminada.';
  } else {
    if (!result.closed) message = 'Circuito abierto. No hay un camino entre los bornes de la fuente.';
    if (result.readings.some(({ current }) => current === null)) {
      message += ' La corriente en los lazos de 0 Ω queda indeterminada.';
    }
  }
  status.classList.toggle('cortocircuito', Boolean(result?.shortCircuit));
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

new ResizeObserver(() => {
  const { width, height } = getDiagramDimensions();
  if (getDiagramScale(width, height) !== diagramScale) {
    drawCircuit(lastResult);
  }
}).observe(viewport);

function updateCurrentDirection() {
  const direction = currentDirection.checked ? 'flujo de electrones' : 'corriente convencional';
  canvas.setAttribute('aria-label', 'Diagrama de conexiones con flechas de ' + direction);
  restartCurrent();
}

currentDirection.addEventListener('change', () => {
  conventionalDirection.checked = !currentDirection.checked;
  updateCurrentDirection();
});
conventionalDirection.addEventListener('change', () => {
  currentDirection.checked = !conventionalDirection.checked;
  updateCurrentDirection();
});
animateCurrent.addEventListener('change', restartCurrent);
reducedMotion.addEventListener('change', restartCurrent);
source.required = true;
source.addEventListener('input', refresh);
internalResistance.addEventListener('input', refresh);
for (const control of document.querySelectorAll('[data-example]')) {
  control.addEventListener('click', () => loadExample(control.dataset.example));
}
byId('agregar-nodo').addEventListener('click', () => {
  const name = nodeNames.find(node => !intermediate.includes(node));
  intermediate.push(name);
  intermediate.sort();
  renderEditor();
  if (byId('agregar-nodo').disabled) byId('agregar-resistencia').focus();
});
byId('agregar-resistencia').addEventListener('click', () => {
  const end = seriesEnd(resistors);
  let from = positive;
  if (end) {
    from = availableSeriesNode();
    if (!from) return;
    if (!intermediate.includes(from)) {
      intermediate.push(from);
      intermediate.sort();
    }
    if (end.from === negative) end.from = from;
    else end.to = from;
  }
  resistors.push({ id: nextResistor++, from, to: negative, value: 100 });
  renderEditor();
  resistorRows.lastElementChild.querySelector('select').focus();
});
loadExample('inicial');
