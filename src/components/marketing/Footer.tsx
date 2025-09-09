import React from "react";
import { Package } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">RentReuse</span>
            </div>
            <p className="text-gray-400">
              Rent smart, reuse better. Building a sustainable community
              together.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Browse Items
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  List Your Items
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Safety Guidelines
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Terms & Privacy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Get the App</h3>
            <div className="space-y-3">
              <button className="block w-full text-left bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors group">
                <div className="text-xs text-gray-400 group-hover:text-green-400 transition-colors">
                  GET IT ON
                </div>
                <div className="text-sm font-semibold">Google Play</div>
              </button>
              <button className="block w-full text-left bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors group">
                <div className="text-xs text-gray-400 group-hover:text-green-400 transition-colors">
                  Download on the
                </div>
                <div className="text-sm font-semibold">App Store</div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
          <p>
            &copy; 2024 RentReuse. All rights reserved. Building sustainable
            communities.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
