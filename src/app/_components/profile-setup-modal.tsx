"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Preloader } from "./preloader";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void; // Optional close without completing
  existingProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    workEmail?: string | null;
    departmentId?: string | null;
    amazonWishlistUrl?: string | null;
    profileCompleted?: boolean;
    domain?: string | null;
    domainEnabled?: boolean | null;
  } | null;
}

export function ProfileSetupModal({ isOpen, onComplete, onClose, existingProfile }: ProfileSetupModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    departmentId: "",
    amazonWishlistUrl: "",
  });
  
  const [domain, setDomain] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forceEditEmail, setForceEditEmail] = useState(false);
  const isEditing = existingProfile?.profileCompleted ?? false;

  // Initialize form data with existing profile when modal opens
  useEffect(() => {
    if (isOpen && existingProfile) {
      setFormData({
        firstName: existingProfile.firstName ?? "",
        lastName: existingProfile.lastName ?? "",
        workEmail: existingProfile.workEmail ?? "",
        departmentId: existingProfile.departmentId ?? "",
        amazonWishlistUrl: existingProfile.amazonWishlistUrl ?? "",
      });
    }
  }, [isOpen, existingProfile]);

  // Get departments for the domain
  const { data: departments = [] } = api.profile.getDepartmentsByDomain.useQuery(
    { domain },
    { enabled: !!domain }
  );
  const completeProfileMutation = api.profile.completeProfile.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const updateProfileMutation = api.profile.updateProfile.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const currentMutation = isEditing ? updateProfileMutation : completeProfileMutation;

  // Extract domain when work email changes
  useEffect(() => {
    if (formData.workEmail?.includes("@")) {
      const emailDomain = formData.workEmail.split("@")[1];
      setDomain(emailDomain ?? "");
    } else {
      setDomain("");
    }
  }, [formData.workEmail]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    
    if (!formData.workEmail.trim()) {
      newErrors.workEmail = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail)) {
      newErrors.workEmail = "Please enter a valid email address";
    }

    if (formData.amazonWishlistUrl) {
      // Accepts URLs with or without query/fragment
      const amazonRegex = /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:[?#].*)?$/i;
      if (!amazonRegex.test(formData.amazonWishlistUrl)) {
        newErrors.amazonWishlistUrl = "Must be a valid Amazon UK wishlist URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    // Trim Amazon wishlist URL to base (remove query/fragment)
    let trimmedWishlistUrl = formData.amazonWishlistUrl;
    if (trimmedWishlistUrl) {
      try {
        const urlObj = new URL(trimmedWishlistUrl);
        // Remove query and fragment
        trimmedWishlistUrl = urlObj.origin + urlObj.pathname;
      } catch {
        // fallback: just use the original if parsing fails
      }
    }
    currentMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      workEmail: formData.workEmail,
      departmentId: formData.departmentId ?? undefined,
      amazonWishlistUrl: trimmedWishlistUrl ?? undefined,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };
  if (!isOpen) return null;
  if (existingProfile === undefined) {
    return <Preloader message="Loading your profile..." />;
  }
  // Check if user has a disabled domain
  const isDomainDisabled = !!(existingProfile?.domain && existingProfile?.domainEnabled === false) && !forceEditEmail;

  if (!existingProfile && isOpen) {
    return <Preloader message="Loading your profile..." />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Domain Disabled Warning */}
        {isDomainDisabled && (
          <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Domain Access Restricted</h3>
                <div className="mt-2 text-sm text-orange-700">
                  <p>Your organization&apos;s domain ({existingProfile?.domain}) is currently disabled.</p>
                  <p className="mt-1">Please contact your manager to enable access. You can only update your profile or sign out.</p>
                  <button
                    type="button"
                    className="mt-3 inline-block rounded bg-white border border-orange-300 px-3 py-1 text-xs text-orange-700 hover:bg-orange-100 font-medium shadow-sm"
                    onClick={() => {
                      setForceEditEmail(true);
                      setErrors({});
                    }}
                  >
                    Used the wrong email? Click here to change it.
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}<div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit Your Profile" : "Complete Your Profile"}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isEditing 
                ? "Update your profile information below."
                : "Help us get to know you better by completing your profile information."
              }
            </p>
          </div>
          {(isEditing || onClose) && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              type="button"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>          {/* Work Email */}
          <div>
            <label htmlFor="workEmail" className="block text-sm font-medium text-gray-700">
              Work Email Address *
            </label>
            <input
              type="email"
              id="workEmail"
              value={formData.workEmail}
              onChange={(e) => handleInputChange("workEmail", e.target.value)}
              disabled={isDomainDisabled}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.workEmail ? "border-red-500" : "border-gray-300"
              } ${isDomainDisabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
              placeholder="Enter your work email"
            />
            {errors.workEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.workEmail}</p>
            )}
            {domain && (
              <p className="mt-1 text-sm text-gray-500">Domain: {domain}</p>
            )}
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                id="department"
                value={formData.departmentId}
                onChange={(e) => handleInputChange("departmentId", e.target.value)}
                disabled={isDomainDisabled}
                className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDomainDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              >
                <option value="">Select a department (optional)</option>
                {departments.map((dept: { id: string; name: string }) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amazon Wishlist URL */}
          <div>
            <label htmlFor="amazonWishlist" className="block text-sm font-medium text-gray-700">
              Amazon UK Wishlist URL
            </label>
            <input
              type="url"
              id="amazonWishlist"
              value={formData.amazonWishlistUrl}
              onChange={(e) => handleInputChange("amazonWishlistUrl", e.target.value)}
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amazonWishlistUrl ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX (optional)"
            />
            {errors.amazonWishlistUrl && (
              <p className="mt-1 text-sm text-red-600">{errors.amazonWishlistUrl}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Optional: Add your Amazon UK wishlist for gift exchanges
            </p>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            {(isEditing || isDomainDisabled) && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 font-medium hover:text-gray-800 focus:outline-none"
              >
                {isDomainDisabled ? "Close" : "Cancel"}
              </button>
            )}
            {!isDomainDisabled && (
              <button
                type="submit"
                disabled={currentMutation.isPending}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentMutation.isPending 
                  ? (isEditing ? "Updating..." : "Completing...") 
                  : (isEditing ? "Update Profile" : "Complete Profile")
                }
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
