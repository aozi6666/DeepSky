import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function App() {
  const [codeMode, setCodeMode] = useState("original");

  const codeModes = useMemo(
    () => [
      { id: "original", label: "原始样式" },
      { id: "syntax-dark", label: "SyntaxHighlighter(One Dark)" },
      { id: "syntax-light", label: "SyntaxHighlighter(One Light)" },
    ],
    [],
  );

  const markdown = `
# react-markdown Demo

这是一个 **Markdown 渲染示例**

## ✅ GFM 支持
- [x] 任务1
- [ ] 任务2

## 表格

| 名字 | 年龄 |
|------|------|
| Alice | 20 |
| Bob   | 25 |

## 行内代码
这里是 \`console.log("hello")\`

## 代码块
\`\`\`js
function add(a, b) {
  return a + b;
}
\`\`\`

## 链接
[OpenAI](https://openai.com)
`;

  return (
    <div className="markdown-demo-page">
      <div className="code-mode-bar">
        <div className="code-mode-label">代码样式：</div>
        <div className="code-mode-buttons">
          {codeModes.map((m) => (
            <button
              key={m.id}
              type="button"
              className={[
                "code-mode-btn",
                m.id === codeMode ? "code-mode-btn--active" : "",
              ].join(" ")}
              onClick={() => setCodeMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 为了紧凑排版：把样式交给 CSS（尽量少用内联 style）
          code({ inline, className, children, ...props }) {
            if (inline) {
              return (
                <code
                  className={["md-inline-code", className].filter(Boolean).join(" ")}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeText = Array.isArray(children) ? children.join("") : String(children);
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1] ?? undefined;

            if (codeMode === "original") {
              return (
                <pre className="md-pre">
                  <code
                    className={["md-pre-code", className].filter(Boolean).join(" ")}
                    {...props}
                  >
                    {children}
                  </code>
                </pre>
              );
            }

            const style = codeMode === "syntax-dark" ? oneDark : oneLight;
            return (
              <SyntaxHighlighter
                language={language}
                style={style}
                wrapLongLines={true}
                customStyle={{
                  margin: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: undefined, // 让主题自己决定背景色
                }}
              >
                {codeText.replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },

          a({ href, children, ...props }) {
            const { className, ...rest } = props;
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={["md-link", className].filter(Boolean).join(" ")}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
