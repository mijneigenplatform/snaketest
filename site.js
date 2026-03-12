(function () {
  const menu = document.querySelector('[data-menu]');
  const toggle = document.querySelector('[data-menu-toggle]');
  if (!menu || !toggle) {
    return;
  }

  const className = 'menu-open';

  function syncState(isOpen) {
    document.body.classList.toggle(className, isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  }

  syncState(false);

  toggle.addEventListener('click', function () {
    syncState(!document.body.classList.contains(className));
  });
})();