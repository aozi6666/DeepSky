/**
 * 场景管理器
 * 负责 UE 场景的切换和状态管理
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { IPCChannels } from '../../../main/ipcMain/ipcChannels';
import { handleSceneSwitch } from '../../contexts/SystemStatusContext/sceneHandler';
import ipcEvent from '../../utils/ipcRender';
import { WallpaperDetail } from './types';

// ==================== 全局场景状态管理器 ====================

class SceneStatusManager {
  private static instance: SceneStatusManager;

  private listeners: Set<() => void> = new Set();

  private initialized: boolean = false;

  public currentScene: string = '';

  public lastUpdated: number = Date.now();

  private constructor() {
    // 初始化时自动同步主进程状态
    this.initSync();
  }

  static getInstance(): SceneStatusManager {
    if (!SceneStatusManager.instance) {
      SceneStatusManager.instance = new SceneStatusManager();
    }
    return SceneStatusManager.instance;
  }

  /**
   * 初始化：监听主进程的场景变化事件
   */
  private initSync() {
    if (this.initialized) return;
    this.initialized = true;

    console.log('[SceneStatusManager] 初始化场景状态同步');

    // 监听场景切换成功事件
    ipcEvent.on(IPCChannels.UE_SCENE_CHANGED, (...args: unknown[]) => {
      const data = args[0] as {
        scene: string;
        confirmed: boolean;
        data?: any;
        timestamp: number;
      };
      console.log('[SceneStatusManager] 收到主进程场景变化:', data);

      // 只有确认的场景才更新本地状态
      if (data.confirmed) {
        this.currentScene = data.scene;
        this.lastUpdated = data.timestamp;
        this.notifyListeners();
        console.log(
          `✅ [SceneStatusManager] 场景已同步: ${data.scene} (已确认)`,
        );
      } else {
        // 乐观更新（可选）
        console.log(
          `🔄 [SceneStatusManager] 场景乐观更新: ${data.scene} (待确认)`,
        );
      }
    });

    // 监听场景切换失败事件
    ipcEvent.on(IPCChannels.UE_SCENE_CHANGE_FAILED, (...args: unknown[]) => {
      const data = args[0] as {
        failedScene: string;
        currentScene: string | null;
        error: string;
      };
      console.warn('[SceneStatusManager] 场景切换失败，回滚:', data);

      // 回滚到主进程确认的场景
      this.currentScene = data.currentScene || '';
      this.lastUpdated = Date.now();
      this.notifyListeners();

      // 显示错误提示
      message.error(`场景切换失败: ${data.error}`);

      console.log(`⚠️ [SceneStatusManager] 场景已回滚: ${data.currentScene}`);
    });

    // 启动时同步主进程状态
    this.syncFromMainProcess();
  }

  /**
   * 从主进程同步当前场景
   */
  private async syncFromMainProcess() {
    try {
      console.log('[SceneStatusManager] 从主进程同步场景状态...');
      const result = (await ipcEvent.invoke(
        IPCChannels.UE_GET_CURRENT_SCENE,
      )) as {
        success: boolean;
        scene: string | null;
        timestamp: number;
      };

      if (result.success && result.scene) {
        this.currentScene = result.scene;
        this.lastUpdated = result.timestamp;
        this.notifyListeners();
        console.log(
          `✅ [SceneStatusManager] 同步主进程状态成功: ${result.scene}`,
        );
      } else {
        console.log('[SceneStatusManager] 主进程当前无场景');
      }
    } catch (error) {
      console.error('[SceneStatusManager] 同步主进程状态失败:', error);
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => callback());
  }

  /**
   * 设置当前场景（仅用于本地UI乐观更新）
   * 注意：主进程是唯一数据源，此方法仅用于优化用户体验
   */
  setCurrentScene(scene: string) {
    if (this.currentScene !== scene) {
      console.log(`[SceneStatusManager] 本地场景更新: ${scene}`);
      this.currentScene = scene;
      this.lastUpdated = Date.now();
      this.notifyListeners();
    }
  }

  getCurrentScene(): string {
    return this.currentScene;
  }
}

// ==================== 导出函数 ====================

/**
 * 切换 UE 场景
 * @param detail 壁纸详情
 * @returns 是否成功
 */
export async function switchScene(detail: WallpaperDetail): Promise<boolean> {
  if (!detail?.scene_id) {
    console.warn('⚠️ 壁纸没有场景ID，跳过场景切换');
    return false;
  }

  try {
    console.log('🎬 切换场景:', detail.scene_id);

    // 1. 验证场景并记录人设信息
    const sceneResult = handleSceneSwitch({
      type: 'selectLevel',
      scene: detail.scene_id,
      from: 'sceneManager',
    });

    if (sceneResult.success) {
      console.log('✅ 场景验证通过:', {
        character: sceneResult.characterName,
        botMode: sceneResult.botMode,
      });
    } else {
      console.warn('⚠️ 场景验证未通过，但仍尝试切换:', sceneResult.error);
    }

    // 2. 调用主进程切换场景
    const result = (await ipcEvent.invoke(IPCChannels.UE_SEND_SELECT_LEVEL, {
      type: 'selectLevel',
      data: { scene: detail.scene_id },
    })) as { success: boolean; error?: string };

    if (result.success) {
      setCurrentScene(detail.scene_id);
      console.log('✅ 场景切换命令已发送');
      return true;
    }

    const errorMsg = result.error || '场景切换失败';
    console.error('❌ 场景切换失败:', errorMsg);
    message.error(errorMsg);
    return false;
  } catch (error) {
    const errorMsg = `场景切换异常: ${(error as Error).message}`;
    console.error('❌', errorMsg);
    message.error(errorMsg);
    return false;
  }
}

/**
 * 获取当前场景ID
 */
export function getCurrentScene(): string {
  return SceneStatusManager.getInstance().getCurrentScene();
}

/**
 * 设置当前场景ID
 */
export function setCurrentScene(scene: string): void {
  SceneStatusManager.getInstance().setCurrentScene(scene);
}

// ==================== Hook ====================

export interface UseSceneStatusReturn {
  currentScene: string;
  lastUpdated: number;
  setCurrentScene: (scene: string) => void;
}

/**
 * 场景状态 Hook
 * 用于在组件中订阅场景状态变化
 */
export function useSceneStatus(): UseSceneStatusReturn {
  const manager = SceneStatusManager.getInstance();
  const [state, setState] = useState({
    currentScene: manager.currentScene,
    lastUpdated: manager.lastUpdated,
  });

  useEffect(() => {
    const unsubscribe = manager.subscribe(() => {
      setState({
        currentScene: manager.currentScene,
        lastUpdated: manager.lastUpdated,
      });
    });

    setState({
      currentScene: manager.currentScene,
      lastUpdated: manager.lastUpdated,
    });

    return unsubscribe;
    // manager 是单例，不会变化，所以不需要添加到依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetCurrentScene = useCallback(
    (scene: string) => {
      manager.setCurrentScene(scene);
    },
    // manager 是单例，不会变化，所以不需要添加到依赖数组
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    ...state,
    setCurrentScene: handleSetCurrentScene,
  };
}
