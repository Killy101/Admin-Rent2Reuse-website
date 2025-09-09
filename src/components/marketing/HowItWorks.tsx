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
const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "Discover & Search",
      description:
        "Use AI-powered search to find exactly what you need. Browse categories or get personalized recommendations based on your location and preferences.",
      color: "from-violet-500 to-purple-600",
      bgColor: "from-violet-50 to-purple-50",
      number: "01",
    },
    {
      icon: Target,
      title: "Connect & Reserve",
      description:
        "Chat with verified owners, check availability, and secure your rental with our built-in escrow system. All transactions are protected and insured.",
      color: "from-emerald-500 to-teal-600",
      bgColor: "from-emerald-50 to-teal-50",
      number: "02",
    },
    {
      icon: Trophy,
      title: "Use & Return",
      description:
        "Pick up your item, use it for your project, and return it when done. Rate your experience and build trust in the community.",
      color: "from-amber-500 to-orange-600",
      bgColor: "from-amber-50 to-orange-50",
      number: "03",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-full mix-blend-multiply filter blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-2xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-lg border border-gray-200/50">
            <Lightbulb className="w-4 h-4 text-emerald-600 mr-2" />
            <span className="text-sm font-medium text-emerald-700">
              Simple Process
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Get started in minutes with our streamlined process designed for
            maximum convenience and security.
          </p>
        </div>

        {/* Steps with enhanced design */}
        <div className="relative">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-32 left-1/2 transform -translate-x-1/2 w-full max-w-4xl">
            <div className="flex justify-between items-center">
              <div className="w-8 h-8"></div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-violet-300 via-emerald-300 to-amber-300 mx-8 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-300 via-emerald-300 to-amber-300 animate-pulse"></div>
              </div>
              <div className="w-8 h-8"></div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-300 to-amber-300 mx-8"></div>
              <div className="w-8 h-8"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="relative text-center group">
                  {/* Floating number badge */}
                  <div className="absolute -top-6 -right-6 lg:-top-8 lg:-right-8 z-10">
                    <div
                      className={`w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center text-white font-black text-xl lg:text-2xl shadow-xl transform rotate-12 group-hover:rotate-0 transition-all duration-500`}
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* Main card */}
                  <div
                    className={`relative bg-gradient-to-br ${step.bgColor} rounded-3xl p-8 lg:p-10 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-white/50 backdrop-blur-sm group-hover:scale-105 overflow-hidden`}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 right-4 w-32 h-32 bg-gradient-to-br from-current to-transparent rounded-full"></div>
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg relative z-10`}
                    >
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-4 relative z-10">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-lg relative z-10">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced bottom CTA */}
        <div className="text-center mt-20">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200/50 max-w-3xl mx-auto relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 rounded-3xl"></div>

            <div className="relative z-10">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to Start Sharing?
              </h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                Join our community of 50,000+ users who save money and help the
                planet by sharing resources.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all transform hover:scale-105 font-semibold text-lg">
                  Download App Now
                </button>
                <button className="bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-800 px-8 py-4 rounded-2xl hover:bg-white hover:shadow-xl transition-all font-semibold text-lg">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
