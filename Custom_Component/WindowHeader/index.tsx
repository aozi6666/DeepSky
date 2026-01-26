import { useEffect, useState } from 'react';
import { IPCChannels } from '../../../main/ipcMain/ipcChannels';
import ipcEvent from '../../utils/ipcRender';
import { CloseIcon, MaximizeIcon, MinimizeIcon } from './icons';
import { useWindowHeaderStyles } from './styles';

interface WindowHeaderProps {
  title?: string;
  showTitle?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  className?: string;
}

function WindowHeader({
  title = 'WallpaperBase',
  showTitle = true,
  onMinimize,
  onMaximize,
  onClose,
  className,
}: WindowHeaderProps) {
  const { styles } = useWindowHeaderStyles();
  const [isMaximized, setIsMaximized] = useState(false);

  // 检查窗口是否最大化
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await ipcEvent.invoke(
          IPCChannels.WINDOW_IS_MAXIMIZED,
        );
        setIsMaximized(maximized || false);
      } catch {
        // 检查窗口最大化状态失败，使用默认值
      }
    };

    checkMaximized();

    // 监听窗口大小变化
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else {
      ipcEvent.sendMessage(IPCChannels.WINDOW_MINIMIZE);
    }
  };

  const handleMaximize = () => {
    if (onMaximize) {
      onMaximize();
    } else {
      ipcEvent.sendMessage(IPCChannels.WINDOW_MAXIMIZE);
    }
    // 立即更新状态，提供更好的用户体验
    setIsMaximized(!isMaximized);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      ipcEvent.sendMessage(IPCChannels.WINDOW_CLOSE);
    }
  };

  return (
    <div className={`${styles.header} ${className || ''}`}>
      {/* 标题区域 - 可拖拽 */}
      <div className={styles.titleBar}>
        {/* {showTitle && <span className={styles.title}>{title}</span>} */}
      </div>

      {/* 窗口控制按钮 */}
      <div className={styles.windowControls}>
        {/* 最小化按钮 */}
        <div
          role="button"
          tabIndex={0}
          className={`${styles.controlButton} ${styles.minimizeButton}`}
          onClick={handleMinimize}
          onKeyDown={(e) => e.key === 'Enter' && handleMinimize()}
          title="最小化"
        >
          <MinimizeIcon />
        </div>

        {/* 最大化/还原按钮 */}
        <div
          role="button"
          tabIndex={0}
          className={`${styles.controlButton} ${styles.maximizeButton}`}
          onClick={handleMaximize}
          onKeyDown={(e) => e.key === 'Enter' && handleMaximize()}
          title={isMaximized ? '还原' : '最大化'}
        >
          <MaximizeIcon />
        </div>

        {/* 关闭按钮 */}
        <div
          role="button"
          tabIndex={0}
          className={`${styles.controlButton} ${styles.closeButton}`}
          onClick={handleClose}
          onKeyDown={(e) => e.key === 'Enter' && handleClose()}
          title="关闭"
        >
          <CloseIcon />
        </div>
      </div>
    </div>
  );
}

export default WindowHeader;
