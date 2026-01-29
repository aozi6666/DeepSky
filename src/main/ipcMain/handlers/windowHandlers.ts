import { BrowserWindow, ipcMain } from 'electron';
import { WindowChannels } from '../channels/windowChannels';

/**
 * 窗口管理相关的IPC处理器
 * 包含：窗口控制功能（最小化、最大化、关闭、查询状态）
 */
export const registerWindowHandlers = () => {
  // ==================== 窗口控制相关处理器 ====================
  
  /**
   * 最小化窗口
   * 当渲染进程发送 WINDOW_MINIMIZE 消息时，将当前窗口最小化
   */
  ipcMain.on(WindowChannels.WINDOW_MINIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.minimize();
    }
  });

  /**
   * 最大化/还原窗口
   * 当渲染进程发送 WINDOW_MAXIMIZE 消息时，切换窗口的最大化状态
   * - 如果窗口已最大化，则还原
   * - 如果窗口未最大化，则最大化
   */
  ipcMain.on(WindowChannels.WINDOW_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  /**
   * 关闭窗口
   * 当渲染进程发送 WINDOW_CLOSE 消息时，关闭当前窗口
   */
  ipcMain.on(WindowChannels.WINDOW_CLOSE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.close();
    }
  });

  /**
   * 查询窗口是否最大化
   * 当渲染进程发送 WINDOW_IS_MAXIMIZED 请求时，返回窗口的最大化状态
   * @returns {boolean} true 表示窗口已最大化，false 表示未最大化
   */
  ipcMain.handle(WindowChannels.WINDOW_IS_MAXIMIZED, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
  });
};
