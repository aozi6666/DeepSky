/**
 * 壁纸文件管理器
 * 负责壁纸文件的查找、读取和保存
 */

import { IPCChannels } from '../../../main/ipcMain/ipcChannels';
import { ThemeItem } from '../../api/types/wallpaper';
import ipcEvent from '../../utils/ipcRender';
import {
  WallpaperDirectory,
  WallpaperItem,
  WallpaperDetail,
  VIDEO_EXTENSIONS,
} from './types';
import { getWallpaperBasePath, normalizePath } from './pathHelper';

/**
 * 查找壁纸目录和信息
 * @param wallpaperId 壁纸ID
 * @returns 壁纸目录信息，未找到返回 null
 */
export async function findWallpaperDirectory(
  wallpaperId: string,
): Promise<WallpaperDirectory | null> {
  try {
    const wallpaperBasePath = await getWallpaperBasePath();
    if (!wallpaperBasePath) return null;

    const wallpaperDirs = await ipcEvent.invoke(
      IPCChannels.READ_DIRECTORY,
      wallpaperBasePath,
    );

    if (!wallpaperDirs || wallpaperDirs.length === 0) {
      return null;
    }

    for (const wallpaperDir of wallpaperDirs) {
      try {
        const infoFilePath = `${wallpaperBasePath}/${wallpaperDir}/info.json`;
        const fileExists = await ipcEvent.invoke(
          IPCChannels.CHECK_FILE_EXISTS,
          infoFilePath,
        );

        if (fileExists) {
          const fileContent = await ipcEvent.invoke(IPCChannels.READ_FILE, {
            filePath: infoFilePath,
            encoding: 'utf8',
          });

          if (fileContent) {
            const wallpaperInfo = JSON.parse(fileContent);
            if (wallpaperInfo.id === wallpaperId) {
              return {
                dirPath: `${wallpaperBasePath}/${wallpaperDir}`,
                wallpaperInfo,
              };
            }
          }
        }
      } catch (error) {
        // 继续查找下一个目录
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('查找壁纸目录失败:', error);
    return null;
  }
}

/**
 * 获取本地视频路径
 * @param wallpaperId 壁纸ID
 * @returns 视频路径，未找到返回 null
 */
export async function getLocalVideoPath(
  wallpaperId: string,
): Promise<string | null> {
  try {
    const wallpaperDir = await findWallpaperDirectory(wallpaperId);
    if (!wallpaperDir) return null;

    const filesInDir = await ipcEvent.invoke(
      IPCChannels.READ_DIRECTORY,
      wallpaperDir.dirPath,
      { filesOnly: true },
    );

    console.log('📂 检查目录文件:', {
      dirPath: wallpaperDir.dirPath,
      files: filesInDir,
    });

    if (!filesInDir || filesInDir.length === 0) return null;

    // 查找视频文件
    for (const file of filesInDir) {
      const dotIndex = file.lastIndexOf('.');
      if (dotIndex === -1) continue;

      const ext = file.substring(dotIndex).toLowerCase();
      if (VIDEO_EXTENSIONS.includes(ext)) {
        const videoPath = normalizePath(`${wallpaperDir.dirPath}\\${file}`);
        console.log('📹 找到本地视频文件:', videoPath);
        return videoPath;
      }
    }

    console.log('⚠️ 壁纸目录中未找到视频文件');
    return null;
  } catch (error) {
    console.error('获取本地视频路径失败:', error);
    return null;
  }
}

/**
 * 检查本地壁纸是否存在
 * @param wallpaperId 壁纸ID
 * @returns 是否存在
 */
export async function checkLocalWallpaper(wallpaperId: string): Promise<boolean> {
  const wallpaperDir = await findWallpaperDirectory(wallpaperId);
  return wallpaperDir !== null;
}

/**
 * 保存壁纸信息为 info.json
 * @param wallpaperDir 壁纸目录路径
 * @param wallpaper 壁纸项
 * @param detail 壁纸详情
 * @returns 是否成功
 */
export async function saveWallpaperInfo(
  wallpaperDir: string,
  wallpaper: WallpaperItem,
  detail: WallpaperDetail,
): Promise<boolean> {
  try {
    const wallpaperInfo: ThemeItem = {
      id: wallpaper.id,
      name: wallpaper.title,
      description: wallpaper.description || '',
      thumbnail_url: wallpaper.thumbnail || wallpaper.preview || '',
      category: detail?.category || '',
      tags: wallpaper.tags || [],
      creator_id: detail?.creator_id || '',
      wallpaper_id: wallpaper.id,
      scene_model_id: detail?.scene_model_id || null,
      digital_human_id: detail?.digital_human_id || null,
      extension_ids: detail?.extension_ids || [],
      agent_prompt_id: detail?.agent_prompt_id || '',
      config_params: detail?.config_params || {},
      download_count: 0,
      rating: 0,
      subscription_count: 0,
      status: 'published',
      is_featured: false,
      creator_name: wallpaper.author || '',
      published_at: new Date().toISOString(),
      created_at: wallpaper.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const success = await ipcEvent.invoke(IPCChannels.SAVE_FILE, {
      fileType: 'json',
      data: wallpaperInfo,
      filename: 'info.json',
      savePath: wallpaperDir,
    });

    if (success) {
      console.log(`✅ 壁纸信息已保存: ${wallpaperDir}/info.json`);
    }

    return success;
  } catch (error) {
    console.error('保存壁纸信息失败:', error);
    return false;
  }
}

/**
 * 设置系统动态壁纸
 * @param videoPath 视频路径
 * @returns 设置结果
 */
export async function setDynamicWallpaper(
  videoPath: string,
): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    const result = await ipcEvent.invoke(
      IPCChannels.SET_DYNAMIC_WALLPAPER,
      videoPath,
    );
    return result;
  } catch (error: any) {
    console.error('设置动态壁纸失败:', error);
    return {
      success: false,
      error: error?.message || '设置失败',
    };
  }
}
