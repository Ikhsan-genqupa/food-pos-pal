import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, AppRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user role from database
  const fetchUserRole = async (userId: string): Promise<AppRole> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.error('Error fetching user role:', error);
      return 'outlet'; // Default role
    }
    
    return data.role as AppRole;
  };

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<{ outletId?: string; outletName?: string }> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('outlet_id, outlets(name)')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return {};
    }
    
    return {
      outletId: data.outlet_id || undefined,
      outletName: (data.outlets as { name: string } | null)?.name || undefined,
    };
  };

  // Build user object from Supabase user
  const buildUser = async (supabaseUser: SupabaseUser): Promise<User> => {
    const [role, profile] = await Promise.all([
      fetchUserRole(supabaseUser.id),
      fetchUserProfile(supabaseUser.id),
    ]);

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      role,
      outletId: profile.outletId,
      outletName: profile.outletName,
    };
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Use setTimeout to prevent Supabase deadlock
          setTimeout(async () => {
            const user = await buildUser(session.user);
            setUser(user);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const user = await buildUser(session.user);
        setUser(user);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const user = await buildUser(data.user);
        setUser(user);
        setSession(data.session);
        return { success: true };
      }

      return { success: false, error: 'Login gagal' };
    } catch (error) {
      return { success: false, error: 'Terjadi kesalahan' };
    }
  };

  const signup = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // User will be set by onAuthStateChange listener
        return { success: true };
      }

      return { success: false, error: 'Pendaftaran gagal' };
    } catch (error) {
      return { success: false, error: 'Terjadi kesalahan' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
