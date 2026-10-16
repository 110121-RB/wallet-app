import { supabase } from "@/config/supabase";
import { AuthContextType, UserType } from "@/types";
import { User } from "@supabase/supabase-js";
import React, { createContext, ReactNode, useEffect, useState } from "react";

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Get profile data from users table
   */
  const getUserData = async (uid: string, authUser?: User) => {
    try {
      console.log("===== GET USER START =====");
      console.log("UID:", uid);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      console.log("DATA:", data);
      console.log("ERROR:", error);

      if (error) {
        console.log("Profile error:", error);
        return null;
      }

      if (!data) {
        console.log("No profile found");

        const fallbackEmail = authUser?.email ?? null;

        const fallbackName =
          (authUser?.user_metadata?.name as string | undefined) ??
          fallbackEmail?.split("@")[0] ??
          "User";

        const { data: createdProfile, error: createError } = await supabase
          .from("users")
          .insert({
            id: uid,
            email: fallbackEmail,
            name: fallbackName,
          })
          .select("*")
          .single();

        if (createError) {
          console.log("Create missing profile error:", createError);

          const fallbackUser: UserType = {
            uid,
            email: fallbackEmail,
            name: fallbackName,
            image: null,
          };

          setUser(fallbackUser);

          return fallbackUser;
        }

        const userData: UserType = {
          uid: createdProfile.id,
          email: createdProfile.email,
          name: createdProfile.name,
          image: createdProfile.image ?? null,
        };

        console.log("Created user:", userData);

        setUser(userData);

        return userData;
      }

      const userData: UserType = {
        uid: data.id,
        email: data.email,
        name: data.name,
        image: data.image ?? null,
      };

      console.log("User loaded:", userData);

      setUser(userData);

      return userData;
    } catch (error) {
      console.log("GET USER CRASH:", error);
      return null;
    }
  };

  /**
   * Initialize existing session
   */
  const initializeAuth = async () => {
    try {
      console.log("===== INITIALIZE AUTH START =====");

      setLoading(true);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("Session:", session);

      if (error) {
        console.log("Session error:", error);
        setUser(null);
        return;
      }

      if (!session?.user) {
        console.log("No session user");
        setUser(null);
        return;
      }

      console.log("Loading existing user...");

      await getUserData(session.user.id, session.user);
    } catch (error) {
      console.log("Initialize auth error:", error);
      setUser(null);
    } finally {
      console.log("===== INITIALIZE AUTH END =====");
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        if (session?.user?.id) {
          /**
           * IMPORTANT:
           * Do not await Supabase requests inside
           * onAuthStateChange.
           */
          setTimeout(() => {
            getUserData(session.user.id, session.user);
          }, 0);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Login
   */
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          msg: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          msg: "Failed to login",
        };
      }

      /**
       * Do NOT call getUserData here.
       * SIGNED_IN event will handle it.
       */
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        msg: error.message,
      };
    }
  };

  /**
   * Register
   */
  const register = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          msg: error.message,
        };
      }

      if (!data.user) {
        return {
          success: false,
          msg: "Failed to create user",
        };
      }

      const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        name,
      });

      if (insertError) {
        return {
          success: false,
          msg: insertError.message,
        };
      }

      setUser({
        uid: data.user.id,
        email,
        name,
        image: null,
      });

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        msg: error.message,
      };
    }
  };

  /**
   * Logout
   */
  const logout = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log("Logout error:", error);
      return;
    }

    setUser(null);
  };

  /**
   * Update user data
   */
  const updateUserData = async (uid: string): Promise<void> => {
    await getUserData(uid);
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    setUser,
    login,
    register,
    logout,
    updateUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
