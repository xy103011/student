import { useState } from 'react';
import Markdown from './Markdown';

function surround(value, start, end, prefix, suffix, placeholder) {
  const selected = value.slice(start, end) || placeholder;
  const inserted = prefix + selected + suffix;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    cursor: start + inserted.length,
  };
}

function linePrefix(value, start, end, prefix) {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const selected = value.slice(lineStart, end);
  const inserted = prefix + selected;
  return {
    value: value.slice(0, lineStart) + inserted + value.slice(end),
    cursor: lineStart + inserted.length,
  };
}

function wrapLines(value, start, end, prefix, suffix) {
  const selected = value.slice(start, end) || '代码';
  const inserted = prefix + selected + suffix;
  return { value: value.slice(0, start) + inserted + value.slice(end), cursor: start + inserted.length };
}

const TOOLS = [
  { label: '加粗', text: 'B', apply: (v, s, e) => surround(v, s, e, '**', '**', '加粗文字') },
  { label: '斜体', text: 'I', apply: (v, s, e) => surround(v, s, e, '*', '*', '斜体文字') },
  { label: '标题', text: 'H', apply: (v, s, e) => linePrefix(v, s, e, '## ') },
  { label: '行内代码', text: '</>', apply: (v, s, e) => surround(v, s, e, '`', '`', '代码') },
  { label: '代码块', text: '{ }', apply: (v, s, e) => wrapLines(v, s, e, '```\n', '\n```') },
  { label: '链接', text: 'link', apply: (v, s, e) => surround(v, s, e, '[', '](https://)', '链接文字') },
  { label: '引用', text: 'quote', apply: (v, s, e) => linePrefix(v, s, e, '> ') },
  { label: '列表', text: 'list', apply: (v, s, e) => linePrefix(v, s, e, '- ') },
  { label: '图片', text: 'img', apply: (v, s, e) => surround(v, s, e, '![', '](https://)', '图片描述') },
];

export default function MarkdownEditor({ value, onChange, placeholder = '支持 Markdown 语法…' }) {
  const [preview, setPreview] = useState(false);
  const [elRef, setElRef] = useState(null);

  const applyTool = (tool) => {
    if (!elRef) return;
    const start = elRef.selectionStart;
    const end = elRef.selectionEnd;
    const result = tool.apply(value, start, end);
    onChange(result.value);
    requestAnimationFrame(() => {
      elRef.focus();
      elRef.setSelectionRange(result.cursor, result.cursor);
    });
  };

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        {TOOLS.map((t) => (
          <button key={t.label} type="button" className="md-tool" title={t.label} onClick={() => applyTool(t)}>
            {t.text}
          </button>
        ))}
        <button
          type="button"
          className={`md-tool md-preview-toggle ${preview ? 'active' : ''}`}
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? '编辑' : '预览'}
        </button>
      </div>
      {preview ? (
        <div className="md-preview card-pad">
          <Markdown>{value}</Markdown>
        </div>
      ) : (
        <textarea
          ref={setElRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="md-textarea"
        />
      )}
    </div>
  );
}
