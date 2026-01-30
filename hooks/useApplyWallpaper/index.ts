/**
 * 壁纸应用 Hook (重构版)
 * 封装壁纸应用的核心流程，委托具体操作给各个管理器
 */

import {
  Character,
  characterState,
  setSelectedCharacter,
  setSelectedWallpaperTitle,
} from '@stores/CharacterStore';
import { updateDownloadProgress } from '@stores/WallpaperDownload';
import { message } from 'antd';
import { useCallback, useState } from 'react';
import { IPCChannels } from '../../../main/ipcMain/ipcChannels';
import { api } from '../../api';
import {
  loadWallpaperConfig,
  saveWallpaperConfig,
} from '../../api/wallpaperConfig';
import { getVisitorId, trackEvent } from '../../utils/Weblogger/weblogger';
import ipcEvent from '../../utils/ipcRender';
import { useSystemStatus } from '../useSystemStatus';

// 导入类型和场景处理工具
import { getSceneInfo } from '../../contexts/SystemStatusContext/sceneHandler';

// 导入模块
import {
  downloadThumbnail,
  downloadVideo,
  markDownloadCompleted,
} from './downloader';
import {
  checkLocalWallpaper,
  getLocalVideoPath,
  saveWallpaperInfo,
  setDynamicWallpaper,
} from './fileManager';
import {
  buildWallpaperDirPath,
  getDefaultVideoPath,
  normalizePath,
  sanitizeFileName,
} from './pathHelper';
import { switchScene } from './sceneManager';
import {
  ApplyWallpaperOptions,
  CharacterData,
  DEFAULT_WALLPAPER_ID,
  WallpaperDetail,
  WallpaperItem,
} from './types';

// 重新导出
export {
  getCurrentScene,
  setCurrentScene,
  useSceneStatus,
  type UseSceneStatusReturn,
} from './sceneManager';
export type { ApplyWallpaperOptions, WallpaperItem };

// ==================== 工具函数 ====================

/**
 * 构建角色数据对象
 */
function buildCharacterData(
  detail: WallpaperDetail,
): CharacterData | undefined {
  if (!detail) return undefined;
  return {
    name: detail.name || '未知角色',
    identity: detail.identity || '',
    personality: detail.personality || '',
    languageStyle: detail.languageStyle || '',
    relationships: detail.relationships || '',
    experience: detail.experience || '',
    background: detail.background || '',
    voice_id: detail.voice_id || '',
    bot_id: detail.bot_id || '',
    activeReplyRules: detail.activeReplyRules || '',
  };
}

/**
 * 构建壁纸配置对象
 */
async function buildWallpaperConfig(
  wallpaper: WallpaperItem,
  detail: WallpaperDetail | null,
  isDefault = false,
) {
  const localVideoPath = wallpaper.id
    ? await getLocalVideoPath(wallpaper.id)
    : null;

  return {
    wallpaperId: wallpaper.id || DEFAULT_WALLPAPER_ID,
    wallpaperTitle: wallpaper.title || '默认壁纸',
    wallpaperThumbnail: wallpaper.thumbnail || '',
    wallpaperPreview: wallpaper.preview || '',
    sceneId: detail?.scene_id,
    localVideoPath: localVideoPath || undefined,
    characterData: detail ? buildCharacterData(detail) : undefined,
    appliedAt: new Date().toISOString(),
    isDefault,
  };
}

/**
 * 验证并记录场景信息
 */
function logSceneInfo(sceneId: string, context: string): void {
  const sceneInfo = getSceneInfo(sceneId);
  if (sceneInfo.hasCharacter && sceneInfo.character) {
    console.log(`👤 [${context}] 场景关联人设:`, {
      sceneId: sceneInfo.sceneId,
      characterName: sceneInfo.character.name,
      characterType: sceneInfo.character.type,
    });
  } else {
    console.warn(`⚠️ [${context}] 场景 ${sceneId} 未关联人设`);
  }
}

/**
 * 处理壁纸设置错误
 */
function handleWallpaperSetError(result: any, loadingKey?: string): void {
  const errorMessages: Record<string, string> = {
    FILE_NOT_FOUND: '视频文件不存在',
    UNSUPPORTED_FORMAT: '视频格式不支持',
    FILE_NOT_ACCESSIBLE: '文件无法访问，请检查权限',
  };

  const errorMsg =
    errorMessages[result.code] || `设置壁纸失败: ${result.error}`;

  if (loadingKey) {
    message.warning({ content: errorMsg, key: loadingKey, duration: 3 });
  } else {
    console.warn(errorMsg);
  }
}

// ==================== 核心业务流程函数 ====================

/**
 * 步骤1: 获取壁纸详情
 */
async function fetchWallpaperDetail(
  wallpaperId: string,
): Promise<WallpaperDetail> {
  console.log('📥 步骤1: 获取壁纸详情...');

  const res = await api.getThemesInfo(wallpaperId);
  if (res.code !== 0) {
    throw new Error(res.message || '获取壁纸详情失败');
  }

  const detail = {
    ...(res.data?.agent_prompt_detail?.prompt_extern_json || {}),
    config_params: res.data?.config_params || {},
  };

  console.log('✅ 壁纸详情获取成功');
  return detail;
}

/**
 * 步骤2: 验证人设信息
 */
function validatePersonaInfo(detail: WallpaperDetail): void {
  if (!detail?.name?.trim()) {
    throw new Error('该壁纸缺少人设信息，无法切换');
  }
  console.log('✅ 人设验证通过:', detail.name);
}

/**
 * 步骤3: 切换场景
 */
async function performSceneSwitch(detail: WallpaperDetail): Promise<boolean> {
  console.log('🎬 步骤3: 切换UE场景...');

  try {
    if (detail?.scene_id) {
      logSceneInfo(detail.scene_id, '场景切换');
    }

    const success = await switchScene(detail);
    console.log(success ? '✅ UE场景切换成功' : '❌ UE场景切换失败');
    return success;
  } catch (error) {
    console.error('❌ UE场景切换异常:', error);
    return false;
  }
}

/**
 * 步骤4: 保存壁纸到本地
 */
async function saveWallpaperToLocal(
  wallpaper: WallpaperItem,
  detail: WallpaperDetail,
): Promise<boolean> {
  console.log('💾 步骤4: 检查并保存壁纸文件...');

  if (await checkLocalWallpaper(wallpaper.id)) {
    console.log('✅ 壁纸文件已在本地');
    return true;
  }

  console.log('📥 开始保存壁纸...');

  const wallpaperDir = await buildWallpaperDirPath(
    wallpaper.title,
    wallpaper.id,
  );
  if (!wallpaperDir) {
    console.error('❌ 无法构建目录路径');
    return false;
  }

  if (!(await saveWallpaperInfo(wallpaperDir, wallpaper, detail))) {
    return false;
  }

  const absoluteDir = normalizePath(wallpaperDir);
  const safeFileName = sanitizeFileName(wallpaper.title);
  const imageUrl = wallpaper.thumbnail || wallpaper.preview;
  const videoUrl = detail?.config_params?.video;

  // 下载缩略图
  if (imageUrl) {
    await downloadThumbnail(
      imageUrl,
      `${safeFileName}.jpg`,
      absoluteDir,
      wallpaper.id,
    );
  }

  // 下载视频或标记完成
  if (videoUrl) {
    const timestamp = Math.floor(Date.now() / 1000);
    await downloadVideo(
      videoUrl,
      `${safeFileName}_video_${timestamp}.mp4`,
      absoluteDir,
      wallpaper.id,
    );
    markDownloadCompleted(wallpaper.id);
  } else if (imageUrl) {
    updateDownloadProgress(wallpaper.id, { status: 'completed' });
  }

  console.log('✅ 壁纸已保存到本地');
  return true;
}

/**
 * 步骤5: 设置系统壁纸
 */
async function setSystemWallpaper(
  wallpaper: WallpaperItem,
  ueState: string,
  loadingKey: string,
): Promise<boolean> {
  console.log('🖼️ 步骤5: 设置系统壁纸 (UE状态:', ueState, ')');

  // UE处于3D模式时跳过
  if (ueState === '3D') {
    console.log('🎮 UE为3D模式，视频壁纸由SystemStatusContext管理');
    message.success({
      content: 'UE场景已切换，视频壁纸将在退出3D模式后自动恢复',
      key: loadingKey,
      duration: 3,
    });
    return true;
  }

  const localVideoPath = await getLocalVideoPath(wallpaper.id);
  if (!localVideoPath) {
    throw new Error('该壁纸无视频文件，壁纸切换失败');
  }

  console.log('📹 设置视频:', localVideoPath);
  message.loading({
    content: '正在设置视频壁纸...',
    key: loadingKey,
    duration: 0,
  });

  const result = await setDynamicWallpaper(localVideoPath);
  if (!result.success) {
    handleWallpaperSetError(result, loadingKey);
    return false;
  }

  console.log('✅ 视频已设置为系统壁纸');
  return true;
}

/**
 * 步骤6: 设置角色信息
 */
function setupCharacterInfo(
  wallpaper: WallpaperItem,
  detail: WallpaperDetail,
): Character | undefined {
  console.log('👤 步骤6: 设置角色信息...');

  const characterData = buildCharacterData(detail);
  if (!characterData) return undefined;

  const character: Character = {
    id: `wallpaper_${wallpaper.id}`,
    ...characterData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = characterState.selectedCharacter;
  const needsChange =
    !current || current.id !== character.id || current.name !== character.name;

  if (needsChange) {
    console.log('🖼️ 设置壁纸角色:', character.name);
    setSelectedCharacter(character);
    setSelectedWallpaperTitle(wallpaper.title);
  }

  return character;
}

/**
 * 步骤7: 保存壁纸配置
 */
async function saveWallpaperConfigToFile(
  wallpaper: WallpaperItem,
  detail: WallpaperDetail,
): Promise<void> {
  console.log('💾 步骤7: 保存壁纸配置到文件...');

  try {
    const config = await buildWallpaperConfig(wallpaper, detail, false);
    const saveResult = await saveWallpaperConfig({
      ...config,
      originDetail: detail,
    });

    console.log(
      saveResult.success ? '✅ 壁纸配置已保存到文件' : '❌ 保存壁纸配置失败',
    );
  } catch (error) {
    console.error('保存壁纸配置到文件失败:', error);
  }
}

/**
 * 步骤8: 通知其他窗口
 */
function notifyOtherWindows(
  wallpaper: WallpaperItem,
  detail: WallpaperDetail,
): void {
  if (!detail?.name || !window.electron?.interWindow) return;

  console.log('📢 步骤8: 通知其他窗口...');
  window.electron.interWindow
    .sendToWindow(
      'WallpaperInput_Window',
      IPCChannels.WALLPAPER_CONFIG_LOADED,
      {
        wallpaperId: wallpaper.id,
        wallpaperTitle: wallpaper.title,
        characterData: { name: detail.name },
        appliedAt: new Date().toISOString(),
      },
    )
    .catch((error) => console.warn('通知窗口失败:', error));
}

/**
 * 步骤9: 发送埋点
 */
function trackWallpaperApplied(wallpaper: WallpaperItem): void {
  trackEvent(window.location.pathname || '/', 'wallpaper_set', {
    wallpaper_id: wallpaper.id,
    visitor_id: getVisitorId() || 'unknown',
    set_time: new Date().toISOString(),
  }).catch((err) => console.error('埋点失败:', err));
}

// ==================== 主Hook ====================

export function useApplyWallpaper() {
  const [isApplying, setIsApplying] = useState(false);
  const { status, reEmbedToDesktop } = useSystemStatus();
  const ueState = status.ueState.state;

  /**
   * 应用壁纸主流程
   */
  const applyWallpaper = useCallback(
    async (options: ApplyWallpaperOptions) => {
      const { wallpaper, onSuccess, onError } = options;

      if (wallpaper.isUsing) {
        message.info('该壁纸已在使用中');
        return;
      }

      setIsApplying(true);
      const loadingKey = 'applying-wallpaper';
      message.loading({
        content: '正在应用壁纸...',
        key: loadingKey,
        duration: 0,
      });

      try {
        const detail = await fetchWallpaperDetail(wallpaper.id);
        validatePersonaInfo(detail);

        const sceneChanged = await performSceneSwitch(detail);

        message.loading({
          content: '正在保存壁纸到本地...',
          key: loadingKey,
          duration: 0,
        });
        await saveWallpaperToLocal(wallpaper, detail);

        const wallpaperChanged = await setSystemWallpaper(
          wallpaper,
          ueState,
          loadingKey,
        );

        if (!sceneChanged && !wallpaperChanged) {
          throw new Error('壁纸切换失败，该壁纸无视频或场景资源');
        }

        setupCharacterInfo(wallpaper, detail);
        await saveWallpaperConfigToFile(wallpaper, detail);
        notifyOtherWindows(wallpaper, detail);
        trackWallpaperApplied(wallpaper);

        message.success({
          content: '壁纸应用成功！',
          key: loadingKey,
          duration: 2,
        });
        onSuccess?.(wallpaper, detail);
        console.log('✅ 壁纸应用完成');
      } catch (error) {
        const errorMsg = `应用壁纸失败: ${(error as Error).message}`;
        console.error('❌', errorMsg);
        message.error({ content: errorMsg, key: loadingKey, duration: 3 });
        onError?.(error as Error);
      } finally {
        setIsApplying(false);
      }
    },
    [ueState],
  );

  /**
   * 获取初始视频路径
   */
  const getInitialVideoPath = useCallback(async (): Promise<string | null> => {
    const configResult = await loadWallpaperConfig();
    let localVideoPath: string | null = null;
    let wallpaperId: string | null = null;

    // 1. 从配置文件读取
    if (configResult.success && configResult.config) {
      wallpaperId = configResult.config.wallpaperId;
      localVideoPath = configResult.config.localVideoPath || null;
      console.log(
        localVideoPath
          ? `✅ 从配置获取视频: ${localVideoPath}`
          : '⚠️ 配置无视频路径，尝试扫描',
      );
    }

    // 2. 扫描本地文件
    if (!localVideoPath && wallpaperId) {
      console.log('🔍 扫描本地文件:', wallpaperId);
      localVideoPath = await getLocalVideoPath(wallpaperId);
    }

    // 3. 使用默认视频
    if (!localVideoPath) {
      console.log('📹 使用默认视频壁纸');
      localVideoPath = await getDefaultVideoPath();

      if (localVideoPath) {
        const defaultWallpaper = {
          id: DEFAULT_WALLPAPER_ID,
          title: '默认壁纸',
          thumbnail: '',
          preview: '',
        };
        const config = await buildWallpaperConfig(
          defaultWallpaper as WallpaperItem,
          null,
          true,
        );
        await saveWallpaperConfig({ ...config, originDetail: null }).catch(
          (error) => console.warn('⚠️ 保存默认配置失败:', error),
        );
      }
    }

    return localVideoPath;
  }, []);

  /**
   * 初始化时检查并设置上次应用的壁纸
   */
  const checkAndSetInitialWallpaper = useCallback(async () => {
    try {
      console.log('📋 初始化壁纸...');
      const localVideoPath = await getInitialVideoPath();

      if (!localVideoPath) {
        console.warn('⚠️ 无法获取视频路径，跳过壁纸设置');
        return;
      }

      console.log('🖼️ 设置初始动态壁纸:', localVideoPath);
      const result = await setDynamicWallpaper(localVideoPath);

      console.log(
        result.success ? '✅ 初始壁纸设置成功' : '❌ 初始壁纸设置失败',
      );
      if (!result.success) {
        handleWallpaperSetError(result);
      }
    } catch (error) {
      console.error('❌ 初始化壁纸失败:', error);
    }
  }, [getInitialVideoPath]);

  /**
   * 重置壁纸场景
   * 1. 重新嵌入壁纸窗口到桌面
   * 2. 加载并恢复保存的场景配置
   */
  const resetWallpaperAndReconnect = useCallback(async (): Promise<void> => {
    console.log('🖼️ 开始壁纸重置流程');

    // 1. 重新嵌入壁纸窗口
    const reEmbedResult = await reEmbedToDesktop('wallpaper-baby');
    if (!reEmbedResult.success) {
      const errorMsg = `重新嵌入失败: ${reEmbedResult.error}`;
      console.error('❌', errorMsg);
      message.error(errorMsg);
      throw new Error(reEmbedResult.error || '重新嵌入失败');
    }

    window.electron.logRenderer.info('重新嵌入壁纸窗口', {
      type: 'desktopEmbederReEmbed',
      data: 'wallpaper-baby',
    });
    console.log('✅ 壁纸窗口已重新嵌入');

    try {
      // 2. 加载壁纸配置
      const configResult = await loadWallpaperConfig();
      if (!configResult.success || !configResult.config) {
        console.warn('⚠️ 未找到壁纸配置');
        message.warning('未找到壁纸配置，请先应用壁纸');
        return;
      }

      const { sceneId } = configResult.config;
      console.log('📋 已加载配置:', configResult.config);

      // 3. 恢复场景
      if (sceneId) {
        console.log('🎬 恢复场景:', sceneId);
        logSceneInfo(sceneId, '场景恢复');

        await ipcEvent.invoke(IPCChannels.UE_SEND_SELECT_LEVEL, {
          type: 'selectLevel',
          data: { scene: sceneId },
        });
      }

      message.destroy();
      console.log('✅ 壁纸场景重置完成');
    } catch (error) {
      message.destroy();
      const errorMsg = `重置失败: ${(error as Error).message}`;
      console.error('❌', errorMsg);
      message.error(errorMsg);
      throw error;
    }
  }, [reEmbedToDesktop]);

  return {
    applyWallpaper,
    isApplying,
    checkAndSetInitialWallpaper,
    resetWallpaperAndReconnect,
  };
}
