"use client";

import { useEffect, useState } from "react";
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

export function ProfileSetupModal({
  isOpen,
  onComplete,
  onClose,
  existingProfile,
}: ProfileSetupModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    workEmail: "",
    departmentId: "",
    amazonWishlistUrl: "",
  });
  const [domain, setDomain] = useState("");
  const [domainForChecking, setDomainForChecking] = useState(""); // Domain state for API queries (only updated on blur)
  const [domainDescription, setDomainDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [forceEditEmail, setForceEditEmail] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [showPersonalEmailWarning, setShowPersonalEmailWarning] = useState(false);
  const isEditing = existingProfile?.profileCompleted ?? false; // Initialize form data with existing profile when modal opens
  useEffect(() => {
    if (isOpen && existingProfile) {
      setFormData({
        firstName: existingProfile.firstName ?? "",
        lastName: existingProfile.lastName ?? "",
        workEmail: existingProfile.workEmail ?? "",
        departmentId: existingProfile.departmentId ?? "",
        amazonWishlistUrl: existingProfile.amazonWishlistUrl ?? "",
      });

      // Set initial domain for checking if workEmail exists
      if (existingProfile.workEmail?.includes("@")) {
        const emailDomain = existingProfile.workEmail.split("@")[1];
        setDomainForChecking(emailDomain ?? "");
      }
    } else if (!isOpen) {
      // Reset domain checking state when modal closes
      setDomainForChecking("");
    }
  }, [isOpen, existingProfile]); // Get departments for the domain
  const { data: departments = [] } =
    api.profile.getDepartmentsByDomain.useQuery(
      { domain: domainForChecking },
      { enabled: !!domainForChecking },
    );
  // Check domain status - run for both new and existing profiles (only on blur)
  const { data: domainStatus } = api.profile.checkDomainStatus.useQuery(
    { domain: domainForChecking },
    { enabled: !!domainForChecking },
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

  const setupNewDomainMutation = api.profile.setupNewDomain.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      setErrors({ submit: error.message });
    },
  });

  const currentMutation = showDomainSetup
    ? setupNewDomainMutation
    : isEditing
      ? updateProfileMutation
      : completeProfileMutation; // Extract domain when work email changes (for display purposes only)
  useEffect(() => {
    if (formData.workEmail?.includes("@")) {
      const emailDomain = formData.workEmail.split("@")[1];
      setDomain(emailDomain ?? "");
    } else {
      setDomain("");
    }
  }, [formData.workEmail]);

  // Warn users if they enter a common personal email provider in the work email field
  useEffect(() => {
    const commonPersonalDomains = new Set([
      "gmail.com",
      "googlemail.com",
      "hotmail.com",
      "outlook.com",
      "outlook.co.uk",
      "yahoo.com",
      "yahoo.co.uk",
      "aol.com",
      "icloud.com",
      "me.com",
      "live.com",
      "msn.com",
      "protonmail.com",
    ]);

    const email = formData.workEmail?.trim() ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setShowPersonalEmailWarning(false);
      return;
    }

    const parts = email.split("@");
    const domainPart = (parts[1] ?? "").toLowerCase();
    setShowPersonalEmailWarning(commonPersonalDomains.has(domainPart));
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
      const amazonRegex =
        /^https:\/\/www\.amazon\.co\.uk\/(?:hz\/)?wishlist\/(?:ls\/)?([A-Z0-9]{10,13})(?:\/.*)?(?:[?#].*)?$/i;
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

    if (showDomainSetup) {
      setupNewDomainMutation.mutate({
        firstName: formData.firstName,
        lastName: formData.lastName,
        workEmail: formData.workEmail,
        departmentId: formData.departmentId ?? undefined,
        amazonWishlistUrl: trimmedWishlistUrl ?? undefined,
        domainDescription: domainDescription ?? undefined,
      });
    } else {
      currentMutation.mutate({
        firstName: formData.firstName,
        lastName: formData.lastName,
        workEmail: formData.workEmail,
        departmentId: formData.departmentId ?? undefined,
        amazonWishlistUrl: trimmedWishlistUrl ?? undefined,
        joinCode: joinCode.trim() || undefined,
      });
    }
  };
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleEmailBlur = () => {
    // Update domain for checking only when email field loses focus
    if (formData.workEmail?.includes("@")) {
      const emailDomain = formData.workEmail.split("@")[1];
      setDomainForChecking(emailDomain ?? "");
    } else {
      setDomainForChecking("");
    }
  };
  if (!isOpen) return null;
  if (existingProfile === undefined) {
    return <Preloader message="Loading your profile..." />;
  } // Check if user has a disabled domain (domain exists but is disabled)
  const isDomainDisabled =
    !!(existingProfile?.domain && existingProfile?.domainEnabled === false) &&
    !forceEditEmail;

  if (!existingProfile && isOpen) {
    return <Preloader message="Loading your profile..." />;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-deep/75">
      <div className="mx-4 w-full max-w-md rounded-label bg-label p-6 shadow-lift">
        {" "}
        {/* Domain Issues Warnings */}
        {isDomainDisabled && (
          <div className="mb-4 rounded-label border border-rule bg-label-shade p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-post"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-ink">
                  Domain Access Restricted
                </h3>{" "}
                <div className="mt-2 text-sm text-ink-soft">
                  <p>
                    Your organization&apos;s domain ({existingProfile?.domain})
                    is currently disabled.
                  </p>
                  <p className="mt-1">
                    Please contact your manager or IT department to enable
                    access. You can only update your profile or sign out.
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-block rounded border border-ink-soft bg-label px-3 py-1 text-xs font-medium text-ink-soft shadow-sm hover:bg-label-shade"
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
        )}{" "}
        {/* Domain Doesn't Exist - Show for all users when domain doesn't exist */}
        {domainForChecking &&
          domainStatus &&
          !domainStatus.exists &&
          !showDomainSetup &&
          !isDomainDisabled && (
            <div className="mb-4 rounded-label border border-rule bg-label-shade p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-ink-soft"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  {" "}
                  <h3 className="text-sm font-medium text-ink">
                    Organization Domain Not Set Up
                  </h3>
                  <div className="mt-2 text-sm text-ink-soft">
                    <p>
                      The domain &quot;{domainForChecking}&quot; hasn&apos;t
                      been set up in our system yet.
                    </p>
                    <p className="mt-1">
                      <strong>We recommend</strong> speaking to your employer or
                      IT department first to see if they want to set this up.
                    </p>
                    <p className="mt-1">
                      Alternatively, if you&apos;d like to set it up yourself
                      now, you can become the domain administrator.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {" "}
                    <button
                      type="button"
                      className="inline-block rounded bg-post px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-post-deep"
                      onClick={() => setShowDomainSetup(true)}
                    >
                      Set Up Domain Now
                    </button>
                    <button
                      type="button"
                      className="inline-block rounded border border-ink-soft bg-label px-3 py-1 text-xs font-medium text-ink-soft shadow-sm hover:bg-label-shade"
                      onClick={() => {
                        setForceEditEmail(true);
                        setErrors({});
                      }}
                    >
                      Wrong Email Address?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-ink">
              {isEditing ? "Edit Your Profile" : "Complete Your Profile"}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {isEditing
                ? "Update your profile information below."
                : "Help us get to know you better by completing your profile information."}
            </p>
          </div>
          {(isEditing || onClose) && (
            <button
              onClick={onClose}
              className="text-2xl font-bold text-ink-soft hover:text-ink"
              type="button"
            >
              ×
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-ink-soft"
            >
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className={`mt-1 block min-h-11 w-full rounded-label border bg-white px-3 py-2 text-ink ${
                errors.firstName ? "border-post" : "border-rule"
              }`}
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-post">{errors.firstName}</p>
            )}
          </div>
          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-ink-soft"
            >
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className={`mt-1 block min-h-11 w-full rounded-label border bg-white px-3 py-2 text-ink ${
                errors.lastName ? "border-post" : "border-rule"
              }`}
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-post">{errors.lastName}</p>
            )}
          </div>{" "}
          {/* Work Email */}
          <div>
            <label
              htmlFor="workEmail"
              className="block text-sm font-medium text-ink-soft"
            >
              Work Email Address *
            </label>{" "}
            <input
              type="email"
              id="workEmail"
              value={formData.workEmail}
              onChange={(e) => handleInputChange("workEmail", e.target.value)}
              onBlur={handleEmailBlur}
              disabled={isDomainDisabled}
              className={`mt-1 block min-h-11 w-full rounded-label border bg-white px-3 py-2 text-ink ${
                errors.workEmail ? "border-post" : "border-rule"
              } ${isDomainDisabled ? "cursor-not-allowed bg-label-shade" : ""}`}
              placeholder="Enter your work email"
            />
            {errors.workEmail && (
              <p className="mt-1 text-sm text-post">{errors.workEmail}</p>
            )}{" "}
            {domain && (
              <p className="mt-1 text-sm text-ink-soft">Domain: {domain}</p>
            )}

            {showPersonalEmailWarning && (
              <div className="mt-2 rounded-label bg-label-shade border border-rule p-3 text-sm text-ink">
                <strong className="font-medium">Heads up:</strong>{' '}
                That looks like a personal email address (Gmail, Hotmail, etc.). Please use your company / work email so we can link your account with the rest of your organisation. You can still continue with a personal address if needed.
              </div>
            )}
            {/* Domain Setup Form */}
            {showDomainSetup && (
              <div className="mt-3 rounded-label border border-pine/30 bg-pine-tint p-4">
                <h4 className="mb-3 text-sm font-medium text-pine">
                  Setting up domain: {domain}
                </h4>
                <div>
                  <label
                    htmlFor="domainDescription"
                    className="block text-sm font-medium text-ink-soft"
                  >
                    Domain Description (Optional)
                  </label>
                  <textarea
                    id="domainDescription"
                    value={domainDescription}
                    onChange={(e) => setDomainDescription(e.target.value)}
                    className="mt-1 block min-h-11 w-full rounded-label border border-rule bg-white px-3 py-2 text-ink"
                    placeholder="Brief description of your organization..."
                    rows={2}
                  />
                </div>
                <div className="mt-3 text-xs text-pine">
                  <p>• You will become the domain administrator</p>
                  <p>• You can manage users and departments for this domain</p>
                  <p>
                    • Other users with {domain} emails can join your
                    organization
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-block rounded border border-rule bg-label-shade px-3 py-1 text-xs font-medium text-ink-soft shadow-sm hover:bg-rule/60"
                  onClick={() => {
                    setShowDomainSetup(false);
                    setDomainDescription("");
                  }}
                >
                  Cancel Domain Setup
                </button>
              </div>
            )}
          </div>
          {/* Organisation join code (Day 11), only when the organisation asks for one */}
          {domainStatus?.codeRequired && !existingProfile?.domain && (
            <div>
              <label
                htmlFor="joinCode"
                className="block text-sm font-medium text-ink-soft"
              >
                Organisation join code
              </label>
              <input
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="ABCD-2345"
                className="mt-1 block min-h-11 w-full rounded-label border border-rule bg-white px-3 py-2 font-bold tracking-widest text-ink"
              />
              <p className="mt-1 text-sm text-ink-soft">
                Your organisation asks new members for a code. Your organiser
                can give it to you.
              </p>
            </div>
          )}
          {/* Department */}
          {departments.length > 0 && (
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-medium text-ink-soft"
              >
                Department
              </label>
              <select
                id="department"
                value={formData.departmentId}
                onChange={(e) =>
                  handleInputChange("departmentId", e.target.value)
                }
                disabled={isDomainDisabled}
                className={`mt-1 block min-h-11 w-full rounded-label border border-rule bg-white px-3 py-2 text-ink ${
                  isDomainDisabled ? "cursor-not-allowed bg-label-shade" : ""
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
            <label
              htmlFor="amazonWishlist"
              className="block text-sm font-medium text-ink-soft"
            >
              Amazon UK Wishlist URL
            </label>
            <input
              type="url"
              id="amazonWishlist"
              value={formData.amazonWishlistUrl}
              onChange={(e) =>
                handleInputChange("amazonWishlistUrl", e.target.value)
              }
              className={`mt-1 block min-h-11 w-full rounded-label border bg-white px-3 py-2 text-ink ${
                errors.amazonWishlistUrl ? "border-post" : "border-rule"
              }`}
              placeholder="https://www.amazon.co.uk/hz/wishlist/ls/XXXXXXXXXX (optional)"
            />
            {errors.amazonWishlistUrl && (
              <p className="mt-1 text-sm text-post">
                {errors.amazonWishlistUrl}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-soft">
              Optional: Add your Amazon UK wishlist for gift exchanges
            </p>
          </div>
          {/* Submit Error */}
          {errors.submit && (
            <div className="rounded-label bg-post-tint p-3">
              <p className="text-sm text-post">{errors.submit}</p>
            </div>
          )}{" "}
          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            {(isEditing || isDomainDisabled) && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-medium text-ink-soft hover:text-ink"
              >
                {isDomainDisabled ? "Close" : "Cancel"}
              </button>
            )}{" "}
            {!isDomainDisabled && (
              <button
                type="submit"
                disabled={currentMutation.isPending}
                className="flex-1 rounded-label bg-post px-4 py-2 font-medium text-white hover:bg-post-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                {currentMutation.isPending
                  ? showDomainSetup
                    ? "Setting up domain..."
                    : isEditing
                      ? "Updating..."
                      : "Completing..."
                  : showDomainSetup
                    ? "Set Up Domain & Complete Profile"
                    : isEditing
                      ? "Update Profile"
                      : "Complete Profile"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
