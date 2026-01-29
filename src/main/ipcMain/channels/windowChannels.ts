/**
 * 窗口管理相关的 IPC 通道
 */
export enum WindowChannels {
  // ==================== 窗口控制 ====================
  /** 最小化窗口 */
  WINDOW_MINIMIZE = 'window-minimize',
  /** 最大化窗口 */
  WINDOW_MAXIMIZE = 'window-maximize',
  /** 关闭窗口 */
  WINDOW_CLOSE = 'window-close',
  /** 窗口是否已最大化 */
  WINDOW_IS_MAXIMIZED = 'window-is-maximized',

}
