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

const Features = () => {
  const features = [
    {
      icon: Package,
      title: "Instant Discovery",
      description:
        "AI-powered search finds exactly what you need in seconds. Smart filters and personalized recommendations.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      stats: "10K+ items",
    },
    {
      icon: MapPin,
      title: "Hyper-Local Network",
      description:
        "Connect with verified neighbors within walking distance. Build community while reducing carbon footprint.",
      gradient: "from-teal-500 to-cyan-500",
      bgGradient: "from-teal-50 to-cyan-50",
      stats: "500m avg distance",
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-16">
          <div className="inline-flex items-center bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-full mb-6">
            <TrendingUp className="w-4 h-4 text-emerald-600 mr-2" />
            <span className="text-sm font-medium text-emerald-700">
              Revolutionary Features
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
            Rent anything you need,{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              whenever you need it
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the future of sharing economy with cutting-edge
            technology and community-driven sustainability.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className={`group relative bg-gradient-to-br ${feature.bgGradient} rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 border border-white/50 backdrop-blur-sm`}
              >
                {/* Floating Badge */}
                <div className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-gray-700 shadow-lg border border-gray-200/50">
                  {feature.stats}
                </div>

                <div
                  className={`w-20 h-20 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-all duration-300 shadow-lg`}
                >
                  <IconComponent className="w-10 h-10 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:bg-clip-text transition-all duration-300">
                  {feature.title}
                </h3>

                <p className="text-gray-600 mb-6 leading-relaxed text-lg">
                  {feature.description}
                </p>

                <button
                  className={`text-transparent bg-gradient-to-r ${feature.gradient} bg-clip-text font-semibold flex items-center justify-center mx-auto hover:scale-110 transition-all duration-300 group-hover:drop-shadow-sm`}
                >
                  Explore Feature{" "}
                  <ArrowRight className="w-5 h-5 ml-2 text-emerald-600" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Center Phone Mockup - Enhanced */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-80 h-96 bg-gradient-to-b from-gray-900 to-black rounded-[2.5rem] p-3 shadow-2xl">
              <div className="w-full h-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-[2rem] overflow-hidden relative">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl">
                      <Shield className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <h4 className="font-bold text-2xl mb-3 drop-shadow-lg">
                      Secure & Trusted
                    </h4>
                    <p className="text-lg opacity-90 mb-6 drop-shadow">
                      End-to-end encrypted transactions
                    </p>

                    {/* Enhanced rental cards */}
                    <div className="space-y-3">
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-sm border border-white/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🔨</span>
                            <span className="font-semibold">Power Tools</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">$12/day</div>
                            <div className="text-xs opacity-75">⭐ 4.9</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-sm border border-white/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">🎪</span>
                            <span className="font-semibold">Party Tent</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">$25/day</div>
                            <div className="text-xs opacity-75">⭐ 4.8</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 bg-emerald-500 text-white p-3 rounded-2xl shadow-xl animate-pulse">
              <div className="text-xs font-semibold">Verified ✓</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
