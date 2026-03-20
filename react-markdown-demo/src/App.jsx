import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function App() {
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
    <div style={{ padding: 20 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ✅ 自定义 code 渲染
          code({ inline, className, children, ...props }) {
            if (inline) {
              return (
                <code
                  style={{
                    background: "#f5f5f5",
                    padding: "2px 4px",
                    borderRadius: "4px",
                    fontSize: "0.9em",
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: "10px",
                  overflowX: "auto",
                  borderRadius: "6px",
                }}
              >
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },

          // ✅ 自定义 a 标签
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#0366d6",
                  wordBreak: "break-all",
                }}
                {...props}
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
