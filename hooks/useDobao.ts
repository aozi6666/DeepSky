import { useContext } from 'react';
import {
  DobaoContext,
  DobaoContextType,
} from '../contexts/DobaoContext/DobaoContext';

/**
 * 使用豆包服务的自定义 Hook
 * @returns DobaoContextType 包含连接、断开连接等方法和状态
 * @throws Error 如果在 DobaoProvider 外部使用会抛出错误
 */
export const useDobao = (): DobaoContextType => {
  const context = useContext(DobaoContext);

  if (context === undefined) {
    throw new Error('useDobao 必须在 DobaoProvider 内部使用');
  }

  return context;
};

export default useDobao;
