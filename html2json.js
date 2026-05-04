'use strict';

import { coerceToString } from './lib/coerce.js';
import { tokenize } from './lib/tokenizer.js';
import { buildTree } from './lib/parser.js';
import { normalizeDocument } from './lib/normalizer.js';
import { pruneNode } from './lib/pruner.js';
import { makeDoctypeNode, makeElement } from './lib/nodes.js';
import { STRUCTURAL_TAGS, DEFAULT_DOCTYPE } from './lib/constants.js';

document.getElementById('convert-btn').addEventListener('click', convertHtml2JsonAndSet);
document.getElementById('ex1-btn').addEventListener('click', showExample1);
document.getElementById('ex2-btn').addEventListener('click', showExample2);

function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById('html').value;
  console.log(htmlTextAreaValue);
  const jsonObj = html2json(htmlTextAreaValue);
  const jsonArea = document.getElementById('json');
  jsonArea.textContent = JSON.stringify(jsonObj, null, 2);
}

/**
 * Converts HTML into a JSON node tree representing its HTML structure.
 */
function html2json(htmlText) {
  try {
    const tokens = tokenize(coerceToString(htmlText));
    const document = normalizeDocument(buildTree(tokens));
    pruneNode(document.html);
    return document;
  } catch {
    return fallbackDocument();
  }
}

function fallbackDocument() {
  const htmlEl = makeElement(STRUCTURAL_TAGS.HTML, {}, [
    makeElement(STRUCTURAL_TAGS.HEAD, {}),
    makeElement(STRUCTURAL_TAGS.BODY, {}),
  ]);
  delete htmlEl.type;
  pruneNode(htmlEl);
  return {
    doctype: makeDoctypeNode(`DOCTYPE ${DEFAULT_DOCTYPE}`),
    html: htmlEl,
  };
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = {
    'Comment 1':
      'You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.',
    'Comment 2':
      'When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.',
  };

  document.getElementById('html').value = htmlExample;
  document.getElementById('json').textContent = JSON.stringify(jsonContent, null, 2);
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;
  const jsonContent = {
    'Comment 1':
      'You have to think about how to take into account various html inputs so your json structure will cover them all and handle different cases.',
    'Comment 2':
      'When you make any choice in terms of selecting specific json structure for conversion - be ready to provide reasoning behind such choice.',
  };

  document.getElementById('html').value = htmlExample;
  document.getElementById('json').textContent = JSON.stringify(jsonContent, null, 2);
}
