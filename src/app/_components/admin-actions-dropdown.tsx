"use client";
import React, { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";

interface AdminActionsDropdownProps {
  kudosId: string;
  kudosUserId: string;
  isHidden?: boolean;
  onActionComplete?: () => void;
}

export const AdminActionsDropdown: React.FC<AdminActionsDropdownProps> = ({
  kudosId,
  kudosUserId,
  isHidden = false,
  onActionComplete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if current user has admin permissions for this content
  const { data: permissions } = api.kudos.checkAdminPermissions.useQuery({
    targetUserId: kudosUserId,
  });
  const utils = api.useUtils();

  // Admin mutations
  const hideKudosMutation = api.kudos.adminHideKudos.useMutation({
    onSuccess: async () => {
      setIsOpen(false);
      // Invalidate and refetch the feed to show updated state
      await utils.kudos.getFeed.invalidate();
      onActionComplete?.();
    },
    onError: (error) => {
      console.error("Error hiding/unhiding kudos:", error);
      alert("Error: " + error.message);
    },
  });

  const deleteKudosMutation = api.kudos.adminDeleteKudos.useMutation({
    onSuccess: async () => {
      setIsOpen(false);
      setIsConfirmingDelete(false);
      // Invalidate and refetch the feed to remove deleted post
      await utils.kudos.getFeed.invalidate();
      onActionComplete?.();
    },
    onError: (error) => {
      console.error("Error deleting kudos:", error);
      alert("Error: " + error.message);
      setIsConfirmingDelete(false);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsConfirmingDelete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render if user doesn't have admin permissions
  if (!permissions?.canModerate) {
    return null;
  }

  const handleHideToggle = () => {
    hideKudosMutation.mutate({
      kudosId,
      hidden: !isHidden,
    });
  };

  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    deleteKudosMutation.mutate({ kudosId });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Admin Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors text-gray-700 hover:text-gray-900"
        title="Admin Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[150px]">
          {/* Admin Level Badge */}
          <div className="px-3 py-1 text-xs text-gray-500 border-b border-gray-100">
            {permissions.adminLevel} Admin
            {permissions.scope && ` (${permissions.scope})`}
          </div>

          {/* Hide/Unhide Action */}
          <button
            onClick={handleHideToggle}
            disabled={hideKudosMutation.isPending}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
          >
            {isHidden ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Unhide Post</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
                <span>Hide Post</span>
              </>
            )}
            {hideKudosMutation.isPending && (
              <div className="ml-auto">
                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {/* Delete Action */}
          <button
            onClick={handleDelete}
            disabled={deleteKudosMutation.isPending}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 flex items-center space-x-2 disabled:opacity-50 ${
              isConfirmingDelete ? "bg-red-50 text-red-700" : "text-red-600"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>
              {isConfirmingDelete ? "Confirm Delete?" : "Delete Post"}
            </span>
            {deleteKudosMutation.isPending && (
              <div className="ml-auto">
                <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </button>

          {isConfirmingDelete && (
            <div className="px-3 py-1 text-xs text-red-600 border-t border-gray-100 bg-red-50">
              This action cannot be undone
            </div>
          )}
        </div>
      )}
    </div>
  );
};
