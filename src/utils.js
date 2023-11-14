//@ts-check
const { markedHighlight } = require('marked-highlight');
const { Marked } = require("marked");
const hljs = require('highlight.js/lib/common').default;

const markdown =  new Marked(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  }));

const escapedText = (/** @type {string} */ text) =>
  text.toLowerCase().replace(/[^\w]+/g, "-");

const renderer = {
  /**
   * @param {string} text
   * @param {number} level
   */
  heading(text, level) {
    return `
            <h${level} id="${escapedText(text)}">
                ${text}
            </h${level}>
        `;
  },
};

markdown.use({ renderer });

/**
 * @param {string} content
 */
module.exports.generateTableOfContent = (content) => {
  const tokens = markdown.lexer(content);
  const result = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "heading") {
      const level = token.depth;
      const text = token.text;
      const id = escapedText(text);
      const link = `<a href="#${id}" style="color: black;">${text}</a>`;
      result.push(
        `<li class="toc-item" style="padding-left: ${12 * level}px;">${link}</li>`
      );
    }
  }
  return `<ul class="toc">${result.join("")}</ul>`;
};

module.exports.markdownRender = markdown.parse;

module.exports.formatPublishTime = (/** @type {string | number | Date} */ time) => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'Asia/Shanghai',
}).format(new Date(time));
