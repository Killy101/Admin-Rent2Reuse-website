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
const Reviews = () => {
  const reviews = [
    {
      name: "Sarah Johnson",
      role: "Small Business Owner",
      avatar: "SJ",
      rating: 5,
      review:
        "RentReuse saved me thousands on equipment for my catering business. The drill set I rented was perfect for my kitchen renovation!",
      achievement: "Saved $2,500 on tools",
      color: "from-pink-500 to-rose-500",
    },
    {
      name: "Michael Chen",
      role: "Weekend DIYer",
      avatar: "MC",
      rating: 5,
      review:
        "Amazing community! Borrowed a pressure washer for my deck project. The owner was super helpful and even gave me usage tips.",
      achievement: "Completed dream deck",
      color: "from-blue-500 to-indigo-500",
    },
    {
      name: "Emma Rodriguez",
      role: "Event Planner",
      avatar: "ER",
      rating: 5,
      review:
        "The party tent rental made my daughter's birthday unforgettable. Great quality, fair price, and eco-friendly too!",
      achievement: "Perfect party setup",
      color: "from-purple-500 to-violet-500",
    },
    {
      name: "David Thompson",
      role: "Home Renovator",
      avatar: "DT",
      rating: 5,
      review:
        "Renovated my entire bathroom using rented tools. The app made finding everything so easy. Highly recommend!",
      achievement: "Full bathroom renovation",
      color: "from-green-500 to-emerald-500",
    },
    {
      name: "Lisa Park",
      role: "Gardening Enthusiast",
      avatar: "LP",
      rating: 5,
      review:
        "Rented a tiller for my garden project. The owner delivered it to my door! This app builds real community connections.",
      achievement: "Dream garden created",
      color: "from-amber-500 to-yellow-500",
    },
    {
      name: "James Wilson",
      role: "Photography Student",
      avatar: "JW",
      rating: 5,
      review:
        "Professional camera gear at fraction of buying cost. Perfect for building my portfolio without breaking the bank.",
      achievement: "Professional portfolio",
      color: "from-teal-500 to-cyan-500",
    },
  ];

  const stats = [
    { number: "50K+", label: "Happy Rentals", icon: Package },
    { number: "4.9", label: "App Rating", icon: Star },
    { number: "100K+", label: "Active Users", icon: Users },
    { number: "95%", label: "Success Rate", icon: Trophy },
  ];

  return (
    <section
      id="reviews"
      className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-lg border border-gray-200/50">
            <Quote className="w-4 h-4 text-emerald-600 mr-2" />
            <span className="text-sm font-medium text-emerald-700">
              Community Stories
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
            What Our Community Says
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Real stories from real people who are building a more sustainable
            future together.
          </p>
        </div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="text-center bg-white/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-semibold">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Reviews Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-200/50 group transform hover:-translate-y-2 relative overflow-hidden"
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${review.color} opacity-5 group-hover:opacity-10 transition-opacity duration-300 rounded-3xl`}
              ></div>

              {/* Quote icon with enhanced styling */}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${review.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Quote className="w-6 h-6 text-white" />
                </div>
                <div className="flex space-x-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-current text-yellow-400 group-hover:scale-110 transition-transform duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              </div>

              {/* Review text */}
              <p className="text-gray-700 mb-6 leading-relaxed italic text-lg relative z-10">
                "{review.review}"
              </p>

              {/* Achievement badge */}
              <div
                className={`bg-gradient-to-r ${review.color} bg-opacity-10 rounded-2xl px-4 py-3 mb-6 relative z-10`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">✨</span>
                  <span
                    className={`bg-gradient-to-r ${review.color} bg-clip-text text-transparent font-bold text-sm`}
                  >
                    {review.achievement}
                  </span>
                </div>
              </div>

              {/* Reviewer info */}
              <div className="flex items-center relative z-10">
                <div
                  className={`w-14 h-14 bg-gradient-to-r ${review.color} rounded-2xl flex items-center justify-center text-white font-bold text-lg mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  {review.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    {review.name}
                  </h4>
                  <p className="text-gray-600">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced bottom CTA */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-10 shadow-2xl text-white max-w-4xl mx-auto relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-3xl"></div>
            <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full"></div>

            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-4">
                Ready to Join Our Community?
              </h3>
              <p className="text-emerald-100 mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
                Start your sustainable sharing journey today and become part of
                a movement that's changing how we consume and share resources.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-emerald-600 px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all transform hover:scale-105 font-semibold text-lg shadow-lg">
                  Download Free App
                </button>
                <button className="border-2 border-white/30 text-white px-8 py-4 rounded-2xl hover:bg-white/10 transition-all font-semibold text-lg backdrop-blur-sm">
                  Browse Success Stories
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Reviews;
