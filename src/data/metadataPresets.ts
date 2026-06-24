export interface MetadataPreset {
  name: string;
  description: string;
  hashtags: string;
  thumbnailTextOptions: string[];
}

export const METADATA_PRESETS: MetadataPreset[] = [
  {
    name: "One Piece / Anime Facts",
    description: "Fakta, teori, dan momen menarik dari dunia One Piece. Menurut kamu, ini masuk akal atau terlalu liar?",
    hashtags: "#shorts #onepiece #animeindonesia #animefacts #luffy #fyp",
    thumbnailTextOptions: ["TEORI TERGILA?", "INI MASUK AKAL?", "FAKTA ONE PIECE!", "JANGAN SKIP!"]
  },
  {
    name: "Construction Timelapse",
    description: "Transformasi bangunan dari awal sampai jadi. Simak prosesnya sampai akhir!",
    hashtags: "#shorts #timelapse #construction #beforeafter #satisfying #fyp",
    thumbnailTextOptions: ["DARI NOL JADI MEWAH", "TRANSFORMASI GILA!", "SEBELUM VS SESUDAH", "HASILNYA PUAS BANGET"]
  },
  {
    name: "General Shorts",
    description: "Video singkat menarik yang sayang untuk dilewatkan. Tonton sampai akhir!",
    hashtags: "#shorts #viral #fyp",
    thumbnailTextOptions: ["LIHAT SAMPAI AKHIR", "KOK BISA?", "INI SERIUS?", "JANGAN DI-SKIP"]
  },
  {
    name: "Affiliate Soft Sell",
    description: "Konten singkat seputar rekomendasi dan inspirasi pilihan. Cek detailnya dan sesuaikan dengan kebutuhanmu.",
    hashtags: "#shorts #rekomendasi #affiliate #fyp",
    thumbnailTextOptions: ["REKOMENDASI TERBAIK?", "WAJIB CEK DULU", "COCOK BUAT KAMU?", "JANGAN SALAH PILIH"]
  }
];

export function generateTitleFromFileName(input: string): string {
  if (!input) return "";
  // remove file extension (e.g. .mp4)
  let title = input.replace(/\.[a-zA-Z0-9]+$/, "");
  // replace hyphens and underscores with spaces
  title = title.replace(/[-_]/g, " ");
  // remove extra spaces
  title = title.replace(/\s+/g, " ").trim();
  // capitalize words
  return title
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

