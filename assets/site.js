document.documentElement.classList.add('js');

const processBox = document.querySelector('[data-process]');

if (processBox) {
  const buttons = [...processBox.querySelectorAll('[data-view]')];
  const viewer = processBox.querySelector('[data-viewer]');
  const diagram = viewer.querySelector('.diagram-scroll');
  const image = diagram.querySelector('img');
  const scaleOutput = viewer.querySelector('[data-scale]');
  const dialog = processBox.querySelector('dialog');
  const dialogContent = dialog.querySelector('[data-dialog-content]');
  const fullButton = viewer.querySelector('[data-action="full"]');
  const zoomIn = viewer.querySelector('[data-action="in"]');
  const zoomOut = viewer.querySelector('[data-action="out"]');

  let scale = null;
  let fit = 1;
  let drag;
  let embeddedView;

  function updateZoom({ center = false } = {}) {
    if (!image.naturalWidth || !diagram.clientWidth) return;
    const previousWidth = image.getBoundingClientRect().width;
    const previousHeight = image.getBoundingClientRect().height;
    const centerX = (diagram.scrollLeft + diagram.clientWidth / 2) / previousWidth;
    const centerY = (diagram.scrollTop + diagram.clientHeight / 2) / previousHeight;
    fit = Math.min(1, diagram.clientWidth / image.naturalWidth);
    if (scale !== null) scale = Math.max(fit, scale);
    const effective = scale ?? fit;
    image.style.width = `${Math.floor(image.naturalWidth * effective)}px`;
    scaleOutput.value = `${Math.round(effective * 100)}%`;
    zoomOut.disabled = effective <= fit + 0.001;
    zoomIn.disabled = effective >= 1.5;

    if (center && scale !== null) {
      diagram.scrollLeft = centerX * image.getBoundingClientRect().width - diagram.clientWidth / 2;
      diagram.scrollTop = centerY * image.getBoundingClientRect().height - diagram.clientHeight / 2;
    }
    if (scale === null) diagram.scrollTo(0, 0);
  }

  function changeZoom(direction) {
    const current = scale ?? fit;
    const next = current * (direction === 1 ? 1.37 : 1 / 1.37);
    scale = next <= fit + 0.001 ? null : Math.min(1.5, next);
    updateZoom({ center: true });
  }

  function selectView(id) {
    for (const button of buttons) {
      const active = button.dataset.view === id;
      button.setAttribute('aria-pressed', String(active));
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    }
    if (id === 'tobe') updateZoom();
  }

  for (const button of buttons) {
    button.addEventListener('click', () => selectView(button.dataset.view));
  }
  selectView('tobe');
  image.addEventListener('load', () => updateZoom());
  new ResizeObserver(() => updateZoom()).observe(diagram);

  viewer.addEventListener('click', (event) => {
    switch (event.target.closest('button')?.dataset.action) {
      case 'in':
        changeZoom(1);
        break;
      case 'out':
        changeZoom(-1);
        break;
      case 'fit':
        scale = null;
        updateZoom();
        break;
      case 'full':
        embeddedView = { scale, left: diagram.scrollLeft, top: diagram.scrollTop };
        scale = Math.max(0.8, scale ?? fit);
        dialogContent.append(viewer);
        dialog.showModal();
        updateZoom();
        break;
    }
  });

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.querySelector('#tobe').prepend(viewer);
    scale = embeddedView.scale;
    updateZoom();
    diagram.scrollTo(embeddedView.left, embeddedView.top);
    fullButton.focus({ preventScroll: true });
  });

  diagram.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    if (diagram.scrollWidth <= diagram.clientWidth && diagram.scrollHeight <= diagram.clientHeight) return;
    if (event.offsetX >= diagram.clientWidth && event.target === diagram) return;
    if (event.offsetY >= diagram.clientHeight && event.target === diagram) return;
    diagram.setPointerCapture(event.pointerId);
    diagram.classList.add('dragging');
    drag = { x: event.clientX, y: event.clientY, left: diagram.scrollLeft, top: diagram.scrollTop };
  });

  diagram.addEventListener('pointermove', (event) => {
    if (!drag) return;
    diagram.scrollLeft = drag.left + drag.x - event.clientX;
    diagram.scrollTop = drag.top + drag.y - event.clientY;
  });

  diagram.addEventListener('lostpointercapture', () => {
    drag = undefined;
    diagram.classList.remove('dragging');
  });
}
