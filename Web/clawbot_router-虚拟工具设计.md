### clawbot_router 虚拟工具设计说明（草案）

> 版本：v0.1（只设计，不落代码）  
> 目标：让主 LLM 能把 clawBot / OpenClaw 当成一个「远程多 Agent 工具」，和本地 tools 并列使用。

---

## 1. 整体设计概览

- **主 LLM 可调用的工具分两类：**
  - **本地系统工具**：`system_volume_control`、`start_app`、`open_website` 等（直接动本机）。
  - **远程大脑工具**：`clawbot_router`（通过 OpenClaw 调子 Agent，只返回文本/发消息，不直接动本机）。
- **安全边界：**
  - 本地系统工具 **只允许被主 LLM 调用**。
  - `clawBot / OpenClaw` 在本设计中是「**只看不碰本地**」的远程大脑：
    - 它可以看日志、查远端文档、调远程 SaaS / 消息通道；
    - 但 **不能直接或间接调用本地系统 tools**，只在远端世界里折腾（日志、SaaS、文档等）。
- **调用方式（底层实现）：**
  - V0 统一走 CLI + `spawn`：
    - `openclaw agent --to <phone> --message "<message>"`  
    - 或 `openclaw agent --agent <agent-name> --message "<message>"`  
  - 未来可以平滑切到 HTTP API，但对 `clawbot_router` 的声明和 LLM 使用方式保持不变。
- **工具形态：**
  - 在 LLM 眼里，`clawbot_router` 是一个 **一次性工具**：
    - 调用 → 等 OpenClaw 执行完 → 一次性返回一个 `content` 字符串（暂时「原样透传」 clawBot 的输出，方便开发观察）。
- **适用场景（使用策略）：**
  - **只有当本地 tools 能力明显达不到时才使用**，例如：
    - 「帮我总结最近的日志」
    - 「帮我分析一段复杂报错日志，给出排查步骤」
    - 「帮我梳理最近三天的告警记录，归纳 3 个主要问题」

---

## 2. 工具声明（对主 LLM 可见）

> 以下是面向 ChatAgent 的 **声明草案**，不是最终代码。

- **name**：`clawbot_router`
- **description（示意）**：

> 使用远程 clawBot / OpenClaw 多 Agent 能力处理复杂任务，例如日志分析、运维排查、跨系统信息整合。  
> 当本地 tools 无法完成任务（如「总结最近日志」「综合多天运维记录」）时，可以调用本工具。  
> 本工具只在远端环境工作，不会直接操作当前用户电脑。

- **parametersJson（最简版本草案）**：

```json
{
  "type": "object",
  "properties": {
    "agent": {
      "type": "string",
      "description": "要调用的远程 Agent 名称，缺省时使用默认主 Agent（例如 main）。例如：\"ops\"。"
    },
    "message": {
      "type": "string",
      "description": "要转交给 clawBot 的用户任务描述，自然语言，例如：\"把最近的运维日志总结成两条要点\"。"
    }
  },
  "required": ["message"]
}
```

- **设计说明：**
  - **`message`（必填）**：  
    - V0 直接用 LLM 生成的一句自然语言任务描述；  
    - 一般等于用户的原始问题，或者在此基础上略微重写（例如加上时间范围）。
  - **`agent`（可选）**：
    - 留给 LLM 或系统策略按需填写（如 `"ops"`）；  
    - 不填时，由 handler 选择默认 Agent（相当于现在的 main/phone 通路）；  
    - 先按字符串处理，实际可用的 Agent 由后端配置控制。

---

## 3. handler 行为（高层伪逻辑）

> 只描述行为，不写具体代码实现。

### 3.1 入参解析

- 从 `args.agent` 和 `args.message` 拿到目标 Agent 和任务文本。
- 若 `message` 为空：直接返回一条错误说明给 LLM（“没有任务描述”），不调用 OpenClaw。

### 3.2 面向用户的预告（由 LLM 负责说）

在工具描述 / 系统提示中写明：

> 当你决定调用 `clawbot_router` 时，请先用自然语言对用户说一句：  
> **“我正在通过 clawBot 处理复杂任务，可能需要几秒钟。”**  
> 等工具结果返回后，再给出最终答案。

handler 本身不负责说话，只负责返回结果；  
**“先提示再调用”** 由提示词规范约束主 LLM 的行为。

### 3.3 调用 OpenClaw CLI

- 根据是否填写 `agent` 字段选择命令形态：
  - 有 `agent`：  
    `openclaw agent --agent <agent> --message "<message>"`
  - 无 `agent`：  
    `openclaw agent --to <默认 phone> --message "<message>"`
- 使用现有 `spawn` / WSL 方式执行（与当前 clawBot 通路一致）。

### 3.4 收集并透传输出

- 在 V0 中，**不做清洗**：
  - 将 stdout / stderr 按时间顺序拼接成一段文本 `rawOutput`；
  - 例如可能包含：
    - `FunctionCallBegin` / `FunctionCallEnd`
    - 工具 JSON（`{"name":"memory_search", ...}`）  
    - 以及 clawBot 的自然语言说明等。
- 最终组合为工具返回值：

```ts
{
  content: rawOutput,      // 原样透传，便于开发和调试观察
  directTTS: false,
  interruptMode: 2
}
```

后续若需要给用户更干净的输出，可以在 V1 之后在 handler 内增加“输出清洗/解析层”，再返回给 LLM。

### 3.5 错误与超时处理

为避免阻塞主流程，`clawbot_router` 必须：

- **永远不会无限阻塞**：  
  - 在内部设置一个调用上限（如 30–60 秒，可配置）；  
  - 超时后主动终止子进程。
- **无论成功还是失败，都返回一个明确的 `content`**，而不是抛异常。

建议处理策略（V0）：

1. **命令级错误（spawn 失败）**
   - 立即结束，返回例如：
   - `"[clawbot_router] 无法启动远程 Agent（openclaw CLI 启动失败：<err>）。"`

2. **执行超时**
   - 达到超时时间：
     - 杀掉子进程；
     - 在 `rawOutput` 末尾追加一行：
       - `"[clawbot_router] 远程 clawBot 处理超时（超过 N 秒未完成），本次结果已中止。"`
     - 将这段文本作为 `content` 返回。

3. **OpenClaw 内部报错**
   - 例如 `memory read failed` / `browser failed` / `Unknown channel` 等：
     - 在 V0 中全部保留在 `rawOutput` 里原样返回；
     - 由上层 LLM 把这些错误翻译成「对用户可读」的说明。

---

## 4. LLM 使用指引（策略草案）

> 这部分通过 system prompt / tool description 传递给主 LLM。

### 4.1 何时应调用 `clawbot_router`

- 当用户任务涉及：
  - **跨多天/多文件的日志总结**：  
    - 例：「帮我总结最近的日志」「看下最近几天错误日志的共性」。
  - **复杂运维/告警分析**：  
    - 例：「根据最近告警帮我归纳三条主要风险」。
  - **需要远程系统信息、SaaS 服务数据，而本地 tools 没有对应能力**。

### 4.2 何时不应调用

- 普通问答、解释概念、写代码等 LLM 自己就能完成的任务；
- 只需要本机操作即可完成的任务（打开应用、调音量、打开网站等），这类应优先使用本地系统工具。

### 4.3 建议调用流程

1. 先判断是否可以通过本地 tools 完成任务。若可以，优先本地工具。  
2. 若本地 tools 不足以完成（如需要「总结最近日志」），则：
   - 先对用户说明：  
     - 「**我正在通过 clawBot 处理复杂任务，可能需要几秒钟。**」
   - 然后调用 `clawbot_router`，传入合适的 `agent`（如 `"ops"`）和 `message`。
   - 等工具返回 `content` 后：
     - 阅读其中的自然语言结果和错误信息；
     - 用用户能理解的语言进行总结和回答。

---

## 5. 未来可迭代方向（预留）

> 不在 V0 开发范围，仅作为后续演进点记录。

- **输出清洗与结构化结果**
  - 在 handler 内增加一层解析逻辑：
    - 提取最终自然语言回答；
    - 总结关键工具调用（如执行了 `memory_search` / `browser` 等）；
  - 向 LLM 返回更干净、更结构化的结果。

- **参数扩展**
  - `timeoutSeconds`：允许调用方指定本次任务的最长可等待时间；
  - `mode`：只读分析 / 允许对远端环境执行写操作（如发送告警消息）。

- **HTTP 通道支持**
  - 在不改 `clawbot_router` 声明的前提下，将底层实现从 CLI + spawn 平滑迁移到 HTTP API：
    - 降低延迟；
    - 更容易获取结构化的工具调用结果；
    - 提高错误处理的一致性。

