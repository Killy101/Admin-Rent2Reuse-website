import { useSettingsStore } from "@/app/store/useSettingStore";

// ------------------------
// General Settings
// ------------------------
export const useGeneralSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.general || {};
};

// ------------------------
// Rental Settings
// ------------------------
export const useRentalSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.rental || {};
};

// ------------------------
// Subscription Settings
// ------------------------
export const useSubscriptionSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.subscription || {};
};

// ------------------------
// Voucher Settings
// ------------------------
export const useVoucherSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.voucher || {};
};

// ------------------------
// Notification Settings
// ------------------------
export const useNotificationSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.notifications || {};
};

// ------------------------
// Permission Settings
// ------------------------
export const usePermissionSettings = () => {
  const { settings } = useSettingsStore();
  return settings?.permissions || {};
};
