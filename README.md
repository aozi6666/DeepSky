# DeepSpace-WallPaper

<div align="center">

一个功能强大的动态壁纸桌面应用程序，支持实时对话、人脸美化等创新功能。

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-35.0.2-47848F.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg)](https://www.typescriptlang.org/)

</div>

## ✨ 功能特性

- 🎨 **动态壁纸管理** - 支持设置动态壁纸，让您的桌面更加生动
- 🗣️ **实时语音对话** - 集成 Volcengine 实时语音服务，支持语音交互
- 💅 **人脸美化** - 内置人脸美化功能，实时优化视频画面
- 🖥️ **桌面嵌入** - 将窗口嵌入到桌面层，实现真正的动态壁纸效果
- 📥 **下载管理** - 完善的下载管理系统
- 🔄 **自动更新** - 支持应用自动更新
- 🎯 **系统托盘** - 便捷的系统托盘控制
- 🌐 **WebSocket 通信** - 内置 WebSocket 服务器，支持进程间通信

## 🛠️ 技术栈

- **框架**: Electron 35.0.2
- **前端**: React 19.0.0 + TypeScript 5.8.2
- **UI 组件**: Ant Design 5.26.7 + Ant Design X
- **状态管理**: Valtio 2.1.5
- **路由**: React Router 7.3.0
- **构建工具**: Webpack 5
- **FFI**: Koffi 2.12.3 (用于原生 DLL 调用)
- **样式**: SASS + CSS Modules

## 📦 安装

### 前置要求

- Node.js >= 22.x
- npm >= 7.x

### 克隆项目

```bash
git clone https://github.com/aozi6666/DeepSky.git
cd DeepSky
```

### 安装依赖

```bash
npm install
```

## 🚀 开发

启动开发环境：

```bash
npm start
```

应用将在开发模式下启动，支持热重载。

### 其他开发命令

```bash
# 构建主进程
npm run build:main

# 构建渲染进程
npm run build:renderer

# 构建完整应用
npm run build

# 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 运行测试
npm test
```

## 📦 打包

打包当前平台的应用程序：

```bash
npm run package
```

打包后的文件将输出到 `release/build` 目录。

### 构建配置

- **Windows**: 生成 NSIS 安装程序
- **macOS**: 支持 x64 和 arm64 架构
- **Linux**: 生成 AppImage

## 📁 项目结构

```
WallpaperBase/
├── assets/              # 资源文件（图标、图片等）
├── resources/           # 原生资源（DLL、动态库等）
│   ├── lib/            # 原生库文件
│   └── faceBeauty/     # 人脸美化相关资源
├── src/
│   ├── main/           # 主进程代码
│   │   ├── DesktopEmbedderManager/   # 桌面嵌入管理
│   │   ├── DownloadManager/          # 下载管理
│   │   ├── RealtimeDialogTS/         # 实时对话服务
│   │   ├── StoreManager/             # 数据存储管理
│   │   ├── TrayManager/              # 系统托盘管理
│   │   ├── WebSocket/                # WebSocket 服务
│   │   ├── Windows/                  # 窗口管理
│   │   ├── koffi/                    # 原生 DLL 调用
│   │   └── ipcMain/                  # IPC 通信处理
│   └── renderer/       # 渲染进程代码
│       ├── Pages/      # 页面组件
│       ├── components/ # UI 组件
│       ├── contexts/   # React Context
│       ├── hooks/      # 自定义 Hooks
│       ├── api/        # API 接口
│       └── utils/      # 工具函数
├── realtime-dialog-nodejs/  # Node.js 实时对话客户端
├── realtime_dialog/         # Python 实时对话客户端
└── release/                 # 构建输出目录
```

## 🔧 核心功能说明

### 桌面嵌入

通过原生 API 调用，将应用窗口嵌入到桌面层，实现真正的动态壁纸效果。支持 Windows 和 macOS 平台。

### 实时语音对话

集成 Volcengine 实时语音服务，支持：

- 麦克风音频输入
- 实时语音识别
- 语音合成与播放
- 音频文件处理

### 人脸美化

使用 GPU 加速的人脸美化引擎，提供实时美颜效果。

### WebSocket 服务

内置 WebSocket 服务器，支持：

- 多客户端连接
- 命令分发
- 消息广播
- 自定义协议

## ⚙️ 配置

应用配置使用 `electron-store` 进行持久化存储。主要配置包括：

- 用户配置：`StoreManager/userConfig.ts`
- Coze Token 配置：`StoreManager/cozeTokenConfig.ts`

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT](LICENSE) © DeepSpace-WallPaper

## 🔗 相关链接

- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://reactjs.org/docs)
- [Ant Design 文档](https://ant.design/)

## 📮 联系方式

如有问题或建议，请提交 [Issue](https://github.com/your-repo/WallpaperBase/issues)。

---

<div align="center">
    ❤️ ❤️ ❤️ ❤️ ❤️ ❤️ ❤️ ❤️ 
</div>
