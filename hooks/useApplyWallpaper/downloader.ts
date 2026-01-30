/**
 * 壁纸下载管理器
 * 负责下载壁纸资源（缩略图、视频）
 */

import {
  clearDownloadProgress,
  updateDownloadProgress,
} from '@stores/WallpaperDownload';
import { downloadAPI } from '../../api';
import {
  DOWNLOAD_MAX_ATTEMPTS,
  DOWNLOAD_POLL_INTERVAL,
  DOWNLOAD_SUCCESS_DELAY,
  DownloadProgressType,
} from './types';

/**
 * 轮询下载任务状态
 * @param taskId 下载任务ID
 * @param wallpaperId 壁纸ID
 * @param progressType 进度类型
 * @returns 是否成功
 */
async function pollDownloadTask(
  taskId: string,
  wallpaperId: string,
  progressType: DownloadProgressType,
): Promise<boolean> {
  const progressKey =
    progressType === 'thumbnail' ? 'thumbnailProgress' : 'videoProgress';

  let attempts = 0;
  while (attempts < DOWNLOAD_MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_POLL_INTERVAL));

    const task = await downloadAPI.getDownloadTask(taskId);

    if (!task) {
      console.warn('⚠️ 无法获取下载任务状态');
      return false;
    }

    const progress = Math.round(task.progress * 100);
    updateDownloadProgress(wallpaperId, { [progressKey]: progress });

    console.log(
      `📊 ${progressType}下载进度: ${(task.progress * 100).toFixed(1)}%, 状态: ${task.status}`,
    );

    if (task.status === 'completed') {
      console.log(`✅ ${progressType}下载完成`);
      return true;
    }

    if (task.status === 'failed') {
      updateDownloadProgress(wallpaperId, {
        status: 'failed',
        error: task.error || '下载失败',
      });
      throw new Error(task.error || '下载失败');
    }

    attempts++;
  }

  console.warn('⚠️ 下载超时，但可能仍在后台进行');
  return false;
}

/**
 * 下载单个文件
 * @param url 下载URL
 * @param filename 文件名
 * @param directory 保存目录
 * @param wallpaperId 壁纸ID
 * @param type 文件类型
 * @returns 是否成功
 */
export async function downloadFile(
  url: string,
  filename: string,
  directory: string,
  wallpaperId: string,
  type: DownloadProgressType,
): Promise<boolean> {
  try {
    const status =
      type === 'thumbnail' ? 'downloading-thumbnail' : 'downloading-video';
    const progressKey =
      type === 'thumbnail' ? 'thumbnailProgress' : 'videoProgress';

    updateDownloadProgress(wallpaperId, {
      status,
      [progressKey]: 0,
    });

    console.log(`📥 开始下载${type}:`, { url, filename, directory });

    const taskId = await downloadAPI.startDownload({
      url,
      filename,
      directory,
    });

    console.log('📥 下载任务已创建，taskId:', taskId);

    const success = await pollDownloadTask(taskId, wallpaperId, type);

    if (success) {
      updateDownloadProgress(wallpaperId, {
        [progressKey]: 100,
      });
    }

    return success;
  } catch (error: any) {
    console.error(`❌ 下载${type}失败:`, error);
    updateDownloadProgress(wallpaperId, {
      status: 'failed',
      error: error?.message || '下载失败',
    });
    return false;
  }
}

/**
 * 下载壁纸缩略图
 * @param imageUrl 图片URL
 * @param filename 文件名
 * @param directory 保存目录
 * @param wallpaperId 壁纸ID
 * @returns 是否成功
 */
export async function downloadThumbnail(
  imageUrl: string,
  filename: string,
  directory: string,
  wallpaperId: string,
): Promise<boolean> {
  return downloadFile(imageUrl, filename, directory, wallpaperId, 'thumbnail');
}

/**
 * 下载壁纸视频
 * @param videoUrl 视频URL
 * @param filename 文件名
 * @param directory 保存目录
 * @param wallpaperId 壁纸ID
 * @returns 是否成功
 */
export async function downloadVideo(
  videoUrl: string,
  filename: string,
  directory: string,
  wallpaperId: string,
): Promise<boolean> {
  return downloadFile(videoUrl, filename, directory, wallpaperId, 'video');
}

/**
 * 标记下载完成
 * @param wallpaperId 壁纸ID
 */
export function markDownloadCompleted(wallpaperId: string): void {
  updateDownloadProgress(wallpaperId, { status: 'completed' });

  // 延迟清除进度
  setTimeout(() => {
    clearDownloadProgress(wallpaperId);
  }, DOWNLOAD_SUCCESS_DELAY);
}
