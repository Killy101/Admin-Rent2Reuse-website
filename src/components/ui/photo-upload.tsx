import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { storage } from "@/app/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { FaCamera } from "react-icons/fa";

interface PhotoUploadProps {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string | null;
  storagePath: string;
  className?: string;
}

export function PhotoUpload({
  onUploadComplete,
  currentImageUrl,
  storagePath,
  className,
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      // Create a storage reference
      const storageRef = ref(
        storage,
        `${storagePath}/${Date.now()}_${file.name}`
      );

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update preview
      setPreviewUrl(downloadURL);

      // Notify parent component
      onUploadComplete(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={triggerFileInput}
        className="relative w-full h-full cursor-pointer group"
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={previewUrl}
              alt="Uploaded preview"
              fill
              className="object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <FaCamera className="text-white text-2xl" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="text-center">
              <FaCamera className="mx-auto text-gray-400 text-2xl mb-2" />
              <p className="text-sm text-gray-500">Click to upload photo</p>
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="text-white">Uploading...</div>
        </div>
      )}
    </div>
  );
}
