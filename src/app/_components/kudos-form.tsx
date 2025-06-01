"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import imageCompression from "browser-image-compression";

interface KudosFormProps {
  purchaseId?: string;
  onSuccess?: () => void;
}

export const KudosForm: React.FC<KudosFormProps> = ({ purchaseId, onSuccess }) => {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createKudos = api.kudos.createKudos.useMutation();  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }
    setError(null);
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }
    if (files.length) {
      setError(null);
      setImages(files);
      setPreviews(files.map((file) => URL.createObjectURL(file)));
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Compress images before converting to base64
      const compressedImages = await Promise.all(
        images.map((file) =>
          imageCompression(file, {
            maxSizeMB: 0.5, // Target max size 0.5MB per image
            maxWidthOrHeight: 1200, // Resize if larger than 1200px
            useWebWorker: true,
          })
        )
      );      // Convert compressed images to base64
      const base64Images = await Promise.all(
        compressedImages.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                if (result) {
                  resolve(result.split(",")[1]!);
                } else {
                  reject(new Error("Failed to read file"));
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );
      await createKudos.mutateAsync({
        message,
        purchaseId,
        images: base64Images,
      });
      setMessage("");
      setImages([]);
      setPreviews([]);
      if (inputRef.current) inputRef.current.value = "";      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send Kudos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-md:w-3xl max-w-4xl mx-auto p-6 space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 border bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-bold">Say Thanks (Kudos)</h2>
        <textarea
          className="w-full border rounded p-2"
          placeholder="Write a short message of thanks..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          required
        />
        {/* Drag and drop area */}
        <div
          className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnd={handleDragLeave}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            tabIndex={-1}
          />
          <div className="z-10 flex flex-col items-center pointer-events-none">
            <svg
              className="w-10 h-10 mb-2 text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16V8a4 4 0 018 0v8m-4 4v-4m0 0H5m4 0h6"
              />
            </svg>            <span className="text-gray-600 text-sm">
              Drag & drop images here, or{" "}
              <span className="underline">click to select</span>
            </span>            <span className="text-xs text-gray-400 mt-1">
              Maximum 5 images, 0.5MB each
              {images.length > 0 && (
                <span className={`ml-2 ${images.length === 5 ? 'text-red-500' : 'text-blue-500'}`}>
                  ({images.length}/5)
                </span>
              )}
            </span>
          </div>
        </div>        {previews.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">            {previews.map((src, i) => (
              <div key={i} className="relative group">
                <div className="relative w-24 h-24">
                  <Image
                    src={src}
                    alt="preview"
                    fill
                    className="object-cover rounded border shadow"
                    sizes="96px"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newImages = images.filter((_, index) => index !== i);
                    const newPreviews = previews.filter((_, index) => index !== i);
                    setImages(newImages);
                    setPreviews(newPreviews);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            Uploading images and sending Kudos...
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Kudos"}
        </button>
      </form>
    </div>
  );
};

export default KudosForm;