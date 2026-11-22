import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

export const supabaseUrl = "https://mzaqqpqbgvtjjzhdnnnz.supabase.co";

export const supabasePublishableKey =
  "sb_publishable_rMexfO183SaYHIMbsfZc7Q_OFs6mmyS";

// Chỉ sử dụng AsyncStorage trên Android và iOS
const isNative = Platform.OS !== "web";

// Tạo Supabase Client
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    ...(isNative ? { storage: AsyncStorage } : {}),

    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Quản lý tự động làm mới session trên Android/iOS
if (isNative) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
