"use client";

import React, { useState, useEffect } from "react";
import {
  Star,
  Package,
  MapPin,
  Shield,
  ArrowRight,
  Play,
  Camera,
  Search,
  Mail,
  Phone,
  Send,
  MessageCircle,
  Clock,
  Users,
  Lightbulb,
  Target,
  Trophy,
  Quote,
  Menu,
  X,
  ChevronDown,
  Heart,
  Zap,
  TrendingUp,
} from "lucide-react";

// Enhanced Navigation Component
const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-lg shadow-xl border-b border-gray-200/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              RentReuse
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#how-it-works"
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              How It Works
            </a>
            <a
              href="#features"
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#reviews"
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Reviews
            </a>
            <a
              href="#contact"
              className="text-gray-700 hover:text-emerald-600 transition-colors font-medium"
            >
              Contact
            </a>
            <button className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all transform hover:scale-105 font-semibold">
              Download App
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg bg-gray-100/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-lg shadow-xl border-b border-gray-200/50">
            <div className="px-4 py-6 space-y-4">
              <a
                href="#how-it-works"
                className="block text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                How It Works
              </a>
              <a
                href="#features"
                className="block text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#reviews"
                className="block text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                Reviews
              </a>
              <a
                href="#contact"
                className="block text-gray-700 hover:text-emerald-600 transition-colors font-medium"
              >
                Contact
              </a>
              <button className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-3 rounded-full font-semibold">
                Download App
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
