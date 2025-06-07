"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import imageCompression from "browser-image-compression";
import { useSession } from "next-auth/react";

interface KudosFormProps {
  purchaseId?: string;
  onSuccess?: () => void;
}

export const KudosForm: React.FC<KudosFormProps> = ({
  purchaseId,
  onSuccess,
}) => {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const createKudos = api.kudos.createKudos.useMutation();
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "anon";

  // Christmas-themed names for anonymization
  const CHRISTMAS_NAMES = [
    "Jingle Bell",
    "Holly Berry",
    "Candy Cane",
    "Snow Flake",
    "Winter Star",
    "Frost Bite",
    "Pine Needle",
    "Sugar Plum",
    "Ginger Bread",
    "Icicle Drop",
    "Mistletoe",
    "Nutcracker",
    "Tinsel Shine",
    "Cocoa Bean",
    "Peppermint",
    "Sleigh Bell",
    "Reindeer",
    "Snowball",
    "Eggnog",
    "Christmas Tree",
    "Angel Wing",
    "Star Light",
    "Gift Wrap",
    "Ribbon Bow",
    "Ornament",
    "Candy Mint",
    "Hot Cocoa",
    "Fire Place",
    "Wreath Maker",
    "Cookie Baker",
    "Snow Angel",
    "Ice Crystal",
    "Winter Moon",
    "Frost King",
    "Snow Queen",
    "Jingle Jangle",
    "Merry Maker",
    "Joy Bringer",
    "Hope Bearer",
    "Peace Keeper",
    "Love Giver",
    "Kind Heart",
    "Gentle Soul",
    "Warm Hug",
    "Sweet Smile",
    "Bright Light",
    "Happy Helper",
    "Cheerful Elf",
    "Magic Maker",
    "Wonder Worker",
  ];

  const CHRISTMAS_AVATARS = [
    "🎅",
    "🤶",
    "🎄",
    "⭐",
    "❄️",
    "🎁",
    "🔔",
    "🕯️",
    "🍪",
    "🥛",
    "🦌",
    "⛄",
    "🎊",
    "🎉",
    "✨",
    "🌟",
    "🎀",
    "🧑‍🎄",
    "🎯",
    "🎪",
    "🍭",
    "🧤",
    "🧣",
    "👑",
    "💎",
    "🎭",
    "🎨",
    "🎵",
    "🎶",
    "💫",
  ];

  const CHRISTMAS_COLORS = [
    "bg-red-200",
    "bg-green-200",
    "bg-red-300",
    "bg-green-300",
    "bg-emerald-200",
    "bg-rose-200",
    "bg-lime-200",
    "bg-pink-200",
    "bg-teal-200",
    "bg-amber-200",
    "bg-orange-200",
    "bg-yellow-200",
    "bg-indigo-200",
    "bg-purple-200",
    "bg-cyan-200",
    "bg-slate-200",
  ];

  function getChristmasIdentity(userId: string) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const nameIndex = Math.abs(hash) % CHRISTMAS_NAMES.length;
    const avatarIndex = Math.abs(hash >> 8) % CHRISTMAS_AVATARS.length;
    const colorIndex = Math.abs(hash >> 16) % CHRISTMAS_COLORS.length;
    return {
      name: CHRISTMAS_NAMES[nameIndex]!,
      avatar: CHRISTMAS_AVATARS[avatarIndex]!,
      color: CHRISTMAS_COLORS[colorIndex]!,
    };
  }

  // Keep liveMessage in sync with message
  useEffect(() => {
    setLiveMessage(message);
  }, [message]);

  // Reset carousel index if images change
  useEffect(() => {
    if (carouselIndex >= previews.length) setCarouselIndex(0);
  }, [previews, carouselIndex]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    // Append new files to existing images, filter out duplicates by name+size
    const allFiles = [...images, ...files].filter(
      (file, idx, arr) =>
        arr.findIndex((f) => f.name === file.name && f.size === file.size) ===
        idx,
    );
    if (allFiles.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }
    setError(null);
    setImages(allFiles);
    setPreviews(allFiles.map((file) => URL.createObjectURL(file)));
    if (inputRef.current) inputRef.current.value = "";
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
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
          }),
        ),
      );
      // Convert compressed images to base64
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
            }),
        ),
      );
      await createKudos.mutateAsync({
        message,
        purchaseId,
        images: base64Images,
      });
      setMessage("");
      setImages([]);
      setPreviews([]);
      if (inputRef.current) inputRef.current.value = "";
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send Kudos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
        {/* Form: 2/3 on desktop, full on mobile */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border bg-white p-6 shadow-md md:col-span-2"
        >
          <h2 className="text-lg font-bold">Say Thanks (Kudos)</h2>
          <textarea
            className="w-full rounded border p-2"
            placeholder="Write a short message of thanks..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            required
          />
          {/* Drag and drop area */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-gray-50"
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
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              tabIndex={-1}
            />
            <div className="pointer-events-none z-10 flex flex-col items-center">
              <svg
                className="mb-2 h-10 w-10 text-blue-400"
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
              </svg>
              <span className="text-sm text-gray-600">
                Drag & drop images here, or{" "}
                <span className="underline">click to select</span>
              </span>
              <span className="mt-1 text-xs text-gray-400">
                Maximum 5 images, 0.5MB each
                {images.length > 0 && (
                  <span
                    className={`ml-2 ${images.length === 5 ? "text-red-500" : "text-blue-500"}`}
                  >
                    ({images.length}/5)
                  </span>
                )}
              </span>
            </div>
          </div>
          {previews.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="group relative">
                  <div className="relative h-24 w-24">
                    <Image
                      src={src}
                      alt="preview"
                      fill
                      className="rounded border object-cover shadow"
                      sizes="96px"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = images.filter(
                        (_, index) => index !== i,
                      );
                      const newPreviews = previews.filter(
                        (_, index) => index !== i,
                      );
                      setImages(newImages);
                      setPreviews(newPreviews);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Uploading images and sending Kudos...
            </div>
          )}
          {error && <div className="text-red-500">{error}</div>}
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Kudos"}
          </button>
        </form>
        {/* Live Preview: 1/3 on desktop, full on mobile */}
        <div className="w-full md:col-span-1">
          <div
            className={`border-opacity-50 overflow-hidden rounded-2xl border border-white shadow-md ${getChristmasIdentity(userId).color} flex min-h-[340px] flex-col p-0`}
          >
            {/* Images at the top, or placeholder */}
            <div className="w-full">
              {previews.length > 0 ? (
                <div className="relative flex aspect-square max-h-[400px] min-h-[180px] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
                  <Image
                    src={previews[carouselIndex] ?? ""}
                    alt="preview"
                    fill
                    className="max-h-[400px] rounded-lg object-contain"
                    sizes="(max-width: 768px) 100vw, 800px"
                  />
                  {previews.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        className="bg-opacity-70 absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-white p-1 shadow hover:bg-blue-100"
                        onClick={() =>
                          setCarouselIndex(
                            (i) => (i - 1 + previews.length) % previews.length,
                          )
                        }
                      >
                        <span className="sr-only">Previous</span>
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Next image"
                        className="bg-opacity-70 absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-white p-1 shadow hover:bg-blue-100"
                        onClick={() =>
                          setCarouselIndex((i) => (i + 1) % previews.length)
                        }
                      >
                        <span className="sr-only">Next</span>
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                        {previews.map((_, idx) => (
                          <span
                            key={idx}
                            className={`inline-block h-2 w-2 rounded-full ${idx === carouselIndex ? "bg-white" : "bg-opacity-50 bg-white"}`}
                          ></span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex aspect-square max-h-[400px] min-h-[180px] w-full flex-col items-center justify-center rounded-lg bg-black">
                  <svg
                    className="mb-2 h-16 w-16 text-white opacity-40"
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
                  </svg>
                  <span className="text-opacity-60 text-sm text-white">
                    Image preview
                  </span>
                </div>
              )}
            </div>
            {/* Content below image */}
            <div className="flex flex-1 flex-col p-5">
              {/* User info */}
              <div className="mb-3 flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="border-opacity-70 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                    <span className="text-2xl">
                      {getChristmasIdentity(userId).avatar}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center space-x-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {getChristmasIdentity(userId).name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 opacity-80">Just now</p>
                </div>
              </div>
              {/* Message */}
              <div className="bg-opacity-40 border-opacity-30 flex min-h-[3rem] flex-1 items-center rounded-xl border border-white bg-white p-4 shadow-sm">
                <p className="w-full leading-relaxed whitespace-pre-wrap text-gray-900">
                  {liveMessage || (
                    <span className="text-gray-400">
                      Your message will appear here...
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KudosForm;
