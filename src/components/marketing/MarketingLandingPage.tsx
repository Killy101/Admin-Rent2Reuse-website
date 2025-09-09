import React from "react";
import Navigation from "./Navigation";
import Hero from "./Hero";
import Features from "./Features";
import CallToAction from "./CallToAction";
import Footer from "./Footer";
import Contact from "./Contact";
import HowItWorks from "./HowItWorks";
import Reviews from "./Reviews";

const MarketingLandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />
      <Hero />
      <Features />
      {/* <CallToAction /> */}
      <HowItWorks />
      <Reviews />
      <Contact />
      <Footer />
    </div>
  );
};

export default MarketingLandingPage;
