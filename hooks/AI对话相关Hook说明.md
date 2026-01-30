# AI 对话相关 Hook 说明

本文档面向前端开发，说明项目中**与 AI 对话功能相关**的 React Hook：每个 Hook 的目的、使用场景、代码实现要点、如何接入使用，并附带示例，便于快速上手。

---

## 一、Hook 总览

| Hook | 所在路径 | 简要用途 |
|------|----------|----------|
| **useRTCChat** | `renderer/hooks/useRTCChat.ts` | RTC 语音/文字与 AI 对话：初始化、启停、发消息、字幕、热更新 |
| **useChatMode** | `renderer/hooks/useChatMode.ts` | 聊天模式（语音/文字）、麦克风、通话/录音状态与计时 |
| **useDobao** | `renderer/hooks/useDobao.ts` | 豆包 AI 对话：连接、发消息、音量/降噪/声纹等 |
| **useCozeToken** | `renderer/hooks/useCozeToken.ts` | 获取/刷新 Coze Token，供 Coze 相关 AI 能力鉴权 |
| **useAIConnectionState** | `renderer/hooks/useSystemStatus.ts` | 读取「AI 连接状态」，用于 UI 展示 |

---

## 二、useRTCChat

### 1. Hook 目的

封装 **RTC 语音/文字聊天** 的完整流程，包括：

- 与主进程/预加载通信，完成 RTC 会话的**初始化、启动、停止**
- **发送文本**给 AI、**热更新**（打断、改人设等）
- **静音、音量**控制
- **历史记录**、**实时字幕**的 state 与事件回调

适合：需要「语音/文字与 AI 对话」的页面或组件（如主界面对话区、输入框、字幕条）。

### 2. 使用场景

- 主界面「开始/结束对话」按钮
- 输入框发送文字、显示 AI 回复/历史
- 实时字幕展示（流式/最终）
- 静音、音量滑块
- 热更新：打断、改人设（通过 `updateBot`）

### 3. 代码实现要点

- **状态**：`isActive`（会话是否开启）、`isConnected`（是否已连接）、`history`、`currentSubtitle`、`error`
- **方法**：`initialize(config)`、`start()`、`stop()`、`sendText(message, mode?)`、`updateBot({ command, message, config })`、`mute(mute)`、`setVolume(volume)`、`refreshHistory()`、`clearError()`
- **入参**：`options` 可选，含 `config`、`autoStart`、`onConnected`、`onDisconnected`、`onError`、`onSubtitle`
- **底层**：通过 `rtcChatAPI`（主进程/预加载）与 RTC 会话通信；内部监听 `connected`、`disconnected`、`error`、`subtitle` 等事件并更新 state、触发回调

### 4. 如何使用

**（1）在组件中直接使用**

```tsx
import { useRTCChat } from '@hooks/useRTCChat';
import type { RTCChatConfig } from '@renderer/types/rtcChat';

function ChatPanel() {
  const {
    isActive,
    isConnected,
    history,
    currentSubtitle,
    error,
    initialize,
    start,
    stop,
    sendText,
    updateBot,
    mute,
    clearError,
  } = useRTCChat({
    autoStart: false,
    onConnected: () => console.log('已连接'),
    onDisconnected: () => console.log('已断开'),
    onError: (err) => console.error(err),
    onSubtitle: (sub) => console.log('字幕:', sub.text),
  });

  const handleStart = async () => {
    const config: RTCChatConfig = {
      rtcConfig: { appId: '...', roomId: '...', userId: '...' },
      serverConfig: { apiUrl: '...', authToken: '...' },
    };
    const ok = await initialize(config);
    if (ok) await start();
  };

  const handleSend = async () => {
    await sendText('你好', 2); // 2 为 InterruptMode.Medium
  };

  return (
    <div>
      <button onClick={handleStart} disabled={isActive}>开始对话</button>
      <button onClick={() => stop()}>结束对话</button>
      <button onClick={() => sendText('你好')}>发送</button>
      <p>当前字幕: {currentSubtitle?.text ?? '-'}</p>
      {error && <p>错误: {error.msg}</p>}
    </div>
  );
}
```

**（2）通过 RTCContext 使用（推荐）**

项目里通常不直接调 `useRTCChat`，而是用 **RTCContext**，由 Provider 内部调用 `useRTCChat`，子组件通过 `useRTC()` 拿到同一套状态和方法：

```tsx
import { useRTC } from '@contexts/RTCContext';

function SomeChild() {
  const { start, stop, sendText, isConnected, currentSubtitle } = useRTC();
  // 使用方式同上
}
```

**（3）热更新示例（打断、改人设）**

```tsx
// 打断 AI
await updateBot({ command: 'interrupt' });

// 热更新 LLM 配置（如人设）
await updateBot({
  command: 'UpdateParameters',
  config: { LLMConfig: { SystemMessages: ['你是简短回复的客服。'] } },
});
```

### 5. 注意事项

- 若传了 `options.config` 且 `options.autoStart === true`，会在挂载时自动 `initialize` + `start`
- 事件监听在 Hook 内部注册，卸载时会清理，避免重复注册
- `currentSubtitle` 为实时字幕，可能带 `isFinal`、`streamId`、`roundId` 等，按需用于 UI 或埋点

---

## 三、useChatMode

### 1. Hook 目的

管理 **聊天模式** 与 **通话/录音** 相关的**全局状态**，保证多个组件看到同一套「当前是语音还是文字、麦是否开、是否在通话/录音、通话/录音时长」等，并可与 UE/主进程同步（如通过 `sendChangeChatModeToUE`）。

### 2. 使用场景

- 顶部或侧边栏「语音 / 文字」切换
- 麦克风开关按钮、通话中/录音中状态展示
- 通话时长、录音时长显示
- 需要把当前模式通知给 UE 或其它模块时（调用 `sendChangeChatModeToUE`）

### 3. 代码实现要点

- **单例**：内部使用 `ChatModeManager` 单例，所有调用 `useChatMode()` 的组件共享同一份状态
- **状态**：`chatMode`（`'voice' | 'text'`）、`isMicEnabled`、`isCallMode`、`callStartTime`、`recordingStartTime`
- **方法**：`setChatMode`、`toggleChatMode`、`setMicEnabled`、`toggleMic`、`setCallMode`、`startCallTimer`、`endCallTimer`、`startRecordingTimer`、`endRecordingTimer`、`getCallDuration`、`getRecordingDuration`、`resetToDefault`
- **同步 UE**：项目内通过 `sendChangeChatModeToUE(mode, isMicOpen)` 把模式与麦状态发给主进程/UE

### 4. 如何使用

```tsx
import { useChatMode, sendChangeChatModeToUE } from '@hooks/useChatMode';

function ChatToolbar() {
  const {
    chatMode,
    isMicEnabled,
    isCallMode,
    toggleChatMode,
    toggleMic,
    startCallTimer,
    endCallTimer,
    getCallDuration,
  } = useChatMode();

  const handleToggleMode = () => {
    toggleChatMode();
    const mode = chatMode === 'voice' ? 'talkback' : 'typewrite';
    sendChangeChatModeToUE(mode, isMicEnabled);
  };

  const handleToggleMic = () => {
    toggleMic();
    sendChangeChatModeToUE(chatMode === 'voice' ? 'call' : 'typewrite', !isMicEnabled);
  };

  return (
    <div>
      <span>模式: {chatMode === 'voice' ? '语音' : '文字'}</span>
      <button onClick={handleToggleMode}>切换模式</button>
      <button onClick={handleToggleMic}>
        麦克风: {isMicEnabled ? '开' : '关'}
      </button>
      {isCallMode && <span>通话: {getCallDuration()}秒</span>}
      <button onClick={startCallTimer}>开始通话</button>
      <button onClick={endCallTimer}>结束通话</button>
    </div>
  );
}
```

### 5. 注意事项

- 必须在同一应用内使用；若多窗口各自渲染，每个窗口内仍是共享同一 ChatModeManager
- `sendChangeChatModeToUE` 为异步，如需在 UI 上等「已通知 UE」再更新，可在其 `Promise` 后处理
- 通话/录音计时依赖 `callStartTime` / `recordingStartTime`，需在适当时机调用 `startCallTimer` / `endCallTimer` 等

---

## 四、useDobao

### 1. Hook 目的

在组件中访问 **豆包（Dobao）AI 对话** 的 Context：连接/断开、发文字消息、音量/降噪/声纹、Bot 模式、场景切换、消息回调、相声模式控制等。所有豆包相关状态与操作都通过该 Hook 暴露。

### 2. 使用场景

- 豆包连接按钮（连接/断开）
- 文字输入框发送消息（`sendTextMessage`）
- 音量、降噪、声纹、Bot 模式等设置面板
- 场景/人设切换（`handleSceneSwitch`）
- 相声模式开始/暂停/恢复（`stopCrosstalkSpeech`、`pauseCrosstalkSpeech`、`resumeCrosstalkSpeech`）
- 消息列表、评论消息等需要收豆包消息的组件（`addMessageCallback`）

### 3. 代码实现要点

- **本质**：`useContext(DobaoContext)` 的封装，类型为 `DobaoContextType`
- **约束**：必须在 **DobaoProvider** 子树内使用，否则会抛错
- **常用字段**：`connect`、`disconnect`、`sendTextMessage`、`isConnected`、`client`、`handleVolumeChange`、`handleMicEnable`、`handleBotModeChange`、`botMode`、`handleSceneSwitch`、`addMessageCallback`、`removeMessageCallback`、`stopCrosstalkSpeech`、`applyWallpaperConfig` 等（详见 Context 类型定义）

### 4. 如何使用

**（1）确保被 Provider 包裹**

```tsx
// App 或根组件
import { DobaoProvider } from '@contexts/DobaoContext';

<DobaoProvider>
  <YourPage />
</DobaoProvider>
```

**（2）在子组件中使用**

```tsx
import { useDobao } from '@hooks/useDobao';

function DobaoPanel() {
  const {
    connect,
    disconnect,
    isConnected,
    sendTextMessage,
    handleSceneSwitch,
    botMode,
    addMessageCallback,
    removeMessageCallback,
  } = useDobao();

  useEffect(() => {
    const cb = (msg) => console.log('收到消息:', msg);
    addMessageCallback(cb);
    return () => removeMessageCallback(cb);
  }, []);

  return (
    <div>
      {!isConnected ? (
        <button onClick={() => connect()}>连接豆包</button>
      ) : (
        <>
          <button onClick={() => disconnect()}>断开</button>
          <input
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendTextMessage(e.currentTarget.value);
            }}
          />
          <button onClick={() => handleSceneSwitch('someBotMode', '角色名')}>
            切换场景
          </button>
        </>
      )}
    </div>
  );
}
```

### 5. 注意事项

- 未在 `DobaoProvider` 内使用会报错：`useDobao 必须在 DobaoProvider 内部使用`
- 豆包与 RTC 是两套对话能力，按产品需求选择：RTC 用 `useRTCChat`/RTCContext，豆包用 `useDobao`

---

## 五、useCozeToken

### 1. Hook 目的

在组件中**获取并持有 Coze Token**，用于调用依赖 Coze 鉴权的接口（如部分 AI 能力）。支持自动拉取、手动刷新、loading/error 状态。

### 2. 使用场景

- 调用 Coze 相关 API 前需要 Token 的页面或请求封装
- 展示「Token 获取中 / 失败」的 UI
- 设置页「重新获取 Token」按钮

### 3. 代码实现要点

- **状态**：`token`、`loading`、`error`
- **方法**：`refresh(forceRefresh?)`，内部调用 `cozeTokenManager.getToken(forceRefresh)`
- **入参**：`autoFetch`（默认 `true`），为 `true` 时在挂载时自动拉取一次 Token

### 4. 如何使用

```tsx
import { useCozeToken } from '@hooks/useCozeToken';

function CozeFeature() {
  const { token, loading, error, refresh } = useCozeToken(true);

  if (loading) return <div>正在获取 Token...</div>;
  if (error) return <div>Token 失败: {error} <button onClick={() => refresh(true)}>重试</button></div>;
  if (!token) return <div>未获取到 Token</div>;

  const callCozeAPI = async () => {
    const res = await fetch('/some-coze-api', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // ...
  };

  return (
    <div>
      <button onClick={callCozeAPI}>调用 Coze 能力</button>
      <button onClick={() => refresh(true)}>强制刷新 Token</button>
    </div>
  );
}
```

### 5. 注意事项

- Token 具体缓存与过期策略在 `CozeTokenManager` 中，Hook 只负责在组件内暴露「当前 token + 刷新」
- 若多个组件需要同一 Token，可在一个上层组件调 `useCozeToken`，再通过 props 或 Context 传给子组件

---

## 六、useAIConnectionState（来自 useSystemStatus）

### 1. Hook 目的

从 **SystemStatusContext** 中只取出「**AI 连接状态**」这一块，用于 UI 展示（如：已连接/未连接、最后更新时间），避免依赖整个 status 对象从而减少重渲染。

### 2. 使用场景

- 顶部栏或状态栏显示「AI 已连接 / 未连接」小图标或文案
- 根据连接状态禁用/启用某些按钮
- 调试时查看连接状态与更新时间

### 3. 代码实现要点

- **来源**：`useSystemStatus()` 返回的 `status.aiConnection`，若无则用默认 `{ state: 'disconnected', lastUpdated: Date.now() }`
- **返回值**：`{ state, lastUpdated }` 等（与 SystemStatus 中 aiConnection 结构一致），用 `useMemo` 按 `state`、`lastUpdated` 做依赖，减少不必要的引用变化

### 4. 如何使用

```tsx
import { useAIConnectionState } from '@hooks/useSystemStatus';

function AIStatusBadge() {
  const aiConnection = useAIConnectionState();
  const isConnected = aiConnection?.state === 'connected';

  return (
    <span>
      AI: {isConnected ? '已连接' : '未连接'}
      {aiConnection?.lastUpdated && (
        <small> @ {new Date(aiConnection.lastUpdated).toLocaleTimeString()}</small>
      )}
    </span>
  );
}
```

### 5. 注意事项

- 必须在 **SystemStatusProvider** 内部使用，否则 `useSystemStatus()` 会抛错
- `state` 的具体取值（如 `'connected'`、`'disconnected'`）以项目内 SystemStatus 的约定为准

---

## 七、如何选择 Hook（简要对照）

| 需求 | 推荐 Hook |
|------|-----------|
| 语音/文字与 RTC AI 对话、发消息、看字幕、热更新 | **useRTCChat** 或通过 **RTCContext** 的 **useRTC** |
| 语音/文字切换、麦克风、通话/录音状态与计时 | **useChatMode**（+ `sendChangeChatModeToUE` 需同步 UE 时） |
| 豆包连接、发消息、场景/人设切换、相声模式 | **useDobao**（需在 DobaoProvider 内） |
| 调用 Coze 相关 API 需要 Token | **useCozeToken** |
| 只展示「AI 是否连接」 | **useAIConnectionState** |

---

## 八、路径与引用方式说明

- 文档中 `@hooks/xxx`、`@contexts/xxx` 等为项目内路径别名，实际对应：
  - hooks：`src/renderer/hooks/`
  - contexts：`src/renderer/contexts/`
- 若你项目别名不同，请把 `@hooks`、`@contexts` 等替换成你自己的别名或相对路径。

以上内容覆盖了与 **AI 对话** 相关的几个核心 Hook，按「目的 → 场景 → 实现要点 → 用法 → 注意」组织，便于前端同学快速接入和排查问题。
