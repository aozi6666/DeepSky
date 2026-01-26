import { createStyles } from 'antd-style';

export const useWindowHeaderStyles = createStyles(() => ({
  header: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    background: 'rgba(15, 15, 15, 1)', // 更深的背景色，更接近Windows风格
    // borderBottom: '1px solid rgba(64, 64, 64, 0.8)', // 更明显的边框
    position: 'relative',
    zIndex: 1000,
    userSelect: 'none',
    WebkitAppRegion: 'drag', // 使标题栏可拖拽
    // boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)', // 添加轻微阴影

    // 确保在所有平台上都有一致的外观
    '@media (max-width: 768px)': {
      height: '28px',
    },
  },

  titleBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '16px',
    height: '100%',
    WebkitAppRegion: 'drag', // 标题区域可拖拽
  },

  title: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: '0.5px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

    '@media (max-width: 768px)': {
      fontSize: '12px',
    },
  },

  windowControls: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    WebkitAppRegion: 'no-drag', // 控制按钮区域不可拖拽
  },

  controlButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46px',
    height: '32px',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
    WebkitAppRegion: 'no-drag',

    '&:hover': {
      background: 'rgba(6, 95, 95, 1)', // 使用指定的悬停背景颜色
    },

    '&:active': {
      background: 'rgba(6, 85, 85, 1)', // 点击时稍微深一点的颜色
    },

    // 图标样式
    '& img': {
      transition: 'all 0.1s ease',
      opacity: 0.9,
    },

    '&:hover img': {
      opacity: 1,
    },

    '@media (max-width: 768px)': {
      width: '40px',
      height: '28px',

      '& img': {
        width: '10px',
        height: '10px',
      },
    },
  },

  minimizeButton: {
    // 继承通用的controlButton样式
  },

  maximizeButton: {
    // 继承通用的controlButton样式
  },

  closeButton: {
    '&:hover': {
      background: '#e81123', // Windows标准的红色
      color: '#ffffff',
    },

    '&:active': {
      background: '#c50e1f', // 按下时更深的红色
    },

    // 关闭按钮的特殊样式
    '&:hover img': {
      opacity: 1,
      filter: 'brightness(0) invert(1)', // 悬停时将图标变为白色
    },
  },

  // 暗色主题下的特殊样式
  '@media (prefers-color-scheme: dark)': {
    header: {
      background: 'rgba(25, 25, 25, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    },
  },

  // 焦点状态下的样式
  '@media (focus-within)': {
    header: {
      background: 'rgba(30, 30, 30, 0.95)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
    },
  },

  // Windows 11 风格的圆角（可选）
  '@supports (border-radius: 8px)': {
    header: {
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
    },
  },
}));
