// Define all roles as a union type
export type AdminRole =
  | "superAdmin"
  | "admin"
  | "support"
  | "manageUsers"
  | "financialViewer"
  | "contentManager";

// Define a navigation item type
export type NavigationItem = {
  name: string;
  href: string;
  icon?: React.ReactNode;
  allowedRoles?: AdminRole[]; // optional: roles allowed to see this item
};

// Example navigation items
export const navigationItems: NavigationItem[] = [
  { name: "Dashboard", href: "/admin", allowedRoles: ["superAdmin", "admin", "support", "manageUsers", "financialViewer", "contentManager"] },
  { name: "Users", href: "/admin/manageUsers", allowedRoles: ["superAdmin", "admin", "manageUsers"] },
  { name: "Team", href: "/admin/team", allowedRoles: ["superAdmin", "admin"] },
  { name: "Payments", href: "/admin/payments", allowedRoles: ["superAdmin", "admin", "financialViewer"] },
  { name: "Inventory", href: "/admin/itemList", allowedRoles: ["superAdmin", "admin", "contentManager", "manageUsers"] },
  { name: "Announcements", href: "/admin/announcements", allowedRoles: ["superAdmin", "admin", "support", "contentManager"] },
  { name: "Subscriptions", href: "/admin/subscription/subscriptionsList", allowedRoles: ["superAdmin", "admin", "financialViewer"] },
  { name: "Support", href: "/admin/support", allowedRoles: ["superAdmin", "admin", "support"] },
  { name: "Profile", href: "/admin/profile", allowedRoles: ["superAdmin", "admin", "support", "manageUsers", "financialViewer", "contentManager"] },
];
