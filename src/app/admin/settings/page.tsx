"use client";

import { AdminLayout } from "~/app/_components/admin-layout";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-white/80">Configure system settings and preferences</p>
        </div>

        {/* Coming Soon */}
        <div className=" bg-black/85 backdrop-blur-sm backdrop-blur-sm rounded-lg border border-white/20 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Settings Coming Soon</h2>
          <p className="text-white/60 max-w-md mx-auto">
            Advanced configuration options for system preferences, notifications, 
            and administrative controls will be available in this section.
          </p>
        </div>

        {/* Placeholder Cards for Future Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className=" bg-black/85 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">System Configuration</h3>
            <p className="text-white/60 text-sm mb-4">
              Configure global system settings, authentication providers, and default values.
            </p>
            <div className="text-xs text-white/40">
              Coming soon...
            </div>
          </div>

          <div className=" bg-black/85 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Email Notifications</h3>
            <p className="text-white/60 text-sm mb-4">
              Manage email templates and notification preferences for user events.
            </p>
            <div className="text-xs text-white/40">
              Coming soon...
            </div>
          </div>

          <div className=" bg-black/85 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Access Control</h3>
            <p className="text-white/60 text-sm mb-4">
              Configure role-based permissions and admin access levels.
            </p>
            <div className="text-xs text-white/40">
              Coming soon...
            </div>
          </div>

          <div className=" bg-black/85 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Data Export</h3>
            <p className="text-white/60 text-sm mb-4">
              Export user data, reports, and system logs for analysis.
            </p>
            <div className="text-xs text-white/40">
              Coming soon...
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
