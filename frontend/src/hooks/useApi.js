import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/dashboard';

export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useProjects() {
  return useApi('/projects');
}

export function useAnalytics() {
  return useApi('/analytics');
}

export function useRealtime() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchRealtime = async () => {
      try {
        const response = await fetch(`${API_BASE}/realtime`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error('Realtime fetch error:', err);
      }
    };

    fetchRealtime();
    const interval = setInterval(fetchRealtime, 5000);

    return () => clearInterval(interval);
  }, []);

  return data;
}

export async function createProject(name, plan = 'free') {
  const response = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, plan })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create project');
  }

  return response.json();
}

export async function updateProjectRules(projectId, rules) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/rules`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules)
  });

  if (!response.ok) {
    throw new Error('Failed to update rules');
  }

  return response.json();
}

export async function rotateApiKey(projectId, keyType) {
  const response = await fetch(`${API_BASE}/projects/${projectId}/rotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyType })
  });

  if (!response.ok) {
    throw new Error('Failed to rotate key');
  }

  return response.json();
}

export async function deleteProject(projectId) {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete project');
  }
}
