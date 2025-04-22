"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard, FileText, Merge, Scissors } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              <FileText size={24} /> 
              <span>CloudPDF</span>
            </Link>
            {user && (
              <div className="hidden md:flex space-x-1 items-center border-l border-gray-200 dark:border-gray-700 pl-4">
                <NavLink href="/dashboard">
                  <LayoutDashboard size={18} className="mr-1" />
                  Dashboard
                </NavLink>
                <NavLink href="/pdf-viewer">
                  <FileText size={18} className="mr-1" />
                  Viewer
                </NavLink>
                <NavLink href="/pdf-tools/merge">
                  <Merge size={18} className="mr-1" />
                  Merge
                </NavLink>
                <NavLink href="/pdf-tools/split">
                  <Scissors size={18} className="mr-1" />
                  Split
                </NavLink>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex items-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
    >
      {children}
    </Link>
  );
} 