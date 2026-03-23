import React, { useMemo, useState } from "react";
// Markdown 渲染器： 负责把 Markdown 变成 React UI
import ReactMarkdown from "react-markdown";
// GFM 插件，支持表格、任务列表、删除线
import remarkGfm from "remark-gfm";

import "./App.css";
// 代码高亮 "组件"
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


  // 更适合小白的学习示例：覆盖 GFM（任务/表格/删除线）、行内代码、带语言代码块、多语言高亮、以及链接的 a 定制
  const learningMarkdown = `
# react-markdown 入门学习 Demo

这是一个“给小白看的 Markdown 渲染示例”。你将重点观察两件事：

1. \`code\`：行内代码 vs 代码块，高亮模式如何根据语言渲染
2. \`a\`：外链（http/https）会在新窗口打开；\`#...\` 锚点链接不会强制新窗口

## 你会看到这些能力（GFM）

- 任务列表：\`- [x] ...\` / \`- [ ] ...\`
- 表格：\`| 名字 | 年龄 |\`
- 删除线：\`~~text~~\`

## 标题与段落

这是一段普通文字，可以使用 **加粗**、*斜体*，以及 ~~删除线~~。

> 这里是区块引用（blockquote），用于展示 Markdown 的结构层级。

## 列表与任务列表

1. 先看标题/段落
2. 再看列表与任务
3. 最后看代码与链接

- [x] 已完成的任务
- [ ] 未完成的任务

## 行内代码

行内代码：\`console.log("hello")\`

## 代码块（带语言）

\`\`\`js
function add(a, b) {
  return a + b;
}
console.log(add(1, 2));
\`\`\`

\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}!"
print(greet("DeepSky"))
\`\`\`

\`\`\`bash
echo "Hello from bash"
node -v
\`\`\`

## 表格

| 功能 | Markdown 写法 | 备注 |
|------|---------------|------|
| 任务列表 | \`- [x] ...\` | GFM 扩展 |
| 表格 | \`| a | b |\` | GFM 扩展 |
| 删除线 | \`~~a~~\` | GFM 扩展 |

## 链接（重点看 a 定制）

1) 外链：会在新窗口打开（http/https）
[OpenAI](https://openai.com)

2) 锚点链接：不会强制新窗口（#...）
[跳到上方锚点（示例）](#react-markdown-demo-title)

3) 相对链接：保持当前页行为（示例）
[相对链接示例](/docs)
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
      {/* Markdown 解析器 react-markdown */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}  // 插件
        // Markdown 被解析成标签<code> / <a> 后，不用默认渲染方式，用自定义方式
        components={{
          // <code> 标签的渲染方式 
          // Markdown 里出现代码，会进入 code 函数，进行渲染 (行内代码 + 代码块)
          /* 
            _node: 代码节点
            inline: 是否 行内代码 ?
            className: 代码的类名
            children: 代码的内容
            props: 代码的属性
          */
          code({ _node, inline, className, children, ...props }) {
            void _node; // 防止 ESLint no-unused-vars：这里不需要 node 本身
            // 行内代码 -> 直接渲染成一个普通 <code> 标签
            if (inline) {
              return (
                <code
                  className={["md-inline-code", className].filter(Boolean).join(" ")}
                  {...props}
                >
                  {/* 代码内容本身：就是传进来的 children */}
                  {children}  
                </code>
              );
            }

            // 把 children代码内容本身 统一变成普通字符串
            const codeText = Array.isArray(children) ? children.join("") : String(children);
            // react-markdown 会识别代码语言，className = "language-js" / "language-python"
            // match: 例如从 language-js 里提取出 js，为 语言高亮做准备
            const match = /language-(\w+)/.exec(className || "");
            const language = match?.[1] ?? undefined;
            // 去掉：结尾Markdown 解析多出来的换行符 \n
            const normalizedText = codeText.replace(/\n$/, "");
            
            // react-markdown 本身并不会“自动高亮代码”，它只是帮你把 代码块 识别出来
            // 1）选择普通渲染
            if (codeMode === "original") {
              return (
                <pre className="md-pre">
                  <code
                    className={["md-pre-code", className].filter(Boolean).join(" ")}
                    {...props}
                  >
                    {normalizedText}
                  </code>
                </pre>
              );
            }

            // 2）选择第三方高亮库（react-syntax-highlighter）
            const style = codeMode === "syntax-dark" ? oneDark : oneLight;
            return (
              // SyntaxHighlighter 显示代码块的 “组件”
              <SyntaxHighlighter
                language={language}  // 告诉高亮器：这是 js / python / bash 等语言
                style={style}   // 主题风格
                wrapLongLines={true} // 长行自动换行
                // 一些额外样式
                customStyle={{
                  margin: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: undefined, // 让主题自己决定背景色
                }}
              >
                {normalizedText}
              </SyntaxHighlighter>
            );
          },

          // <a> 标签：链接跳转
          a({ _node, href, children, ...props }) {
            const { className, ...rest } = props;
            void _node; // 仅为了避免 ESLint no-unused-vars

            // 判断是否是外部链接：http/https 开头  -> 跳转用 新窗口 打开
            // #...（锚点链接） 和 /docs（相对链接） 不强制新开窗口
            const isHttp = typeof href === "string" && /^https?:\/\//i.test(href);
            return (
              <a
                href={href}
                target={isHttp ? "_blank" : undefined}  // 外部链接：新窗口打开
                rel={isHttp ? "noopener noreferrer" : undefined}  // 外部链接：补上安全属性
                className={["md-link", className].filter(Boolean).join(" ")}
                {...rest}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {learningMarkdown}
      </ReactMarkdown>
    </div>
  );
}
