/**
 * useRTCChat Hook
 * 封装 RTC 聊天功能的 React Hook
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { rtcChatAPI } from '../api/rtcChat';
import type {
  ChatMessage,
  ErrorData,
  InterruptMode,
  RTCChatConfig,
  SubtitleData,
} from '../types/rtcChat';
import { WindowName } from '../utils/constance';
import ipcEvent from '../utils/ipcRender';

interface UseRTCChatOptions {
  /** 自动初始化配置 */
  config?: RTCChatConfig;
  /** 自动启动会话 */
  autoStart?: boolean;
  /** 错误回调 */
  onError?: (error: ErrorData) => void;
  /** 连接成功回调 */
  onConnected?: () => void;
  /** 断开连接回调 */
  onDisconnected?: () => void;
  /** 字幕更新回调 */
  onSubtitle?: (subtitle: SubtitleData) => void;
}

interface UseRTCChatReturn {
  // 状态
  isActive: boolean;
  isConnected: boolean;
  history: ChatMessage[];
  currentSubtitle: SubtitleData | null;
  error: ErrorData | null;

  // 操作方法
  initialize: (config: RTCChatConfig) => Promise<boolean>;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  sendText: (message: string, mode?: InterruptMode) => Promise<boolean>;
  updateBot: (options: {
    command?: string;
    message?: string;
    interruptMode?: InterruptMode;
    config?: any;
  }) => Promise<boolean>;
  mute: (mute: boolean) => Promise<boolean>;
  setVolume: (volume: number) => Promise<boolean>;
  refreshHistory: () => Promise<void>;
  clearError: () => void;
}

/**
 * RTC 聊天 Hook
 */
export const useRTCChat = (options?: UseRTCChatOptions): UseRTCChatReturn => {
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleData | null>(
    null,
  );
  const [error, setError] = useState<ErrorData | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * 初始化配置
   */
  const initialize = useCallback(
    async (config: RTCChatConfig): Promise<boolean> => {
      try {
        const result = await rtcChatAPI.initialize(config);
        if (!result.success) {
          const errorData = {
            code: -1,
            msg: result.error || '初始化失败',
          };
          setError(errorData);
          optionsRef.current?.onError?.(errorData);
          return false;
        }
        return true;
      } catch (err: any) {
        const errorData = {
          code: -1,
          msg: err.message || '初始化异常',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
    },
    [],
  );

  /**
   * 启动会话
   */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const result = await rtcChatAPI.start();
      if (!result.success) {
        const errorData = {
          code: -1,
          msg: result.error || '启动失败',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
      setIsActive(true);
      return true;
    } catch (err: any) {
      const errorData = {
        code: -1,
        msg: err.message || '启动异常',
      };
      setError(errorData);
      optionsRef.current?.onError?.(errorData);
      return false;
    }
  }, []);

  /**
   * 停止会话
   */
  const stop = useCallback(async (): Promise<boolean> => {
    try {
      const result = await rtcChatAPI.stop();
      if (!result.success) {
        const errorData = {
          code: -1,
          msg: result.error || '停止失败',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
      setIsActive(false);
      setIsConnected(false);
      return true;
    } catch (err: any) {
      const errorData = {
        code: -1,
        msg: err.message || '停止异常',
      };
      setError(errorData);
      optionsRef.current?.onError?.(errorData);
      return false;
    }
  }, []);

  /**
   * 发送文本消息
   */
  const sendText = useCallback(
    async (message: string, mode?: InterruptMode): Promise<boolean> => {
      try {
        const result = await rtcChatAPI.sendText(message, mode);
        if (!result.success) {
          const errorData = {
            code: -1,
            msg: result.error || '发送失败',
          };
          setError(errorData);
          optionsRef.current?.onError?.(errorData);
          return false;
        }
        return true;
      } catch (err: any) {
        const errorData = {
          code: -1,
          msg: err.message || '发送异常',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
    },
    [],
  );

  /**
   * 更新 Bot
   */
  const updateBot = useCallback(
    async (options: {
      command?: string;
      message?: string;
      interruptMode?: InterruptMode;
      config?: any;
    }): Promise<boolean> => {
      try {
        const result = await rtcChatAPI.updateBot(options);
        if (!result.success) {
          const errorData = {
            code: -1,
            msg: result.error || '更新 Bot 失败',
          };
          setError(errorData);
          optionsRef.current?.onError?.(errorData);
          return false;
        }
        return true;
      } catch (err: any) {
        const errorData = {
          code: -1,
          msg: err.message || '更新 Bot 异常',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
    },
    [],
  );

  /**
   * 静音/取消静音
   */
  const mute = useCallback(async (mute: boolean): Promise<boolean> => {
    try {
      const result = await rtcChatAPI.mute(mute);
      if (!result.success) {
        const errorData = {
          code: -1,
          msg: result.error || '静音操作失败',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
      return true;
    } catch (err: any) {
      const errorData = {
        code: -1,
        msg: err.message || '静音操作异常',
      };
      setError(errorData);
      optionsRef.current?.onError?.(errorData);
      return false;
    }
  }, []);

  /**
   * 设置音量
   */
  const setVolume = useCallback(async (volume: number): Promise<boolean> => {
    try {
      const result = await rtcChatAPI.setVolume(volume);
      if (!result.success) {
        const errorData = {
          code: -1,
          msg: result.error || '设置音量失败',
        };
        setError(errorData);
        optionsRef.current?.onError?.(errorData);
        return false;
      }
      return true;
    } catch (err: any) {
      const errorData = {
        code: -1,
        msg: err.message || '设置音量异常',
      };
      setError(errorData);
      optionsRef.current?.onError?.(errorData);
      return false;
    }
  }, []);

  /**
   * 刷新历史记录
   */
  const refreshHistory = useCallback(async (): Promise<void> => {
    try {
      const result = await rtcChatAPI.getHistory();
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (err: any) {
      console.error('[useRTCChat] 刷新历史失败:', err);
    }
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 创建稳定的回调函数引用（用于清理）
  const handleConnected = () => {
    setIsConnected(true);
    optionsRef.current?.onConnected?.();
  };

  const handleDisconnected = () => {
    setIsConnected(false);
    setIsActive(false);
    optionsRef.current?.onDisconnected?.();
  };

  const handleError = (...args: any[]) => {
    // 第一个参数是 event，第二个是 data
    const data = args[1] || args[0];
    setError(data);
    optionsRef.current?.onError?.(data);
  };

  const handleSubtitle = (...args: any[]) => {
    console.log('[useRTCChat] 📡 字幕事件参数:', {
      argsLength: args.length,
      arg0: args[0],
      arg1: args[1],
      arg0Type: typeof args[0],
      arg1Type: typeof args[1],
    });

    // 第一个参数是 event，第二个是 data
    const rawData = args[1] || args[0];
    console.log('[useRTCChat] 收到字幕数据:', rawData);
    // 🔄 映射 RTC SDK 的字段格式为标准格式
    // 现在包含消息流信息：streamId, isStreamStart, roundId
    const normalizedData: SubtitleData = {
      uid: rawData?.uid || rawData?.userId || '',
      text: rawData?.text || '',
      isFinal: rawData?.isFinal !== undefined ? rawData.isFinal : rawData?.definite === true,
      streamId: rawData?.streamId,
      isStreamStart: rawData?.isStreamStart,
      roundId: rawData?.roundId,
      timestamp: rawData?.timestamp || Date.now(),
    };

    console.log('[useRTCChat] 字幕数据映射:', {
      原始: {
        definite: rawData?.definite,
        isFinal: rawData?.isFinal,
        streamId: rawData?.streamId,
        isStreamStart: rawData?.isStreamStart,
        roundId: rawData?.roundId,
      },
      标准: {
        isFinal: normalizedData.isFinal,
        streamId: normalizedData.streamId,
        isStreamStart: normalizedData.isStreamStart,
        roundId: normalizedData.roundId,
      },
      文本: normalizedData.text.substring(0, 50),
      完整数据: rawData,
    });

    setCurrentSubtitle(normalizedData);

    // 🎙️ 触发外部的 onSubtitle 回调（传递标准化后的数据）
    // 这会通过RTCContext触发rtc-subtitle-update事件，被UETextMessageListener接收处理
    if (normalizedData.text) {
      console.log('[useRTCChat] 触发RTC字幕事件:', {
        text: normalizedData.text.substring(0, 50),
        streamId: normalizedData.streamId,
        isStreamStart: normalizedData.isStreamStart,
        isFinal: normalizedData.isFinal,
        roundId: normalizedData.roundId,
      });
      optionsRef.current?.onSubtitle?.(normalizedData);
    }

    // 字幕消息会自动添加到历史中，这里可以选择刷新
    // 注意：这里调用 refreshHistory 会导致依赖变化，可能引起重复调用
    // refreshHistory();
  };

  const handleUserJoined = (...args: any[]) => {
    const data = args[1] || args[0];
    // 用户加入事件处理
  };

  const handleUserLeft = (...args: any[]) => {
    const data = args[1] || args[0];
    // 用户离开事件处理
  };

  // 监听事件 - 使用 useRef 确保在整个生命周期内只注册一次
  const isListenersRegisteredRef = useRef(false);

  useEffect(() => {
    // 🔒 防止重复注册
    if (isListenersRegisteredRef.current) {
      console.warn('[useRTCChat] 事件监听器已注册，跳过重复注册');
      return;
    }

    console.log('[useRTCChat] 📡 注册事件监听器...');

    // 注册事件监听
    rtcChatAPI.on.connected(handleConnected);
    rtcChatAPI.on.disconnected(handleDisconnected);
    rtcChatAPI.on.error(handleError);
    rtcChatAPI.on.subtitle(handleSubtitle);
    rtcChatAPI.on.userJoined(handleUserJoined);
    rtcChatAPI.on.userLeft(handleUserLeft);

    isListenersRegisteredRef.current = true;
    console.log('[useRTCChat] ✅ 事件监听器注册完成');

    // 清理监听器（传入相同的回调函数引用）
    return () => {
      console.log('[useRTCChat] 🧹 清理事件监听器...');
      rtcChatAPI.off.connected(handleConnected);
      rtcChatAPI.off.disconnected(handleDisconnected);
      rtcChatAPI.off.error(handleError);
      rtcChatAPI.off.subtitle(handleSubtitle);
      rtcChatAPI.off.userJoined(handleUserJoined);
      rtcChatAPI.off.userLeft(handleUserLeft);
      isListenersRegisteredRef.current = false;
      console.log('[useRTCChat] ✅ 事件监听器已清理');
    };
  }, []);

  // 自动初始化和启动
  useEffect(() => {
    const init = async () => {
      if (options?.config) {
        const success = await initialize(options.config);
        if (success && options.autoStart) {
          await start();
        }
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时运行一次

  return {
    // 状态
    isActive,
    isConnected,
    history,
    currentSubtitle,
    error,

    // 方法
    initialize,
    start,
    stop,
    sendText,
    updateBot,
    mute,
    setVolume,
    refreshHistory,
    clearError,
  };
};
