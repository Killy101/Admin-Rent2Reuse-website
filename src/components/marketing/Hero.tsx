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
const Hero = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const features = ["Smart", "Better", "Faster", "Greener"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            >
              <div
                className={`w-2 h-2 bg-gradient-to-r from-emerald-300 to-cyan-300 rounded-full opacity-40`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-lg border border-emerald-200/50">
              <Zap className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="text-sm font-medium text-emerald-700">
                Sustainable Living Made Simple
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-tight mb-6">
              Rent{" "}
              <div className="inline-block">
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
                  {features[currentFeature]}
                </span>
              </div>
              <br />
              <span className="text-4xl sm:text-5xl lg:text-6xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Reuse Better
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Transform your neighborhood into a sharing economy. Access
              thousands of items instantly while building a sustainable future
              together.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8">
              {[
                { number: "10K+", label: "Happy Users" },
                { number: "50K+", label: "Items Shared" },
                { number: "95%", label: "Satisfaction" },
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button className="group flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl shadow-xl hover:shadow-emerald-500/25 transition-all transform hover:scale-105 font-semibold text-lg">
                <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>Get Started Free</span>
              </button>

              <button className="flex items-center justify-center space-x-3 bg-white/80 backdrop-blur-sm text-gray-800 px-8 py-4 rounded-2xl border border-gray-200/50 hover:bg-white hover:shadow-xl transition-all font-semibold text-lg">
                <Camera className="w-6 h-6" />
                <span>List Your Items</span>
              </button>
            </div>
          </div>

          {/* Right Content - Enhanced Phone Mockup */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Floating Cards */}
              <div className="absolute -top-8 -left-8 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-gray-200/50 animate-bounce">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-800">
                    2 nearby rentals
                  </span>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-2xl shadow-xl animate-pulse">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 fill-current" />
                  <span className="text-sm font-semibold">Eco-Friendly ♻️</span>
                </div>
              </div>

              {/* Phone Frame */}
              <div className="w-80 h-[600px] bg-gradient-to-b from-gray-800 to-black rounded-[3rem] p-3 shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-700">
                <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                  {/* Status Bar */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-12 flex items-center justify-between px-6 text-white">
                    <span className="font-medium">9:41</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-3 bg-white/30 rounded-sm"></div>
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xl">RentReuse</h3>
                      <div className="relative">
                        <Search className="w-6 h-6" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                      </div>
                    </div>
                    <p className="text-emerald-100 text-sm mt-1">
                      Find items near you
                    </p>
                  </div>

                  {/* App Content */}
                  <div className="p-6 bg-gradient-to-b from-gray-50 to-white h-full">
                    {/* Search Bar */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200/50 mb-6">
                      <div className="flex items-center space-x-3">
                        <Search className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-500">
                          Search "power tools"
                        </span>
                      </div>
                    </div>

                    {/* Featured Item */}
                    <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-200/50 mb-6 hover:shadow-xl transition-shadow">
                      <div className="bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100 h-32 rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden">
                        <div className="text-5xl animate-bounce">🔨</div>
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Popular
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 text-lg">
                        Professional Power Drill
                      </h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Complete toolkit with 50+ bits
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <span className="text-2xl font-bold text-emerald-600">
                            $12
                          </span>
                          <span className="text-gray-500 text-sm">/day</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>0.8km away</span>
                        </div>
                      </div>
                      <div className="flex items-center mt-3 space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-current text-yellow-400"
                          />
                        ))}
                        <span className="text-xs text-gray-500 ml-2">
                          (24 reviews)
                        </span>
                      </div>
                    </div>

                    {/* Quick Categories */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-2xl">
                        <Package className="w-6 h-6 mb-2" />
                        <span className="text-sm font-semibold">
                          Browse Items
                        </span>
                      </div>
                      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-4 rounded-2xl">
                        <Camera className="w-6 h-6 mb-2" />
                        <span className="text-sm font-semibold">
                          List Items
                        </span>
                      </div>
                    </div>

                    {/* Bottom Stats */}
                    <div className="text-center bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl">
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        2,847
                      </div>
                      <div className="text-sm text-gray-600">
                        Items Available Nearby
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
