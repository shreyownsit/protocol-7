/**
 * LexiClear / Protocol-7 API Client
 * Connects frontend to FastAPI backend (default: http://localhost:8000)
 * with graceful fallback to mock data when backend is starting or offline.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader(): Record<string, string> {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("lexiclear_access_token");
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
    return {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const status = res.status;
      if (!res.ok) {
        let errorMsg = `HTTP Error ${status}`;
        try {
          const errData = await res.json();
          errorMsg = errData?.error?.message || errData?.detail || errorMsg;
        } catch {
          // ignore json parse error
        }
        return { data: null, error: errorMsg, status };
      }

      const data = await res.json();
      return { data, error: null, status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      return { data: null, error: msg, status: 0 };
    }
  }

  // Health
  async checkHealth(): Promise<boolean> {
    const res = await this.request<{ status: string }>("/health");
    return res.data?.status === "ok";
  }

  // Auth - Login
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (res.data?.tokens?.access_token && typeof window !== "undefined") {
      localStorage.setItem("lexiclear_access_token", res.data.tokens.access_token);
      localStorage.setItem("lexiclear_refresh_token", res.data.tokens.refresh_token);
      localStorage.setItem("lexiclear_user", JSON.stringify(res.data.user));
    }

    return res;
  }

  // Auth - Register
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<ApiResponse<AuthResponse>> {
    const res = await this.request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    });

    if (res.data?.tokens?.access_token && typeof window !== "undefined") {
      localStorage.setItem("lexiclear_access_token", res.data.tokens.access_token);
      localStorage.setItem("lexiclear_refresh_token", res.data.tokens.refresh_token);
      localStorage.setItem("lexiclear_user", JSON.stringify(res.data.user));
    }

    return res;
  }

  // Logout
  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("lexiclear_access_token");
      localStorage.removeItem("lexiclear_refresh_token");
      localStorage.removeItem("lexiclear_user");
    }
  }

  // Get current user from storage
  getCurrentUser(): AuthUser | null {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lexiclear_user");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export const api = new ApiClient(API_BASE_URL);
