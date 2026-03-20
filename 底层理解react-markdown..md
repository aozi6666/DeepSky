# react-markdown 的“内涵”：它在做 AST 渲染（小白向 + 真正的优化点）

这份笔记只讲一个核心：**`react-markdown` 不是字符串替换，而是把 Markdown 解析成 AST，再把 AST 映射成 React 组件树**。  
所以你做优化时，重点不是“怎么写 CSS”，而是：

- **哪些节点要自定义渲染（`components`）**
- **哪些节点要过滤/清洗（`allowedElements` / `disallowedElements` / `allowElement` / `skipHtml`）**
- **插件放在哪一层（`remarkPlugins` vs `rehypePlugins`）**

> 本文基于你工作区里的源码：`react-markdown/lib/index.js`（版本见 `react-markdown/package.json`: `10.1.0`）。

---

## 你要先记住的 3 个“树”

- **Markdown 字符串**：你传给 `<Markdown children="...">` 的那段文本
- **MDAST（Markdown AST）**：Markdown 语法树（标题、强调、列表等）
- **HAST（HTML AST）**：更像 HTML 标签结构的语法树（`h1`、`p`、`a`、`code` 等）

`react-markdown` 做的事情是一条流水线：

1. Markdown 字符串 → **mdast**（`remark-parse`）
2. mdast → **hast**（`remark-rehype`）
3. hast → **React 元素树**（`hast-util-to-jsx-runtime`，并支持你用 `components` 替换标签渲染）

---

## 关键代码 1：Markdown 组件本质上就是“跑管线 + post 处理”

在 `lib/index.js` 里，同步组件非常直白（我把核心 3 行抽出来）：

```js
export function Markdown(options) {
  const processor = createProcessor(options)
  const file = createFile(options)
  return post(processor.runSync(processor.parse(file), file), options)
}
```

读懂它，你就懂了 80%：

- **`createProcessor`**：把 unified/remark/rehype 插件串起来（决定“树怎么来”）
- **`post`**：遍历树，做过滤/URL 安全/HTML 处理（决定“哪些节点能活下来”）
- **`toJsxRuntime`**：把 hast 映射成 React（决定“标签怎么渲染/替换”）

---

## 关键代码 2：createProcessor = 你的插件插在哪里（优化就从这下手）

`react-markdown` 组装 unified 的方式（核心逻辑）：

```js
function createProcessor(options) {
  const rehypePlugins = options.rehypePlugins || []
  const remarkPlugins = options.remarkPlugins || []
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? {...options.remarkRehypeOptions, allowDangerousHtml: true}
    : {allowDangerousHtml: true}

  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins)

  return processor
}
```

你需要的“面试级理解”是：

- **`remarkPlugins` 工作在 mdast 阶段**（更贴近“Markdown 语义”）
  - 例：`remark-gfm`（表格/删除线/任务列表）、`remark-toc`（目录）
- **`rehypePlugins` 工作在 hast 阶段**（更贴近“HTML/标签结构”）
  - 例：代码高亮通常在 hast 上做（给 `code`/`pre` 节点加结构和 class）

**真实优化点**：插件越多，树的处理越重；并且**插件位置不对会导致不必要的遍历/转换**。  
比如“只想改链接跳转行为”，优先考虑 `components.a` 或 `urlTransform`，而不是上来加一堆 rehype 插件。

---

## 关键代码 3：post() 才是“安全 + 过滤 + 节点级优化”的核心

`post(tree, options)` 里做了三类你最该关心的事：

1. **HTML（raw）怎么处理**
2. **URL（href/src 等）怎么净化**
3. **哪些元素允许/禁止（白名单/黑名单/自定义过滤）**

### 3.1 HTML 节点（raw）不是“直接插入 DOM”

源码逻辑是：

- 默认：把 raw HTML 变成普通文本（所以你写 `<i>a</i>` 会渲染成 `&lt;i&gt;a&lt;/i&gt;`）
- `skipHtml: true`：直接把 raw 节点删掉（更严格）

这也是为什么面试官会说它不是“字符串替换”：**它先变成树，然后你可以决定“raw 节点在树里怎么被处理”。**

> 只有你显式加 `rehype-raw`（rehype 插件）时，raw HTML 才会被当作真正的标签解析进 hast；这会带来明显的安全风险（通常还需要 sanitize）。

### 3.2 URL 统一走 urlTransform（你能在这里做安全/埋点/改写）

`post` 会遍历带 URL 属性的节点（比如 `a[href]`、`img[src]`），对每个 URL 调用：

- `urlTransform(url, key, node)`

默认实现 `defaultUrlTransform` 会过滤危险协议（比如 `javascript:`），返回空字符串 `''`。

**真实优化/工程点**：

- **安全**：你可以在 `urlTransform` 里统一拦截 `data:`、限制域名、强制 https
- **体验**：给站外链接加跳转页、给图片 URL 做 CDN 改写
- **观测**：站外点击埋点（更推荐在 `components.a` 里做）

### 3.3 allowed/disallowed/allowElement：这才是“渲染层面的优化按钮”

源码会根据你的配置决定是否移除某个 element：

- **`allowedElements`**：白名单，不在列表里的 tag 直接移除
- **`disallowedElements`**：黑名单，在列表里的 tag 移除
- **`allowElement(node, index, parent)`**：你写函数做更细粒度的判断
- **`unwrapDisallowed`**：移除 tag 但保留子节点（比如不允许 `em`，但想保留里面的文字）

**这就是最“真实”的优化**：

- 你不渲染某类节点，就不会生成对应的 React 元素（减少组件树规模）
- 你能把“业务不需要的 Markdown 能力”从根上禁掉（不仅是样式层面）

---

## 关键代码 4：toJsxRuntime = “AST 映射成 React 组件”的那一刻

`post` 最终会调用（关键参数我保留了）：

```js
return toJsxRuntime(tree, {
  Fragment,
  components,
  ignoreInvalidStyle: true,
  jsx,
  jsxs,
  passKeys: true,
  passNode: true
})
```

这段代码对应你在业务里最常用的优化点：`components`。

### 你真正该怎么用 components（不是为了 CSS，是为了“节点语义”）

`components` 是 “tagName → React 组件/标签名” 的映射。

最常见的三个实战点：

1. **`a`**：统一站外链接 `target/_blank` + `rel`
2. **`img`**：统一懒加载、占位图、错误兜底、CDN 参数
3. **`code`**：区分行内/块级，交给你自己的高亮/复制按钮组件

一个“最小但正确”的例子（你可以直接照抄到项目里）：

```tsx
import Markdown from 'react-markdown'

export function MdView({text}: {text: string}) {
  return (
    <Markdown
      children={text}
      components={{
        a({href, children, ...props}) {
          const isExternal = href?.startsWith('http')
          return (
            <a
              href={href}
              {...props}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noreferrer noopener' : undefined}
            >
              {children}
            </a>
          )
        },
        code({className, children, ...props}) {
          const lang = (className || '').replace('language-', '')
          const isBlock = className?.includes('language-')
          if (!isBlock) return <code {...props}>{children}</code>
          return (
            <pre>
              <code data-lang={lang} {...props}>
                {children}
              </code>
            </pre>
          )
        }
      }}
    />
  )
}
```

> 面试官想听到的关键词：**“节点级别自定义渲染”**、**“映射 HAST tag 到 React 组件”**、**“减少无用节点渲染（allowedElements）”**。

---

## 真正的“优化清单”：按成本从低到高

- **只渲染你需要的节点**
  - `allowedElements={['p','a','strong','em','code','pre','ul','ol','li']}` 这类白名单，通常比“渲染一切再用 CSS 隐藏”更干净
- **用 `components` 做节点语义封装**
  - 把 `a/img/code` 这些高频节点统一成“你项目的规范组件”
- **别随便开 `rehype-raw`**
  - 这是“把 raw HTML 当真 HTML 解析”的开关，会把安全问题和节点复杂度一起带进来
- **插件越少越好，位置要对**
  - 能用 `components`/`urlTransform` 搞定的，不要上来就用插件
- **大文本/频繁变更：考虑异步与缓存**
  - 客户端如果必须跑异步插件，用 `MarkdownHooks` 并提供 `fallback`
  - 如果 Markdown 内容不变，外层用 `useMemo` 缓存 `children`（或者缓存渲染结果）会更直接

---

## 一句话总结（面试版）

`react-markdown` 的本质是：**Markdown → AST（mdast）→ AST（hast）→ React 元素树**；优化的本质是：**在 AST 层决定“渲染哪些节点、怎么渲染节点、用哪些插件改树”**，而不是做字符串替换或只调 CSS。

