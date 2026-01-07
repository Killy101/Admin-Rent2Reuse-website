"use client";
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/app/firebase/config";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Download,
  Search,
  Grid3X3,
  List,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  ImageOff,
  Eye,
  Package,
  DollarSign,
  PhilippinePeso,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, MapPin, Star, User, Mail, Phone } from "lucide-react";

const TOOL_CATEGORIES = [
  "Power Tools & Hand Tools",
  "Construction & Workshop Equipment",
  "Audio & Visual Equipment",
  "Electronics & Computing",
  "Gardening Tools",
  "Camping & Outdoor Gear",
  "Measuring & Detection Tools",
  "Cleaning Equipment",
  "Lifting & Moving Tools",
  "Lighting & Photography",
  "Automotive Tools",
  "Event & Entertainment Equipment",
  "Safety Equipment",
  "Specialty Tools",
  "Other",
];

type Item = {
  id: string;
  owner: {
    fullname: string;
  };
  images: string[];
  itemName: string;
  itemDesc: string;
  itemCategory: string;
  itemMinRentDuration: number;
  itemPrice: number;
  itemCondition: string;
  itemLocation:
    | string
    | { address: string; longitude: number; latitude: number; radius: number };
  createdAt: { seconds: number; nanoseconds: number };
  userId: string;
  itemStatus: string;
};

type Rental = {
  id: string;
  itemId: string;
  renterID: string;
  startDate: { seconds: number; nanoseconds: number };
  endDate?: { seconds: number; nanoseconds: number };
  totalAmount: number;
  status: string;
};

type RenterUser = {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
};

const ItemListPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [rentalStatusFilter, setRentalStatusFilter] = useState<
    "all" | "rented" | "available"
  >("all");

  // Helper function to get location display text
  const getLocationText = (
    location:
      | string
      | { address: string; longitude: number; latitude: number; radius: number }
  ): string => {
    if (typeof location === "object" && typeof location.address === "string") {
      return location.address;
    }
    if (typeof location === "string") {
      return location;
    }
    return "Location not specified";
  };

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const itemsData: Item[] = [];
        const categories = new Set<string>();

        querySnapshot.forEach((doc) => {
          const item = { id: doc.id, ...doc.data() } as Item;
          itemsData.push(item);
          if (item.itemCategory) {
            categories.add(item.itemCategory);
          }
        });

        setItems(itemsData);
        setFilteredItems(itemsData);
        setAvailableCategories(Array.from(categories));
        setLoading(false);
      } catch (error) {
        console.log("Error fetching items:", error);
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  useEffect(() => {
    const filtered = items.filter((item) => {
      const matchesSearch =
        !search ||
        item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        item.itemDesc?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        (item.itemCategory && selectedCategories.includes(item.itemCategory));

      const matchesRentalStatus =
        rentalStatusFilter === "all" ||
        (rentalStatusFilter === "rented" &&
          item.itemStatus?.toLowerCase() === "rented") ||
        (rentalStatusFilter === "available" &&
          item.itemStatus?.toLowerCase() === "available");

      return matchesSearch && matchesCategory && matchesRentalStatus;
    });
    setFilteredItems(filtered);
  }, [search, items, selectedCategories, rentalStatusFilter]);

  const exportToCSV = () => {
    const headers = [
      "Item Name",
      "Owner",
      "Category",
      "Price",
      "Status",
      "Location",
    ];
    const data = filteredItems.map((item) => [
      item.itemName,
      item.owner.fullname,
      item.itemCategory,
      item.itemPrice,
      item.itemStatus,
      getLocationText(item.itemLocation),
    ]);

    const csvContent = [
      headers.join(","),
      ...data.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "items-list.csv";
    a.click();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleOpenModal = (item: Item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalOpen(false);
  };

  // Calculate stats
  const availableItems = items.filter(
    (item) => item.itemStatus?.toLowerCase() === "available"
  ).length;
  const unavailableItems = items.filter(
    (item) => item.itemStatus?.toLowerCase() !== "available"
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white p-8 rounded-2xl shadow-xl"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Loading Items
            </h3>
            <p className="text-gray-500">
              Fetching the latest inventory data...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-12"
                >
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                      <img
                        src="/assets/logoWhite.png"
                        className="w-8 h-8 object-contain"
                        alt="Logo"
                      />
                    </div>
                    <div>
                      <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                        List of Items
                      </h1>
                      <p className="text-lg text-gray-600 mt-2">
                        Monitor all rental items with ease
                      </p>
                    </div>
                  </div>
                  <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
                </motion.div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={exportToCSV}
                  className="bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-lg transition-all duration-300 border-gray-200"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Total Items
                    </p>
                    <p className="text-3xl font-bold">{items.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-200" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">
                      Available
                    </p>
                    <p className="text-3xl font-bold">{availableItems}</p>
                  </div>
                  <Sparkles className="w-8 h-8 text-green-200" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">
                      Unavailable
                    </p>
                    <p className="text-3xl font-bold">
                      {unavailableItems.toLocaleString()}
                    </p>
                  </div>
                  <Sparkles className="w-8 h-8 text-green-200" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Search and filter section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-xl border border-white/20 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Search items by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg h-12 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:ring-0 bg-white/50 backdrop-blur-sm transition-all duration-300"
              />
            </div>

            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <Filter className="w-4 h-4 mr-2" />
                    Categories
                    {selectedCategories.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-white/20 text-white border-0"
                      >
                        {selectedCategories.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[300px] max-h-[400px] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl"
                >
                  {availableCategories.map((category) => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                      className="px-4 py-3 hover:bg-gray-50 rounded-xl mx-2"
                    >
                      {category}
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {
                          items.filter((item) => item.itemCategory === category)
                            .length
                        }
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex bg-gray-100 rounded-2xl p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-xl transition-all duration-300 ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={`rounded-xl transition-all duration-300 ${
                    viewMode === "table"
                      ? "bg-white shadow-sm"
                      : "hover:bg-gray-200"
                  }`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Selected categories display */}
          <AnimatePresence>
            {selectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-600 font-medium">
                    Active filters:
                  </span>
                  {selectedCategories.map((category) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge
                        variant="secondary"
                        className="cursor-pointer flex items-center gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors px-3 py-1 rounded-full"
                        onClick={() => handleCategoryChange(category)}
                      >
                        {category}
                        <span className="text-xs bg-blue-200 px-1.5 py-0.5 rounded-full">
                          {
                            items.filter(
                              (item) => item.itemCategory === category
                            ).length
                          }
                        </span>
                        <span className="ml-1 text-xs hover:text-red-600">
                          ×
                        </span>
                      </Badge>
                    </motion.div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCategories([])}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full px-3 py-1"
                  >
                    Clear all
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rental Status Filter */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.05 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 font-medium">
                Rental Status:
              </span>
              <Button
                variant={rentalStatusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setRentalStatusFilter("all")}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${
                  rentalStatusFilter === "all"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                All Items
              </Button>
              <Button
                variant={
                  rentalStatusFilter === "available" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setRentalStatusFilter("available")}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${
                  rentalStatusFilter === "available"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Available
              </Button>
              <Button
                variant={
                  rentalStatusFilter === "rented" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setRentalStatusFilter("rented")}
                className={`rounded-full px-4 py-2 transition-all duration-300 ${
                  rentalStatusFilter === "rented"
                    ? "bg-orange-500 text-white hover:bg-orange-600"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Rented
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Items display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20">
                      <div className="relative h-48 overflow-hidden">
                        {item.images && item.images.length > 0 ? (
                          <Image
                            src={item.images[0]}
                            alt={item.itemName}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
                            <ImageOff className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={
                              item.itemStatus?.toLowerCase() === "available"
                                ? "default"
                                : "secondary"
                            }
                            className={`${
                              item.itemStatus?.toLowerCase() === "available"
                                ? "bg-green-500 hover:bg-green-600"
                                : "bg-blue-500"
                            } text-white shadow-lg`}
                          >
                            {item.itemStatus.charAt(0).toUpperCase() +
                              item.itemStatus.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">
                            {item.itemName}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {item.itemCategory}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.itemDesc}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">
                              {getLocationText(item.itemLocation)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                            <PhilippinePeso className="w-4 h-4" />
                            {item.itemPrice}
                            <span className="text-sm text-gray-500 font-normal">
                              /day
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenModal(item)}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl py-2.5 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* Table View */
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      {[
                        "IMAGE",
                        "NAME",
                        "CATEGORY",
                        "PRICE (₱/day)",
                        "STATUS",
                        "LOCATION",
                        "ACTIONS",
                      ].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <AnimatePresence>
                      {filteredItems.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.02 }}
                          className="hover:bg-gray-50/80 transition-colors duration-200 group"
                        >
                          <td className="px-6 py-4">
                            {item.images && item.images.length > 0 ? (
                              <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                                <Image
                                  src={item.images[0]}
                                  alt={item.itemName}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                                <ImageOff className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {item.itemName}
                              </p>
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {item.itemDesc}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="bg-gray-50">
                              {item.itemCategory}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-lg text-gray-900">
                              ₱{item.itemPrice}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                item.itemStatus?.toLowerCase() === "available"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`${
                                item.itemStatus?.toLowerCase() === "available"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500"
                              } text-white`}
                            >
                              {item.itemStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 max-w-32 truncate">
                              {getLocationText(item.itemLocation)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenModal(item)}
                              className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>

        {/* Enhanced footer stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg border border-white/20"
        >
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredItems.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">
                {items.length}
              </span>{" "}
              items
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Available: {availableItems}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                Unavailable: {items.length - availableItems}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Item Details Modal */}
        <ItemDetailsModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
};

// Enhanced ItemDetailsModal component
const ItemDetailsModal = ({
  item,
  isOpen,
  onClose,
}: {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [activeImage, setActiveImage] = useState(0);
  const [rentalInfo, setRentalInfo] = useState<Rental | null>(null);
  const [renterUser, setRenterUser] = useState<RenterUser | null>(null);
  const [loadingRental, setLoadingRental] = useState(false);

  // NEW: prohibit state & saving flag
  const [isProhibited, setIsProhibited] = useState<boolean>(
    !!item && item.itemStatus?.toLowerCase() === "prohibited"
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActiveImage(0);
    setIsProhibited(!!item && item.itemStatus?.toLowerCase() === "prohibited");
  }, [item]);

  // NEW: toggle prohibit / deactivate item
  const toggleProhibit = async () => {
    if (!item) return;
    setIsSaving(true);
    try {
      const newStatus = isProhibited ? "available" : "prohibited";
      await updateDoc(doc(db, "items", item.id), {
        itemStatus: newStatus,
      });
      setIsProhibited(!isProhibited);
      // Optional: quick local update so UI reflects change immediately
      // (if parent relies on re-fetch, it will still update later)
      (item as any).itemStatus = newStatus;
    } catch (err) {
      console.log("Error updating item status:", err);
      alert("Failed to update item status. See console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to get location display text
  const getLocationText = (
    location:
      | string
      | { address: string; longitude: number; latitude: number; radius: number }
  ): string => {
    if (typeof location === "object" && typeof location.address === "string") {
      return location.address;
    }
    if (typeof location === "string") {
      return location;
    }
    return "Location not specified";
  };

  // Helper function to get additional location info
  const getLocationDetails = (
    location:
      | string
      | { address: string; longitude: number; latitude: number; radius: number }
  ) => {
    if (typeof location === "object" && location?.radius) {
      return location.radius;
    }
    return null;
  };

  // Fetch rental information if item is rented
  useEffect(() => {
    const fetchRentalInfo = async () => {
      if (!item || item.itemStatus?.toLowerCase() !== "rented") {
        setRentalInfo(null);
        setRenterUser(null);
        return;
      }

      setLoadingRental(true);
      try {
        const rentalQuery = query(
          collection(db, "rentals"),
          orderBy("createdAt", "desc")
        );
        const rentalDocs = await getDocs(rentalQuery);
        const rentals = rentalDocs.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              renterID: data.renterID || data.renterId || "", // Handle both field name variations
            } as Rental;
          })
          .filter((rental) => rental.itemId === item.id);

        if (rentals.length > 0) {
          console.log("Rental fetched:", rentals[0]); // Debug log
          setRentalInfo(rentals[0]); // Get the most recent rental
        } else {
          setRentalInfo(null);
          setRenterUser(null);
        }
      } catch (error) {
        console.log("Error fetching rental info:", error);
        setRentalInfo(null);
        setRenterUser(null);
      } finally {
        setLoadingRental(false);
      }
    };

    fetchRentalInfo();
  }, [item]);

  // Fetch renter user information when rental info is available
  useEffect(() => {
    const fetchRenterUser = async () => {
      if (!rentalInfo || !rentalInfo.renterID) {
        setRenterUser(null);
        return;
      }

      try {
        const usersCollection = collection(db, "users");
        const userDocs = await getDocs(usersCollection);
        const user = userDocs.docs.find(
          (doc) => doc.id === rentalInfo.renterID
        );

        if (user) {
          const userData = user.data();
          setRenterUser({
            id: user.id,
            fullName: userData.fullName || userData.displayName || "N/A",
            email: userData.email || "N/A",
            phone: userData.phone || "N/A",
            address: userData.address || "N/A",
            profileImage: userData.profileImage || userData.photoURL,
          });
        } else {
          setRenterUser(null);
        }
      } catch (error) {
        console.log("Error fetching renter user:", error);
        setRenterUser(null);
      }
    };

    fetchRenterUser();
  }, [rentalInfo]);

  useEffect(() => {
    if (item?.images) {
      setActiveImage(0);
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="min-w-[50vw] max-h-[90vh] flex flex-col overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl">
        {/* Fixed Header */}
        <DialogHeader className="relative border-b border-white/30 pb-6 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm rounded-t-3xl -m-6 mb-0 p-6 flex-shrink-0">
          <DialogTitle className="text-3xl font-bold flex items-center gap-4">
            <div className="relative p-4 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shadow-lg">
              <Package className="w-7 h-7 text-white" />
              <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-900">{item.itemName}</span>
                <Badge
                  variant={
                    item.itemStatus?.toLowerCase() === "available"
                      ? "default"
                      : "secondary"
                  }
                  className={`px-4 py-1.5 text-sm font-medium rounded-full ${
                    item.itemStatus?.toLowerCase() === "available"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                      : "bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md"
                  } transition-all duration-300`}
                >
                  {item.itemStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  ID: {item.id}
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  Owner: {item.owner.fullname}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          <div className="py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Enhanced Image Gallery */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Main Image Container with Scroll */}
                <div className="relative h-[480px] w-full bg-gradient-to-br from-gray-50 via-white to-blue-50/30 rounded-3xl overflow-hidden shadow-2xl border border-white/50">
                  {item.images && item.images.length > 0 ? (
                    <>
                      <div className="h-full overflow-auto">
                        <Image
                          src={item.images[activeImage]}
                          alt={item.itemName}
                          fill
                          className="object-contain transition-all duration-700 hover:scale-105"
                          priority
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4">
                        <div className="p-6 bg-gray-100 rounded-full mx-auto w-fit">
                          <ImageOff className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          No images available
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery with Horizontal Scroll */}
                {item.images && item.images.length > 1 && (
                  <div className="relative">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-gray-100">
                      <div className="flex gap-3 pb-2 min-w-max">
                        {item.images.map((img, index) => (
                          <motion.div
                            key={index}
                            whileHover={{ scale: 1.08, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={`relative h-20 w-24 flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer border-3 transition-all duration-300 shadow-md hover:shadow-lg ${
                              index === activeImage
                                ? "border-blue-500 shadow-blue-200 ring-2 ring-blue-200"
                                : "border-white hover:border-blue-200"
                            }`}
                            onClick={() => setActiveImage(index)}
                          >
                            <Image
                              src={img}
                              alt={`${item.itemName} ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            {index === activeImage && (
                              <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 rounded-2xl"></div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    {/* Scroll Indicators */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none rounded-r-2xl"></div>
                  </div>
                )}
              </motion.div>

              {/* Enhanced Item Details with Scroll */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                className="space-y-8"
              >
                {/* Item Header */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                    {item.itemName}
                  </h2>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium">
                      {item.itemCategory}
                    </span>
                  </div>
                  {/* Scrollable Description */}
                  <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                    <p className="text-gray-700 leading-relaxed">
                      {item.itemDesc ||
                        "No description available for this item."}
                    </p>
                  </div>
                </div>

                {/* Price Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border border-green-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                      <PhilippinePeso className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        Daily Rate
                      </p>
                      <span className="text-2xl font-bold text-green-800">
                        ₱{item.itemPrice}
                      </span>
                      <span className="text-green-600 ml-2">per day</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Location
                      </p>
                      <span className="text-gray-900 font-semibold">
                        {getLocationText(item.itemLocation)}
                      </span>
                      {/* Optionally show additional location details if needed */}
                      {getLocationDetails(item.itemLocation) && (
                        <div className="text-xs text-gray-500 mt-1">
                          Radius: {getLocationDetails(item.itemLocation)}km
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Minimum Duration
                      </p>
                      <span className="text-gray-900 font-semibold">
                        {item.itemMinRentDuration} day
                        {item.itemMinRentDuration > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Condition
                      </p>
                      <span className="text-gray-900 font-semibold">
                        {item.itemCondition}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Date Added
                      </p>
                      <span className="text-gray-900 font-semibold">
                        {new Date(
                          item.createdAt.seconds * 1000
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Details Section */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-white/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Item Category
                      </p>
                      <span className="text-gray-900 font-semibold">
                        {item.itemCategory}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rental Information Section - Only shows if item is rented */}
                {item.itemStatus?.toLowerCase() === "rented" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 shadow-md border border-orange-100 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-lg">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-orange-900">
                        Current Rental Information
                      </h3>
                    </div>

                    {loadingRental ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <span className="ml-2 text-orange-700">
                          Loading rental details...
                        </span>
                      </div>
                    ) : rentalInfo ? (
                      <div className="space-y-4">
                        {/* Renter ID - Prominent display for management */}
                        <div className="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-5 border-2 border-orange-300">
                          <p className="text-xs text-orange-700 font-bold mb-2 uppercase tracking-wide">
                            Renter ID (For Management)
                          </p>
                          <div className="flex items-center gap-3">
                            <code className="flex-1 text-sm font-mono font-bold text-gray-900 bg-white/60 px-4 py-2 rounded-lg break-all">
                              {rentalInfo.renterID &&
                              rentalInfo.renterID.length > 0
                                ? rentalInfo.renterID
                                : "Loading..."}
                            </code>
                            {rentalInfo.renterID && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    rentalInfo.renterID
                                  );
                                }}
                                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                              >
                                Copy
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Start Date, End Date, and Amount */}
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-white/70 rounded-xl p-4">
                            <p className="text-xs text-orange-600 font-medium mb-1">
                              START DATE
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {rentalInfo.startDate
                                ? new Date(
                                    rentalInfo.startDate.seconds * 1000
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </p>
                          </div>
                          <div className="bg-white/70 rounded-xl p-4">
                            <p className="text-xs text-orange-600 font-medium mb-1">
                              END DATE (Expected Return)
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {rentalInfo.endDate
                                ? new Date(
                                    rentalInfo.endDate.seconds * 1000
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </p>
                          </div>
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                            <p className="text-xs text-green-600 font-medium mb-1">
                              TOTAL AMOUNT
                            </p>
                            <p className="text-lg font-bold text-green-700">
                              ₱{rentalInfo.totalAmount}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white/70 rounded-xl p-4 text-center">
                        <p className="text-gray-600">
                          No rental information found for this item.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Renter User Information Section - Shows when rental info is available */}
                {renterUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 shadow-md border border-blue-100 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900">
                        Renter Information
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Profile Image if available */}
                      {renterUser.profileImage && (
                        <div className="flex justify-center mb-4">
                          <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200 shadow-lg">
                            <Image
                              src={renterUser.profileImage}
                              alt={renterUser.fullName || "Renter"}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* Full Name */}
                      <div className="bg-white/70 rounded-xl p-4">
                        <p className="text-xs text-blue-600 font-medium mb-1">
                          FULL NAME
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {renterUser.fullName}
                        </p>
                      </div>

                      {/* Email and Phone */}
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white/70 rounded-xl p-4 flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-blue-600 font-medium mb-1">
                              EMAIL
                            </p>
                            <p className="text-sm font-semibold text-gray-900 break-words">
                              {renterUser.email}
                            </p>
                          </div>
                        </div>
                        <div className="bg-white/70 rounded-xl p-4 flex items-center gap-3">
                          <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-blue-600 font-medium mb-1">
                              PHONE
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {renterUser.phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="bg-white/70 rounded-xl p-4">
                        <p className="text-xs text-blue-600 font-medium mb-1">
                          ADDRESS
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {renterUser.address}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <DialogFooter className="bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm border-t border-white/30 rounded-b-3xl -m-6 mt-0 p-6 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="flex-1">
            {isProhibited ? (
              <div className="inline-flex items-center gap-3 bg-red-50 text-red-800 px-4 py-2 rounded-xl border border-red-100">
                <strong>Warning:</strong>
                <span>This item is prohibited and cannot be rented.</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-xl border border-yellow-100">
                <strong>Note:</strong>
                <span>This item is available for rent.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
              disabled={isSaving}
            >
              Close
            </Button>

            <Button
              onClick={toggleProhibit}
              className={`rounded-xl px-4 py-2 font-semibold ${
                isProhibited
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : isProhibited
                ? "Reactivate Item"
                : "Prohibit Item"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemListPage;
