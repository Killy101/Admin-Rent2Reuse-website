import React from "react";
import { Download, Play } from "lucide-react";

const CallToAction = () => {
  return (
    <section className="py-16 bg-gradient-to-r from-green-500 to-green-700">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
          Ready to Start Renting Smarter?
        </h2>
        <p className="text-xl text-green-100 mb-8">
          Join thousands of users who are already saving money and living
          sustainably with RentReuse.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="flex items-center justify-center space-x-3 bg-white text-green-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors font-semibold">
            <Download className="w-5 h-5" />
            <span>Download for iOS</span>
          </button>

          <button className="flex items-center justify-center space-x-3 bg-black text-white px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors font-semibold">
            <Play className="w-5 h-5 fill-current" />
            <span>Download for Android</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
