import { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Redirect to sign in page if not authenticated */}

      {/* Main Content */}
      <main className="flex-1 ">{children}</main>
    </div>
  );
}
