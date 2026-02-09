## `react-markdown` 源码解析（入门版）

面向场景：**你已经在项目里直接用 `<ReactMarkdown>{text}</ReactMarkdown>`，想搞清楚这个库内部到底做了什么。**

目标：带你从源码角度，走一遍“**一段 Markdown 字符串是怎样变成 React 组件树的**”。

---

## 一、整体思路：三步流水线

从非常高的层面看，`react-markdown` 做的事情可以概括为三步：

1. **字符串 → Markdown 抽象语法树（Markdown AST / mdast）**
   - 把 `# 标题`、`*斜体*`、列表、代码块等解析成一棵“节点树”。
2. **Markdown AST → HTML 抽象语法树（HTML AST / hast）**
   - 把“这是一个二级标题节点”这样的信息，转成接近 HTML 结构的节点：
     - heading(level 2) → `h2` 标签节点
     - emphasis → `em`
     - link → `a`
3. **HTML AST → React 元素树**
   - 把每个标签节点变成 `React.createElement(...)`（在源码里是通过 `jsx/jsxs` 完成），
   - 同时支持用你的自定义组件替换默认标签（`components` 配置）。

你平常写的：

```tsx
<ReactMarkdown>{markdownText}</ReactMarkdown>
```

内部基本就是：

1. 用一条 `unified` 处理管线，把 `markdownText` 变成一棵 HAST 树（HTML 语法树）。
2. 在这棵树上做一些安全处理、过滤节点、处理 URL。
3. 用 `hast-util-to-jsx-runtime` 把树变成真正的 React 元素。

---

## 二、涉及到的主要库（从 `package.json` 看）

在 `react-markdown/package.json` 里，和核心逻辑最相关的是这些依赖：

- **`unified`**
  - 一个“可插拔的文本处理管线框架”，
  - 可以挂很多插件，一路把输入（字符串）变成输出（AST、字符串等）。
- **`remark-parse`**
  - 一个 `unified` 插件，
  - 作用：**把 Markdown 字符串解析成 Markdown AST（mdast）**。
- **`remark-rehype`**
  - 另一个 `unified` 插件，
  - 作用：**把 mdast（Markdown AST）转换成 hast（HTML AST）**。
- **`mdast-util-to-hast`**
  - `remark-rehype` 内部使用的工具库，做 mdast → hast 的具体转换。
- **`hast-util-to-jsx-runtime`**
  - 作用：**把 hast（HTML AST）变成 React JSX Runtime 调用**，也就是最后的 React 元素树。
- **`vfile`**
  - 一个“虚拟文件”对象，用来存储文本内容、位置等信息。
  - 在这里用来承载 `children` 里的 Markdown 字符串。
- **`unist-util-visit`**
  - 一个遍历树的工具函数，方便对 AST 做自定义处理（比如过滤节点、处理 URL）。
- **`html-url-attributes`**
  - 维护哪些 HTML 属性可能包含 URL，比如 `href`、`src` 等，以及它们适用于哪些标签。
  - 用它来统一处理并“修正”链接、图片等的 URL。
- **`devlop`**
  - 里面的 `unreachable` 函数用来在“按理说不会发生”的情况里抛异常，
  - 比如 `children` 不是字符串时。
- **`react/jsx-runtime`、`react`**
  - 用来实际创建 React 元素（`jsx` / `jsxs` / `Fragment`），以及在 `MarkdownHooks` 里使用 `useState`、`useEffect`、`useMemo` 等。

理解上面的库之后，再看源码会清晰很多：  
`react-markdown` 自己主要负责**组装这些库，做一条合理的处理管线**。

---

## 三、入口文件：从 `index.js` 到 `lib/index.js`

根目录的 `index.js` 非常简单：

```js
export {
  MarkdownAsync,
  MarkdownHooks,
  Markdown as default,
  defaultUrlTransform
} from './lib/index.js'
```

也就是说：

- 对外导出：
  - 默认导出：`Markdown`（同步组件）
  - 具名导出：`MarkdownAsync`（支持 async/await 的版本）
  - 具名导出：`MarkdownHooks`（用 React hooks 做异步）
  - 具名导出：`defaultUrlTransform`（默认 URL 处理函数）
- **真正的实现都在 `lib/index.js` 里。**

下面所有的源码解析，都以 `lib/index.js` 为主线。

---

## 四、同步组件 `Markdown` 的执行流程

源码（简化版）：

```js
export function Markdown(options) {
  const processor = createProcessor(options)
  const file = createFile(options)
  return post(processor.runSync(processor.parse(file), file), options)
}
```

可以拆成三步：

1. **`createProcessor(options)`：创建 `unified` 处理管线**
2. **`createFile(options)`：把 `children` 变成一个 `VFile`（虚拟文件）**
3. **`processor.parse + processor.runSync`：跑完整条管线得到 AST 树**
4. **`post(tree, options)`：对树做后处理，并转成 React 元素**

### 4.1 `createProcessor(options)`：搭建 markdown → HTML 的管线

源码（摘取关键部分）：

```js
function createProcessor(options) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins
  const remarkPlugins = options.remarkPlugins || emptyPlugins
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? {...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions}
    : emptyRemarkRehypeOptions

  const processor = unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins)

  return processor
}
```

逐行理解：

- `unified()`：创建一个“处理器”（processor），相当于一个空的流水线。
- `.use(remarkParse)`：
  - 挂上“**解析 Markdown 字符串 → Markdown AST（mdast）**”这一步。
- `.use(remarkPlugins)`：
  - 这里会把你通过 `remarkPlugins` 传进来的所有插件挂上去，
  - 插件可以在 mdast 阶段做各种自定义处理（比如 TOC、GFM 等）。
- `.use(remarkRehype, remarkRehypeOptions)`：
  - 把 mdast 转换成 hast（HTML AST），
  - `remarkRehypeOptions` 控制这一步的一些细节（比如是否允许危险 HTML）。
- `.use(rehypePlugins)`：
  - 把你传进来的 rehype 插件再挂上去，
  - 这些插件是在 **HTML AST 阶段** 做处理，比如处理 `<code>` 高亮、处理图片等。

所以，`processor` 的职责就是：

- 接收：一个 `VFile`（里面存着 Markdown 字符串）
- 返回：一棵 HAST 树（HTML 抽象语法树）

### 4.2 `createFile(options)`：把 children 变成 VFile

源码（简化版）：

```js
function createFile(options) {
  const children = options.children || ''
  const file = new VFile()

  if (typeof children === 'string') {
    file.value = children
  } else {
    unreachable(
      'Unexpected value `' +
        children +
        '` for `children` prop, expected `string`'
    )
  }

  return file
}
```

要点：

- `children` 是你传进来的 Markdown 字符串（`<ReactMarkdown>{markdownText}</ReactMarkdown>`）。
- 这里强制要求 `children` 必须是字符串，**否则直接抛错**（`unreachable`）。
- 用 `new VFile()` 创建一个“虚拟文件”，然后把 `children` 填进去：
  - 之后 `unified` 在解析、转换时，都会带着这个 `file` 对象。

### 4.3 `processor.parse(file)` + `processor.runSync(...)`

源码中的一行：

```js
post(processor.runSync(processor.parse(file), file), options)
```

拆开来看：

- `processor.parse(file)`：
  - 用前面挂好的 `remark-parse`，把 `file.value` 里的 Markdown 文本解析成 **mdast**。
- `processor.runSync(tree, file)`：
  - 把这棵 mdast 树依次交给后续插件：
    1. 先给 `remarkPlugins`（如果有）
    2. 再给 `remark-rehype`（mdast → hast）
    3. 再给 `rehypePlugins`
  - 最终得到的是一棵 **hast（HTML AST）**。

返回值我们叫它 `tree`，接下来会交给 `post` 做最后一步处理。

### 4.4 `post(tree, options)`：对 AST 做安全与过滤，再转 React

`post` 是一个比较重要也稍微复杂的函数，简化理解可以分三块：

1. **检查不再支持的旧属性（兼容性提示）**
2. **在 AST 上做“清洗”和“过滤”**
3. **用 `toJsxRuntime` 把 AST 转成 React 元素**

核心结构（删去注释和无关部分）：

```js
function post(tree, options) {
  const allowedElements = options.allowedElements
  const allowElement = options.allowElement
  const components = options.components
  const disallowedElements = options.disallowedElements
  const skipHtml = options.skipHtml
  const unwrapDisallowed = options.unwrapDisallowed
  const urlTransform = options.urlTransform || defaultUrlTransform

  // 1. 检查废弃的旧属性
  for (const deprecation of deprecations) {
    if (Object.hasOwn(options, deprecation.from)) {
      unreachable(/* ...提示错误信息... */)
    }
  }

  // 不允许同时配置 allowedElements 和 disallowedElements
  if (allowedElements && disallowedElements) {
    unreachable(/* ...提示错误信息... */)
  }

  // 2. 遍历 AST，进行节点级别的处理
  visit(tree, transform)

  // 3. 转成 React 元素树
  return toJsxRuntime(tree, {
    Fragment,
    components,
    ignoreInvalidStyle: true,
    jsx,
    jsxs,
    passKeys: true,
    passNode: true
  })

  function transform(node, index, parent) {
    // 2.1 处理 HTML（raw 节点）
    if (node.type === 'raw' && parent && typeof index === 'number') {
      if (skipHtml) {
        parent.children.splice(index, 1)
      } else {
        parent.children[index] = {type: 'text', value: node.value}
      }

      return index
    }

    // 2.2 处理 URL（链接、图片等属性）
    if (node.type === 'element') {
      for (key in urlAttributes) {
        if (Object.hasOwn(urlAttributes, key) &&
            Object.hasOwn(node.properties, key)
        ) {
          const value = node.properties[key]
          const test = urlAttributes[key]
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ''), key, node)
          }
        }
      }
    }

    // 2.3 过滤元素（allowed/disallowed/allowElement/unwrapDisallowed）
    if (node.type === 'element') {
      let remove = allowedElements
        ? !allowedElements.includes(node.tagName)
        : disallowedElements
          ? disallowedElements.includes(node.tagName)
          : false

      if (!remove && allowElement && typeof index === 'number') {
        remove = !allowElement(node, index, parent)
      }

      if (remove && parent && typeof index === 'number') {
        if (unwrapDisallowed && node.children) {
          parent.children.splice(index, 1, ...node.children)
        } else {
          parent.children.splice(index, 1)
        }

        return index
      }
    }
  }
}
```

用小白视角来理解：

- **遍历整棵 HAST 树（`visit(tree, transform)`）**
  - 对每个节点调用 `transform` 函数。
- **处理原始 HTML (`<b>`, `<script>` 这类)**
  - 如果 `skipHtml = true`：
    - 这些 HTML 节点直接从树中删掉。
  - 如果 `skipHtml = false`（默认）：
    - 把 HTML 当作普通文本（`type: 'text'`），不会真正渲染成 HTML，防 XSS。
- **处理 URL**
  - 对所有带 URL 属性的节点（如 `href`、`src`）：
    - 调用 `urlTransform`（默认是 `defaultUrlTransform`）做一次“净化”，
    - 比如过滤掉不安全的协议（`javascript:` 之类）。
- **过滤某些标签**
  - 如果你设置了 `allowedElements`：
    - 那么**不在这个白名单里的标签全部移除**。
  - 如果你设置了 `disallowedElements`：
    - 这些标签会被移除。
  - 如果你设置了 `allowElement` 回调：
    - 可以基于节点内容以更细粒度控制是否保留。
  - `unwrapDisallowed` 为 `true` 时：
    - 删除元素本身，但**保留并“提升”它的子节点**。

最后，用 `toJsxRuntime` 把这棵已经处理好的树，变成：

- `jsx('p', props, children)` / `jsxs(...)` 这样的调用，
- React 就会把它们渲染成真正的 DOM。

---

## 五、异步组件 `MarkdownAsync`：支持 async/await 的版本

源码（简化）：

```js
export async function MarkdownAsync(options) {
  const processor = createProcessor(options)
  const file = createFile(options)
  const tree = await processor.run(processor.parse(file), file)
  return post(tree, options)
}
```

和 `Markdown` 唯一的大区别是：

- 同步版本用的是：`processor.runSync(...)`
- 异步版本用的是：`await processor.run(...)`

为什么需要这个版本？

- 有些 `remark` / `rehype` 插件可能是异步的（比如要请求网络、读文件等）。
- 如果你在 Node.js 环境（SSR 或脚本）里跑，可以直接 `await MarkdownAsync(props)` 拿到 React 元素。

整体流程还是那三步，只是管线运行是异步的。

---

## 六、Hooks 版本 `MarkdownHooks`：前端异步 + loading

源码核心部分（删减非关键注释）：

```js
export function MarkdownHooks(options) {
  const processor = useMemo(
    function () {
      return createProcessor(options)
    },
    [options.rehypePlugins, options.remarkPlugins, options.remarkRehypeOptions]
  )
  const [error, setError] = useState(undefined)
  const [tree, setTree] = useState(undefined)

  useEffect(
    function () {
      let cancelled = false
      const file = createFile(options)

      processor.run(processor.parse(file), file, function (error, tree) {
        if (!cancelled) {
          setError(error)
          setTree(tree)
        }
      })

      return function () {
        cancelled = true
      }
    },
    [options.children, processor]
  )

  if (error) throw error

  return tree ? post(tree, options) : options.fallback
}
```

理解路径：

1. **用 `useMemo` 创建 `processor`**
   - 只有当 `rehypePlugins` / `remarkPlugins` / `remarkRehypeOptions` 变了，才会重新创建管线。
2. **用 `useEffect` 在客户端异步处理 Markdown**
   - 每当 `options.children` 或 `processor` 变化：
     - 创建 `file`，
     - 异步调用 `processor.run(...)`，
     - 把结果树存到 `tree` 这个 state。
3. **渲染逻辑**
   - 如果有错误，抛出 error（交给 React Error Boundary）。
   - 如果还没拿到 `tree`，返回 `options.fallback`（相当于 loading 内容）。
   - 拿到 `tree` 后，调用 `post(tree, options)`，得到 React 元素并渲染。

适用场景：

- 你在客户端用了一些异步插件，需要在“加载中”和“加载完成”之间切换展示，
- `MarkdownHooks` 提供了一个比较 React 风格的封装。

---

## 七、URL 安全处理：`defaultUrlTransform`

源码核心：

```js
export function defaultUrlTransform(value) {
  const colon = value.indexOf(':')
  const questionMark = value.indexOf('?')
  const numberSign = value.indexOf('#')
  const slash = value.indexOf('/')

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value
  }

  return ''
}
```

要点：

- 允许的协议：`http`、`https`、`irc`、`ircs`、`mailto`、`xmpp`。
- 逻辑大致是：
  - 如果没有 `:`，说明是相对链接，比如 `/path`，直接放行。
  - 如果 `:` 出现在 `?` / `#` / `/` 之后，也视为不是协议（比如查询参数里）。
  - 如果真的是协议，就判断是否在白名单内。
  - 不合法则返回空字符串 `''`，即把 URL 清空。

结合 `post` 函数中对 URL 的遍历，就可以做到：

- Markdown 里的各种链接、图片等，即使写成奇怪的 `javascript:alert(1)`，也会被过滤掉。

---

## 八、和“一开始的三步流水线”对应关系

现在，再把所有内容和最开始讲的“三步流水线”对一下：

1. **Markdown 字符串 → Markdown AST（mdast）**
   - 对应：`createFile` + `processor.parse(file)`（内部用 `remark-parse`）
2. **Markdown AST → HTML AST（hast）**
   - 对应：`processor.runSync(...)` / `processor.run(...)` 里：
     - `remarkPlugins`（可选）
     - `remark-rehype`（内部用 `mdast-util-to-hast`）
     - `rehypePlugins`（可选）
3. **HTML AST → React 元素树**
   - 对应：`post(tree, options)`：
     - `visit(tree, transform)` 做 HTML 过滤、URL 安全、元素过滤
     - `toJsxRuntime(tree, {jsx, jsxs, Fragment, components, ...})` 生成 React 元素

你在业务代码里写的只是：

```tsx
<ReactMarkdown>{markdownText}</ReactMarkdown>
```

背后真正跑的是：

1. 创建一个 `VFile`，内容是 `markdownText`。
2. 用 `unified + remark-parse + remark-rehype + 插件` 把它变成一棵 HAST 树。
3. 在树上做一些安全处理和过滤。
4. 用 `hast-util-to-jsx-runtime` 把树变成 React 组件树。

---

## 九、如果你想继续深入源码，可以怎么读？

建议的阅读顺序：

1. **先把这份文档过一遍，脑子里有“整体流程图”。**
2. **打开 `lib/index.js`，配合这份文档“对号入座”：**
   - 找到 `Markdown` / `MarkdownAsync` / `MarkdownHooks`，
   - 找到 `createProcessor` / `createFile` / `post` / `defaultUrlTransform`。
3. **如果对插件体系感兴趣，可以去看：**
   - `unified` 官方文档（理解 `.use()` 的工作原理），
   - `remark-parse`、`remark-rehype` 的 README，
   - `hast-util-to-jsx-runtime` 的 README（看看怎么从 HAST 生成 JSX）。

有了这条“主线”，以后你再加插件、改 URL 处理、定制组件时，就能清楚自己是在整个流水线的哪一步动手，而不是“黑盒瞎改”。
