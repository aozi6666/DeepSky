import { useEffect, useState } from 'react';
import cozeTokenManager from '../utils/CozeTokenManager';

/**
 * 自定义 Hook: 在组件中使用 Coze Token
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { token, loading, error, refresh } = useCozeToken();
 *
 *   if (loading) return <div>加载中...</div>;
 *   if (error) return <div>错误: {error}</div>;
 *   if (!token) return <div>未获取到 Token</div>;
 *
 *   return <div>Token: {token}</div>;
 * }
 * ```
 */
export function useCozeToken(autoFetch = true) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const fetchedToken = await cozeTokenManager.getToken(forceRefresh);
      setToken(fetchedToken);

      if (!fetchedToken) {
        setError('无法获取 Token');
      }
    } catch (err: any) {
      setError(err.message || '获取 Token 失败');
      console.error('useCozeToken 错误:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchToken();
    }
  }, [autoFetch]);

  return {
    token,
    loading,
    error,
    refresh: fetchToken,
  };
}

export default useCozeToken;
