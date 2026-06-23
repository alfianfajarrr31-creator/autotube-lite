import { Video } from '../types';

export const INITIAL_VIDEOS: Video[] = [
  {
    id: 'vid-1',
    title: 'One Piece Theory - Joy Boy Secret',
    duration: '0:45',
    fileName: 'one-piece-joyboy-secret-short.mp4',
    status: 'Draft',
    size: '15.4 MB',
    resolution: '1080x1920',
    thumbnailGradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600'
  },
  {
    id: 'vid-2',
    title: 'Luffy Gear 5 Fact',
    duration: '0:38',
    fileName: 'luffy-gear-5-fact.mp4',
    status: 'Draft',
    size: '12.8 MB',
    resolution: '1080x1920',
    thumbnailGradient: 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600'
  },
  {
    id: 'vid-3',
    title: 'Dadan Best Anime Mom',
    duration: '0:42',
    fileName: 'dadan-best-anime-mom.mp4',
    status: 'Draft',
    size: '14.1 MB',
    resolution: '1080x1920',
    thumbnailGradient: 'bg-gradient-to-br from-rose-500 via-red-500 to-pink-500'
  },
  {
    id: 'vid-4',
    title: 'Abandoned Land to Dream House Timelapse',
    duration: '0:55',
    fileName: 'abandoned-land-dream-house.mp4',
    status: 'Draft',
    size: '23.4 MB',
    resolution: '1080x1920',
    thumbnailGradient: 'bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-700'
  },
  {
    id: 'vid-5',
    title: 'Luxury LEGO House Build',
    duration: '0:50',
    fileName: 'luxury-lego-house-build.mp4',
    status: 'Draft',
    size: '20.1 MB',
    resolution: '1080x1920',
    thumbnailGradient: 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500'
  }
];

export const PRESET_HASHTAGS = [
  '#shorts',
  '#onepiece',
  '#animeindonesia',
  '#animefacts',
  '#luffy',
  '#timelapse',
  '#construction',
  '#viral',
  '#fyp'
];

export const PRESET_MOCK_COVERS = [
  { id: 'sunset', name: 'Sunset Rose', gradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600' },
  { id: 'cyber', name: 'Cyber Neon', gradient: 'bg-gradient-to-br from-rose-500 via-fuchsia-600 to-indigo-700' },
  { id: 'emerald', name: 'Emerald Teal', gradient: 'bg-gradient-to-br from-emerald-400 via-teal-600 to-cyan-700' },
  { id: 'vapor', name: 'Retro Wave', gradient: 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500' },
  { id: 'comet', name: 'Cosmic Indigo', gradient: 'bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-800' }
];
