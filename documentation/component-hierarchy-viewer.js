/* =============================
   Component Hierarchy Renderer
   ============================= */

// Inject styles
const style = document.createElement('style');
style.textContent = `
  body {
    font-family: Menlo, monospace;
    background: #fff;
    padding: 20px;
  }
  .node {
    border: 2px solid #444;
    border-radius: 10px;
    padding: 10px;
    margin: 10px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  .title {
    font-weight: bold;
    margin-bottom: 4px;
  }
  .details {
    font-size: 12px;
    color: #333;
    margin-bottom: 6px;
  }
  .children {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .children.vertical {
    flex-direction: column;
  }
  .children.horizontal {
    flex-direction: row;
    align-items: flex-start;
  }

  .node[data-depth] {
    background-color: var(--bg, #fff);
  }
  .ios-line {
    color: #d22;
    font-weight: bold;
  }
  .android-line {
    color: #060;
    font-weight: bold;
  }
  .nb-line {
    color: #05f;
    font-weight: bold;
  }

  /* Print styles */
  @media print {
    @page {
      size: letter portrait;
      margin: 0.4in 0.5in;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      transform: scale(0.65);
      transform-origin: top left;
      width: 154%;
      padding: 0;
    }

    h2 {
      margin: 0 0 8px 0;
      font-size: 14pt;
      page-break-after: avoid;
    }

    .node {
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 4px;
      padding: 5px;
      border: 1px solid #444;
    }

    .title {
      font-size: 9pt;
      page-break-after: avoid;
    }

    .details {
      font-size: 8pt;
    }

    /* Force all content to stay together */
    #root {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .children {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
`;
document.head.appendChild(style);

const colors = [
  '#c0d6ff',  // More vibrant blue
  '#ffe5a0',  // More vibrant yellow
  '#d4e8ff',  // More vibrant light blue
  '#ffd4a0',  // More vibrant peach
  '#e0c8ff',  // More vibrant purple
  '#c0ffc0',  // More vibrant green
  '#fff5a0',  // More vibrant light yellow
  '#b0e0ff',  // More vibrant sky blue
  '#f0c0ff',  // More vibrant pink
];

// Lighter colors for print
const printColors = [
  '#e0ecff',
  '#fef8e4',
  '#f0f8ff',
  '#fff3e6',
  '#f3f0ff',
  '#e8ffe6',
  '#fffbe6',
  '#e6f7ff',
  '#f9e6ff',
];

function getColor(d) {
  return colors[d % colors.length];
}

function renderDetailLine(line) {
  const span = document.createElement('div');
  span.textContent = line;
  span.className = 'detail-line';
  if (/\[iOS\]/i.test(line)) span.classList.add('ios-line');
  if (/\[Android\]/i.test(line)) span.classList.add('android-line');
  if (/\[NB\]/i.test(line)) span.classList.add('nb-line');
  return span;
}

function renderNode(node, depth = 0, hasSiblings = false) {
  const el = document.createElement('div');
  el.className = 'node';
  el.dataset.depth = depth;

  // Only apply color if this node has siblings (multiple children at same level)
  if (hasSiblings) {
    el.style.setProperty('--bg', getColor(depth));
  } else {
    el.style.setProperty('--bg', '#ffffff');
  }

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = node.name;
  el.appendChild(title);

  if (node.details) {
    const details = document.createElement('div');
    details.className = 'details';
    if (Array.isArray(node.details)) {
      node.details.forEach(l => details.appendChild(renderDetailLine(l)));
    } else {
      details.textContent = node.details;
    }
    el.appendChild(details);
  }

  if (node.children?.length) {
    const wrap = document.createElement('div');
    wrap.className =
      'children ' +
      (node.layout === 'horizontal' ? 'horizontal' : 'vertical');

    // Children have siblings if there are multiple of them
    const childrenHaveSiblings = node.children.length > 1;

    node.children.forEach(c =>
      wrap.appendChild(renderNode(c, depth + 1, childrenHaveSiblings)),
    );
    el.appendChild(wrap);
  }

  return el;
}

function renderHierarchy(data) {
  document.getElementById('root').appendChild(renderNode(data));
}
