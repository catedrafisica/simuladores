/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
'use strict';
const fuerzas = [{m:4,a:0,color:'#2563eb',nombre:'F₁'},{m:3,a:90,color:'#c2410c',nombre:'F₂'}];
const $ = id => document.getElementById(id);
const fmt = n => (Math.abs(n)<0.0000001?0:n).toLocaleString('es-AR',{maximumFractionDigits:2});
const componentes = f => ({x:f.m*Math.cos(f.a*Math.PI/180),y:f.m*Math.sin(f.a*Math.PI/180)});
const calcular = fs => {const c=fs.map(componentes);const x=c[0].x+c[1].x,y=c[0].y+c[1].y;const m=Math.hypot(x,y);return {c,x,y,m,a:m<1e-8?null:((Math.atan2(y,x)*180/Math.PI)%360+360)%360};};
$('controles').innerHTML=fuerzas.map((f,i)=>`<fieldset class="fuerza" style="--color:${f.color}"><legend>${f.nombre}</legend><label class="campo" for="m${i}">Módulo (N)<input id="m${i}" type="number" min="0" max="100" step="0.1" value="${f.m}"></label><input aria-label="Módulo de ${f.nombre}" id="mr${i}" type="range" min="0" max="100" step="0.1" value="${f.m}"><label class="campo" for="a${i}">Ángulo (°)<input id="a${i}" type="number" min="0" max="360" step="0.1" value="${f.a}"></label><input aria-label="Ángulo de ${f.nombre}" id="ar${i}" type="range" min="0" max="360" step="0.1" value="${f.a}"></fieldset>`).join('');
function sync(){fuerzas.forEach((f,i)=>{['m','a'].forEach(k=>{ $(k+i).value=f[k];$(k+'r'+i).value=f[k];});});}
fuerzas.forEach((f,i)=>['m','a'].forEach(k=>[k+i,k+'r'+i].forEach(id=>$(id).addEventListener('input',e=>{if(e.target.value===''||!Number.isFinite(e.target.valueAsNumber))return;f[k]=Math.min(k==='m'?100:360,Math.max(0,e.target.valueAsNumber));sync();render();}))));
let transform,drag=null;
const svg=$('plano');
let zoom=1;
let pan={x:0,y:0};
function actualizarZoom(valor){
 zoom=Math.max(.5,Math.min(3,Math.round(valor*100)/100));
 const ancho=700/zoom,alto=560/zoom;
 svg.setAttribute('viewBox',`${350-ancho/2+pan.x} ${280-alto/2+pan.y} ${ancho} ${alto}`);
 $('zoomNivel').textContent=`${Math.round(zoom*100)} %`;
 $('zoomAlejar').disabled=zoom<=.5;
 $('zoomAcercar').disabled=zoom>=3;
}
$('zoomAlejar').addEventListener('click',()=>actualizarZoom(zoom-.25));
$('zoomAcercar').addEventListener('click',()=>actualizarZoom(zoom+.25));
function restablecerZoom(){pan={x:0,y:0};actualizarZoom(1);}
$('zoomRestablecer').addEventListener('click',restablecerZoom);
function dibujarAngulo(f,i){
 const radio=38+i*32;
 const punto=(r,a)=>[350+r*Math.cos(a*Math.PI/180),280-r*Math.sin(a*Math.PI/180)];
 let arco='';
 if(f.m>0&&f.a>0){
  // Dividir el recorrido permite representar también una vuelta completa (360°).
  let recorrido=`M ${350+radio} 280`;
  for(let inicio=0;inicio<f.a;inicio+=180){
   const [x,y]=punto(radio,Math.min(inicio+180,f.a));
   recorrido+=` A ${radio} ${radio} 0 0 0 ${x} ${y}`;
  }
  arco=`<path class="arco-angulo" d="${recorrido}" fill="none" stroke="${f.color}" stroke-width="2"/>`;
 }
 const [x,y]=punto(radio+18,f.m>0?f.a/2:0);
 const etiqueta=f.m>0?`θ${i===0?'₁':'₂'} = ${fmt(f.a)}°`:`θ${i===0?'₁':'₂'} indefinido (0 N)`;
 return `<g class="angulo-fuerza" pointer-events="none">${arco}<text class="etiqueta-angulo" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${f.color}">${etiqueta}</text></g>`;
}
function render(){
 const r=calcular(fuerzas),method=$('metodo').value;
 const extent=Math.max(5,...r.c.flatMap(c=>[Math.abs(c.x),Math.abs(c.y)]),Math.abs(r.x),Math.abs(r.y));
 const step=10**Math.floor(Math.log10(extent/3))*([1,2,5,10].find(v=>v*10**Math.floor(Math.log10(extent/3))>=extent/3));
 const limit=Math.ceil(extent/step)*step+step;const s=220/limit;transform={s,ox:350,oy:280};
 const p=(x,y)=>`${350+x*s},${280-y*s}`;
 const line=(x1,y1,x2,y2,color,width=2,dash='')=>`<line x1="${350+x1*s}" y1="${280-y1*s}" x2="${350+x2*s}" y2="${280-y2*s}" stroke="${color}" stroke-width="${width}" ${dash?'stroke-dasharray="6 5"':''}/>`;
 const arrow=(x,y,dx,dy,color,name,aux=false)=>{if(Math.hypot(dx,dy)<1e-8)return '';const angle=Math.atan2(-dy,dx)*180/Math.PI;const ex=350+(x+dx)*s,ey=280-(y+dy)*s;return line(x,y,x+dx,y+dy,color,aux?2:3,aux)+`<path d="M0 0 L-12 -5 L-12 5 Z" transform="translate(${ex} ${ey}) rotate(${angle})" fill="${color}"/><text x="${ex+10}" y="${ey-10}" fill="${color}" font-weight="bold">${name}</text>`;};
 let html='';for(let v=-limit;v<=limit+step/2;v+=step){html+=line(v,-limit,v,limit,'#e5eaf2',1)+line(-limit,v,limit,v,'#e5eaf2',1);if(Math.abs(v)>step/2)html+=`<text x="${350+v*s}" y="298" text-anchor="middle" fill="#68748b">${fmt(v)}</text><text x="339" y="${284-v*s}" text-anchor="end" fill="#68748b">${fmt(v)}</text>`;}
 html+=line(-limit,0,limit,0,'#8391a7',1.5)+line(0,-limit,0,limit,'#8391a7',1.5)+`<text x="585" y="272">+X (N)</text><text x="363" y="40">+Y (N)</text><text x="336" y="298">0</text>`;
 const [c1,c2]=r.c;
 if(method==='paralelogramo')html+=`<polygon points="${p(0,0)} ${p(c1.x,c1.y)} ${p(r.x,r.y)} ${p(c2.x,c2.y)}" fill="#31498608"/>`+line(c1.x,c1.y,r.x,r.y,fuerzas[1].color,2,true)+line(c2.x,c2.y,r.x,r.y,fuerzas[0].color,2,true);
 if(method==='triangulo')html+=arrow(c1.x,c1.y,c2.x,c2.y,fuerzas[1].color,'F₂ trasladada',true);
 if(method==='componentes')r.c.forEach((c,i)=>{html+=arrow(0,0,c.x,0,fuerzas[i].color,`${fuerzas[i].nombre}x`,true)+arrow(c.x,0,0,c.y,fuerzas[i].color,`${fuerzas[i].nombre}y`,true);});
 if($('componentes').checked){html+=line(r.x,0,r.x,r.y,'#237548',1.5,true)+line(0,r.y,r.x,r.y,'#237548',1.5,true)+arrow(0,0,r.x,0,'#237548','Rₓ',true)+arrow(0,0,0,r.y,'#237548','Rᵧ',true);}
 r.c.forEach((c,i)=>{html+=arrow(0,0,c.x,c.y,fuerzas[i].color,fuerzas[i].nombre)+`<circle class="punta" data-fuerza="${i}" cx="${350+c.x*s}" cy="${280-c.y*s}" r="10" fill="${fuerzas[i].color}" fill-opacity=".18" stroke="${fuerzas[i].color}"/>`;});
 html+=arrow(0,0,r.x,r.y,'#237548','R');if(r.m<1e-8)html+='<circle cx="350" cy="280" r="5" fill="#237548"/>';
 html+=fuerzas.map(dibujarAngulo).join('');
 svg.innerHTML='<title id="tituloPlano">Suma vectorial de fuerzas</title><desc id="descripcionPlano">'+`Resultante ${fmt(r.m)} N. Componentes X ${fmt(r.x)} N e Y ${fmt(r.y)} N. `+fuerzas.map(f=>`${f.nombre}: ${f.m>0?`ángulo ${fmt(f.a)}° desde +X en sentido antihorario`:'ángulo indefinido por módulo cero'}.`).join(' ')+'</desc>'+html;
 $('escala').innerHTML=`Escala: <strong>${fmt(step)}N</strong> / mín. div.`;
 $('resumen').innerHTML=`<div class="dato"><span>Módulo de la resultante</span><strong>${fmt(r.m)} N</strong></div><div class="dato"><span>Dirección desde +X</span><strong>${r.a===null?'Indefinida':fmt(r.a)+'°'}</strong></div><div class="dato"><span>Estado del sistema</span><strong>${r.m<1e-8?'Equilibrio':'Fuerza neta ≠ 0'}</strong></div>`;
 $('tabla').innerHTML=r.c.map((c,i)=>{
  const f=fuerzas[i],n=i+1;
  return `<tr><th scope="row" style="color:${f.color}">${f.nombre}</th><td>F<sub>x${n}</sub> = ${f.nombre} · cos(θ<sub>${n}</sub>) î<br>= ${fmt(f.m)} · cos(${fmt(f.a)}°) î = <strong>${fmt(c.x)} î</strong></td><td>F<sub>y${n}</sub> = ${f.nombre} · sen(θ<sub>${n}</sub>) ĵ<br>= ${fmt(f.m)} · sen(${fmt(f.a)}°) ĵ = <strong>${fmt(c.y)} ĵ</strong></td></tr>`;
 }).join('')+`<tr><th scope="row">R = F₁ + F₂</th><td><strong>${fmt(r.x)} î</strong></td><td><strong>${fmt(r.y)} ĵ</strong></td></tr>`;
 const delta=(fuerzas[1].a-fuerzas[0].a)*Math.PI/180,alpha=Math.acos(Math.max(-1,Math.min(1,Math.cos(delta))))*180/Math.PI;
 const perpendicular=fuerzas.every(f=>f.m>0)&&Math.abs(Math.cos(delta))<1e-8;
 $('procedimiento').innerHTML=`<div class="formula"><p><strong>1. Descomponer:</strong> Fₓ = F cos θ; Fᵧ = F sen θ.</p><p><strong>2. Sumar:</strong> Rₓ = ${fmt(c1.x)} + (${fmt(c2.x)}) = ${fmt(r.x)} N; Rᵧ = ${fmt(c1.y)} + (${fmt(c2.y)}) = ${fmt(r.y)} N.</p><p><strong>3. Obtener el módulo:</strong> |R| = √(Rₓ² + Rᵧ²) = √[(${fmt(r.x)})² + (${fmt(r.y)})²] = ${fmt(r.m)} N.</p><p><strong>4. Obtener la dirección:</strong> ${r.a===null?'La fuerza neta es cero; no tiene una dirección definida.':`θ = tg<sup>−1</sup>(Rᵧ/Rₓ) = ${fmt(r.a)}° (respecto de +X).`}</p></div><h3>${perpendicular?'Fuerzas perpendiculares: teorema de Pitágoras':'Método del paralelogramo'}</h3><p>${perpendicular?`El ángulo entre las fuerzas es 90°. Al trasladar F₂ a la punta de F₁ se forma un triángulo rectángulo: |R| = √(F₁² + F₂²) = √(${fmt(fuerzas[0].m)}² + ${fmt(fuerzas[1].m)}²) = <strong>${fmt(r.m)} N</strong>.`:`El ángulo entre las fuerzas es α = ${fmt(alpha)}°. La diagonal del paralelogramo representa la suma: |R| = √(F₁² + F₂² + 2 F₁ F₂ cos α) = <strong>${fmt(r.m)} N</strong>.`}</p><p class="nota">Pitágoras siempre permite calcular el módulo a partir de Rₓ y Rᵧ porque los ejes son perpendiculares. Para usar directamente los módulos F₁ y F₂, ambas fuerzas deben formar 90°. Los cálculos utilizan todos los decimales; los resultados se muestran redondeados.</p>`;
}
$('metodo').addEventListener('change',render);$('componentes').addEventListener('change',render);
function ejemplo(tipo){const valores={rectangulo:[[4,0],[3,90]],oblicuas:[[6,25],[4,120]],equilibrio:[[5,30],[5,210]]}[tipo];valores.forEach(([m,a],i)=>Object.assign(fuerzas[i],{m,a}));sync();render();}
document.querySelectorAll('[data-ejemplo]').forEach(b=>b.addEventListener('click',()=>ejemplo(b.dataset.ejemplo)));
$('restablecer').addEventListener('click',()=>{restablecerZoom();$('metodo').value='paralelogramo';$('componentes').checked=true;ejemplo('rectangulo');});
svg.addEventListener('pointerdown',e=>{
 const target=e.target.closest('[data-fuerza]');
 if(target)drag={tipo:'fuerza',i:Number(target.dataset.fuerza),...transform};
 else{
  const viewBox=svg.viewBox.baseVal,rect=svg.getBoundingClientRect();
  drag={tipo:'pan',x:e.clientX,y:e.clientY,viewX:viewBox.x,viewY:viewBox.y,width:viewBox.width,height:viewBox.height,rectWidth:rect.width,rectHeight:rect.height};
  e.preventDefault();
 }
 svg.setPointerCapture(e.pointerId);
});
svg.addEventListener('pointermove',e=>{
 if(!drag)return;
 if(drag.tipo==='pan'){
  pan={x:drag.viewX-(e.clientX-drag.x)*drag.width/drag.rectWidth-(350-drag.width/2),y:drag.viewY-(e.clientY-drag.y)*drag.height/drag.rectHeight-(280-drag.height/2)};
  actualizarZoom(zoom);
  return;
 }
 const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());const x=(pt.x-drag.ox)/drag.s,y=(drag.oy-pt.y)/drag.s;Object.assign(fuerzas[drag.i],{m:Math.min(100,Math.round(Math.hypot(x,y)*10)/10),a:Math.round(((Math.atan2(y,x)*180/Math.PI+360)%360)*10)/10});sync();render();
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>svg.addEventListener(type,()=>{drag=null;}));
render();
