import { useState, useEffect, useCallback } from 'react';

export const useApi = (apiFn, params, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(params);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
};

export const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = async (apiFn, onSuccess, onError) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn();
      onSuccess && onSuccess(res.data.data);
      return res.data.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg);
      onError && onError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, call };
};