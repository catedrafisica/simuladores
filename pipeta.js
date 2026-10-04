/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('pipeta'), ctx = canvas.getContext('2d');
  const nivel = $('posicion'), divisiones = $('divisiones'), tipo = $('menisco'), objetivo = $('objetivo');
  const top = 70, span = 600, left = 390, right = 510, center = 450;
  let active = null;
  const format = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const withinTolerance = (value, target) => Math.abs(value-target)<=1/Number(divisiones.value)/4+1e-9;
  const y = v => top + v * span / 10;
  function line(x1,y1,x2,y2,color,width=1) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
  }
  function label(text,x,y,size=18,color='#17243f',align='left') {
    ctx.font=`${size}px Arial`; ctx.fillStyle=color; ctx.textAlign=align; ctx.fillText(text,x,y);
  }
  function draw() {
    const value = Number(nivel.value), target = Number(objetivo.value), d = Number(divisiones.value);
    const reading = withinTolerance(value, target) ? target : value;
    const concave = tipo.value === 'concavo', mid = y(value), edge = mid + (concave ? -18 : 18);
    ctx.clearRect(0,0,1000,760);
    label('PIPETA GRADUADA · 10 ml',450,30,22,'#314986','center');
    ctx.fillStyle='#f2f8fc'; ctx.fillRect(left-6,48,right-left+12,640);
    // The quadratic control point is twice the offset: its midpoint is the reading level.
    ctx.save(); ctx.beginPath(); ctx.rect(left,48,right-left,640); ctx.clip();
    const fill=ctx.createLinearGradient(left,0,right,0);
    fill.addColorStop(0,concave?'#54b3d0':'#8698ae'); fill.addColorStop(.5,concave?'#b4e6f1':'#d5dce6'); fill.addColorStop(1,concave?'#54b3d0':'#8698ae');
    ctx.beginPath(); ctx.moveTo(left,edge); ctx.quadraticCurveTo(center,mid+(concave?18:-18),right,edge); ctx.lineTo(right,688); ctx.lineTo(left,688); ctx.closePath(); ctx.fillStyle=fill; ctx.fill();
    ctx.beginPath(); ctx.moveTo(left,edge); ctx.quadraticCurveTo(center,mid+(concave?18:-18),right,edge); ctx.lineWidth=3; ctx.strokeStyle=concave?'#16758c':'#4c6079'; ctx.stroke(); ctx.restore();
    line(left-6,48,left-6,688,'#61758b',3); line(right+6,48,right+6,688,'#61758b',3);
    line(left-6,688,center,737,'#61758b',3); line(right+6,688,center,737,'#61758b',3);
    for(let i=0;i<=10*d;i++) {
      const major=i%d===0, yy=y(i/d);
      line(right-(major?45:22),yy,right,yy,d===20?'#111827':'#17243f',d===20?(major?1.3:0.6):(major?2:1));
      if(major) label(String(i/d),right+20,yy+6,18);
    }
    const targetY=y(target);
    if($('mostrarObjetivo').checked) {
      ctx.setLineDash([7,5]); line(285,targetY,590,targetY,'#c2410c',2); ctx.setLineDash([]);
    }
    label(`Objetivo: ${format(target)} ml`,275,targetY-12,18,'#a7370b','right');
    if($('mostrarGuia').checked) {
      ctx.setLineDash([5,4]); line(center,mid,720,mid,'#236943',2); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(center,mid,4,0,Math.PI*2); ctx.fillStyle='#236943'; ctx.fill();
      label(concave?'Leer el punto más bajo':'Leer el punto más alto',610,mid-15,18,'#236943');
    }
    label(concave?'Moja las paredes · menisco cóncavo':'No moja las paredes · menisco convexo',450,755,18,'#314986','center');
    $('lectura').hidden=!$('mostrarResultado').checked;
    $('lectura').textContent=`Lectura: ${format(reading)} ml`;
    $('division').textContent=`Cada división: ${format(1/d)} ml`;
    canvas.setAttribute('aria-label',`Pipeta de 10 ml con menisco ${concave?'cóncavo':'convexo'}. Objetivo ${format(target)} ml.${$('mostrarResultado').checked ? ` Lectura ${format(reading)} ml.` : ''}`);
  }
  function setLevel(value) {
    nivel.value=String(Math.round(Math.min(10,Math.max(0,value))*200)/200);
    $('estado').textContent=''; draw();
  }
  nivel.addEventListener('input',()=>setLevel(Number(nivel.value)));
  for(const id of ['menisco','mostrarGuia','mostrarObjetivo','mostrarResultado']) $(id).addEventListener('change',()=>{ $('estado').textContent=''; draw(); });
  function snapTarget() {
    const value=objetivo.valueAsNumber;
    const target=Number.isFinite(value)?value:4;
    objetivo.value=String(Math.round(Math.min(10,Math.max(0,target))*Number(divisiones.value))/Number(divisiones.value));
    $('estado').textContent=''; draw();
  }
  objetivo.addEventListener('change',snapTarget);
  divisiones.addEventListener('change',()=>{ objetivo.step=String(1/Number(divisiones.value)); snapTarget(); });
  function setupLevelButton(id, direction) {
    const button = $(id);
    let pointer = null, delay = null, repeat = null, repeated = false;
    const step = () => setLevel(Number(nivel.value)+direction/Number(divisiones.value)/10);
    function stop() {
      clearTimeout(delay); clearInterval(repeat);
      delay = repeat = null;
      const captured = pointer;
      pointer = null;
      if(captured !== null && button.hasPointerCapture(captured)) button.releasePointerCapture(captured);
    }
    button.style.touchAction = 'none';
    button.addEventListener('pointerdown', e => {
      if(pointer !== null || !e.isPrimary || e.button !== 0) return;
      pointer = e.pointerId;
      repeated = false;
      button.setPointerCapture(pointer);
      delay = setTimeout(() => {
        repeated = true;
        step();
        repeat = setInterval(step, 60);
      }, 300);
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(event, e => { if(e.pointerId === pointer) stop(); });
    }
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', () => { if(document.hidden) stop(); });
    button.addEventListener('click', e => {
      if(!repeated || e.detail === 0) step();
      repeated = false;
    });
  }
  setupLevelButton('subir', -1);
  setupLevelButton('bajar', 1);
  $('nuevo').addEventListener('click',()=>{
    const d=Number(divisiones.value);
    objetivo.value=String((1+Math.floor(Math.random()*(10*d-1)))/d);
    setLevel(Number(objetivo.value)+(Math.random()<.5?-1:1)*(.15+Math.random()*.7));
  });
  $('comprobar').addEventListener('click',()=>{
    snapTarget();
    const error=Number(nivel.value)-Number(objetivo.value);
    // Accept a small offset on either side, proportional to the selected scale.
    const ok=withinTolerance(Number(nivel.value), Number(objetivo.value));
    $('estado').style.color=ok?'#236943':'#a7370b';
    $('estado').textContent=ok?'¡Enrase correcto! El punto de lectura está dentro del margen aceptado de la marca.':`El líquido está ${error>0?'por debajo':'por encima'} de la marca. ${error>0?'Sube':'Baja'} el líquido para enrasar.`;
  });
  function drag(e) {
    const rect=canvas.getBoundingClientRect();
    setLevel(((e.clientY-rect.top)*canvas.height/rect.height-top)*10/span);
  }
  canvas.addEventListener('pointerdown',e=>{
    if(active!==null || !e.isPrimary || e.button!==0) return;
    active=e.pointerId; canvas.setPointerCapture(active); drag(e);
  });
  canvas.addEventListener('pointermove',e=>{ if(e.pointerId===active) drag(e); });
  function finish(e) { if(e.pointerId!==active) return; active=null; if(canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); }
  for(const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,finish);
  draw();
})();
