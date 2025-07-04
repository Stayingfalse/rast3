"use client";

import {
    BuildingOfficeIcon,
    Cog6ToothIcon,
    GlobeAltIcon,
    HomeIcon,
    LinkIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Overview", href: "/admin", icon: HomeIcon },
  { name: "Departments", href: "/admin/departments", icon: BuildingOfficeIcon },
  { name: "Domains", href: "/admin/domains", icon: GlobeAltIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "Links", href: "/admin/links", icon: LinkIcon },
  { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon },
];

export function AdminSidebar({ onClose, mobile = false }: { 
  onClose?: () => void; 
  mobile?: boolean; 
}) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (mobile && onClose) {
      onClose();
    }
  };
  return (
    <div className={`flex w-full flex-col ${mobile ? 'bg-transparent' : 'h-full bg-black/90 backdrop-blur-sm'}`}>
      {/* Desktop header only */}
      {!mobile && (
        <div className="flex h-16 shrink-0 items-center px-6">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>
      )}

      <nav className={`flex flex-1 flex-col ${mobile ? 'px-4 py-3' : 'px-6 pb-4'}`}>
        <ul className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={`group flex gap-x-3 rounded-md p-3 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-purple-600 text-white"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? "text-white" : "text-white/60"
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          <li className={mobile ? '' : 'mt-auto'}>
            <Link
              href="/"
              onClick={handleLinkClick}
              className="group -mx-2 flex gap-x-3 rounded-md p-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
            >
              <HomeIcon
                className="h-5 w-5 shrink-0 text-white/60"
                aria-hidden="true"
              />
              Back to App
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
