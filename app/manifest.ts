import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Absensi Taruna Anugerah Mandiri",
    short_name: "Absensi TAM",
    description:
      "Sistem absensi karyawan Taruna Anugerah Mandiri: absen masuk/pulang dengan foto dan lokasi.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e2a78",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
