"use client";
import dynamic from "next/dynamic";

const HomeHeader = dynamic(() => import("./home-header"), { ssr: false });

export default function HomeHeaderClientWrapper() {
  return <HomeHeader />;
}
