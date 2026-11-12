import { createClient, type SupabaseClient, type User, type Session } from "@supabase/supabase-js";
import { getStorageAdapter } from "@/lib/storage";

export interface AuthUser {
  id: string;
  email: string | null;
  createdAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type AuthListener = (state: AuthState) => void;

export class AuthService {
  private static instance: AuthService;
  private client: SupabaseClient | null = null;
  private currentUser: AuthUser | null = null;
  private isLoading = true;
  private listeners: Set<AuthListener> = new Set();

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  public getState(): AuthState {
    return {
      user: this.currentUser,
      isAuthenticated: Boolean(this.currentUser),
      isLoading: this.isLoading,
    };
  }

  public getCurrentUserId(): string {
    return this.currentUser?.id || "local-user";
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  public async init(url?: string, key?: string): Promise<void> {
    this.isLoading = true;
    this.notify();

    try {
      const storage = await getStorageAdapter();
      const savedUrl = url || (await storage.getSetting<string>("supabase_url", ""));
      const savedKey = key || (await storage.getSetting<string>("supabase_key", ""));

      if (savedUrl && savedKey) {
        this.client = createClient(savedUrl, savedKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        });

        // Check active session
        const { data: { session } } = await this.client.auth.getSession();
        if (session?.user) {
          this.setCurrentUserFromSupabase(session.user);
        } else {
          // Check cached local user profile if offline
          const cachedUser = await storage.getSetting<AuthUser | null>("auth_cached_user", null);
          this.currentUser = cachedUser;
        }

        this.client.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            this.setCurrentUserFromSupabase(session.user);
            await storage.setSetting("auth_cached_user", this.currentUser);
          } else {
            this.currentUser = null;
            await storage.setSetting("auth_cached_user", null);
          }
          this.notify();
        });
      } else {
        this.client = null;
        this.currentUser = null;
      }
    } catch (e) {
      console.warn("[AuthService] Initialization warning:", e);
      this.currentUser = null;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async configureClient(url: string, key: string): Promise<void> {
    await this.init(url, key);
  }

  private setCurrentUserFromSupabase(user: User) {
    this.currentUser = {
      id: user.id,
      email: user.email || null,
      createdAt: user.created_at,
    };
  }

  public async signUp(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!this.client) {
      return { user: null, error: "Supabase connection is not configured. Add credentials in Settings." };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        this.setCurrentUserFromSupabase(data.user);
        const storage = await getStorageAdapter();
        await storage.setSetting("auth_cached_user", this.currentUser);
        this.notify();
        return { user: this.currentUser, error: null };
      }

      return { user: null, error: "Please check your email for confirmation link." };
    } catch (err: unknown) {
      return { user: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    if (!this.client) {
      return { user: null, error: "Supabase connection is not configured. Add credentials in Settings." };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        this.setCurrentUserFromSupabase(data.user);
        const storage = await getStorageAdapter();
        await storage.setSetting("auth_cached_user", this.currentUser);
        this.notify();
        return { user: this.currentUser, error: null };
      }

      return { user: null, error: "No user returned." };
    } catch (err: unknown) {
      return { user: null, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async signOut(): Promise<void> {
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (e) {
        console.warn("[AuthService] Sign out error:", e);
      }
    }

    const storage = await getStorageAdapter();
    await storage.setSetting("auth_cached_user", null);
    this.currentUser = null;
    this.notify();
  }
}

export const authService = AuthService.getInstance();
