"use client";
import dynamic from "next/dynamic";

const CareerNavigator = dynamic(() => import("./CareerNavigator"), {
  ssr: false,
});

export default function CareerNavigatorLoader() {
  return <CareerNavigator />;
}
