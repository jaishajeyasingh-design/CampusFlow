import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to append Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campusflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('campusflow_token');
      localStorage.removeItem('campusflow_user');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('campusflow:auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Safely extracts human-readable error messages from API responses,
 * including FastAPI Pydantic 422 validation error arrays, HTTPException detail strings,
 * status code messages, and network / connection failure diagnostics.
 */
export function extractApiErrorMessage(err: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!err || typeof err !== 'object') {
    return fallbackMessage;
  }

  const axiosErr = err as {
    response?: {
      status?: number;
      data?: {
        detail?: unknown;
        message?: unknown;
        error?: unknown;
      } | string;
    };
    message?: string;
    code?: string;
  };

  // 1. Process server response data if available
  if (axiosErr.response) {
    const { status, data } = axiosErr.response;

    if (data) {
      // If data is a plain string (not HTML)
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed && !trimmed.startsWith('<!DOCTYPE') && !trimmed.startsWith('<html')) {
          return trimmed;
        }
      }

      if (typeof data === 'object') {
        // FastAPI 422 returns detail as an array of validation errors: [{ loc: [...], msg: "...", type: "..." }]
        if (Array.isArray(data.detail)) {
          const formattedErrors = data.detail
            .map((item: unknown) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                const errObj = item as { loc?: unknown[]; msg?: string };
                const locArr = Array.isArray(errObj.loc) ? errObj.loc : [];
                // Filter out generic location markers like 'body'
                const fieldName = locArr.filter((l: unknown) => l !== 'body').join('.');
                const msg = errObj.msg || 'Invalid format';
                if (fieldName) {
                  // Humanize field name (e.g. ra_number -> RA Number, full_name -> Full Name)
                  const humanField = fieldName
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c: string) => c.toUpperCase());
                  return `${humanField}: ${msg}`;
                }
                return msg;
              }
              return null;
            })
            .filter((msg): msg is string => Boolean(msg));

          if (formattedErrors.length > 0) {
            return formattedErrors.join('. ');
          }
        }

        // FastAPI HTTPException detail string: e.g. "Email is already registered."
        if (typeof data.detail === 'string' && data.detail.trim().length > 0) {
          return data.detail.trim();
        }

        // Alternative API error message properties
        if (typeof data.message === 'string' && data.message.trim().length > 0) {
          return data.message.trim();
        }
        if (typeof data.error === 'string' && data.error.trim().length > 0) {
          return data.error.trim();
        }
      }
    }

    // Status code fallbacks
    if (status === 400) {
      return 'Invalid request data. Please verify your submitted information.';
    }
    if (status === 401) {
      return 'Invalid email or password.';
    }
    if (status === 403) {
      return 'Access denied. You do not have permission for this action.';
    }
    if (status === 404) {
      return 'The requested resource or endpoint was not found.';
    }
    if (status === 409) {
      return 'Account conflict. An account with these details already exists.';
    }
    if (status === 422) {
      return 'Validation failed. Please verify that all fields meet the required formats.';
    }
    if (status && status >= 500) {
      return `Server error (${status}). The server encountered an issue processing your request. Please try again later.`;
    }
  }

  // 2. Network and connection errors
  if (axiosErr.code === 'ECONNABORTED') {
    return 'Connection timed out. Please check your network and try again.';
  }
  if (axiosErr.message === 'Network Error' || axiosErr.code === 'ERR_NETWORK') {
    return 'Unable to connect to the CampusFlow backend server. Please verify the backend is running at http://localhost:8000.';
  }
  if (axiosErr.message && typeof axiosErr.message === 'string' && !axiosErr.message.includes('object Object')) {
    return axiosErr.message;
  }

  return fallbackMessage;
}

export default api;
