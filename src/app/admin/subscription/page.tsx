"use client";
import { db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Users,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Star,
  Crown,
  Gem,
  Award,
  Sparkles,
  Calendar,
  DollarSign,
  Package,
  Settings,
} from "lucide-react";

type Plan = {
  id: string;
  description: string;
  price: number;
  rent: number;
  list: number;
  color: string;
  textColor: string;
  duration: string;
  planType: string;
  useCustomDescription?: boolean;
};

const PLAN_BADGES = {
  free: "/badge/bronzeBadge.png",
  basic: "/badge/silverBadge.png",
  premium: "/badge/goldBadge.png",
  platinum: "/badge/platinumBadge.png",
};

const PLAN_COLORS = {
  free: "amber",
  basic: "lightblue",
  premium: "gold",
  platinum: "grayish-white",
} as const;

const PLAN_ICONS = {
  free: Award,
  basic: Shield,
  premium: Crown,
  platinum: Gem,
};

export default function PlansManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Form state
  const [planDescription, setPlanDescription] = useState("");
  const [planPrice, setPlanPrice] = useState<number>(0);
  const [planList, setPlanList] = useState<number>(0);
  const [planRent, setPlanRent] = useState<number>(0);
  const [planColor, setPlanColor] = useState("blue");
  const [planTextColor, setPlanTextColor] = useState("white");
  const [planDuration, setPlanDuration] = useState("monthly");
  const [planType, setPlanType] = useState("basic");
  const [useCustomDescription, setUseCustomDescription] = useState(false);

  const planTypeOptions = [
    { name: "Free", value: "free", color: PLAN_COLORS.free, icon: Award },
    { name: "Basic", value: "basic", color: PLAN_COLORS.basic, icon: Shield },
    {
      name: "Premium",
      value: "premium",
      color: PLAN_COLORS.premium,
      icon: Crown,
    },
    {
      name: "Platinum",
      value: "platinum",
      color: PLAN_COLORS.platinum,
      icon: Gem,
    },
  ];

  const colorOptions = [
    { name: "Gray", value: "gray" },
    { name: "Blue", value: "blue" },
    { name: "Purple", value: "purple" },
    { name: "Yellow", value: "yellow" },
  ];

  const durationOptions = [
    { name: "Monthly", value: "monthly" },
    { name: "Quarterly", value: "quarterly" },
    { name: "Semi-Annual", value: "semi-annual" },
    { name: "Annual", value: "annual" },
  ];

  // Generate description based on inputs
  const generateDescription = () => {
    if (planPrice === 0 && planType === "free") {
      return `Start for free! Enjoy access to our rental platform at no cost. Rent up to ${planRent} items and list ${planList} item for sale. A great option to explore the features and benefits before upgrading.`;
    }
    const durationText =
      {
        Unlimited: "unlimited",
        monthly: "month",
        quarterly: "quarter",
        "semi-annual": "half year",
        annual: "year",
      }[planDuration] || planDuration;

    const planTypeCapitalized =
      planType.charAt(0).toUpperCase() + planType.slice(1);

    return `${planTypeCapitalized} plan for ₱${planPrice.toLocaleString()} per ${durationText}. Rent up to ${planRent} items and list up to ${planList} items for sale.`;
  };

  // Update description when relevant fields change
  useEffect(() => {
    if (!useCustomDescription) {
      if (planType === "free") {
        setPlanDuration("unlimited");
        setPlanDescription(
          `Start for free! Enjoy access to our rental platform at no cost. Rent up to ${planRent} items and list ${planList} item concurrently. A great option to explore the features and benefits before upgrading.`
        );
      } else {
        setPlanDescription(generateDescription());
      }
    }
  }, [
    planPrice,
    planRent,
    planList,
    planDuration,
    planType,
    useCustomDescription,
  ]);

  // Validation checks
  if (isNaN(planPrice)) {
    console.log("Invalid price value. Setting to 0.");
    setPlanPrice(0);
    return;
  }

  if (isNaN(planRent)) {
    console.log("Invalid rent value. Setting to 0.");
    setPlanRent(0);
    return;
  }

  if (isNaN(planList)) {
    console.log("Invalid list value. Setting to 0.");
    setPlanList(0);
    return;
  }

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const snapshot = await getDocs(collection(db, "plans"));
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            description: d.description,
            price: d.price,
            rent: d.rent,
            list: d.list,
            color: d.color || "blue",
            textColor: d.textColor || "white",
            isPopular: d.isPopular || false,
            duration: d.duration || "monthly",
            planType: d.planType || "basic",
            useCustomDescription: d.useCustomDescription || false,
          };
        });
        setPlans(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching plans:", error);
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Modal functions
  const openAddPlanModal = () => {
    setPlanPrice(0.0);
    setPlanRent(0.0);
    setPlanList(0.0);
    setPlanColor("blue");
    setPlanTextColor("white");
    setPlanDuration("monthly");
    setPlanType("basic");
    setUseCustomDescription(false);
    setIsEditMode(false);
    setIsPlanModalOpen(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanDescription(plan.description);
    setPlanPrice(plan.price);
    setPlanRent(plan.rent);
    setPlanList(plan.list);
    setPlanColor(plan.color);
    setPlanTextColor(plan.textColor);
    setPlanDuration(plan.duration);
    setPlanType(plan.planType || "basic");
    setUseCustomDescription(plan.useCustomDescription || false);
    setIsEditMode(true);
    setIsPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    setSelectedPlan(null);
  };

  const isPlanTypeExists = (type: string, excludeId: string | null = null) => {
    return plans.some(
      (plan) => plan.planType === type && plan.id !== excludeId
    );
  };

  const savePlan = async () => {
    if (!planDescription.trim()) {
      alert(
        "Please fill all required fields and ensure values are greater than zero."
      );
      return;
    }

    try {
      const planData = {
        description: planDescription,
        price: planPrice,
        rent: planRent,
        list: planList,
        color: planColor,
        textColor: planTextColor,
        duration: planType === "free" ? "unlimited" : planDuration,
        planType: planType,
        useCustomDescription: useCustomDescription,
      };

      if (isEditMode && selectedPlan) {
        if (planType !== selectedPlan.planType && isPlanTypeExists(planType)) {
          alert(
            `A ${
              planTypeOptions.find((pt) => pt.value === planType)?.name
            } plan already exists. Please edit the existing plan instead.`
          );
          return;
        }

        await updateDoc(doc(db, "plans", selectedPlan.id), planData);
        setPlans(
          plans.map((plan) =>
            plan.id === selectedPlan.id ? { ...plan, ...planData } : plan
          )
        );
      } else {
        if (isPlanTypeExists(planType)) {
          alert(
            `A ${
              planTypeOptions.find((pt) => pt.value === planType)?.name
            } plan already exists. Please edit the existing plan instead.`
          );
          return;
        }

        const docRef = await addDoc(collection(db, "plans"), planData);
        setPlans([...plans, { id: docRef.id, ...planData }]);
      }

      closePlanModal();
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Failed to save plan. Please try again.");
    }
  };

  const deletePlan = async (planId: string) => {
    if (window.confirm("Are you sure you want to delete this plan?")) {
      try {
        await deleteDoc(doc(db, "plans", planId));
        setPlans(plans.filter((plan) => plan.id !== planId));
      } catch (error) {
        console.error("Error deleting plan:", error);
        alert("Failed to delete plan. Please try again.");
      }
    }
  };

  const getBgColorClass = (planType: string) => {
    const gradientMap: Record<string, string> = {
      free: "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500",
      basic: "bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700",
      premium: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500",
      platinum: "bg-gradient-to-br from-purple-400 via-pink-400 to-indigo-500",
    };

    return (
      gradientMap[planType as keyof typeof gradientMap] ||
      "bg-gradient-to-br from-gray-400 to-gray-600"
    );
  };

  const getTextColorClass = (textColor: string) => `text-${textColor}`;

  const getPlanTypeDisplay = (planType: string) => {
    return (
      planTypeOptions.find((pt) => pt.value === planType)?.name || planType
    );
  };

  useEffect(() => {
    const planColor = PLAN_COLORS[planType as keyof typeof PLAN_COLORS];
    setPlanColor(planColor);
    setPlanTextColor("white");
  }, [planType]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Glassmorphism */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-teal-600/10"></div>
          <motion.div
            animate={{
              background: [
                "radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 40% 60%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
              ],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute inset-0"
          />
        </div>

        <div className="relative z-10 text-center py-20 px-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
            className="inline-flex items-center gap-6 mb-8"
          >
            <div className="relative group">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-teal-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity"
              />
              <div className="relative p-5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-3xl shadow-2xl">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Settings className="w-14 h-14 text-white" />
                </motion.div>
              </div>
            </div>

            <div className="text-left">
              <motion.h1
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-7xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent"
              >
                Subscriptions
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="text-xl text-slate-600 mt-3 font-semibold"
              >
                Comprehensive subscription management dashboard
              </motion.p>
            </div>
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 1, duration: 1.2, ease: "easeInOut" }}
            className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 rounded-full mx-auto shadow-lg"
            style={{ width: "8rem" }}
          />

          {/* Floating decorative elements */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-20 left-20 w-20 h-20 bg-blue-400/20 rounded-full blur-xl"
          />
          <motion.div
            animate={{ y: [10, -10, 10] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute top-40 right-20 w-16 h-16 bg-purple-400/20 rounded-full blur-xl"
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Enhanced Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex items-center justify-between mb-10 bg-white/60 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-white/30"
        >
          {/* <div className="flex space-x-4">
            <Link
              href="/admin/subscription/subscriptionsList"
              className="group relative flex items-center px-8 py-4 text-slate-600 bg-white/80 rounded-2xl shadow-lg border border-white/50 hover:bg-white transition-all duration-300 hover:shadow-xl font-semibold"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              />
              <Shield className="h-6 w-6 mr-3 relative z-10" />
              <span className="relative z-10">Subscribers List</span>
            </Link>

            <button className="group relative flex items-center px-8 py-4 text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl font-bold shadow-xl border border-white/20 transition-all duration-300 hover:shadow-2xl hover:scale-105">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Users className="h-6 w-6 mr-3" />
              </motion.div>
              Plans Management
              <Sparkles className="h-4 w-4 ml-2" />
            </button>
          </div> */}

          <motion.button
            onClick={openAddPlanModal}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-xl hover:shadow-2xl font-bold"
          >
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Plus className="h-6 w-6 mr-3" />
            </motion.div>
            Add New Plan
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"
            />
          </motion.button>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
              <div
                className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "0.8s",
                }}
              ></div>
            </motion.div>
          </div>
        ) : (
          <>
            {/* Enhanced Plans Grid */}
            {plans.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                <AnimatePresence>
                  {plans
                    .sort((a, b) => a.price - b.price)
                    .map((plan, index) => {
                      const IconComponent =
                        PLAN_ICONS[plan.planType as keyof typeof PLAN_ICONS] ||
                        Shield;
                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, y: 50, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -50, scale: 0.9 }}
                          transition={{
                            delay: index * 0.1,
                            duration: 0.6,
                            type: "spring",
                          }}
                          whileHover={{ y: -8, scale: 1.02 }}
                          className="group relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden border border-white/30 hover:shadow-2xl transition-all duration-500"
                        >
                          {/* Popular badge for premium plans */}
                          {plan.planType === "premium" && (
                            <motion.div
                              initial={{ opacity: 0, x: 50 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="absolute top-4 right-4 z-10"
                            >
                              <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                                <Star className="w-3 h-3 mr-1" />
                                POPULAR
                              </div>
                            </motion.div>
                          )}

                          {/* Plan Header */}
                          <div
                            className={`${getBgColorClass(
                              plan.planType
                            )} p-8 relative overflow-hidden`}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="absolute -top-10 -right-10 w-32 h-32 opacity-10"
                            >
                              <IconComponent className="w-full h-full" />
                            </motion.div>

                            <div className="relative z-10">
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center space-x-3 mb-4"
                              >
                                <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/30">
                                  <div className="w-10 h-10 relative mr-3">
                                    <Image
                                      src={
                                        PLAN_BADGES[
                                          plan.planType as keyof typeof PLAN_BADGES
                                        ]
                                      }
                                      alt={`${getPlanTypeDisplay(
                                        plan.planType
                                      )} badge`}
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <IconComponent className="w-5 h-5 text-white mr-2" />
                                    <span
                                      className={`text-lg font-bold ${getTextColorClass(
                                        plan.textColor
                                      )}`}
                                    >
                                      {getPlanTypeDisplay(
                                        plan.planType || "basic"
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>

                              <p
                                className={`text-sm ${getTextColorClass(
                                  plan.textColor
                                )} opacity-90 mb-6 leading-relaxed`}
                              >
                                {plan.description}
                              </p>

                              <div className="flex items-end space-x-2">
                                <motion.span
                                  whileHover={{ scale: 1.1 }}
                                  className={`text-4xl font-black ${getTextColorClass(
                                    plan.textColor
                                  )}`}
                                >
                                  ₱{plan.price.toLocaleString()}
                                </motion.span>
                                <span
                                  className={`text-sm ${getTextColorClass(
                                    plan.textColor
                                  )} opacity-75 mb-1`}
                                >
                                  /{plan.duration}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Plan Features */}
                          <div className="p-8">
                            <h4 className="text-lg font-bold mb-6 text-slate-800 flex items-center">
                              <Package className="w-5 h-5 mr-2 text-indigo-600" />
                              Features & Limitations
                            </h4>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                  <span className="text-slate-700 font-medium">
                                    Max Concurrent Rentals
                                  </span>
                                </div>
                                <span className="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                  {plan.rent.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                                  <span className="text-slate-700 font-medium">
                                    Max Concurrent Listings
                                  </span>
                                </div>
                                <span className="font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                                  {plan.list.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="p-6 pt-0 flex space-x-3">
                            <motion.button
                              onClick={() => openEditPlanModal(plan)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex-1 group flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                            >
                              <Edit3 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                              Edit Plan
                            </motion.button>
                            <motion.button
                              onClick={() => deletePlan(plan.id)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="group px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-12 text-center border border-white/30"
              >
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Package className="h-10 w-10 text-indigo-600" />
                </motion.div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  No plans created yet
                </h3>
                <p className="text-slate-600 mb-8 text-lg">
                  Create your first subscription plan to get started with your
                  platform
                </p>
                <motion.button
                  onClick={openAddPlanModal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl font-bold inline-flex items-center"
                >
                  <Plus className="h-6 w-6 mr-3" />
                  Create First Plan
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="ml-2"
                  >
                    <Sparkles className="w-5 h-5" />
                  </motion.div>
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden transform border border-white/30 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 px-8 py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute top-2 right-20 w-8 h-8 opacity-20"
                >
                  <Settings className="w-full h-full text-white" />
                </motion.div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"
                    >
                      {isEditMode ? (
                        <Edit3 className="w-6 h-6 text-white" />
                      ) : (
                        <Plus className="w-6 h-6 text-white" />
                      )}
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {isEditMode
                          ? "Edit Subscription Plan"
                          : "Create New Plan"}
                      </h2>
                      <p className="text-white/80 mt-1">
                        {isEditMode
                          ? "Modify your existing plan settings"
                          : "Configure your new subscription plan"}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    onClick={closePlanModal}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all"
                  >
                    <X className="w-6 h-6 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Plan Type Selection */}
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-4 flex items-center">
                      <Crown className="w-4 h-4 mr-2" />
                      Plan Type*
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {planTypeOptions.map((option) => {
                        const IconComponent = option.icon;
                        const isSelected = planType === option.value;
                        const isDisabled = isPlanTypeExists(
                          option.value,
                          selectedPlan?.id || null
                        );

                        return (
                          <motion.button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              !isDisabled &&
                              !isEditMode &&
                              setPlanType(option.value)
                            }
                            disabled={isDisabled || isEditMode}
                            whileHover={
                              !isDisabled && !isEditMode ? { scale: 1.05 } : {}
                            }
                            whileTap={
                              !isDisabled && !isEditMode ? { scale: 0.95 } : {}
                            }
                            className={`relative p-4 rounded-2xl border-2 transition-all duration-300 ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                : isDisabled
                                ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50"
                            }`}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <IconComponent
                                className={`w-6 h-6 ${
                                  isSelected
                                    ? "text-indigo-600"
                                    : isDisabled
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                }`}
                              />
                              <span className="font-semibold text-sm">
                                {option.name}
                              </span>
                              {isDisabled && (
                                <span className="text-xs text-red-500">
                                  Exists
                                </span>
                              )}
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center"
                                >
                                  <Check className="w-3 h-3 text-white" />
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    {isEditMode && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-amber-600 mt-2 flex items-center bg-amber-50 p-3 rounded-xl border border-amber-200"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Plan type cannot be changed after creation.
                      </motion.p>
                    )}
                  </div>

                  {/* Price Input */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Price (₱)*
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={planPrice}
                        onChange={(e) => setPlanPrice(Number(e.target.value))}
                        className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all pl-12 font-semibold text-lg"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                        ₱
                      </div>
                    </div>
                  </motion.div>

                  {/* Duration Selection */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Duration
                    </label>
                    <select
                      value={planType === "free" ? "unlimited" : planDuration}
                      onChange={(e) => setPlanDuration(e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                      disabled={planType === "free"}
                    >
                      {durationOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={
                            planType === "free" && option.value !== "unlimited"
                          }
                        >
                          {option.name}
                        </option>
                      ))}
                    </select>
                    {planType === "free" && (
                      <p className="text-sm text-blue-600 mt-2 flex items-center bg-blue-50 p-2 rounded-xl">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Free plans are always unlimited duration
                      </p>
                    )}
                  </motion.div>

                  {/* Rent Limit */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Number of Items User Can Rent*
                    </label>
                    <input
                      type="number"
                      value={planRent}
                      onChange={(e) => setPlanRent(Number(e.target.value))}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. 2"
                      min="0"
                    />
                  </motion.div>

                  {/* List Limit */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Number of Items User Can List*
                    </label>
                    <input
                      type="number"
                      value={planList}
                      onChange={(e) => setPlanList(Number(e.target.value))}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. 2"
                      min="0"
                    />
                  </motion.div>

                  {/* Text Color */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      Text Color
                    </label>
                    <div className="flex space-x-3">
                      {["white", "black"].map((color) => (
                        <motion.button
                          key={color}
                          type="button"
                          onClick={() => setPlanTextColor(color)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex-1 p-3 rounded-2xl border-2 transition-all ${
                            planTextColor === color
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full mx-auto mb-2 ${
                              color === "white"
                                ? "bg-white border-2 border-gray-300"
                                : "bg-black"
                            }`}
                          ></div>
                          <span className="font-semibold capitalize">
                            {color}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Custom Description Toggle */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="col-span-2 mt-4"
                  >
                    <motion.label
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={useCustomDescription}
                        onChange={(e) =>
                          setUseCustomDescription(e.target.checked)
                        }
                        className="w-6 h-6 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                      <span className="ml-3 text-sm font-semibold text-slate-700 flex items-center">
                        <Edit3 className="w-4 h-4 mr-2" />
                        Use custom description
                      </span>
                    </motion.label>
                  </motion.div>

                  {/* Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="col-span-2"
                  >
                    <label className="block text-sm font-bold text-slate-700 mb-3">
                      {useCustomDescription
                        ? "Custom Description*"
                        : "Auto-Generated Description"}
                    </label>
                    <div className="relative">
                      <textarea
                        value={planDescription}
                        onChange={(e) => setPlanDescription(e.target.value)}
                        rows={4}
                        className={`w-full p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none ${
                          !useCustomDescription
                            ? "bg-gray-50 border-gray-200 text-gray-600"
                            : "border-gray-200"
                        }`}
                        placeholder="Plan description"
                        readOnly={!useCustomDescription}
                      />
                      {!useCustomDescription && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                        >
                          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200 shadow-lg">
                            <p className="text-sm text-gray-600 text-center max-w-md">
                              <Sparkles className="w-4 h-4 inline mr-2" />
                              Auto-generated based on your inputs. Enable "Use
                              custom description" to edit manually.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>

                  {/* Plan Preview */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="col-span-2 mt-6"
                  >
                    <h4 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
                      <Star className="w-5 h-5 mr-2" />
                      Plan Preview
                    </h4>
                    <div className="relative bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-16 h-16 relative">
                          <Image
                            src={
                              PLAN_BADGES[planType as keyof typeof PLAN_BADGES]
                            }
                            alt={`${getPlanTypeDisplay(planType)} badge`}
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <h5 className="text-xl font-bold text-gray-800 mb-2">
                          {getPlanTypeDisplay(planType)}
                        </h5>
                        <p className="text-3xl font-black text-indigo-600 mb-1">
                          ₱{planPrice.toLocaleString()}
                        </p>
                        <p className="text-gray-600">
                          /{planType === "free" ? "unlimited" : planDuration}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200"
                >
                  <motion.button
                    onClick={closePlanModal}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 border-2 border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-all font-semibold"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={savePlan}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold flex items-center"
                  >
                    {isEditMode ? (
                      <>
                        <Edit3 className="w-5 h-5 mr-2" />
                        Update Plan
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Create Plan
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
