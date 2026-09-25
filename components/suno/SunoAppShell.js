"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  LibraryBig,
  UsersRound,
  Heart,
  Plus,
  Settings,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import SunoLogo from "@/components/brand/SunoLogo";

const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: LibraryBig },
  { href: "/rooms", label: "Rooms", icon: UsersRound },
];

const secondary = [
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/upload", label: "Upload music", icon: Plus },
];

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ item, pathname, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`suno-shell-nav-item ${active ? "active" : ""}`}
    >
      <Icon size={17} strokeWidth={active ? 2.25 : 1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

export default function SunoAppShell({ children }) {
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="suno-shell">
      <aside className="suno-sidebar">
        <div className="suno-sidebar-top">
          <SunoLogo />
        </div>

        <div className="suno-sidebar-scroll">
          <div className="suno-shell-nav-group">
            <p className="suno-shell-nav-label">Browse</p>
            {nav.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>

          <div className="suno-shell-divider" />

          <div className="suno-shell-nav-group">
            <p className="suno-shell-nav-label">Your space</p>
            {secondary.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </div>

          <div className="suno-room-promo">
            <div className="suno-room-promo-glow" />
            <div className="suno-room-promo-icon">
              <UsersRound size={16} />
            </div>
            <p>Listen together</p>
            <span>Create a room and bring your people into the same song.</span>
            <Link href="/rooms" className="suno-room-promo-link">
              Open Rooms <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        <div className="suno-sidebar-bottom">
          <Link
            href="/profile"
            className={`suno-profile-chip ${
              isActive(pathname, "/profile") ? "active" : ""
            }`}
          >
            <span className="suno-profile-avatar">S</span>
            <span>
              <strong>My account</strong>
              <small>Profile & settings</small>
            </span>
            <Settings size={15} />
          </Link>
        </div>
      </aside>

      <div className="suno-shell-main">
        <header className="suno-mobile-topbar">

          <SunoLogo size="sm" />

          <Link href="/profile" className="suno-mobile-avatar" aria-label="Open profile">
          
          </Link>
        </header>

        {mobileMenu && (
          <div className="suno-mobile-menu-panel">
            <div className="suno-shell-nav-group">
              <p className="suno-shell-nav-label">Browse</p>
              {nav.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileMenu(false)}
                />
              ))}
            </div>
            <div className="suno-shell-divider" />
            <div className="suno-shell-nav-group">
              <p className="suno-shell-nav-label">Your space</p>
              {secondary.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileMenu(false)}
                />
              ))}
            </div>
            <Link
              href="/profile"
              className="suno-mobile-settings-link"
              onClick={() => setMobileMenu(false)}
            >
              <Settings size={16} />
              Profile & settings
            </Link>
          </div>
        )}

        <main className="suno-shell-content">{children}</main>

        <nav className="suno-bottom-nav" aria-label="Mobile navigation">
          {[
            { href: "/dashboard", label: "Home", icon: Home },
            { href: "/search", label: "Search", icon: Search },
            { href: "/library", label: "Library", icon: LibraryBig },
            { href: "/rooms", label: "Rooms", icon: UsersRound },
            { href: "/profile", label: "You", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`suno-bottom-nav-item ${active ? "active" : ""}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}