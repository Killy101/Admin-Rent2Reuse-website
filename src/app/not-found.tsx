import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      {/* Logo */}
      <Image
        src="/assets/logo.png" // Path to your logo
        alt="Logo"
        width={270}
        height={48}
        className="mb-6"
      />

      {/* Error Message */}
      <h1 className="text-4xl font-bold text-red-500 mb-4">
        404 - Page Not Found
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        Sorry, the page you are looking for does not exist.
      </p>

      {/* Back to Home Button */}
      <Link
        href="/"
        className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
      >
        Go Back to Home
      </Link>
    </div>
  );
}
