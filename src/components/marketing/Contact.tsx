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

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "general",
  });

  interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
    type: string;
  }

  interface ContactInfo {
    icon: React.ElementType;
    title: string;
    details: string;
    description: string;
    color: string;
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  interface ContactFormSubmitEvent extends React.FormEvent<HTMLFormElement> {}

  interface ResetFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
    type: string;
  }

  const handleSubmit = (e: ContactFormSubmitEvent) => {
    e.preventDefault();
    alert("Thank you for your message! We'll get back to you soon.");
    const resetData: ResetFormData = {
      name: "",
      email: "",
      subject: "",
      message: "",
      type: "general",
    };
    setFormData(resetData);
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Support",
      details: "hello@rentreuse.com",
      description: "Get help within 2 hours, 24/7",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Phone,
      title: "Phone Support",
      details: "+1 (555) 123-RENT",
      description: "Mon-Fri 8AM-8PM PST",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      details: "Available in app",
      description: "Instant support for urgent issues",
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <section
      id="contact"
      className="py-24 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-200 to-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full mb-6 shadow-lg border border-gray-200/50">
            <MessageCircle className="w-4 h-4 text-emerald-600 mr-2" />
            <span className="text-sm font-medium text-emerald-700">
              Get In Touch
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">
            We're Here to Help
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Have questions about RentReuse? Need support? Our community team is
            here to help you succeed.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Enhanced Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-gray-200/50 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full transform translate-x-16 -translate-y-16"></div>

              <div className="relative z-10">
                <h3 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                  <Send className="w-8 h-8 text-emerald-600 mr-3" />
                  Send Us a Message
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Inquiry Type
                      </label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="safety">Safety Concern</option>
                        <option value="partnership">Partnership</option>
                        <option value="feedback">Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white/80 backdrop-blur-sm"
                        placeholder="How can we help?"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Message
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none bg-white/80 backdrop-blur-sm"
                      placeholder="Tell us more about how we can help..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all transform hover:scale-105 font-semibold text-lg flex items-center justify-center space-x-3"
                  >
                    <Send className="w-6 h-6" />
                    <span>Send Message</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Enhanced Contact Info & Features */}
          <div className="space-y-8">
            {/* Contact Information */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-200/50 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full transform translate-x-12 -translate-y-12"></div>

              <h3 className="text-2xl font-bold text-gray-900 mb-6 relative z-10">
                Contact Information
              </h3>

              <div className="space-y-6 relative z-10">
                {contactInfo.map((info, index) => {
                  const IconComponent = info.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-4 group"
                    >
                      <div
                        className={`w-14 h-14 bg-gradient-to-r ${info.color} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {info.title}
                        </h4>
                        <p
                          className={`bg-gradient-to-r ${info.color} bg-clip-text text-transparent font-semibold text-lg`}
                        >
                          {info.details}
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Stats Card */}
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-3xl"></div>
              <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full"></div>

              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">
                  Why Choose RentReuse?
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-6 h-6 text-emerald-200" />
                    <span className="font-semibold">
                      24/7 Community Support
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-emerald-200" />
                    <span className="font-semibold">2-hour Response Time</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-emerald-200" />
                    <span className="font-semibold">100,000+ Happy Users</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-6 h-6 text-emerald-200" />
                    <span className="font-semibold">Fully Insured Rentals</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-emerald-300/30">
                  <p className="text-emerald-100 text-sm italic leading-relaxed">
                    "RentReuse transformed how our community shares resources.
                    The support team is incredible!"
                  </p>
                  <p className="text-white font-semibold text-sm mt-3">
                    - Maria S., Community Leader
                  </p>
                </div>
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-200/50">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Quick FAQ
              </h3>

              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-2">
                    How do I start renting items?
                  </h4>
                  <p className="text-gray-600">
                    Simply download the app, verify your identity, and start
                    browsing available items in your area.
                  </p>
                </div>
                <div className="pb-4 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Are rentals insured?
                  </h4>
                  <p className="text-gray-600">
                    Yes! All rentals are covered by our comprehensive insurance
                    policy for your peace of mind.
                  </p>
                </div>
              </div>

              <button className="mt-6 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors flex items-center">
                View All FAQ <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
