/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
(() => {
  const version = '1.0.2';
  document.querySelectorAll('[data-app-version]').forEach(element => {
    element.textContent = version;
  });
})();