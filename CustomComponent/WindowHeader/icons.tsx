import CloseSvg from '$assets/icons/WinHeader/close.svg';
import MinSvg from '$assets/icons/WinHeader/min.svg';
import SquareSvg from '$assets/icons/WinHeader/square.svg';

// 最小化图标
export function MinimizeIcon() {
  return (
    <img src={MinSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}

// 最大化图标 (方形)
export function MaximizeIcon() {
  return (
    <img src={SquareSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}

// 关闭图标
export function CloseIcon() {
  return (
    <img src={CloseSvg} alt="icon" style={{ width: '16px', height: '16px' }} />
  );
}
