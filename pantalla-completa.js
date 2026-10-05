/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
'use strict';
document.querySelectorAll('.vista-grafico, .zoom-instrumento').forEach((vista, index) => {
  if (!vista.id) vista.id = `vistaSimulacion${index}`;
  let boton = vista.querySelector('.pantalla-completa');
  if (!boton) {
    boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'pantalla-completa';
    boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path class="icono-maximizar" d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/><path class="icono-minimizar" d="M3 9h6V3m6 0v6h6M9 21v-6H3m18 0h-6v6"/></svg>';
    const cabecera = vista.querySelector('.acciones-grafico') || vista.querySelector('.cabecera, .zoom-controles');
    cabecera.append(boton);
  }
  boton.setAttribute('aria-controls', vista.id);
  const avisoGirar = document.createElement('div');
  avisoGirar.className = 'aviso-girar-celular';
  avisoGirar.setAttribute('role', 'status');
  avisoGirar.textContent = 'Girar el celular para ver mejor el simulador.';
  vista.prepend(avisoGirar);
  const canvas = vista.querySelector('canvas');
  const ventana = vista.querySelector('.escala-ventana');
  const contenedorMenisco = vista.querySelector('.contenedor-menisco');
  const controlesEnrase = contenedorMenisco
    ? [document.querySelector('.practica'), document.getElementById('lectura'), document.getElementById('estado')].filter(Boolean)
    : [];
  const posicionesEnrase = controlesEnrase.map(control => {
    const posicion = document.createComment('Posición normal del control de enrase');
    control.before(posicion);
    return posicion;
  });
  let panelEnrase;
  if (controlesEnrase.length) {
    panelEnrase = document.createElement('div');
    panelEnrase.className = 'enrase-ampliado';
    panelEnrase.hidden = true;
    contenedorMenisco.append(panelEnrase);
  }
  function ajustarInstrumento() {
    if (!canvas || !ventana) return;
    const ancho = Math.min(ventana.clientWidth, ventana.clientHeight * canvas.width / canvas.height);
    vista.style.setProperty('--ancho-instrumento', `${ancho}px`);
  }
  function sincronizar() {
    const ampliada = document.fullscreenElement === vista || vista.classList.contains('ampliada-respaldo');
    vista.classList.toggle('ampliada', ampliada);
    document.body.classList.toggle('grafico-ampliado', ampliada);
    const etiqueta = ampliada ? 'Minimizar gráfico' : 'Maximizar gráfico';
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
    boton.setAttribute('aria-pressed', String(ampliada));
    if (panelEnrase) {
      panelEnrase.hidden = !ampliada;
      controlesEnrase.forEach((control, i) => {
        if (ampliada) panelEnrase.append(control);
        else posicionesEnrase[i].after(control);
      });
    }
    ajustarInstrumento();
  }
  boton.addEventListener('click', async () => {
    if (document.fullscreenElement === vista) {
      await document.exitFullscreen();
    } else if (vista.classList.contains('ampliada-respaldo')) {
      vista.classList.remove('ampliada-respaldo');
    } else {
      try {
        if (!vista.requestFullscreen) throw new Error('Pantalla completa no disponible');
        await vista.requestFullscreen();
      } catch {
        vista.classList.add('ampliada-respaldo');
      }
    }
    sincronizar();
  });
  document.addEventListener('fullscreenchange', sincronizar);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && vista.classList.contains('ampliada-respaldo')) {
      vista.classList.remove('ampliada-respaldo');
      sincronizar();
      boton.focus();
    }
  });
  if (ventana) new ResizeObserver(ajustarInstrumento).observe(ventana);
  sincronizar();
});
