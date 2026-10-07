/* © 2026 Augusto Rodrigo Alterats. Uso educativo con cita de autoría. */
(() => {
  const version = '1.0.2';
  const formattedMonthAndYear = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  const monthAndYear = formattedMonthAndYear.charAt(0).toLocaleUpperCase('es-AR')
    + formattedMonthAndYear.slice(1);

  document.querySelectorAll('[data-app-version]').forEach(element => {
    const versionNumber = document.createElement('strong');
    versionNumber.textContent = version;
    element.replaceChildren(versionNumber);
    element.parentElement.style.marginBottom = '1rem';

    const details = document.createElement('span');
    details.style.display = 'block';
    details.style.lineHeight = '1.1';
    const month = document.createElement('strong');
    month.textContent = monthAndYear;
    const author = document.createElement('span');
    author.style.display = 'block';
    author.textContent = '@augusalterats';

    element.append(details);
    details.append(month, author);
  });
})();