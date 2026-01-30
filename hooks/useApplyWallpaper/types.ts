/**
 * 壁纸相关类型定义
 */

// ==================== 基础类型 ====================

export interface WallpaperItem {
  id: string;
  title: string;
  thumbnail: string;
  preview: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  author?: string;
  isUsing?: boolean;
}

export interface ApplyWallpaperOptions {
  wallpaper: WallpaperItem;
  showDetailPanel?: boolean;
  onSuccess?: (wallpaper: WallpaperItem, detail?: WallpaperDetail) => void;
  onError?: (error: Error) => void;
}

export interface WallpaperDirectory {
  dirPath: string;
  wallpaperInfo: any;
}

// ==================== 壁纸详情类型 ====================

export interface WallpaperDetail {
  name?: string;
  identity?: string;
  personality?: string;
  languageStyle?: string;
  relationships?: string;
  experience?: string;
  background?: string;
  voice_id?: string;
  bot_id?: string;
  activeReplyRules?: string;
  scene_id?: string;
  category?: string;
  creator_id?: string;
  scene_model_id?: string | null;
  digital_human_id?: string | null;
  extension_ids?: string[];
  agent_prompt_id?: string;
  config_params?: {
    video?: string;
    [key: string]: any;
  };
}

// ==================== 角色数据类型 ====================

export interface CharacterData {
  name: string;
  identity: string;
  personality: string;
  languageStyle: string;
  relationships: string;
  experience: string;
  background: string;
  voice_id: string;
  bot_id: string;
  activeReplyRules: string;
}

// ==================== 壁纸配置类型 ====================

export interface WallpaperConfig {
  wallpaperId: string;
  wallpaperTitle: string;
  wallpaperThumbnail: string;
  wallpaperPreview: string;
  sceneId?: string;
  localVideoPath?: string;
  characterData?: CharacterData;
  appliedAt: string;
  isDefault: boolean;
}

// ==================== 下载相关类型 ====================

export type DownloadProgressType = 'thumbnail' | 'video';
export type DownloadStatus =
  | 'idle'
  | 'downloading-thumbnail'
  | 'downloading-video'
  | 'completed'
  | 'failed';

export interface DownloadTask {
  taskId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

// ==================== 常量 ====================

export const DOWNLOAD_MAX_ATTEMPTS = 30; // 下载轮询最大次数（30秒）
export const DOWNLOAD_POLL_INTERVAL = 1000; // 下载轮询间隔（1秒）
export const DOWNLOAD_SUCCESS_DELAY = 3000; // 下载完成后清除进度的延迟（3秒）
export const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm'];
export const DEFAULT_WALLPAPER_ID = 'theme_1760599563_0_369385490867994624';
export const DEFAULT_VIDEO_PATH = '\\assets\\videos\\defalutShow.mp4';
