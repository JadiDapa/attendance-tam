"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function AuthCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = [
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsjtK1J-rS48JwMWqWE1SexBwfWgx0-3XLOjvWacZWBw&s=10",
    "https://images.unsplash.com/photo-1708807472445-d33589e6b090?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1683141047802-524f4100f656?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ];

  const texts = [
    "Simplify Your Daily Attendance",
    "Monitor Your Team Effortlessly",
    "Accurate Data, Better Decisions",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <aside className="absolute -z-50 h-[95vh] w-full overflow-hidden p-4 opacity-40 lg:relative lg:z-0 lg:block lg:opacity-100">
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        {/* Logo */}
        <div className="bg-primary/50 absolute top-0 left-0 z-50 flex h-20 w-64 items-center justify-center rounded-br-3xl p-4">
          <div className="flex items-center gap-5 rounded-xl px-2 py-2.5">
            <Image
              src="/icon.webp"
              alt="Logo"
              width={50}
              height={30}
              className="dark:opacity-85 dark:brightness-0 dark:invert"
            />

            <div className="min-w-0 flex-1">
              <p className="letter truncate text-xl font-semibold tracking-wide">
                ABSENSI
              </p>

              <p className="truncate text-xs">Taruna Anugerah Mandiri</p>
            </div>
          </div>
        </div>

        <div className="bg-primary/30 absolute inset-0 h-full w-full object-cover" />

        {/* Image Carousel */}
        {images.map((src, index) => (
          <Image
            key={index}
            src={src || "/placeholder.svg"}
            alt={`Slide ${index + 1}`}
            fill
            className={`absolute inset-0 -z-10 object-cover transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            priority={index === 0}
          />
        ))}

        {/* Navigation Dots */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 space-x-4">
          {images.map((_, index) => (
            <button
              key={index}
              className={`h-1 w-20 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Text Carousel */}
        <div className="absolute bottom-32 left-[28%] text-center">
          {texts.map((text, index) => (
            <p
              key={index}
              className={`absolute w-80 text-3xl text-slate-100 transition-all duration-1000 ${
                index === currentIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
