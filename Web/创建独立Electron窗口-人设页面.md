# 创建独立 Electron 窗口 - 人设页面完整教程

## 📋 概述

本教程详细记录如何从零开始创建一个独立的 Electron 窗口页面（以"创建人设"功能为例）。整个过程分为三个主要步骤，每一步都有明确的文件修改和代码实现。

---

## 🎯 目标

在系统控制面板中添加一个"创建人设"按钮，点击后能够打开一个独立的 Electron 窗口，显示 `Windows/CreateCharacter` 目录下的 React 组件。

---

## 📚 前置知识

在开始之前，需要了解 Electron 的基本架构：

1. **主进程（Main Process）**：负责创建和管理窗口
   - 文件位置：`src/main/`
   - 关键文件：`Windows/createWindows.ts`、`ipcMain/handlers/windowHandlers.ts`

2. **渲染进程（Renderer Process）**：负责显示 UI
   - 文件位置：`src/renderer/`
   - 关键文件：`Pages/Home/SystemControl/index.tsx`

3. **IPC 通信（Inter-Process Communication）**：主进程和渲染进程之间的通信桥梁
   - 通道定义：`src/main/ipcMain/channels/windowChannels.ts`
   - 统一导出：`src/main/ipcMain/ipcChannels.ts`

---

## 🚀 第一步：添加按钮和回调函数（渲染进程）

### 目标
在系统控制面板中添加"创建人设"按钮，并实现点击回调函数。

### 操作文件
**文件路径：** `src/renderer/Pages/Home/SystemControl/index.tsx`

### 具体修改

#### 1.1 添加回调函数

在文件中添加 `openCreateCharacterWindow` 函数（约第 183-215 行）：

```typescript
// 创建人设按钮 回调函数
const openCreateCharacterWindow = async () => {
  try {
    const result = await ipcEvent.invoke(
      IPCChannels.CREATE_CREATE_CHARACTER_WINDOW,
    );
    if (result?.success) {
      const newLogMessage: LogMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: '创建人设窗口创建成功',
        type: 'SUCCESS',
        timestamp: new Date().toLocaleString('zh-CN'),
      };
      onAddLogMessage(newLogMessage);
    } else {
      const newLogMessage: LogMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: `创建人设窗口创建失败: ${result?.error || '未返回success'}`,
        type: 'ERROR',
        timestamp: new Date().toLocaleString('zh-CN'),
      };
      onAddLogMessage(newLogMessage);
    }
  } catch (error) {
    const newLogMessage: LogMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: `创建创建人设窗口时发生错误: ${(error as Error).message}`,
      type: 'ERROR',
      timestamp: new Date().toLocaleString('zh-CN'),
    };
    onAddLogMessage(newLogMessage);
  }
};
```

**代码说明：**
- `ipcEvent.invoke()`：通过 IPC 向主进程发送请求
- `IPCChannels.CREATE_CREATE_CHARACTER_WINDOW`：IPC 通道名称（第二步会定义）
- `result.success`：主进程返回的操作结果
- `onAddLogMessage()`：将操作结果记录到日志中

#### 1.2 添加按钮 UI

在 JSX 返回部分添加按钮（约第 223-229 行，在"打开下载器窗口"按钮之后）：

```tsx
<button
  type="button"
  className="create-character-btn"
  onClick={openCreateCharacterWindow}
>
  创建人设
</button>
```

**代码说明：**
- `onClick={openCreateCharacterWindow}`：绑定点击事件到回调函数
- `className="create-character-btn"`：CSS 类名，用于样式定制

### 第一步完成检查清单
- ✅ 回调函数已添加
- ✅ 按钮 UI 已添加
- ✅ 错误处理已实现
- ✅ 日志记录已实现

---

## 🔌 第二步：定义 IPC 通道和注册处理器（主进程）

### 目标
定义 IPC 通信通道，并在主进程中注册处理器，接收渲染进程的窗口创建请求。

### 操作文件 1：定义 IPC 通道
**文件路径：** `src/main/ipcMain/channels/windowChannels.ts`

### 具体修改

在 `WindowChannels` 枚举中添加新的通道定义（约第 22-23 行）：

```typescript
/** 创建人设窗口（CreateCharacter） */
CREATE_CREATE_CHARACTER_WINDOW = 'create-createcharacter-window',
```

**代码说明：**
- `WindowChannels`：窗口相关的 IPC 通道枚举
- `CREATE_CREATE_CHARACTER_WINDOW`：通道常量名（使用大写下划线命名）
- `'create-createcharacter-window'`：通道字符串值（使用小写连字符命名）

**为什么这样命名？**
- 遵循项目现有的命名规范（参考 `CREATE_OFFICIAL_WALLPAPER_WINDOW`）
- 通道值会被自动合并到 `IPCChannels` 对象中，供全局使用

### 操作文件 2：注册 IPC 处理器
**文件路径：** `src/main/ipcMain/handlers/windowHandlers.ts`

### 具体修改

#### 2.1 导入窗口创建函数（在文件顶部，约第 8-21 行）

在导入语句中添加 `createCreateCharacterWindow`：

```typescript
import {
  AlertDialogConfig,
  createAlertDialog,
  createCreationCenterWindow,
  createCreateCharacterWindow,  // ⬅️ 新增
  createFloatingBallWindow,
  createGenerateFaceWindow,
  createLiveWindow,
  createLoginWindow,
  createOfficialWallpaperWindow,
  createPreviewWindow,
  createSceneWindow,
  createUpdateUEWindow,
  createWallpaperInputWindow,
} from '../../Windows/createWindows';
```

**注意：** 此时 `createCreateCharacterWindow` 函数还不存在，会在第三步创建。

#### 2.2 注册 IPC 处理器（约第 810-824 行）

在 `registerWindowHandlers` 函数中添加处理器：

```typescript
// 创建人设窗口（CreateCharacter）
ipcMain.handle(IPCChannels.CREATE_CREATE_CHARACTER_WINDOW, async () => {
  try {
    console.log('正在创建人设窗口（CreateCharacter）...');
    createCreateCharacterWindow();  // ⬅️ 调用窗口创建函数（第三步实现）
    console.log('人设窗口创建成功');
    return { success: true };
  } catch (error) {
    console.error('创建人设窗口失败:', error);
    return {
      success: false,
      error: `创建人设窗口时发生错误: ${(error as Error).message}`,
    };
  }
});
```

**代码说明：**
- `ipcMain.handle()`：注册 IPC 处理器，监听来自渲染进程的请求
- `IPCChannels.CREATE_CREATE_CHARACTER_WINDOW`：要监听的通道名称
- `async () => {...}`：异步处理函数
- `return { success: true }`：返回操作结果给渲染进程

### 第二步完成检查清单
- ✅ IPC 通道已定义
- ✅ IPC 处理器已注册
- ✅ 错误处理已实现
- ✅ 日志输出已添加

---

## 🪟 第三步：实现窗口创建函数（主进程）

### 目标
在主进程中实现实际的窗口创建逻辑，包括窗口配置、HTML 加载、窗口管理等。

### 操作文件 1：添加窗口名称常量
**文件路径：** `src/renderer/utils/constance.ts`

### 具体修改

在 `WindowName` 枚举中添加新窗口名称（约第 9 行之后）：

```typescript
export enum WindowName {
  MAIN = 'Main_Window',
  LOGIN = 'Login_Window',
  VIDEO = 'Video_Window',
  LIVE = 'Live_Window',
  GENERATE_FACE = 'GenerateFace_Window',
  WALLPAPER_INPUT = 'WallpaperInput_Window',
  FLOATING_BALL = 'FloatingBall_Window',
  OFFICIAL_WALLPAPER = 'OfficialWallpaper_Window',
  CREATE_CHARACTER = 'CreateCharacter_Window',  // ⬅️ 新增
  CREATE_SCENE = 'CreateScene_Window',
  PREVIEW = 'Preview_Window',
  CREATION_CENTER = 'CreationCenter_Window',
  UPDATE_UE = 'UpdateUE_Window',
}
```

**代码说明：**
- `WindowName`：窗口名称枚举，用于窗口池管理
- `CREATE_CHARACTER`：窗口的唯一标识符
- 窗口池（windowPool）使用这个名称来存储和检索窗口实例

### 操作文件 2：配置 Webpack 多窗口入口
**文件路径：** `.erb/configs/webpack.config.common.ts`

### 具体修改

在 `windowConfigs` 数组中添加新窗口配置（约第 164 行之后）：

```typescript
{
  name: 'createcharacter',
  entryPath: path.join(
    webpackPaths.srcRendererPath,
    'Windows/CreateCharacter/index.tsx',
  ),
  templatePath: path.join(
    webpackPaths.srcRendererPath,
    'Windows/CreateCharacter/index.ejs',
  ),
  filename: 'createcharacter.html',
},
```

**代码说明：**
- `name: 'createcharacter'`：窗口的 webpack 入口名称
- `entryPath`：React 应用的入口文件路径
- `templatePath`：HTML 模板文件路径
- `filename`：编译后生成的 HTML 文件名

**为什么需要这一步？**
- Webpack 需要知道如何打包这个窗口的代码
- 编译后会生成 `createcharacter.html` 文件，供 Electron 加载

### 操作文件 3：实现窗口创建函数
**文件路径：** `src/main/Windows/createWindows.ts`

### 具体修改

在文件中添加 `createCreateCharacterWindow` 函数（约第 744 行之后，参考 `createOfficialWallpaperWindow` 的实现）：

```typescript
// 创建人设窗口（CreateCharacter）
export function createCreateCharacterWindow() {
  // 检查是否已存在创建人设窗口
  const existingWindow = windowPool.get(WindowName.CREATE_CHARACTER);
  if (existingWindow && !existingWindow.isDestroyed()) {
    console.log('创建人设窗口已存在，显示并返回现有窗口');
    existingWindow.show();
    existingWindow.focus();
    return existingWindow;
  }

  // 获取主显示器信息
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

  // 窗口尺寸 - 与官方壁纸管理器保持一致
  const windowWidth = 1200;
  const windowHeight = 800;

  // 计算居中位置
  const x = Math.floor((screenWidth - windowWidth) / 2);
  const y = Math.floor((screenHeight - windowHeight) / 2);

  const createCharacterWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false, // 禁用原生窗口框架
    transparent: true, // 透明以支持圆角
    resizable: true,
    alwaysOnTop: false,
    center: false,
    show: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    minWidth: 800,
    minHeight: 600,
    ...(process.platform === 'darwin' ? { cornerRadius: 8 } : {}),
    webPreferences: {
      preload: app.isPackaged
        ? join(__dirname, 'preload.js')
        : join(__dirname, '../../.erb/dll/preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  createCharacterWindow.loadURL(resolveHtmlPath('createcharacter.html'));

  windowPool.add(WindowName.CREATE_CHARACTER, createCharacterWindow);
  console.log('创建新的创建人设窗口');

  // 开发模式下打开开发者工具
  if (!app.isPackaged) {
    createCharacterWindow.webContents.once('did-finish-load', () => {
      createCharacterWindow.webContents.openDevTools({
        mode: 'detach',
        activate: true,
      });
    });
  }

  return createCharacterWindow;
}
```

**代码详细说明：**

1. **窗口存在性检查**
   ```typescript
   const existingWindow = windowPool.get(WindowName.CREATE_CHARACTER);
   if (existingWindow && !existingWindow.isDestroyed()) {
     // 如果窗口已存在，直接显示并聚焦
   }
   ```
   - 避免重复创建窗口
   - 如果窗口已存在，直接显示并聚焦

2. **窗口尺寸和位置计算**
   ```typescript
   const primaryDisplay = screen.getPrimaryDisplay();
   const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;
   const windowWidth = 1200;
   const windowHeight = 800;
   const x = Math.floor((screenWidth - windowWidth) / 2);
   const y = Math.floor((screenHeight - windowHeight) / 2);
   ```
   - 获取主显示器的工作区域尺寸
   - 计算窗口居中位置

3. **BrowserWindow 配置**
   ```typescript
   new BrowserWindow({
     width, height, x, y,  // 尺寸和位置
     frame: false,         // 无边框（自定义窗口样式）
     transparent: true,    // 透明背景
     resizable: true,     // 可调整大小
     // ... 其他配置
   })
   ```
   - `frame: false`：禁用系统默认窗口框架，使用自定义样式
   - `transparent: true`：透明背景，支持圆角等自定义样式
   - `webPreferences`：配置 Web 安全性和 Node.js 集成

4. **加载 HTML 页面**
   ```typescript
   createCharacterWindow.loadURL(resolveHtmlPath('createcharacter.html'));
   ```
   - `resolveHtmlPath()`：解析 HTML 文件路径（开发/生产环境不同）
   - `createcharacter.html`：由 webpack 编译生成的 HTML 文件

5. **窗口池管理**
   ```typescript
   windowPool.add(WindowName.CREATE_CHARACTER, createCharacterWindow);
   ```
   - 将窗口实例添加到窗口池，方便后续管理和检索

6. **开发者工具（开发模式）**
   ```typescript
   if (!app.isPackaged) {
     createCharacterWindow.webContents.once('did-finish-load', () => {
       createCharacterWindow.webContents.openDevTools({...});
     });
   }
   ```
   - 仅在开发模式下自动打开开发者工具
   - 方便调试和开发

### 第三步完成检查清单
- ✅ 窗口名称常量已添加
- ✅ Webpack 配置已添加
- ✅ 窗口创建函数已实现
- ✅ 窗口配置完整
- ✅ 窗口池管理已实现

---

## 📁 文件结构总结

完成后的关键文件结构：

```
wallpaperbase/
├── src/
│   ├── renderer/
│   │   ├── Pages/
│   │   │   └── Home/
│   │   │       └── SystemControl/
│   │   │           └── index.tsx          # 第一步：按钮和回调
│   │   ├── Windows/
│   │   │   └── CreateCharacter/           # 窗口内容（已存在）
│   │   │       ├── index.tsx
│   │   │       ├── index.ejs
│   │   │       └── App.tsx
│   │   └── utils/
│   │       └── constance.ts                # 第三步：窗口名称
│   │
│   └── main/
│       ├── ipcMain/
│       │   ├── channels/
│       │   │   └── windowChannels.ts      # 第二步：IPC 通道定义
│       │   ├── handlers/
│       │   │   └── windowHandlers.ts      # 第二步：IPC 处理器
│       │   └── ipcChannels.ts             # IPC 通道统一导出
│       └── Windows/
│           └── createWindows.ts           # 第三步：窗口创建函数
│
└── .erb/
    └── configs/
        └── webpack.config.common.ts       # 第三步：Webpack 配置
```

---

## 🔄 完整数据流

```
用户点击按钮
    ↓
[渲染进程] SystemControl/index.tsx
    ↓ openCreateCharacterWindow()
    ↓ ipcEvent.invoke(IPCChannels.CREATE_CREATE_CHARACTER_WINDOW)
    ↓
[IPC 通信] 跨进程通信
    ↓
[主进程] windowHandlers.ts
    ↓ ipcMain.handle() 接收请求
    ↓ createCreateCharacterWindow()
    ↓
[主进程] createWindows.ts
    ↓ new BrowserWindow({...})
    ↓ window.loadURL('createcharacter.html')
    ↓ windowPool.add(WindowName.CREATE_CHARACTER, window)
    ↓
[渲染进程] CreateCharacter/App.tsx
    ↓ React 组件渲染
    ↓
用户看到窗口
```

---

## ✅ 验证步骤

完成所有步骤后，按以下步骤验证：

1. **启动项目**
   ```bash
   npm start
   ```

2. **打开系统控制面板**
   - 在主界面找到"系统控制"或"窗口管理"区域

3. **点击"创建人设"按钮**
   - 应该能看到一个新的窗口弹出
   - 窗口标题应该是"创建人设 - WallpaperBase"
   - 窗口内容应该是 `CreateCharacter/App.tsx` 渲染的内容

4. **检查控制台日志**
   - 主进程控制台应该输出："正在创建人设窗口（CreateCharacter）..."
   - 然后输出："人设窗口创建成功"

5. **测试窗口功能**
   - 尝试调整窗口大小（应该可以）
   - 尝试最小化/最大化（应该可以）
   - 尝试关闭窗口（应该可以）

---

## 🐛 常见问题

### 问题 1：点击按钮没有反应
**可能原因：**
- IPC 通道名称不匹配
- IPC 处理器未正确注册

**解决方法：**
- 检查 `windowChannels.ts` 中的通道定义
- 检查 `windowHandlers.ts` 中的处理器注册
- 检查 `SystemControl/index.tsx` 中的通道名称

### 问题 2：窗口创建失败
**可能原因：**
- `createcharacter.html` 文件不存在
- Webpack 配置错误

**解决方法：**
- 检查 `webpack.config.common.ts` 中的配置
- 确认 `Windows/CreateCharacter/index.tsx` 和 `index.ejs` 文件存在
- 重新编译项目：`npm run build`

### 问题 3：窗口显示空白
**可能原因：**
- React 组件渲染错误
- HTML 模板配置错误

**解决方法：**
- 打开开发者工具查看错误信息
- 检查 `CreateCharacter/index.tsx` 中的代码
- 检查 `CreateCharacter/index.ejs` 中的 HTML 结构

---

## 📝 总结

创建独立 Electron 窗口的完整流程：

1. **第一步（渲染进程）**：添加按钮 UI 和回调函数，通过 IPC 向主进程发送请求
2. **第二步（主进程）**：定义 IPC 通道，注册处理器，接收渲染进程的请求
3. **第三步（主进程）**：实现窗口创建函数，配置窗口属性，加载 HTML 页面

**关键概念：**
- **IPC 通信**：连接渲染进程和主进程的桥梁
- **窗口池**：管理所有窗口实例的容器
- **Webpack 多入口**：为每个窗口单独打包代码

**命名规范：**
- IPC 通道：`CREATE_CREATE_CHARACTER_WINDOW`（大写下划线）
- 通道值：`'create-createcharacter-window'`（小写连字符）
- 窗口名称：`CREATE_CHARACTER`（大写下划线）
- Webpack 入口：`'createcharacter'`（小写）

---

## 🎓 扩展学习

完成基础功能后，可以进一步学习：

1. **窗口生命周期管理**
   - 窗口关闭事件处理
   - 窗口状态保存和恢复

2. **窗口间通信**
   - 主窗口和子窗口之间的消息传递
   - 窗口数据同步

3. **窗口样式定制**
   - 自定义窗口标题栏
   - 窗口动画效果

4. **性能优化**
   - 窗口懒加载
   - 窗口资源管理

---

**文档创建时间：** 2026.1.26
**适用项目：** wallpaperbase
**Electron 版本：** 最新稳定版
