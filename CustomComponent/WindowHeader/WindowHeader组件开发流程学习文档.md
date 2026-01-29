# WindowHeader 组件开发流程学习文档

> 适合小白学习的详细开发指南

## 📋 目录

1. [组件概述](#组件概述)
2. [文件结构](#文件结构)
3. [技术栈说明](#技术栈说明)
4. [开发流程（从零开始）](#开发流程从零开始)
5. [代码详解](#代码详解)
6. [IPC 通信机制](#ipc-通信机制)
7. [使用示例](#使用示例)
8. [常见问题](#常见问题)

---

## 组件概述

### 什么是 WindowHeader？

`WindowHeader` 是一个**可复用的窗口标题栏组件**，用于 Electron 应用中自定义窗口的标题栏和控制按钮。

### 主要功能

1. **窗口控制按钮**：最小化、最大化/还原、关闭
2. **窗口拖拽**：点击标题栏区域可以拖拽窗口
3. **状态管理**：自动检测窗口是否最大化，切换按钮图标
4. **自定义回调**：支持自定义按钮点击行为

### 为什么需要这个组件？

在 Electron 应用中，如果设置了 `frame: false`（无边框窗口），就需要自己实现窗口控制功能。这个组件封装了所有窗口控制逻辑，让其他窗口可以直接复用。

---

## 文件结构

```
wallpaperbase/src/renderer/components/WindowHeader/
├── index.tsx          # 主组件文件
├── styles.ts          # 样式定义文件
└── icons.tsx          # 图标组件文件
```

### 文件说明

- **index.tsx**：组件的核心逻辑，包含状态管理、事件处理、IPC 通信
- **styles.ts**：使用 `antd-style` 定义的样式，支持响应式和主题
- **icons.tsx**：三个图标组件（最小化、最大化、关闭）

---

## 技术栈说明

### 1. React Hooks

- `useState`：管理窗口最大化状态
- `useEffect`：监听窗口大小变化，检测最大化状态

### 2. Electron IPC（进程间通信）

- **主进程（Main Process）**：控制窗口的实际操作（最小化、最大化、关闭）
- **渲染进程（Renderer Process）**：发送 IPC 消息请求窗口操作

### 3. antd-style

- 用于创建 CSS-in-JS 样式
- 支持响应式、主题、媒体查询

### 4. TypeScript

- 提供类型安全
- 定义组件 Props 接口

---

## 开发流程（从零开始）

### 第一步：创建文件结构

```bash
# 在项目中的位置
wallpaperbase/src/renderer/components/WindowHeader/
```

创建三个文件：
1. `index.tsx` - 主组件
2. `styles.ts` - 样式
3. `icons.tsx` - 图标

### 第二步：准备图标资源

在 `$assets/icons/WinHeader/` 目录下放置三个 SVG 图标：
- `min.svg` - 最小化图标
- `square.svg` - 最大化图标
- `close.svg` - 关闭图标

### 第三步：实现图标组件（icons.tsx）

```typescript
// icons.tsx
import CloseSvg from '$assets/icons/WinHeader/close.svg';
import MinSvg from '$assets/icons/WinHeader/min.svg';
import SquareSvg from '$assets/icons/WinHeader/square.svg';

// 最小化图标组件
export function MinimizeIcon() {
  return (
    <img src={MinSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}

// 最大化图标组件
export function MaximizeIcon() {
  return (
    <img src={SquareSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}

// 关闭图标组件
export function CloseIcon() {
  return (
    <img src={CloseSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}
```

**为什么这样写？**
- 将图标封装成组件，方便复用和维护
- 统一图标尺寸，保持视觉一致性

### 第四步：定义样式（styles.ts）

```typescript
import { createStyles } from 'antd-style';

export const useWindowHeaderStyles = createStyles(() => ({
  // 主容器样式
  header: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    background: 'rgba(15, 15, 15, 1)',
    position: 'relative',
    zIndex: 1000,
    userSelect: 'none',
    WebkitAppRegion: 'drag', // 🔑 关键：使标题栏可拖拽
  },

  // 标题区域（可拖拽）
  titleBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px',
    height: '100%',
    WebkitAppRegion: 'drag', // 🔑 关键：标题区域可拖拽
  },

  // 窗口控制按钮容器
  windowControls: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    WebkitAppRegion: 'no-drag', // 🔑 关键：按钮区域不可拖拽
  },

  // 通用按钮样式
  controlButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    height: '32px',
    background: 'transparent',
    cursor: 'pointer',
    WebkitAppRegion: 'no-drag', // 🔑 关键：按钮不可拖拽
    transition: 'all 0.1s ease',
    
    '&:hover': {
      background: 'rgba(6, 95, 95, 1)',
    },
  },

  // 关闭按钮特殊样式
  closeButton: {
    '&:hover': {
      background: '#e81123', // Windows 标准红色
      color: '#ffffff',
    },
  },
}));
```

**关键知识点：**

1. **WebkitAppRegion**：
   - `drag`：该区域可以拖拽窗口
   - `no-drag`：该区域不能拖拽窗口（用于按钮）
   
2. **为什么按钮区域要设置 `no-drag`？**
   - 如果按钮区域也可以拖拽，点击按钮时窗口会移动，无法正常点击
   - 只有标题栏区域可以拖拽，按钮区域只能点击

### 第五步：实现主组件（index.tsx）

#### 5.1 定义 Props 接口

```typescript
interface WindowHeaderProps {
  title?: string;           // 窗口标题（可选）
  showTitle?: boolean;      // 是否显示标题（可选）
  onMinimize?: () => void;  // 自定义最小化回调（可选）
  onMaximize?: () => void;  // 自定义最大化回调（可选）
  onClose?: () => void;     // 自定义关闭回调（可选）
  className?: string;        // 自定义 CSS 类名（可选）
}
```

**为什么 Props 都是可选的？**

- 提供默认行为，让组件开箱即用
- 同时支持自定义，满足特殊需求

#### 5.2 状态管理

```typescript
const [isMaximized, setIsMaximized] = useState(false);
```

**作用**：跟踪窗口是否最大化，用于切换按钮图标和提示文字。

#### 5.3 检测窗口最大化状态

```typescript
useEffect(() => {
  const checkMaximized = async () => {
    try {
      // 通过 IPC 询问主进程：窗口是否最大化？
      const maximized = await ipcEvent.invoke(
        IPCChannels.WINDOW_IS_MAXIMIZED,
      );
      setIsMaximized(maximized || false);
    } catch {
      // 如果查询失败，使用默认值 false
    }
  };

  // 组件挂载时检查一次
  checkMaximized();

  // 监听窗口大小变化
  const handleResize = () => {
    checkMaximized();
  };

  window.addEventListener('resize', handleResize);
  
  // 清理函数：组件卸载时移除监听器
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**为什么需要监听 resize 事件？**

- 用户可能通过其他方式（如双击标题栏）最大化窗口
- 需要实时更新按钮状态

#### 5.4 按钮点击处理

```typescript
const handleMinimize = () => {
  if (onMinimize) {
    // 如果提供了自定义回调，使用自定义回调
    onMinimize();
  } else {
    // 否则使用默认的 IPC 通信
    ipcEvent.sendMessage(IPCChannels.WINDOW_MINIMIZE);
  }
};
```

**设计模式：策略模式**

- 优先使用自定义回调（灵活性）
- 没有自定义回调时使用默认行为（便利性）

#### 5.5 渲染组件

```typescript
return (
  <div className={`${styles.header} ${className || ''}`}>
    {/* 标题区域 - 可拖拽 */}
    <div className={styles.titleBar}>
      {/* 标题暂时被注释掉了 */}
    </div>

    {/* 窗口控制按钮 */}
    <div className={styles.windowControls}>
      {/* 最小化按钮 */}
      <div
        role="button"
        tabIndex={0}
        className={`${styles.controlButton} ${styles.minimizeButton}`}
        onClick={handleMinimize}
        onKeyDown={(e) => e.key === 'Enter' && handleMinimize()}
        title="最小化"
      >
        <MinimizeIcon />
      </div>
      
      {/* 最大化/还原按钮 */}
      {/* 关闭按钮 */}
      {/* ... */}
    </div>
  </div>
);
```

**无障碍性（Accessibility）**：
- `role="button"`：告诉屏幕阅读器这是一个按钮
- `tabIndex={0}`：允许通过 Tab 键聚焦
- `onKeyDown`：支持键盘操作（Enter 键触发）

---

## IPC 通信机制

### 什么是 IPC？

IPC（Inter-Process Communication）是进程间通信。在 Electron 中：
- **主进程（Main Process）**：控制窗口、文件系统等系统资源
- **渲染进程（Renderer Process）**：运行网页内容（React 组件）

它们之间需要通过 IPC 进行通信。

### 通信流程

```
渲染进程（WindowHeader 组件）
    ↓ 发送 IPC 消息
    ipcEvent.sendMessage(IPCChannels.WINDOW_MINIMIZE)
    ↓
主进程（windowHandlers.ts）
    ↓ 接收消息并执行
    window.minimize()
    ↓
窗口实际最小化
```

### IPC 通道定义

在 `wallpaperbase/src/main/ipcMain/channels/windowChannels.ts` 中定义：

```typescript
export enum WindowChannels {
  /** 最小化窗口 */
  WINDOW_MINIMIZE = 'window-minimize',
  /** 最大化窗口 */
  WINDOW_MAXIMIZE = 'window-maximize',
  /** 关闭窗口 */
  WINDOW_CLOSE = 'window-close',
  /** 窗口是否已最大化 */
  WINDOW_IS_MAXIMIZED = 'window-is-maximized',
}
```

### 主进程处理器

在 `wallpaperbase/src/main/ipcMain/handlers/windowHandlers.ts` 中实现：

```typescript
import { BrowserWindow, ipcMain } from 'electron';
import { WindowChannels } from '../channels/windowChannels';

export const registerWindowHandlers = () => {
  // 最小化窗口
  ipcMain.on(WindowChannels.WINDOW_MINIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
    }
  });

  // 最大化/还原窗口
  ipcMain.on(WindowChannels.WINDOW_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize(); // 如果已最大化，则还原
      } else {
        window.maximize();   // 否则最大化
      }
    }
  });

  // 关闭窗口
  ipcMain.on(WindowChannels.WINDOW_CLOSE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
    }
  });

  // 查询窗口是否最大化
  ipcMain.handle(WindowChannels.WINDOW_IS_MAXIMIZED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });
};
```

---

## 📖 主进程处理器详解（小白必看）

### 1. 什么是 `event` 参数？

`event` 是 Electron 提供的**事件对象**，它包含了发送 IPC 消息的相关信息。

**类比理解：**
- 就像你给朋友发微信，微信系统会记录"谁发的消息"、"什么时候发的"等信息
- `event` 就是 Electron 记录这些信息的对象

**`event` 对象包含什么？**
- `event.sender`：发送消息的**渲染进程**（可以理解为"哪个窗口发送的消息"）
- 其他信息：时间戳、消息内容等

### 2. `BrowserWindow.fromWebContents(event.sender)` 是什么意思？

这是 Electron 提供的**静态方法**，用于根据渲染进程获取对应的窗口对象。

**详细解释：**

```typescript
const window = BrowserWindow.fromWebContents(event.sender);
```

**拆解理解：**

1. **`event.sender`**：
   - 这是发送 IPC 消息的**渲染进程**（WebContents 对象）
   - 可以理解为"哪个网页/窗口发送的消息"

2. **`BrowserWindow.fromWebContents()`**：
   - 这是 Electron 的**内置方法**（静态方法）
   - 作用：根据渲染进程（WebContents）找到对应的**窗口对象**（BrowserWindow）
   - 返回值：窗口对象，如果找不到则返回 `null`

3. **`const window`**：
   - 保存找到的窗口对象
   - 有了这个对象，就可以控制窗口了（最小化、最大化、关闭等）

**类比理解：**
- 就像通过"身份证号"（event.sender）找到"具体的人"（window）
- 找到了人，才能对他进行操作（最小化、最大化等）

### 3. `window.minimize()` 是内置方法吗？

**是的！** 这是 Electron 的 `BrowserWindow` 类提供的**内置方法**。

**Electron 提供的窗口控制方法：**

| 方法 | 作用 | 说明 |
|------|------|------|
| `window.minimize()` | 最小化窗口 | 将窗口缩小到任务栏 |
| `window.maximize()` | 最大化窗口 | 将窗口放大到全屏 |
| `window.unmaximize()` | 还原窗口 | 从最大化状态还原 |
| `window.close()` | 关闭窗口 | 关闭窗口 |
| `window.isMaximized()` | 查询是否最大化 | 返回 `true` 或 `false` |

**这些方法都是 Electron 官方提供的，不需要自己实现！**

### 4. 为什么需要 `if (window)` 判断？

**安全检查**，防止程序崩溃。

**可能的情况：**
- 窗口可能已经被关闭了
- 窗口可能不存在
- `fromWebContents()` 可能返回 `null`

**如果不判断：**
```typescript
const window = BrowserWindow.fromWebContents(event.sender);
window.minimize(); // ❌ 如果 window 是 null，程序会崩溃！
```

**正确的做法：**
```typescript
const window = BrowserWindow.fromWebContents(event.sender);
if (window) {  // ✅ 先检查 window 是否存在
  window.minimize(); // 安全地调用方法
}
```

### 5. `ipcMain.on` vs `ipcMain.handle` 的区别

#### `ipcMain.on` - 用于"发送消息"（不需要返回值）

```typescript
ipcMain.on(WindowChannels.WINDOW_MINIMIZE, (event) => {
  // 执行操作，不需要返回结果
  window.minimize();
});
```

**特点：**
- 渲染进程发送消息后，**不等待返回值**
- 主进程执行操作即可
- 类似于"发通知"，不需要回复

**使用场景：**
- 最小化窗口（不需要知道结果）
- 最大化窗口（不需要知道结果）
- 关闭窗口（不需要知道结果）

#### `ipcMain.handle` - 用于"请求-响应"（需要返回值）

```typescript
ipcMain.handle(WindowChannels.WINDOW_IS_MAXIMIZED, (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  return window ? window.isMaximized() : false; // ✅ 返回结果
});
```

**特点：**
- 渲染进程发送请求后，**等待返回值**
- 主进程必须返回结果
- 类似于"问问题"，需要回答

**使用场景：**
- 查询窗口是否最大化（需要返回 true/false）
- 获取窗口大小（需要返回数据）
- 获取窗口位置（需要返回数据）

**对比表格：**

| 特性 | `ipcMain.on` | `ipcMain.handle` |
|------|--------------|-----------------|
| 是否需要返回值 | ❌ 不需要 | ✅ 需要 |
| 渲染进程调用方式 | `ipcEvent.sendMessage()` | `ipcEvent.invoke()` |
| 是否等待响应 | ❌ 不等待 | ✅ 等待 |
| 使用场景 | 执行操作 | 查询信息 |

### 6. 完整代码流程示例

让我们用一个完整的例子来理解整个流程：

#### 场景：用户点击"最小化"按钮

**步骤 1：渲染进程（WindowHeader 组件）**

```typescript
// 用户点击最小化按钮
const handleMinimize = () => {
  // 发送 IPC 消息到主进程
  ipcEvent.sendMessage(WindowChannels.WINDOW_MINIMIZE);
};
```

**步骤 2：IPC 通信（Electron 内部）**

```
渲染进程 → IPC 通道 → 主进程
```

**步骤 3：主进程（windowHandlers.ts）**

```typescript
// 主进程接收到消息
ipcMain.on(WindowChannels.WINDOW_MINIMIZE, (event) => {
  // 1. 通过 event.sender 找到对应的窗口对象
  const window = BrowserWindow.fromWebContents(event.sender);
  
  // 2. 安全检查
  if (window) {
    // 3. 调用 Electron 内置方法，最小化窗口
    window.minimize();
  }
});
```

**步骤 4：窗口实际最小化**

窗口被最小化到任务栏，用户看到窗口消失了。

---

### 7. 常见问题解答

#### Q1: 为什么不能直接在渲染进程调用 `window.minimize()`？

**A:** 因为渲染进程（网页）**没有权限**直接控制窗口。这是 Electron 的安全设计：
- **渲染进程**：只能显示内容，不能控制系统资源
- **主进程**：可以控制系统资源（窗口、文件系统等）

**类比：**
- 就像网页不能直接删除你电脑上的文件一样
- 必须通过主进程（有权限的进程）来操作

#### Q2: `event.sender` 是什么类型？

**A:** `event.sender` 是 `WebContents` 类型，代表一个渲染进程（网页）。

**理解：**
- 每个 Electron 窗口都有一个 `WebContents` 对象
- `WebContents` 负责加载和显示网页内容
- 通过 `WebContents` 可以找到对应的 `BrowserWindow`（窗口对象）

#### Q3: 如果多个窗口都发送了消息，怎么知道是哪个窗口？

**A:** 通过 `event.sender` 自动识别！

**原理：**
- 每个窗口的渲染进程都有**唯一的** `WebContents`
- `event.sender` 就是发送消息的那个窗口的 `WebContents`
- `BrowserWindow.fromWebContents(event.sender)` 会自动找到对应的窗口

**示例：**
```typescript
// 窗口 A 发送消息 → event.sender 是窗口 A 的 WebContents → 找到窗口 A
// 窗口 B 发送消息 → event.sender 是窗口 B 的 WebContents → 找到窗口 B
```

---

### 8. 代码总结

**最小化窗口的完整流程：**

```typescript
// 1. 注册 IPC 处理器
ipcMain.on(WindowChannels.WINDOW_MINIMIZE, (event) => {
  // 2. 获取窗口对象
  const window = BrowserWindow.fromWebContents(event.sender);
  
  // 3. 安全检查
  if (window) {
    // 4. 调用 Electron 内置方法
    window.minimize();
  }
});
```

**关键点总结：**
1. ✅ `event` 是 Electron 提供的事件对象
2. ✅ `event.sender` 是发送消息的渲染进程
3. ✅ `BrowserWindow.fromWebContents()` 是 Electron 内置方法，用于获取窗口对象
4. ✅ `window.minimize()` 是 Electron 内置方法，用于最小化窗口
5. ✅ `if (window)` 是安全检查，防止程序崩溃
6. ✅ `ipcMain.on` 用于不需要返回值的操作
7. ✅ `ipcMain.handle` 用于需要返回值的查询

---

## 代码详解

### 1. 组件 Props 接口

```typescript
interface WindowHeaderProps {
  title?: string;           // 窗口标题，默认 'WallpaperBase'
  showTitle?: boolean;       // 是否显示标题，默认 true（但代码中标题被注释了）
  onMinimize?: () => void;   // 自定义最小化处理函数
  onMaximize?: () => void;   // 自定义最大化处理函数
  onClose?: () => void;      // 自定义关闭处理函数
  className?: string;        // 额外的 CSS 类名
}
```

**使用场景：**
- 默认情况：`<WindowHeader />` - 使用所有默认值
- 自定义标题：`<WindowHeader title="我的窗口" />`
- 自定义关闭行为：`<WindowHeader onClose={() => console.log('关闭前保存数据')} />`

### 2. 状态管理详解

```typescript
const [isMaximized, setIsMaximized] = useState(false);
```

**为什么需要这个状态？**
- 切换最大化按钮的图标（最大化 ↔ 还原）
- 更新按钮的提示文字（"最大化" ↔ "还原"）

### 3. useEffect 详解

```typescript
useEffect(() => {
  // 1. 定义检查函数
  const checkMaximized = async () => {
    const maximized = await ipcEvent.invoke(IPCChannels.WINDOW_IS_MAXIMIZED);
    setIsMaximized(maximized || false);
  };

  // 2. 立即执行一次
  checkMaximized();

  // 3. 监听窗口大小变化
  const handleResize = () => {
    checkMaximized();
  };
  window.addEventListener('resize', handleResize);

  // 4. 清理函数（组件卸载时执行）
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []); // 空依赖数组：只在组件挂载时执行一次
```

**依赖数组 `[]` 的含义：**
- 空数组：只在组件挂载时执行一次
- 有值：当值变化时重新执行

### 4. 事件处理函数

```typescript
const handleMinimize = () => {
  if (onMinimize) {
    // 策略1：使用自定义回调
    onMinimize();
  } else {
    // 策略2：使用默认 IPC 通信
    ipcEvent.sendMessage(IPCChannels.WINDOW_MINIMIZE);
  }
};
```

**设计优势：**
- 灵活性：支持自定义行为
- 便利性：不传回调时自动使用默认行为

### 5. 样式关键点

#### WebkitAppRegion

```typescript
header: {
  WebkitAppRegion: 'drag', // 整个标题栏可拖拽
}

titleBar: {
  WebkitAppRegion: 'drag', // 标题区域可拖拽
}

windowControls: {
  WebkitAppRegion: 'no-drag', // 按钮区域不可拖拽
}

controlButton: {
  WebkitAppRegion: 'no-drag', // 按钮不可拖拽
}
```

**为什么这样设置？**
- 标题栏区域：可以拖拽窗口
- 按钮区域：不能拖拽，只能点击

如果按钮区域也设置为 `drag`，点击按钮时窗口会移动，无法正常点击。

---

## 使用示例

### 示例 1：基础使用

```typescript
import WindowHeader from '../../components/WindowHeader';

function MyWindow() {
  return (
    <>
      <WindowHeader title="我的窗口" />
      <div>窗口内容</div>
    </>
  );
}
```

### 示例 2：自定义关闭行为

```typescript
import WindowHeader from '../../components/WindowHeader';
import { Modal } from 'antd';

function MyWindow() {
  const handleClose = () => {
    Modal.confirm({
      title: '确认关闭',
      content: '确定要关闭窗口吗？未保存的数据将丢失。',
      onOk: () => {
        // 用户确认后，发送关闭消息
        ipcEvent.sendMessage(IPCChannels.WINDOW_CLOSE);
      },
    });
  };

  return (
    <>
      <WindowHeader title="我的窗口" onClose={handleClose} />
      <div>窗口内容</div>
    </>
  );
}
```

### 示例 3：完全自定义所有按钮

```typescript
function MyWindow() {
  const handleMinimize = () => {
    console.log('自定义最小化');
    ipcEvent.sendMessage(IPCChannels.WINDOW_MINIMIZE);
  };

  const handleMaximize = () => {
    console.log('自定义最大化');
    ipcEvent.sendMessage(IPCChannels.WINDOW_MAXIMIZE);
  };

  const handleClose = () => {
    console.log('自定义关闭');
    // 可以在这里添加保存数据等逻辑
    ipcEvent.sendMessage(IPCChannels.WINDOW_CLOSE);
  };

  return (
    <>
      <WindowHeader
        title="我的窗口"
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />
      <div>窗口内容</div>
    </>
  );
}
```

### 示例 4：调整容器高度

当使用 WindowHeader 时，需要调整内容容器的高度，避免被标题栏遮挡：

```typescript
// styles.ts
export const useStyles = createStyles(() => ({
  container: css`
    width: 100%;
    height: calc(100vh - 32px); /* 减去 WindowHeader 的高度 */
    /* 其他样式... */
  `,
}));
```

---

## 常见问题

### Q1: 为什么点击按钮时窗口会移动？

**原因**：按钮区域没有设置 `WebkitAppRegion: 'no-drag'`

**解决**：确保按钮和按钮容器都设置了 `WebkitAppRegion: 'no-drag'`

```typescript
windowControls: {
  WebkitAppRegion: 'no-drag', // ✅ 必须设置
}

controlButton: {
  WebkitAppRegion: 'no-drag', // ✅ 必须设置
}
```

### Q2: 为什么窗口无法拖拽？

**原因**：标题栏区域没有设置 `WebkitAppRegion: 'drag'`

**解决**：确保标题栏区域设置了 `WebkitAppRegion: 'drag'`

```typescript
header: {
  WebkitAppRegion: 'drag', // ✅ 必须设置
}

titleBar: {
  WebkitAppRegion: 'drag', // ✅ 必须设置
}
```

### Q3: 最大化按钮状态不更新？

**原因**：没有监听窗口大小变化

**解决**：确保在 `useEffect` 中监听 `resize` 事件

```typescript
useEffect(() => {
  const handleResize = () => {
    checkMaximized(); // 重新检查最大化状态
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### Q4: IPC 通信失败？

**检查清单：**
1. ✅ IPC 通道名称是否正确？
2. ✅ 主进程是否注册了对应的处理器？
3. ✅ 窗口对象是否存在？（`BrowserWindow.fromWebContents` 是否返回有效窗口）

### Q5: 如何修改按钮样式？

**方法 1：修改 styles.ts**

```typescript
controlButton: {
  width: '50px',  // 修改宽度
  height: '36px', // 修改高度
  // 其他样式...
}
```

**方法 2：使用 className 覆盖**

```typescript
<WindowHeader className="my-custom-header" />
```

然后在 CSS 中：
```css
.my-custom-header .controlButton {
  width: 50px;
  height: 36px;
}
```

### Q6: 如何添加更多按钮？

**步骤：**
1. 在 `icons.tsx` 中添加新图标组件
2. 在 `styles.ts` 中添加新按钮样式
3. 在 `index.tsx` 中添加新按钮和处理函数
4. 在 `WindowHeaderProps` 接口中添加新的回调属性

---

## 开发流程总结

### 完整开发步骤

1. **创建文件结构**
   ```
   WindowHeader/
   ├── index.tsx
   ├── styles.ts
   └── icons.tsx
   ```

2. **准备图标资源**
   - 准备三个 SVG 图标文件

3. **实现图标组件**（icons.tsx）
   - 封装图标为 React 组件

4. **定义样式**（styles.ts）
   - 使用 `antd-style` 创建样式
   - 设置 `WebkitAppRegion` 属性

5. **实现主组件**（index.tsx）
   - 定义 Props 接口
   - 实现状态管理
   - 实现事件处理
   - 实现 IPC 通信
   - 渲染组件

6. **在主进程中注册 IPC 处理器**
   - 在 `windowHandlers.ts` 中实现窗口控制逻辑

7. **测试**
   - 测试按钮点击
   - 测试窗口拖拽
   - 测试状态更新

---

## 扩展阅读

### 相关文件

- `wallpaperbase/src/renderer/components/WindowHeader/` - 组件源码
- `wallpaperbase/src/main/ipcMain/channels/windowChannels.ts` - IPC 通道定义
- `wallpaperbase/src/main/ipcMain/handlers/windowHandlers.ts` - IPC 处理器实现

### 相关概念

- **Electron 进程模型**：主进程 vs 渲染进程
- **IPC 通信**：`ipcMain.on` vs `ipcMain.handle`
- **WebkitAppRegion**：Electron 特有的 CSS 属性
- **React Hooks**：`useState`、`useEffect`

---

## 总结

`WindowHeader` 组件是一个典型的**可复用组件**设计案例：

1. **封装性**：隐藏了 IPC 通信的复杂性
2. **灵活性**：支持自定义回调
3. **便利性**：提供默认行为，开箱即用
4. **可维护性**：代码结构清晰，易于扩展

通过学习这个组件，你可以掌握：
- React 组件开发
- Electron IPC 通信
- CSS-in-JS 样式管理
- 组件设计模式

希望这份文档对你有帮助！🎉
