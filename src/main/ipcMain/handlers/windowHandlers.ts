import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import path from 'path';
import { WindowName } from '../../../renderer/utils/constance';
import { Aria2Downloader } from '../../utils/aria2Downloader';
import logMain from '../../utils/LogMain';
import { extractZipFile } from '../../utils/zipExtractor';
import {
  AlertDialogConfig,
  createAlertDialog,
  createCreationCenterWindow,
  createCreateCharacterWindow,
  createFloatingBallWindow,
  createGenerateFaceWindow,
  createLiveWindow,
  createLoginWindow,
  createOfficialWallpaperWindow,
  createPreviewWindow,
  createSceneWindow,
  createUpdateUEWindow,
  createWallpaperInputWindow,
} from '../../Windows/createWindows';
import { windowPool } from '../../Windows/windowPool';
import { IPCChannels } from '../ipcChannels';
/**
 * 窗口管理相关的IPC处理器
 * 包含：创建各种窗口、关闭窗口、开发者工具等功能
 */
export const registerWindowHandlers = () => {
  
  // 窗口控制相关处理器
  // 最小化窗口
  ipcMain.on(IPCChannels.WINDOW_MINIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
    }
  });

  // 最大化/还原窗口
  ipcMain.on(IPCChannels.WINDOW_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  // 关闭窗口
  ipcMain.on(IPCChannels.WINDOW_CLOSE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
    }
  });

  // 获取窗口状态
  ipcMain.handle(IPCChannels.WINDOW_IS_MAXIMIZED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });

  // 获取窗口是否可以最大化
  ipcMain.handle('window-is-maximizable', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximizable() : false;
  });

  // 获取窗口是否可以最小化
  ipcMain.handle('window-is-minimizable', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMinimizable() : false;
  });


  // UpdateUE窗口参数处理
  let ueDownloadProgress = 0;
  let ueExtractProgress = 0; // 解压文件进度（0-100）
  let ueStatus:
    | 'downloading'
    | 'paused'
    | 'extracting'
    | 'completed'
    | 'network-error' = 'downloading';
  let ueDownloader: Aria2Downloader | null = null; // 保存下载器实例以便暂停/继续
  let ueDownloadUrl = '';
  let ueDownloadFilename = '';
  let ueDownloadDirectory = '';
  let ueDownloadedBytes = 0; // 已下载的字节数
  let ueTotalBytes = 0; // 总文件大小（字节）
  let ueTotalBytesFromHead = 0; // 从 HEAD 请求获取的精确总大小（字节），用于防止被 aria2 的整数大小覆盖
  let ueDownloadSpeed = 0; // 当前下载速度（字节/秒）
  let networkRetryTimer: ReturnType<typeof setInterval> | null = null; // 网络重试定时器
  let ueDownloadSpeedLimitKb: number = 1024; // 下载限速（单位：KB/s），默认1024KB/s = 1MB/s

  /**
   * 清理UE下载器资源（取消下载并清理进程）
   * 用于窗口关闭或应用退出时调用
   */
  function cleanupUEDownloader(): void {
    try {
      console.log('[cleanupUEDownloader] 开始清理UE下载器资源...');
      
      // 1. 清除网络重试定时器
      if (networkRetryTimer) {
        clearInterval(networkRetryTimer);
        networkRetryTimer = null;
        console.log('[cleanupUEDownloader] 已清除网络重试定时器');
      }

      // 2. 取消下载（如果正在下载或暂停）
      if (ueDownloader) {
        try {
          if (ueStatus === 'downloading' || ueStatus === 'paused') {
            console.log('[cleanupUEDownloader] 正在取消下载...');
            ueDownloader.cancel();
            console.log('[cleanupUEDownloader] 下载已取消');
          }
        } catch (error) {
          console.error('[cleanupUEDownloader] 取消下载时出错:', error);
        }
        ueDownloader = null;
      }

      // 3. 重置状态变量
      ueStatus = 'downloading';
      ueDownloadProgress = 0;
      ueExtractProgress = 0;
      ueDownloadedBytes = 0;
      ueTotalBytes = 0;
      ueTotalBytesFromHead = 0;
      ueDownloadSpeed = 0;
      ueDownloadUrl = '';
      ueDownloadFilename = '';
      ueDownloadDirectory = '';

      console.log('[cleanupUEDownloader] UE下载器资源清理完成');
    } catch (error) {
      console.error('[cleanupUEDownloader] 清理UE下载器资源时出错:', error);
    }
  }

  // 将清理函数暴露到全局，供外部调用
  (global as any).__cleanupUEDownloader = cleanupUEDownloader;

  /**
   * 检查网络是否恢复并自动恢复下载
   */
  const startNetworkRecoveryCheck = () => {
    // 清除之前的定时器
    if (networkRetryTimer) {
      clearInterval(networkRetryTimer);
    }
    
    // 每5秒检查一次网络状态
    networkRetryTimer = setInterval(async () => {
      if (ueStatus !== 'network-error') {
        // 如果状态已经不是网络错误，停止检测
        if (networkRetryTimer) {
          clearInterval(networkRetryTimer);
          networkRetryTimer = null;
        }
        return;
      }
      
      // 检查网络是否恢复（尝试ping一个简单的URL）
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch('https://www.baidu.com', { 
          method: 'HEAD',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          // 网络已恢复，自动恢复下载
          console.log('网络已恢复，自动恢复下载');
          if (networkRetryTimer) {
            clearInterval(networkRetryTimer);
            networkRetryTimer = null;
          }
          
          // 恢复下载
          if (ueDownloadUrl && ueDownloadFilename && ueDownloadDirectory) {
            ueStatus = 'downloading';
            const downloader = new Aria2Downloader();
            ueDownloader = downloader;
            
            const maxSpeedBytesPerSecond = ueDownloadSpeedLimitKb * 1024; // 转换为字节/秒
            
            downloader.download({
              url: ueDownloadUrl,
              filename: ueDownloadFilename,
              directory: ueDownloadDirectory,
              maxSpeed: maxSpeedBytesPerSecond,
              onProgress: (
                progress: number | { progress: number; downloadedBytes: number; totalBytes: number },
              ) => {
                if (ueStatus === 'downloading') {
                  if (typeof progress === 'object' && 'downloadedBytes' in progress) {
                    ueDownloadProgress = Math.round(progress.progress * 100);
                    if (ueTotalBytesFromHead > 0) {
                      ueTotalBytes = ueTotalBytesFromHead;
                      ueDownloadedBytes = ueTotalBytesFromHead * progress.progress;
                    } else {
                      ueDownloadedBytes = progress.downloadedBytes;
                      ueTotalBytes = progress.totalBytes;
                    }
                    if ('downloadSpeed' in progress && typeof progress.downloadSpeed === 'number') {
                      ueDownloadSpeed = progress.downloadSpeed;
                    }
                  } else {
                    ueDownloadProgress = Math.round(progress * 100);
                  }
                }
              },
              onCompleted: async (filePath: string) => {
                ueDownloadProgress = 100;
                if (ueTotalBytes > 0) {
                  ueDownloadedBytes = ueTotalBytes;
                } else {
                  try {
                    const stats = fs.statSync(filePath);
                    ueDownloadedBytes = stats.size;
                    ueTotalBytes = stats.size;
                  } catch {
                    // 忽略错误
                  }
                }
                console.log('UE下载完成:', filePath);
                await handleExtractAfterDownload(filePath);
                ueDownloader = null;
              },
              onError: (error: Error) => {
                console.error('UE下载失败:', error);
                const isNetworkError = error.message.includes('网络') || 
                                 error.message.includes('Network') || 
                                 error.message.includes('连接') ||
                                 error.message.includes('Connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('检查你的网络问题') ||
                                 error.message.includes('网络设置') ||
                                 error.message.includes('网络连接错误');
                
                if (isNetworkError) {
                  ueStatus = 'network-error';
                  ueDownloadSpeed = 0;
                  ueDownloader = null;
                  startNetworkRecoveryCheck();
                } else {
                  ueDownloadProgress = 0;
                  ueStatus = 'downloading';
                  ueDownloader = null;
                }
              },
            }).catch((error) => {
              console.error('恢复下载过程中出错:', error);
              ueStatus = 'network-error';
              ueDownloadSpeed = 0;
              ueDownloader = null;
              startNetworkRecoveryCheck();
            });
          }
        }
      } catch (error) {
        // 网络仍未恢复，继续等待
        console.log('网络仍未恢复，继续等待...');
      }
    }, 5000); // 每5秒检查一次
  };

  // 解压文件的辅助函数
  const handleExtractAfterDownload = async (filePath: string) => {
    try {
      // 更新状态为解压中
      ueStatus = 'extracting';
      ueDownloadProgress = 100; // 保持100%显示

      // 解压到 ZIP 文件的同级目录
      const zipDir = path.dirname(filePath);
      const extractTo = path.join(zipDir, 'Windows-Pak-WallpaperMate');
      console.log('开始解压 Windows-Pak-WallpaperMate 到:', extractTo);

      // 重置解压进度
      ueExtractProgress = 0;

      // ZIP文件中的实际路径是 WallPaper-0.1.41/Windows-Pak-WallpaperMate/
      // 需要匹配这个完整路径
      const zipFileName = path.basename(filePath, '.zip'); // WallPaper-0.1.41
      const filterPath = `${zipFileName}/Windows-Pak-WallpaperMate`;
      console.log(`📦 过滤路径: ${filterPath}`);

      // 解压进度回调，只解压 Windows-Pak-WallpaperMate 文件夹
      await extractZipFile(
        filePath,
        extractTo,
        filterPath,
        (current: number, total: number) => {
          // 更新解压文件进度（0-100%）
          ueExtractProgress =
            total > 0 ? Math.round((current / total) * 100) : 0;
          console.log(
            `📦 解压进度: ${current}/${total} (${ueExtractProgress}%)`,
          );
        },
      );

      console.log('✅ UE解压完成:', extractTo);

      // 解压完成，更新状态
      ueStatus = 'completed';
      ueDownloadProgress = 100;
      ueExtractProgress = 100;
    } catch (extractError) {
      console.error('❌ UE解压失败:', extractError);
      // 解压失败不影响下载成功的返回，但会在日志中记录
      // 保持 completed 状态，因为下载已完成
      ueStatus = 'completed';
    }
  };
  // 初始化 handler，只设置一次
  ipcMain.removeHandler(IPCChannels.UPDATE_UE_WINDOW_PARAMS);
  ipcMain.handle(IPCChannels.UPDATE_UE_WINDOW_PARAMS, async () => {
    // 返回当前下载进度和状态
    // 如果是解压状态，显示解压进度；否则显示下载进度
    const displayProgress =
      ueStatus === 'extracting' ? ueExtractProgress : ueDownloadProgress;
    return {
      progress: displayProgress,
      status: ueStatus,
      downloadedBytes: ueDownloadedBytes,
      totalBytes: ueTotalBytes,
      downloadSpeed: ueDownloadSpeed,
    };
  });

  // 下载UE
  ipcMain.handle(IPCChannels.DOWNLOAD_UE, async () => {
    try {
      // 检查 aria2 是否可用
      const aria2Available = await Aria2Downloader.checkAria2Available();
      if (!aria2Available) {
        return {
          success: false,
          error: 'aria2 未安装或不可用，请先安装 aria2',
        };
      }

      // 获取项目根目录的上一级目录（与 wallpaperbase-Develop 并列的文件夹）
      let projectRootPath: string;
      if (app.isPackaged) {
        // 生产环境：process.resourcesPath 是 resources 目录
        // 需要向上找到项目根目录（假设 resources 在项目根目录下）
        projectRootPath = path.resolve(process.resourcesPath, '..');
      } else {
        // 开发环境：process.cwd() 就是项目根目录（wallpaperbase-Develop）
        projectRootPath = process.cwd();
      }
      // 获取与项目根目录并列的文件夹
      const parentDirectory = path.resolve(projectRootPath, '..');

      const downloadUrl =
        'https://client-resources.tos-cn-beijing.volces.com/wallpaper-pkg-product/WallPaper-0.1.41.zip';
      const filename = 'WallPaper-0.1.41.zip';

      console.log('开始使用 aria2 下载UE:', downloadUrl);
      console.log('下载路径:', parentDirectory);

      // 保存下载信息以便 resume() 使用
      ueDownloadUrl = downloadUrl;
      ueDownloadFilename = filename;
      ueDownloadDirectory = parentDirectory;

      // 重置进度和状态
      ueDownloadProgress = 0;
      ueStatus = 'downloading';
      ueDownloadedBytes = 0;
      ueTotalBytes = 0;
      ueDownloadSpeed = 0;

      // 先获取文件总大小
      try {
        const headResponse = await fetch(downloadUrl, { method: 'HEAD' });
        if (headResponse.ok) {
          const contentLength = headResponse.headers.get('content-length');
          if (contentLength) {
            ueTotalBytes = parseInt(contentLength, 10);
            ueTotalBytesFromHead = ueTotalBytes; // 保存精确值
            console.log(`获取到文件总大小: ${ueTotalBytes} 字节 (${(ueTotalBytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);
          }
        }
      } catch (error) {
        console.warn('获取文件总大小失败，将在下载过程中获取:', error);
      }

      // 使用 aria2 下载，限制速度为 1M/s (1MB/s = 1024 * 1024 bytes/s)
      const downloader = new Aria2Downloader();
      ueDownloader = downloader; // 保存下载器实例

      const maxSpeedBytesPerSecond = ueDownloadSpeedLimitKb * 1024; // 转换为字节/秒
      console.log(`UE下载限速: ${maxSpeedBytesPerSecond} bytes/s (${ueDownloadSpeedLimitKb}KB/s)`);

      const downloadedFilePath = await downloader.download({
        url: downloadUrl,
        filename,
        directory: parentDirectory,
        maxSpeed: maxSpeedBytesPerSecond, // 限制下载速度为 1M/s
        onProgress: (
          progress: number | { progress: number; downloadedBytes: number; totalBytes: number; downloadSpeed?: number },
        ) => {
          // 只有在下载状态时才更新进度，暂停时不更新
          if (ueStatus === 'downloading') {
            // 检查是否是新格式（包含大小信息）
            if (typeof progress === 'object' && 'downloadedBytes' in progress) {
              // 更新进度（progress 是 0-1 之间的值，转换为 0-100）
              ueDownloadProgress = Math.round(progress.progress * 100);
              // 更新下载速度
              if ('downloadSpeed' in progress && progress.downloadSpeed !== undefined) {
                ueDownloadSpeed = progress.downloadSpeed;
              }
              // 如果已经有从 HEAD 请求获取的精确总大小，基于进度百分比计算精确的已下载大小
              // aria2 输出的大小可能是整数（如 14GiB 或 666MiB），会丢失精度
              if (ueTotalBytesFromHead > 0) {
                // 使用精确的总大小和进度百分比计算已下载大小，保持精度
                ueTotalBytes = ueTotalBytesFromHead;
                const newDownloadedBytes = ueTotalBytesFromHead * progress.progress;
                // 确保已下载大小只增不减（防止进度后退）
                if (newDownloadedBytes >= ueDownloadedBytes) {
                  ueDownloadedBytes = newDownloadedBytes;
                }
              } else {
                // 如果没有精确值，使用 aria2 解析的大小
                // 确保已下载大小只增不减
                if (progress.downloadedBytes >= ueDownloadedBytes) {
                  ueDownloadedBytes = progress.downloadedBytes;
                }
                ueTotalBytes = progress.totalBytes;
              }
            } else {
              // 旧格式：只有进度百分比
              ueDownloadProgress = Math.round(progress * 100);
            }
          }
        },
        onCompleted: async (completedFilePath: string) => {
          ueDownloadProgress = 100;
          // 下载完成时，已下载大小应该等于总大小
          if (ueTotalBytes > 0) {
            ueDownloadedBytes = ueTotalBytes;
          } else {
            // 如果总大小未知，尝试从文件系统获取
            try {
              const stats = fs.statSync(completedFilePath);
              ueDownloadedBytes = stats.size;
              ueTotalBytes = stats.size;
            } catch {
              // 忽略错误
            }
          }
          console.log('UE下载完成:', completedFilePath);
          // 下载完成后自动解压
          await handleExtractAfterDownload(completedFilePath);
        },
        onError: (error: Error) => {
          console.error('UE下载失败 (DOWNLOAD_UE):', error);
          // 检查是否是网络错误
          const isNetworkError = error.message.includes('网络') || 
                                 error.message.includes('Network') || 
                                 error.message.includes('连接') ||
                                 error.message.includes('Connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('检查你的网络问题') ||
                                 error.message.includes('网络设置') ||
                                 error.message.includes('网络连接错误');
          
          console.log('UE下载失败 - 是否是网络错误:', isNetworkError, '错误消息:', error.message);
          
          if (isNetworkError) {
            // 网络错误时设置为网络错误状态，等待网络恢复后自动重试
            console.log('UE下载失败 - 设置为 network-error 状态');
            ueStatus = 'network-error';
            ueDownloadSpeed = 0;
            // 不重置进度，保持当前进度
            ueDownloader = null;
            
            // 启动网络恢复检测
            startNetworkRecoveryCheck();
          } else {
            // 其他错误，重置状态
            console.log('UE下载失败 - 设置为 downloading 状态');
            ueDownloadProgress = 0;
            ueStatus = 'downloading';
            ueDownloader = null;
          }
        },
      });

      // 下载完成后自动解压（如果 onCompleted 回调没有执行）
      if (downloadedFilePath) {
        await handleExtractAfterDownload(downloadedFilePath);
      }

      ueDownloader = null; // 下载完成，清除下载器实例
      return { success: true };
    } catch (error) {
      console.error('下载UE失败:', error);
      
      // 如果是网络错误，不尝试解压文件（文件可能不完整）
      const isNetworkError = error instanceof Error && (
        error.message.includes('网络') || 
        error.message.includes('Network') || 
        error.message.includes('连接') ||
        error.message.includes('Connection') ||
        error.message.includes('timeout') ||
        error.message.includes('检查你的网络问题')
      );
      
      if (isNetworkError) {
        // 网络错误已经在 onError 回调中处理，这里直接返回
        console.log('下载UE失败 - 网络错误，不尝试解压文件');
        return {
          success: false,
          error: error instanceof Error ? error.message : '下载失败',
        };
      }
      
      // 即使下载失败，也检查文件是否存在（可能是下载完成了但进程被 kill）
      // 但只有在非网络错误的情况下才尝试解压
      const expectedFilePath = path.join(
        ueDownloadDirectory,
        ueDownloadFilename,
      );
      if (fs.existsSync(expectedFilePath)) {
        const stats = fs.statSync(expectedFilePath);
        // 检查文件大小是否接近总大小（允许1%的误差），确保文件完整
        const isFileComplete = ueTotalBytes > 0 && stats.size >= ueTotalBytes * 0.99;
        if (stats.size > 0 && isFileComplete) {
          console.log(`检测到文件已存在且完整 (${stats.size} 字节，总大小: ${ueTotalBytes} 字节)，尝试解压...`);
          // 文件存在且完整，尝试解压
          try {
            await handleExtractAfterDownload(expectedFilePath);
            ueDownloader = null;
            return { success: true };
          } catch (extractError) {
            console.error('解压失败:', extractError);
          }
        } else {
          console.log(`检测到文件存在但不完整 (${stats.size} 字节，总大小: ${ueTotalBytes} 字节)，不尝试解压`);
        }
      }
      ueDownloader = null; // 下载失败，清除下载器实例
      return {
        success: false,
        error: error instanceof Error ? error.message : '下载失败',
      };
    }
  });

  // 暂停UE下载
  ipcMain.handle(IPCChannels.PAUSE_UE_DOWNLOAD, async () => {
    try {
      if (ueDownloader && ueStatus === 'downloading') {
        const success = ueDownloader.pause();
        if (success) {
          ueStatus = 'paused';
          ueDownloadSpeed = 0; // 暂停时重置下载速度
          console.log('UE下载已暂停');
          return { success: true };
        }
        return {
          success: false,
          error: '暂停下载失败',
        };
      }
      return {
        success: false,
        error: '当前没有正在进行的下载',
      };
    } catch (error) {
      console.error('暂停UE下载失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '暂停下载失败',
      };
    }
  });

  // 继续UE下载
  ipcMain.handle(IPCChannels.RESUME_UE_DOWNLOAD, async () => {
    try {
      // 清除网络重试定时器
      if (networkRetryTimer) {
        clearInterval(networkRetryTimer);
        networkRetryTimer = null;
      }
      
      if (ueDownloader && ueStatus === 'paused') {
        // 继续下载前，先读取实际文件的进度，避免进度跳变
        if (ueDownloadFilename && ueDownloadDirectory) {
          const expectedFilePath = path.join(
            ueDownloadDirectory,
            ueDownloadFilename,
          );
          if (fs.existsSync(expectedFilePath)) {
            const stats = fs.statSync(expectedFilePath);
            // 尝试从 aria2 的控制文件获取总大小，如果无法获取，使用文件大小作为估算
            // 注意：这里只是估算，实际进度由 aria2 输出为准
            // 如果文件大小 > 0，说明已经有部分下载，进度应该 > 0
            if (stats.size > 0) {
              // 估算进度（基于文件大小，但这只是粗略估算）
              // 实际进度会在 aria2 输出时更新
              console.log(
                `继续下载：检测到已下载文件大小 ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
              );
            }
          }
        }
        // 如果下载器存在，使用 resume 方法，传递解压回调
        const success = await ueDownloader.resume({
          onProgress: (
            progress: number | { progress: number; downloadedBytes: number; totalBytes: number; downloadSpeed?: number },
          ) => {
            if (ueStatus === 'downloading') {
              if (typeof progress === 'object' && 'downloadedBytes' in progress) {
                ueDownloadProgress = Math.round(progress.progress * 100);
                // 如果已经有从 HEAD 请求获取的精确总大小，基于进度百分比计算精确的已下载大小
                if (ueTotalBytesFromHead > 0) {
                  ueTotalBytes = ueTotalBytesFromHead;
                  ueDownloadedBytes = ueTotalBytesFromHead * progress.progress;
                } else {
                  ueDownloadedBytes = progress.downloadedBytes;
                  ueTotalBytes = progress.totalBytes;
                }
                // 更新下载速度
                if ('downloadSpeed' in progress && progress.downloadSpeed !== undefined) {
                  ueDownloadSpeed = progress.downloadSpeed;
                }
              } else {
                ueDownloadProgress = Math.round(progress * 100);
              }
            }
          },
          onCompleted: async (filePath: string) => {
            ueDownloadProgress = 100;
            // 下载完成时，已下载大小应该等于总大小
            if (ueTotalBytes > 0) {
              ueDownloadedBytes = ueTotalBytes;
            } else {
              try {
                const stats = fs.statSync(filePath);
                ueDownloadedBytes = stats.size;
                ueTotalBytes = stats.size;
              } catch {
                // 忽略错误
              }
            }
            console.log('UE下载完成:', filePath);
            // 下载完成后自动解压
            await handleExtractAfterDownload(filePath);
            ueDownloader = null;
          },
          onError: (error: Error) => {
            console.error('UE下载失败 (RESUME_UE_DOWNLOAD):', error);
            // 检查是否是网络错误
                const isNetworkError = error.message.includes('网络') || 
                                 error.message.includes('Network') || 
                                 error.message.includes('连接') ||
                                 error.message.includes('Connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('检查你的网络问题') ||
                                 error.message.includes('网络设置') ||
                                 error.message.includes('网络连接错误');
            
            console.log('UE下载失败 - 是否是网络错误:', isNetworkError, '错误消息:', error.message);
            
            if (isNetworkError) {
              // 网络错误时设置为网络错误状态，等待网络恢复后自动重试
              console.log('UE下载失败 - 设置为 network-error 状态');
              ueStatus = 'network-error';
              ueDownloadSpeed = 0;
              // 不重置进度，保持当前进度
              ueDownloader = null;
              
              // 启动网络恢复检测
              startNetworkRecoveryCheck();
            } else {
              // 其他错误，重置状态
              console.log('UE下载失败 - 设置为 downloading 状态');
              ueDownloadProgress = 0;
              ueStatus = 'downloading';
              ueDownloader = null;
            }
          },
        });
        if (success) {
          ueStatus = 'downloading';
          console.log('UE下载已继续');
          return { success: true };
        }
        return {
          success: false,
          error: '继续下载失败',
        };
      }
      if ((ueStatus === 'paused' || ueStatus === 'network-error') && ueDownloadUrl && ueDownloadFilename && ueDownloadDirectory) {
        // 如果下载器不存在但下载信息存在，重新创建下载器并启动下载
        const downloader = new Aria2Downloader();
        ueDownloader = downloader;
        ueStatus = 'downloading';
        // 使用设置的限速值
        const maxSpeedBytesPerSecond = ueDownloadSpeedLimitKb * 1024; // 转换为字节/秒
        // 启动下载但不等待完成（在后台进行）
        downloader.download({
          url: ueDownloadUrl,
          filename: ueDownloadFilename,
          directory: ueDownloadDirectory,
          maxSpeed: maxSpeedBytesPerSecond, // 限制下载速度为 1M/s
          onProgress: (
            progress: number | { progress: number; downloadedBytes: number; totalBytes: number; downloadSpeed?: number },
          ) => {
              // 只有在下载状态时才更新进度，暂停时不更新
              if (ueStatus === 'downloading') {
                if (typeof progress === 'object' && 'downloadedBytes' in progress) {
                  ueDownloadProgress = Math.round(progress.progress * 100);
                  // 如果已经有从 HEAD 请求获取的精确总大小，基于进度百分比计算精确的已下载大小
                  if (ueTotalBytesFromHead > 0) {
                    ueTotalBytes = ueTotalBytesFromHead;
                    ueDownloadedBytes = ueTotalBytesFromHead * progress.progress;
                  } else {
                    ueDownloadedBytes = progress.downloadedBytes;
                    ueTotalBytes = progress.totalBytes;
                  }
                  // 更新下载速度
                  if ('downloadSpeed' in progress && progress.downloadSpeed !== undefined) {
                    ueDownloadSpeed = progress.downloadSpeed;
                  }
                } else {
                  ueDownloadProgress = Math.round(progress * 100);
                }
              }
            },
          onCompleted: async (filePath: string) => {
              ueDownloadProgress = 100;
              // 下载完成时，已下载大小应该等于总大小
              if (ueTotalBytes > 0) {
                ueDownloadedBytes = ueTotalBytes;
              } else {
                try {
                  const stats = fs.statSync(filePath);
                  ueDownloadedBytes = stats.size;
                  ueTotalBytes = stats.size;
                } catch {
                  // 忽略错误
                }
              }
              console.log('UE下载完成:', filePath);
              // 下载完成后自动解压
              await handleExtractAfterDownload(filePath);
              ueDownloader = null;
            },
          onError: (error: Error) => {
            console.error('UE下载失败 (RESUME - 重新创建下载器):', error);
            // 检查是否是网络错误
                const isNetworkError = error.message.includes('网络') || 
                                 error.message.includes('Network') || 
                                 error.message.includes('连接') ||
                                 error.message.includes('Connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('检查你的网络问题') ||
                                 error.message.includes('网络设置') ||
                                 error.message.includes('网络连接错误');
            
            console.log('UE下载失败 - 是否是网络错误:', isNetworkError, '错误消息:', error.message);
            
            if (isNetworkError) {
              // 网络错误时设置为网络错误状态，等待网络恢复后自动重试
              console.log('UE下载失败 - 设置为 network-error 状态');
              ueStatus = 'network-error';
              ueDownloadSpeed = 0;
              // 不重置进度，保持当前进度
              ueDownloader = null;
              
              // 启动网络恢复检测
              startNetworkRecoveryCheck();
            } else {
              // 其他错误，重置状态
              console.log('UE下载失败 - 设置为 downloading 状态');
              ueDownloadProgress = 0;
              ueStatus = 'downloading';
              ueDownloader = null;
            }
          },
        }).catch((error) => {
          console.error('继续下载过程中出错:', error);
          ueStatus = 'paused';
          ueDownloadSpeed = 0; // 暂停时重置下载速度
          ueDownloader = null;
        });
        
        console.log('UE下载已继续（重新启动）');
        return { success: true };
      }
      return {
        success: false,
        error: '当前没有暂停的下载',
      };
    } catch (error) {
      console.error('继续UE下载失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '继续下载失败',
      };
    }
  });

  // 获取UE文件大小
  ipcMain.handle(IPCChannels.GET_UE_FILE_SIZE, async () => {
    try {
      const downloadUrl =
        'https://client-resources.tos-cn-beijing.volces.com/wallpaper-pkg-product/WallPaper-0.1.41.zip';

      // 使用 fetch HEAD 请求获取文件大小
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP错误: ${response.status}`,
        };
      }

      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        return {
          success: false,
          error: '无法获取文件大小',
        };
      }

      const fileSizeBytes = parseInt(contentLength, 10);
      return {
        success: true,
        size: fileSizeBytes,
      };
    } catch (error) {
      console.error('获取UE文件大小失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件大小失败',
      };
    }
  });

  // 停止并卸载UE下载（取消下载并删除文件）
  ipcMain.handle(IPCChannels.CANCEL_UE_DOWNLOAD_AND_CLEANUP, async () => {
    try {
      // 1. 取消下载（如果正在下载或暂停）
      if (ueDownloader) {
        if (ueStatus === 'downloading' || ueStatus === 'paused') {
          ueDownloader.cancel();
          console.log('已取消UE下载');
        }
        ueDownloader = null;
      }

      // 2. 删除下载的ZIP文件
      if (ueDownloadFilename && ueDownloadDirectory) {
        const zipFilePath = path.join(ueDownloadDirectory, ueDownloadFilename);
        if (fs.existsSync(zipFilePath)) {
          try {
            fs.unlinkSync(zipFilePath);
            console.log('已删除下载文件:', zipFilePath);
          } catch (error) {
            console.error('删除下载文件失败:', error);
          }
        }
      }

      // 3. 删除解压后的文件夹（Windows-Pak-WallpaperMate）
      if (ueDownloadDirectory) {
        const extractDir = path.join(ueDownloadDirectory, 'Windows-Pak-WallpaperMate');
        if (fs.existsSync(extractDir)) {
          try {
            // 递归删除文件夹
            fs.rmSync(extractDir, { recursive: true, force: true });
            console.log('已删除解压文件夹:', extractDir);
          } catch (error) {
            console.error('删除解压文件夹失败:', error);
          }
        }
      }

      // 4. 删除 aria2 的控制文件（如果存在）
      if (ueDownloadFilename && ueDownloadDirectory) {
        const controlFile = path.join(ueDownloadDirectory, `${ueDownloadFilename}.aria2`);
        if (fs.existsSync(controlFile)) {
          try {
            fs.unlinkSync(controlFile);
            console.log('已删除aria2控制文件:', controlFile);
          } catch (error) {
            console.error('删除aria2控制文件失败:', error);
          }
        }
      }

      // 5. 重置状态
      ueStatus = 'downloading';
      ueDownloadProgress = 0;
      ueExtractProgress = 0;
      ueDownloadedBytes = 0;
      ueTotalBytes = 0;
      ueTotalBytesFromHead = 0;
      ueDownloadSpeed = 0;
      ueDownloadUrl = '';
      ueDownloadFilename = '';
      ueDownloadDirectory = '';

      console.log('UE下载已停止并卸载所有文件');
      return { success: true };
    } catch (error) {
      console.error('停止并卸载UE下载失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '停止并卸载失败',
      };
    }
  });

  // 设置UE下载限速（单位：KB/s）
  ipcMain.handle(IPCChannels.SET_UE_DOWNLOAD_SPEED_LIMIT, async (_, speedLimitKb: number) => {
    try {
      // 验证范围：0-1024 KB/s
      if (speedLimitKb < 0 || speedLimitKb > 1024) {
        return {
          success: false,
          error: '限速值必须在0-1024 KB/s之间',
        };
      }
      
      const wasDownloading = ueStatus === 'downloading';
      const wasPaused = ueStatus === 'paused';
      
      // 如果正在下载，需要暂停并重新启动以应用新限速
      if (wasDownloading && ueDownloader) {
        // 暂停下载
        ueDownloader.pause();
        ueStatus = 'paused';
        // 等待一小段时间确保暂停完成
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      
      // 设置新的限速值
      ueDownloadSpeedLimitKb = speedLimitKb;
      console.log(`UE下载限速已设置为: ${ueDownloadSpeedLimitKb} KB/s`);
      
      // 如果之前正在下载，重新启动下载以应用新限速
      if (wasDownloading && ueDownloader) {
        // 重新启动下载
        const downloader = new Aria2Downloader();
        ueDownloader = downloader;
        ueStatus = 'downloading';
        const maxSpeedBytesPerSecond = ueDownloadSpeedLimitKb * 1024; // 转换为字节/秒
        
        downloader.download({
          url: ueDownloadUrl,
          filename: ueDownloadFilename,
          directory: ueDownloadDirectory,
          maxSpeed: maxSpeedBytesPerSecond,
          onProgress: (
            progress: number | { progress: number; downloadedBytes: number; totalBytes: number; downloadSpeed?: number },
          ) => {
            if (ueStatus === 'downloading') {
              if (typeof progress === 'object' && 'downloadedBytes' in progress) {
                ueDownloadProgress = Math.round(progress.progress * 100);
                if (ueTotalBytesFromHead > 0) {
                  ueTotalBytes = ueTotalBytesFromHead;
                  const newDownloadedBytes = ueTotalBytesFromHead * progress.progress;
                  if (newDownloadedBytes >= ueDownloadedBytes) {
                    ueDownloadedBytes = newDownloadedBytes;
                  }
                } else {
                  if (progress.downloadedBytes >= ueDownloadedBytes) {
                    ueDownloadedBytes = progress.downloadedBytes;
                  }
                  ueTotalBytes = progress.totalBytes;
                }
                if ('downloadSpeed' in progress && progress.downloadSpeed !== undefined) {
                  ueDownloadSpeed = progress.downloadSpeed;
                }
              } else {
                ueDownloadProgress = Math.round(progress * 100);
              }
            }
          },
          onCompleted: async (filePath: string) => {
            ueDownloadProgress = 100;
            if (ueTotalBytes > 0) {
              ueDownloadedBytes = ueTotalBytes;
            } else {
              try {
                const stats = fs.statSync(filePath);
                ueDownloadedBytes = stats.size;
                ueTotalBytes = stats.size;
              } catch {
                // 忽略错误
              }
            }
            console.log('UE下载完成:', filePath);
            await handleExtractAfterDownload(filePath);
            ueDownloader = null;
          },
          onError: (error: Error) => {
            console.error('UE下载失败 (限速设置后重启):', error);
                const isNetworkError = error.message.includes('网络') || 
                                 error.message.includes('Network') || 
                                 error.message.includes('连接') ||
                                 error.message.includes('Connection') ||
                                 error.message.includes('timeout') ||
                                 error.message.includes('检查你的网络问题') ||
                                 error.message.includes('网络设置') ||
                                 error.message.includes('网络连接错误');
            
            if (isNetworkError) {
              ueStatus = 'network-error';
              ueDownloadSpeed = 0;
              ueDownloader = null;
              startNetworkRecoveryCheck();
            } else {
              ueDownloadProgress = 0;
              ueStatus = 'downloading';
              ueDownloader = null;
            }
          },
        }).catch((error) => {
          console.error('重启下载失败:', error);
          // 检查是否是网络错误，如果是，保持 network-error 状态
          const isNetworkError = error instanceof Error && (
            error.message.includes('网络') || 
            error.message.includes('Network') || 
            error.message.includes('连接') ||
            error.message.includes('Connection') ||
            error.message.includes('timeout') ||
            error.message.includes('检查你的网络问题') ||
            error.message.includes('网络设置') ||
            error.message.includes('网络连接错误')
          );
          
          if (isNetworkError) {
            // 如果是网络错误，保持 network-error 状态（onError 回调中已经设置）
            // 如果 onError 回调没有被调用（例如 Promise 直接 reject），则在这里设置
            if (ueStatus !== 'network-error') {
              ueStatus = 'network-error';
              ueDownloadSpeed = 0;
              startNetworkRecoveryCheck();
            }
          } else {
            // 其他错误，重置状态
            ueStatus = wasPaused ? 'paused' : 'downloading';
          }
          ueDownloader = null;
        });
      }
      
      return {
        success: true,
        speedLimitKb: ueDownloadSpeedLimitKb,
        restarted: wasDownloading,
      };
    } catch (error) {
      console.error('设置UE下载限速失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置限速失败',
      };
    }
  });

  // 获取UE下载限速（单位：KB/s）
  ipcMain.handle(IPCChannels.GET_UE_DOWNLOAD_SPEED_LIMIT, async () => {
    try {
      return {
        success: true,
        speedLimitKb: ueDownloadSpeedLimitKb,
      };
    } catch (error) {
      console.error('获取UE下载限速失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取限速失败',
      };
    }
  });

  // 创建AlertDialog窗口
  ipcMain.handle(
    IPCChannels.CREATE_ALERT_DIALOG,
    async (event, config: AlertDialogConfig) => {
      try {
        console.log('正在创建AlertDialog窗口...', config);

        logMain.info('IPC收到创建AlertDialog窗口请求', {
          channel: IPCChannels.CREATE_ALERT_DIALOG,
          config,
        });

        // 获取发送请求的窗口作为父窗口
        const parentWindow =
          BrowserWindow.fromWebContents(event.sender) || undefined;

        // 创建AlertDialog窗口并等待用户响应
        const result = await createAlertDialog(config, parentWindow);

        console.log('AlertDialog窗口完成，用户选择:', result);

        logMain.info('IPC创建AlertDialog窗口成功', {
          channel: IPCChannels.CREATE_ALERT_DIALOG,
          result,
        });

        return result; // 返回 'confirm' 或 'cancel'
      } catch (error) {
        console.error('创建AlertDialog窗口失败:', error);
        logMain.error('IPC创建AlertDialog窗口失败', {
          channel: IPCChannels.CREATE_ALERT_DIALOG,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error; // 重新抛出错误，让调用者处理
      }
    },
  );
};

/**
 * 导出清理UE下载器函数供外部调用
 */
export function getCleanupUEDownloader(): (() => void) | null {
  // 通过闭包访问内部函数
  // 注意：这个函数需要在 registerWindowHandlers 执行后才能使用
  return (global as any).__cleanupUEDownloader || null;
}

// 在 registerWindowHandlers 执行后设置全局函数
// 注意：这需要在 registerWindowHandlers 内部设置
