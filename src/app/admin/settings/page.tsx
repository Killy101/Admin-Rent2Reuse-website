"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase/config";

const settingsTabs = [
  { id: "general", label: "General" },
  { id: "rental", label: "Rental Rules" },
  { id: "subscription", label: "Subscriptions" },
  { id: "voucher", label: "Vouchers" },
  { id: "notifications", label: "Notifications" },
  { id: "permissions", label: "Permissions" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      const ref = doc(db, "settings", activeTab);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings(snap.data());
      } else {
        setSettings({});
      }
      setLoading(false);
    };
    loadSettings();
  }, [activeTab]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    await updateDoc(doc(db, "settings", activeTab), settings);
    setSaving(false);
    alert("Settings saved!");
  };

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <div className="w-64 border-r bg-white p-4">
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <div className="space-y-2">
          {settingsTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left p-2 rounded-lg ${
                activeTab === t.id ? "bg-blue-600 text-white" : "hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">{settingsTabs.find(t => t.id === activeTab)?.label}</h1>

        {/* Render forms */}
        {renderSettingsForm(activeTab, settings, setSettings)}

        {/* Save Button */}
        <button
          onClick={saveSettings}
          className="mt-6 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// --- FORMS RENDERER ---

function renderSettingsForm(tab: string, settings: any, setSettings: any) {
  const change = (field: string, value: any) =>
    setSettings({ ...settings, [field]: value });

  switch (tab) {
    case "general":
      return (
        <div className="space-y-4">
          <Input label="App Name" value={settings.appName} onChange={(e: any) => change("appName", e.target.value)} />
          <Input label="Contact Email" value={settings.contactEmail} onChange={(e: any) => change("contactEmail", e.target.value)} />
          <Input label="Currency" value={settings.currency} onChange={(e: any) => change("currency", e.target.value)} />
          <Input label="Service Fee (%)" type="number" value={settings.serviceFee} onChange={(e: any) => change("serviceFee", Number(e.target.value))} />
        </div>
      );

    case "rental":
      return (
        <div className="space-y-4">
          <Input label="Min Rental Days" type="number" value={settings.minRentalDays} onChange={(e: any) => change("minRentalDays", Number(e.target.value))} />
          <Input label="Max Rental Days" type="number" value={settings.maxRentalDays} onChange={(e: any) => change("maxRentalDays", Number(e.target.value))} />
          <Toggle label="Enable Late Fees" value={settings.lateFeeEnabled} onChange={(v: any) => change("lateFeeEnabled", v)} />
          <Input label="Late Fee Rate (%)" type="number" value={settings.lateFeeRate} onChange={(e: any) => change("lateFeeRate", Number(e.target.value))} />
        </div>
      );

    case "subscription":
      return (
        <div className="space-y-4">
          <Input label="Default Plan" value={settings.defaultPlan} onChange={(e: any) => change("defaultPlan", e.target.value)} />
          <Toggle label="Enable Limited Offer" value={settings.allowLimitedOffer} onChange={(v: any) => change("allowLimitedOffer", v)} />
          <Input label="Limited Offer Discount (%)" type="number" value={settings.limitedOfferDiscount} onChange={(e: any) => change("limitedOfferDiscount", Number(e.target.value))} />
        </div>
      );

    case "voucher":
      return (
        <div className="space-y-4">
          <Toggle label="Auto-disable used vouchers" value={settings.autoDisableUsed} onChange={(v: any) => change("autoDisableUsed", v)} />
          <Input label="Max voucher use per user" type="number" value={settings.maxUsagePerUser} onChange={(e: any) => change("maxUsagePerUser", Number(e.target.value))} />
          <Input label="Voucher expiration (days)" type="number" value={settings.globalExpirationDays} onChange={(e: any) => change("globalExpirationDays", Number(e.target.value))} />
        </div>
      );

    case "notifications":
      return (
        <div className="space-y-4">
          <Input label="Sender Name" value={settings.senderName} onChange={(e: any) => change("senderName", e.target.value)} />
          <Toggle label="Send Support Ticket Updates" value={settings.sendTicketUpdates} onChange={(v: any) => change("sendTicketUpdates", v)} />
          <Toggle label="Send Subscription Expiry Notifications" value={settings.sendSubscriptionExpiry} onChange={(v: any) => change("sendSubscriptionExpiry", v)} />
        </div>
      );

    case "permissions":
      return (
        <div className="space-y-4">
          <Toggle label="Allow Role Creation" value={settings.allowRoleCreation} onChange={(v: any) => change("allowRoleCreation", v)} />
          <Toggle label="Allow Adding Admin Accounts" value={settings.allowAdminAdd} onChange={(v: any) => change("allowAdminAdd", v)} />
          <Input label="Log Retention Days" type="number" value={settings.logRetentionDays} onChange={(e: any) => change("logRetentionDays", Number(e.target.value))} />
        </div>
      );

    default:
      return <p>No settings available.</p>;
  }
}

// --- REUSABLE COMPONENTS ---

function Input({ label, ...props }: any) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 font-medium">{label}</label>
      <input className="border rounded-lg p-2" {...props} />
    </div>
  );
}

function Toggle({ label, value, onChange }: any) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <span className="font-medium">{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5"
      />
    </label>
  );
}
