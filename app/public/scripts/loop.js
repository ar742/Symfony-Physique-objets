(() => {
  const nodes = Array.from(document.querySelectorAll('[data-loop-node]'));
  function closeTip(node, dismiss = true) {
    delete node.dataset.tipOpen;
    node.querySelector('.tip-toggle').setAttribute('aria-expanded', 'false');
    if (dismiss) node.dataset.tipDismissed = '';
  }
  nodes.forEach(node => {
    const button = node.querySelector('.tip-toggle');
    button.addEventListener('click', () => {
      const opening = !node.hasAttribute('data-tip-open');
      nodes.forEach(other => closeTip(other));
      if (opening) {
        delete node.dataset.tipDismissed;
        node.dataset.tipOpen = '';
        button.setAttribute('aria-expanded', 'true');
      }
    });
    node.addEventListener('pointerenter', () => { delete node.dataset.tipDismissed; });
    node.addEventListener('pointerleave', () => {
      if (!node.contains(document.activeElement)) closeTip(node, false);
      delete node.dataset.tipDismissed;
    });
    node.addEventListener('focusin', () => { delete node.dataset.tipDismissed; });
    node.addEventListener('focusout', event => {
      if (!node.contains(event.relatedTarget)) { closeTip(node, false); delete node.dataset.tipDismissed; }
    });
    node.querySelector('a').addEventListener('click', () => closeTip(node));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') nodes.forEach(node => closeTip(node));
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('[data-loop-node]')) nodes.forEach(node => closeTip(node));
  });
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    nodes.forEach(node => {
      const link = node.querySelector('a');
      if (link.pathname === location.pathname && link.hash === location.hash && location.hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    let parent = target.parentElement;
    let opened = false;
    while (parent) {
      if (parent.tagName === 'DETAILS' && !parent.open) { parent.open = true; opened = true; }
      parent = parent.parentElement;
    }
    if (opened) requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
    if (target.matches('.guide-step, .learning-article [tabindex="-1"]')) target.focus({preventScroll: true});
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
