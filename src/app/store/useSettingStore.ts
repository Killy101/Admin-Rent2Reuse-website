import { create } from "zustand";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";

interface SettingsState {
  settings: any;
  loaded: boolean;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  loaded: false,

  loadSettings: async () => {
    const sections = [
      "general",
      "rental",
      "subscription",
      "voucher",
      "notifications",
      "permissions"
    ];

    const data: any = {};
    for (const s of sections) {
      const snap = await getDoc(doc(db, "settings", s));
      data[s] = snap.exists() ? snap.data() : {};
    }

    set({ settings: data, loaded: true });
  },
}));
