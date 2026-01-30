/**
 * 壁纸路径处理工具
 * 封装所有与路径相关的操作
 */

import { IPCChannels } from '../../../main/ipcMain/ipcChannels';
import ipcEvent from '../../utils/ipcRender';
import { DEFAULT_VIDEO_PATH } from './types';

/**
 * 规范化路径，将所有斜杠转换为反斜杠（Windows）
 */
export function normalizePath(path: string): string {
  return path.replace(/\//g, '\\');
}

/**
 * 获取项目根路径
 */
export async function getProjectPath(): Promise<string | null> {
  try {
    const projectPath = await ipcEvent.invoke(
      IPCChannels.PATH_GET_PROJECT_PATH,
    );
    if (!projectPath) {
      console.error('❌ 无法获取项目路径');
      return null;
    }
    return projectPath;
  } catch (error) {
    console.error('获取项目路径失败:', error);
    return null;
  }
}

/**
 * 获取壁纸基础路径
 */
export async function getWallpaperBasePath(): Promise<string | null> {
  const projectPath = await getProjectPath();
  return projectPath ? `${projectPath}/resources/mockwallpaper` : null;
}

/**
 * 获取默认视频路径
 */
export async function getDefaultVideoPath(): Promise<string | null> {
  const projectPath = await getProjectPath();
  if (!projectPath) {
    return null;
  }
  return normalizePath(`${projectPath}${DEFAULT_VIDEO_PATH}`);
}

/**
 * 构建壁纸文件夹名称
 */
export function buildWallpaperFolderName(
  title: string,
  wallpaperId: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const wallpaperIdClean = wallpaperId.replace(/-/g, '');
  return `${title}_theme_${timestamp}_0_${wallpaperIdClean}`;
}

/**
 * 构建壁纸目录路径
 */
export async function buildWallpaperDirPath(
  title: string,
  wallpaperId: string,
): Promise<string | null> {
  const basePath = await getWallpaperBasePath();
  if (!basePath) {
    return null;
  }
  const folderName = buildWallpaperFolderName(title, wallpaperId);
  return `${basePath}/${folderName}`;
}

/**
 * 生成安全的文件名（移除非法字符）
 */
export function sanitizeFileName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}
