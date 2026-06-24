/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Video as VideoIcon,
  Film,
  Upload,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Globe,
  Lock,
  Eye,
  Layers,
  Settings,
  HelpCircle,
  Activity,
  PlusCircle,
  TrendingUp,
  X,
  FileText,
  BadgeAlert,
  Info,
  CheckCircle,
  RotateCcw,
  Youtube,
  CloudLightning,
  ChevronRight,
  MonitorPlay,
  Moon,
  Search,
  Zap,
  Play,
  VideoOff,
  XCircle,
  Users,
  LogOut,
  Copy,
  History
} from 'lucide-react';
import { Video, QueueItem, mapToQueueItem, mapToDbItem } from './types';
import { checkUploadReadiness } from './utils/uploadReadiness';
import { INITIAL_VIDEOS, PRESET_HASHTAGS, PRESET_MOCK_COVERS } from './data/mockVideos';
import { METADATA_PRESETS, generateTitleFromFileName } from './data/metadataPresets';
import { isSupabaseConfigured } from './lib/supabase';
import {
  getDriveVideos,
  upsertDriveVideo,
  upsertDriveVideos,
  updateDriveVideoStatus,
  deleteDriveVideo
} from './services/driveVideoService';
import {
  getUploadQueue,
  addUploadQueueItem,
  deleteUploadQueueItem,
  updateUploadQueueStatus,
  clearUploadQueue,
  markQueueItemUploaded,
  markQueueItemUploadFailed,
  resetQueueItemForRetry
} from './services/uploadQueueService';
import {
  loadGoogleScripts,
  ensurePickerLoaded,
  requestDriveAccessToken,
  openGooglePicker,
  checkGoogleConfigured
} from './services/googleDrivePickerService';
import {
  connectYouTube,
  getMyYouTubeChannels,
  YouTubeChannelInfo
} from './services/youtubeService';
import {
  requestYouTubeUploadToken,
  downloadDriveFileAsBlob,
  uploadVideoToYouTube
} from './services/youtubeUploadService';

export default function App() {
  // State for Video Bank
  const [videos, setVideos] = useState<Video[]>(() => 
    INITIAL_VIDEOS.map(v => ({ ...v, source: 'mock' as const }))
  );
  
  // State for Queue
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // State for Google Drive
  const [gDriveStatus, setGDriveStatus] = useState<'Google Drive Not Connected' | 'Google Drive Connected' | 'Google Drive Error'>(() => {
    return checkGoogleConfigured() ? 'Google Drive Not Connected' : 'Google Drive Error';
  });
  const [gDriveError, setGDriveError] = useState<string | null>(() => {
    return checkGoogleConfigured() ? null : 'Google Drive is not configured yet.';
  });
  const [gDriveToken, setGDriveToken] = useState<string | null>(null);

  // Initial check on mount
  useEffect(() => {
    if (!checkGoogleConfigured()) {
      setGDriveStatus('Google Drive Error');
      setGDriveError('Google Drive is not configured yet.');
    }
  }, []);

  // Supabase Database Connection/Load State
  const [dbLoading, setDbLoading] = useState(isSupabaseConfigured);
  const [dbError, setDbError] = useState<string | null>(null);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'loading' | 'synced' | 'failed'>(() => {
    return isSupabaseConfigured ? 'loading' : 'idle';
  });

  // Selected Draft Video for Metadata Editing
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>('vid-1');
  const [vBankSearch, setVBankSearch] = useState('');

  // Form State variables linked to currently Selected Video
  const [ytTitle, setYtTitle] = useState('One Piece Theory - Joy Boy Secret 🔥');
  const [ytDescription, setYtDescription] = useState('An incredible theory exploring Joy Boy secret. What was his true identity in the Void Century?');
  const [ytHashtags, setYtHashtags] = useState('#shorts #onepiece #animefacts');
  const [ytCoverGradient, setYtCoverGradient] = useState('bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600');
  const [ytThumbnailText, setYtThumbnailText] = useState('');
  const [ytVisibility, setYtVisibility] = useState<'Private' | 'Unlisted' | 'Public'>('Public');
  const [ytPublishDate, setYtPublishDate] = useState('2026-06-23');
  const [ytPublishTime, setYtPublishTime] = useState('12:00');

  // Metadata Preset states
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [selectedThumbnailText, setSelectedThumbnailText] = useState(METADATA_PRESETS[0]?.thumbnailTextOptions[0] || '');

  // Interactive Upload simulation state
  const [simulationActive, setSimulationActive] = useState(false);
  const [simLog, setSimLog] = useState<string | null>(null);

  // Upload readiness check state
  const [readinessOpenId, setReadinessOpenId] = useState<string | null>(null);
  const [readinessSummaryMessage, setReadinessSummaryMessage] = useState<string | null>(null);

  // ARC 8 Upload History & Error Log states
  const [historyFilter, setHistoryFilter] = useState<'All' | 'Uploaded' | 'Failed' | 'Scheduled'>('All');
  const [historySearch, setHistorySearch] = useState('');

  // ARC 10 Manual Batch Upload states
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [batchUploadActive, setBatchUploadActive] = useState(false);
  const [batchStatus, setBatchStatus] = useState<'Idle' | 'Running' | 'Complete' | 'Failed/Stopped'>('Idle');
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchTotalCount, setBatchTotalCount] = useState(0);
  const [batchCurrentItemTitle, setBatchCurrentItemTitle] = useState('');
  const [batchStopOnError, setBatchStopOnError] = useState(true);
  const [batchResults, setBatchResults] = useState<{ id: string; title: string; status: 'Success' | 'Failed' | 'Skipped'; error?: string; reason?: string }[]>([]);

  // Quick form state for "Creating own custom mocked Video"
  const [isAddMockOpen, setIsAddMockOpen] = useState(false);
  const [mockVidTitle, setMockVidTitle] = useState('');
  const [mockVidDuration, setMockVidDuration] = useState('0:30');
  const [mockVidFileName, setMockVidFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Success alert states
  const [notification, setNotification] = useState<{ id: string; text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Manual YouTube upload states (ARC 7)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadingStep, setUploadingStep] = useState<string>('');
  const [uploadingPercent, setUploadingPercent] = useState<number>(0);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ id: String(Date.now()), text, type });
  };

  // YouTube Channel Connection states
  const [ytChannelStatus, setYtChannelStatus] = useState<'YouTube Not Connected' | 'Connecting YouTube...' | 'YouTube Connected' | 'YouTube Connect Error'>(() => {
    const saved = localStorage.getItem('autotube_yt_channel');
    return saved ? 'YouTube Connected' : (checkGoogleConfigured() ? 'YouTube Not Connected' : 'YouTube Connect Error');
  });
  const [ytChannelError, setYtChannelError] = useState<string | null>(() => {
    return checkGoogleConfigured() ? null : 'Google Client ID / API Key is not configured yet.';
  });
  const [ytChannelsList, setYtChannelsList] = useState<YouTubeChannelInfo[]>([]);
  const [selectedYtChannel, setSelectedYtChannel] = useState<YouTubeChannelInfo | null>(() => {
    const saved = localStorage.getItem('autotube_yt_channel');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleConnectYouTube = async () => {
    try {
      setYtChannelStatus('Connecting YouTube...');
      setYtChannelError(null);
      
      // 1. Ensure Google scripts are loaded using our safe shared loader
      await loadGoogleScripts();
      
      // 2. Request YouTube Readonly OAuth access token
      const token = await connectYouTube();
      
      // 3. Fetch YouTube channel list from Data API v3
      const channels = await getMyYouTubeChannels(token);
      
      setYtChannelsList(channels);
      
      if (channels.length === 0) {
        setYtChannelStatus('YouTube Connect Error');
        const errStr = 'No YouTube channel found for this Google account.';
        setYtChannelError(errStr);
        showNotification(errStr, 'error');
      } else if (channels.length === 1) {
        const channel = channels[0];
        setSelectedYtChannel(channel);
        localStorage.setItem('autotube_yt_channel', JSON.stringify(channel));
        setYtChannelStatus('YouTube Connected');
        showNotification(`Connected to YouTube channel: ${channel.title}`, 'success');
      } else {
        // Multiple channels found - select first one automatically but let user choose too
        const firstChannel = channels[0];
        setSelectedYtChannel(firstChannel);
        localStorage.setItem('autotube_yt_channel', JSON.stringify(firstChannel));
        setYtChannelStatus('YouTube Connected');
        showNotification(`Connected! Found ${channels.length} channels, loaded "${firstChannel.title}". You can switch channels below.`, 'success');
      }
    } catch (err: any) {
      console.error("YouTube connection failed:", err);
      setYtChannelStatus('YouTube Connect Error');
      const msg = err?.message || 'Failed to authorize or fetch YouTube channels.';
      setYtChannelError(msg);
      showNotification(msg, 'error');
    }
  };

  const handleSelectYtChannel = (channelId: string) => {
    const target = ytChannelsList.find(c => c.id === channelId);
    if (target) {
      setSelectedYtChannel(target);
      localStorage.setItem('autotube_yt_channel', JSON.stringify(target));
      showNotification(`Switched YouTube channel to: ${target.title}`, 'success');
    }
  };

  const handleDisconnectYouTube = () => {
    setSelectedYtChannel(null);
    setYtChannelsList([]);
    localStorage.removeItem('autotube_yt_channel');
    setYtChannelStatus(checkGoogleConfigured() ? 'YouTube Not Connected' : 'YouTube Connect Error');
    setYtChannelError(null);
    showNotification('Disconnected YouTube account', 'success');
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchQueue = async () => {
    if (!isSupabaseConfigured) {
      setDbLoading(false);
      setDriveSyncStatus('idle');
      return;
    }
    setDbLoading(true);
    setDbError(null);
    setDriveSyncStatus('loading');
    try {
      const dbQueue = await getUploadQueue();
      const mappedQueue = dbQueue.map(mapToQueueItem);
      setQueue(mappedQueue);
      
      const dbDriveVideos = await getDriveVideos();
      const mappedDriveVideos: Video[] = dbDriveVideos.map(record => {
        let formattedSize = 'Unknown size';
        if (record.size_bytes) {
          const mb = Number(record.size_bytes) / (1024 * 1024);
          formattedSize = mb >= 1.0 ? `${mb.toFixed(1)} MB` : `${(mb * 1024).toFixed(0)} KB`;
        }
        return {
          id: record.id || `drive-${record.drive_file_id}`,
          driveFileId: record.drive_file_id,
          title: record.title,
          fileName: record.file_name,
          duration: '0:30',
          status: record.status,
          size: formattedSize,
          resolution: '1080p (Drive)',
          thumbnailGradient: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]',
          source: 'drive',
          mimeType: record.mime_type || undefined,
          url: record.url || undefined,
          thumbnailUrl: record.thumbnail_url || undefined,
          sizeBytes: record.size_bytes || undefined
        };
      });

      setVideos(prev => {
        const nonDriveVideos = prev.filter(v => v.source !== 'drive');
        const merged = [...nonDriveVideos, ...mappedDriveVideos];
        
        return merged.map(v => {
          const matchingDbItem = dbQueue.find(q => q.video_id === v.id) || dbQueue.find(q => q.file_name === v.fileName);
          if (matchingDbItem) {
            return { ...v, status: matchingDbItem.status };
          }
          return { ...v, status: v.status || 'Draft' };
        });
      });
      setDriveSyncStatus('synced');
    } catch (err: any) {
      setDbError(err.message || 'Unknown database error occurred');
      showNotification('Failed to load data from Supabase', 'error');
      setDriveSyncStatus('failed');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Sync Form when selected video changes
  const selectedVideoObj = useMemo(() => {
    return videos.find(v => v.id === selectedVideoId) || null;
  }, [selectedVideoId, videos]);

  const handleSelectVideo = (video: Video) => {
    setSelectedVideoId(video.id);
    setYtTitle(video.title + (video.title.includes('#shorts') ? '' : ' 🔥'));
    setYtDescription(`Exploring the details for: ${video.title}. Created in demo only workspace.`);
    setYtThumbnailText('');
    
    // Assign suitable initial hashtags depending on the video!
    if (video.title.toLowerCase().includes('one piece') || video.title.toLowerCase().includes('luffy') || video.title.toLowerCase().includes('dadan')) {
      setYtHashtags('#shorts #onepiece #animefacts');
    } else {
      setYtHashtags('#shorts #timelapse #construction');
    }
    
    setYtCoverGradient(video.thumbnailGradient || 'bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950');
    setYtVisibility('Public');
    
    // Set scheduled date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    setYtPublishDate(dateStr);
    setYtPublishTime('12:00');

    showNotification(`Selected draft: "${video.title}"`);
  };

  const handlePresetChange = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = METADATA_PRESETS[index];
    if (preset && preset.thumbnailTextOptions.length > 0) {
      setSelectedThumbnailText(preset.thumbnailTextOptions[0]);
    } else {
      setSelectedThumbnailText('');
    }
  };

  const handleApplyPreset = () => {
    const preset = METADATA_PRESETS[selectedPresetIndex];
    if (!preset) return;
    
    // Fill description and hashtags
    setYtDescription(preset.description);
    setYtHashtags(preset.hashtags);
    setYtThumbnailText(selectedThumbnailText);
    
    // If YouTube title is empty, generate a clean title from selected video's title or file name
    if (!ytTitle.trim() && selectedVideoObj) {
      const source = selectedVideoObj.fileName || selectedVideoObj.title;
      const cleanTitle = generateTitleFromFileName(source);
      setYtTitle(cleanTitle);
    }
    
    showNotification(`Applied metadata preset: "${preset.name}"`);
  };

  const handleApplyHashtagsOnly = () => {
    const preset = METADATA_PRESETS[selectedPresetIndex];
    if (!preset) return;
    setYtHashtags(preset.hashtags);
    showNotification(`Applied hashtags only from "${preset.name}"`);
  };

  const handleApplyDescriptionOnly = () => {
    const preset = METADATA_PRESETS[selectedPresetIndex];
    if (!preset) return;
    setYtDescription(preset.description);
    showNotification(`Applied description only from "${preset.name}"`);
  };

  const handleApplyThumbnailTextOnly = () => {
    setYtThumbnailText(selectedThumbnailText);
    showNotification(`Applied thumbnail text overlay: "${selectedThumbnailText}"`);
  };

  const handleClearMetadata = () => {
    setYtTitle('');
    setYtDescription('');
    setYtHashtags('');
    setYtThumbnailText('');
    showNotification('Cleared video title, description, hashtags, and thumbnail text');
  };

  // Quick Stats computation
  const stats = useMemo(() => {
    // Computed based on base videos list and queue list
    const draftCount = videos.filter(v => {
      const isQueued = queue.some(q => q.videoId === v.id);
      const isUploaded = v.status === 'Uploaded' || queue.some(q => q.videoId === v.id && q.status === 'Uploaded');
      return !isQueued && !isUploaded;
    }).length;
    const scheduledCount = queue.filter(q => q.status === 'Scheduled').length;
    const uploadedCount = queue.filter(q => q.status === 'Uploaded').length;
    const failedCount = queue.filter(q => q.status === 'Failed').length;

    return {
      drafts: draftCount,
      scheduled: scheduledCount,
      uploaded: uploadedCount,
      failed: failedCount
    };
  }, [videos, queue]);

  const readinessResults = useMemo(() => {
    const isYouTubeConnected = ytChannelStatus === 'YouTube Connected' && !!selectedYtChannel;
    return queue.map(item => ({
      item,
      result: checkUploadReadiness(item, {
        isYouTubeConnected,
        selectedYouTubeChannel: selectedYtChannel,
        driveVideos: videos,
      })
    }));
  }, [queue, videos, ytChannelStatus, selectedYtChannel]);

  const readinessSummary = useMemo(() => {
    return readinessResults.reduce(
      (acc, entry) => {
        if (entry.result.level === 'ready') acc.ready += 1;
        if (entry.result.level === 'warning') acc.warning += 1;
        if (entry.result.level === 'blocked') acc.blocked += 1;
        return acc;
      },
      { ready: 0, warning: 0, blocked: 0 }
    );
  }, [readinessResults]);

  // Computed history filtered & searched queue items (ARC 8)
  const filteredHistory = useMemo(() => {
    return queue.filter(item => {
      // 1. Status Filter
      if (historyFilter !== 'All' && item.status !== historyFilter) {
        return false;
      }
      // 2. Search query
      if (historySearch.trim() !== '') {
        const query = historySearch.toLowerCase();
        const matchesTitle = item.videoTitle?.toLowerCase().includes(query) || false;
        const matchesYtTitle = item.youtubeTitle?.toLowerCase().includes(query) || false;
        const matchesFile = item.fileName?.toLowerCase().includes(query) || false;
        const matchesStatus = item.status?.toLowerCase().includes(query) || false;
        return matchesTitle || matchesYtTitle || matchesFile || matchesStatus;
      }
      return true;
    });
  }, [queue, historyFilter, historySearch]);

  const getReadinessForItem = (itemId: string) => {
    return readinessResults.find(entry => entry.item.id === itemId)?.result;
  };

  const handleCheckAllQueue = () => {
    const message = `${readinessSummary.ready} ready, ${readinessSummary.warning} need review, ${readinessSummary.blocked} blocked.`;
    setReadinessSummaryMessage(message);
    showNotification(`Readiness check complete: ${message}`, readinessSummary.blocked > 0 ? 'error' : 'info');
  };

  // Handlers
  const handlePickFromGoogleDrive = async () => {
    setGDriveError(null);
    try {
      showNotification('Accessing Google authentication...', 'info');
      await loadGoogleScripts();
      await ensurePickerLoaded();

      const token = await requestDriveAccessToken();
      setGDriveToken(token);
      setGDriveStatus('Google Drive Connected');

      const selectedFiles = await openGooglePicker(token);
      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      // Convert selected files to DriveVideoRecord payload for database saving
      const recordsToUpsert = selectedFiles.map(file => {
        const existingLocally = videos.find(v => v.driveFileId === file.driveFileId);
        return {
          id: existingLocally?.id || `drive-${file.driveFileId}`,
          drive_file_id: file.driveFileId,
          title: file.name,
          file_name: file.name,
          mime_type: file.mimeType || null,
          url: file.url || null,
          thumbnail_url: file.thumbnailUrl || null,
          size_bytes: file.sizeBytes ? Number(file.sizeBytes) : null,
          status: (existingLocally?.status || 'Draft') as 'Draft' | 'Scheduled' | 'Uploaded' | 'Failed',
        };
      });

      // Save to Supabase table drive_videos using upsert if configured
      if (isSupabaseConfigured) {
        try {
          await upsertDriveVideos(recordsToUpsert);
        } catch (err: any) {
          console.error("Supabase upsert failed:", err);
          showNotification(`Database save warning: ${err.message}`, 'error');
        }
      }

      let addedCount = 0;
      let updatedCount = 0;
      let firstDriveVideo: Video | null = null;

      setVideos(prev => {
        const updatedList = [...prev];
        selectedFiles.forEach((file) => {
          let formattedSize = 'Unknown size';
          if (file.sizeBytes) {
            const mb = Number(file.sizeBytes) / (1024 * 1024);
            formattedSize = mb >= 1.0 ? `${mb.toFixed(1)} MB` : `${(mb * 1024).toFixed(0)} KB`;
          }

          const matchedIndex = updatedList.findIndex(v => v.source === 'drive' && v.driveFileId === file.driveFileId);
          if (matchedIndex > -1) {
            // Update existing record
            const updatedItem: Video = {
              ...updatedList[matchedIndex],
              title: file.name,
              fileName: file.name,
              size: formattedSize,
              url: file.url,
              thumbnailUrl: file.thumbnailUrl,
              sizeBytes: file.sizeBytes,
              mimeType: file.mimeType,
            };
            updatedList[matchedIndex] = updatedItem;
            updatedCount++;
            if (!firstDriveVideo) {
              firstDriveVideo = updatedItem;
            }
          } else {
            // Append new record
            const driveVideoItem: Video = {
              id: `drive-${file.driveFileId}`,
              driveFileId: file.driveFileId,
              title: file.name,
              fileName: file.name,
              duration: '0:30',
              status: 'Draft',
              size: formattedSize,
              resolution: '1080p (Drive)',
              thumbnailGradient: 'bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]',
              source: 'drive',
              mimeType: file.mimeType,
              url: file.url,
              thumbnailUrl: file.thumbnailUrl,
              sizeBytes: file.sizeBytes
            };
            updatedList.push(driveVideoItem);
            addedCount++;
            if (!firstDriveVideo) {
              firstDriveVideo = driveVideoItem;
            }
          }
        });
        return updatedList;
      });

      if (addedCount > 0) {
        showNotification(`Successfully imported ${addedCount} videos from Google Drive!`, 'success');
      } else if (updatedCount > 0) {
        showNotification(`Updated ${updatedCount} existing Google Drive videos!`, 'success');
      }

      if (firstDriveVideo) {
        const target: Video = firstDriveVideo;
        setSelectedVideoId(target.id);
        handleSelectVideo(target);
      }
    } catch (err: any) {
      console.error("Google Picker Error: ", err);
      setGDriveStatus('Google Drive Error');
      const errorMsg = err.message || 'Failed connecting to Google Drive.';
      setGDriveError(errorMsg);
      showNotification(errorMsg, 'error');
    }
  };

  const handleAddHashtag = (hashtag: string) => {
    if (!ytHashtags.includes(hashtag)) {
      setYtHashtags(prev => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${hashtag}` : hashtag;
      });
    }
  };

  const handleCreateMockVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockVidTitle.trim()) {
      showNotification('Please enter a video title', 'error');
      return;
    }

    const file = mockVidFileName.trim() || `${mockVidTitle.toLowerCase().replace(/\s+/g, '_')}_shorts.mp4`;
    const randomGradient = PRESET_MOCK_COVERS[Math.floor(Math.random() * PRESET_MOCK_COVERS.length)].gradient;
    
    const newVideo: Video = {
      id: `vid-${Date.now()}`,
      title: mockVidTitle,
      duration: mockVidDuration,
      fileName: file,
      status: 'Draft',
      size: `${(Math.random() * 15 + 10).toFixed(1)} MB`,
      resolution: '1080x1920',
      thumbnailGradient: randomGradient
    };

    setVideos(prev => [newVideo, ...prev]);
    setSelectedVideoId(newVideo.id);
    handleSelectVideo(newVideo);
    
    setMockVidTitle('');
    setMockVidFileName('');
    setMockVidDuration('0:30');
    setIsAddMockOpen(false);
    showNotification(`Added "${newVideo.title}" to your Video Bank!`);
  };

  const handleQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoObj) {
      showNotification('Choose a video from the Video Bank first!', 'error');
      return;
    }
    if (!ytTitle.trim()) {
      showNotification('YouTube Video Title is required!', 'error');
      return;
    }

    // Check if item already exists in queue to avoid duplicating
    const alreadyInQueue = queue.some(q => q.videoId === selectedVideoObj.id);
    if (alreadyInQueue) {
      showNotification(`"${selectedVideoObj.title}" is already scheduled in the Upload Queue!`, 'error');
      return;
    }

    const itemId = `q-${Date.now()}`;
    const newQueueItem: QueueItem = {
      id: itemId,
      videoId: selectedVideoObj.id,
      videoTitle: selectedVideoObj.title,
      fileName: selectedVideoObj.fileName,
      youtubeTitle: ytTitle,
      description: ytDescription,
      hashtags: ytHashtags,
      thumbnail: ytThumbnailText ? `${ytCoverGradient}|||${ytThumbnailText}` : ytCoverGradient,
      visibility: ytVisibility,
      publishDate: ytPublishDate || '2026-06-24',
      publishTime: ytPublishTime || '12:00',
      status: 'Scheduled',
      duration: selectedVideoObj.duration
    };

    if (isSupabaseConfigured) {
      try {
        const payload = mapToDbItem(newQueueItem);
        await addUploadQueueItem(payload);

        // Sync Drive video status if from Drive
        if (selectedVideoObj.source === 'drive') {
          try {
            await updateDriveVideoStatus(selectedVideoObj.id, 'Scheduled');
          } catch (driveErr: any) {
            console.warn("Could not sync status to drive_videos table:", driveErr);
            showNotification("Warning: Could not update database status for Google Drive video.", "info");
          }
        }

        setQueue(prev => [...prev, newQueueItem]);
        setVideos(prev => prev.map(v => v.id === selectedVideoObj.id ? { ...v, status: 'Scheduled' } : v));
        showNotification(`Successfully scheduled in Supabase: "${ytTitle}"`);
      } catch (err: any) {
        showNotification(`Database error: ${err.message}`, 'error');
      }
    } else {
      setQueue(prev => [...prev, newQueueItem]);
      // Update matching video in bank status to Scheduled
      setVideos(prev => prev.map(v => v.id === selectedVideoObj.id ? { ...v, status: 'Scheduled' } : v));
      showNotification(`Successfully scheduled: "${ytTitle}"`);
    }
  };

  const handleRemoveFromQueue = async (itemId: string, videoId: string) => {
    if (isSupabaseConfigured) {
      try {
        await deleteUploadQueueItem(itemId);

        // Sync Drive video status if from Drive
        const matchedVideo = videos.find(v => v.id === videoId);
        if (matchedVideo && matchedVideo.source === 'drive') {
          try {
            await updateDriveVideoStatus(videoId, 'Draft');
          } catch (driveErr: any) {
            console.warn("Could not reset status to Draft in drive_videos:", driveErr);
            showNotification("Warning: Could not check in Drive video draft status in database.", "info");
          }
        }

        setQueue(prev => prev.filter(item => item.id !== itemId));
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'Draft' } : v));
        showNotification('Item removed from queue and deleted from Supabase.', 'info');
      } catch (err: any) {
        showNotification(`Database error: ${err.message}`, 'error');
      }
    } else {
      setQueue(prev => prev.filter(item => item.id !== itemId));
      // Reset video status in bank to Draft
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'Draft' } : v));
      showNotification('Item removed from queue and set back to Draft.', 'info');
    }
  };

  const handleRemoveDriveVideo = async (id: string) => {
    try {
      const inQueue = queue.some(q => q.videoId === id);
      if (inQueue) {
        showNotification("This video is currently scheduled in the queue. Please remove it from the queue first.", "error");
        return;
      }

      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideoId === id) {
        setSelectedVideoId(null);
      }

      if (isSupabaseConfigured) {
        await deleteDriveVideo(id);
        showNotification("Successfully removed Drive video from your Bank.", "success");
      } else {
        showNotification("Successfully removed Drive video locally.", "success");
      }
    } catch (err: any) {
      console.error("Error removing Drive video:", err);
      showNotification(`Failed to remove Drive video: ${err.message}`, 'error');
    }
  };

  // Real-time Upload & Scheduler simulation trigger
  const runSchedulerSimulation = () => {
    const scheduledItems = queue.filter(item => item.status === 'Scheduled');
    if (scheduledItems.length === 0) {
      showNotification('No scheduled items in the queue to process!', 'error');
      return;
    }

    setSimulationActive(true);
    setSimLog('Preparing video upload simulation... Demo only');

    let currentItemIndex = 0;
    
    const runStep = () => {
      if (currentItemIndex >= scheduledItems.length) {
        setSimulationActive(false);
        setSimLog(null);
        showNotification('Demo upload sequence complete! All simulated Shorts have been uploaded.', 'success');
        return;
      }

      const currentItem = scheduledItems[currentItemIndex];
      
      // Step 1: Starting file upload pipeline
      setSimLog(`[1/3] Simulating upload of "${currentItem.youtubeTitle}" (${currentItem.fileName})... Demo only`);
      setQueue(prev => prev.map(item => item.id === currentItem.id ? { ...item, progress: 20 } : item));

      // Step 2: Processing video quality
      setTimeout(() => {
        setSimLog(`[2/3] Rendering 1080x1920 vertical preview. Configuring thumbnail styles...`);
        setQueue(prev => prev.map(item => item.id === currentItem.id ? { ...item, progress: 65 } : item));

        // Step 3: Injecting metadata and completing fields
        setTimeout(() => {
          setSimLog(`[3/3] Inserting title metadata and setting visibility to ${currentItem.visibility}...`);
          setQueue(prev => prev.map(item => item.id === currentItem.id ? { ...item, progress: 95 } : item));

          // Step 4: Finished!
          setTimeout(async () => {
            if (isSupabaseConfigured) {
              try {
                await updateUploadQueueStatus(currentItem.id, 'Uploaded');

                // Sync Drive video status if from Drive
                const matchedVideo = videos.find(v => v.id === currentItem.videoId);
                if (matchedVideo && matchedVideo.source === 'drive') {
                  try {
                    await updateDriveVideoStatus(currentItem.videoId, 'Uploaded');
                  } catch (driveErr: any) {
                    console.error("Failed to update status to Uploaded in drive_videos:", driveErr);
                  }
                }
              } catch (err: any) {
                console.error("Failed to update status in Supabase:", err);
              }
            }
            setQueue(prev => prev.map(item => {
              if (item.id === currentItem.id) {
                return { ...item, status: 'Uploaded', progress: undefined };
              }
              return item;
            }));
            setVideos(prev => prev.map(v => v.id === currentItem.videoId ? { ...v, status: 'Uploaded' } : v));
            currentItemIndex++;
            runStep();
          }, 800);

        }, 1200);

      }, 1200);
    };

    runStep();
  };

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => {
        showNotification("YouTube link copied.", "success");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        showNotification("Could not copy link. Please copy it manually.", "error");
      });
  };

  const isItemSelectable = (item: QueueItem) => {
    if (item.status === 'Uploaded') return { selectable: false, reason: 'Already uploaded' };
    if (uploadingItemId === item.id) return { selectable: false, reason: 'Currently uploading' };
    const matchedVideo = videos.find(v => v.id === item.videoId || v.driveFileId === item.videoId || v.fileName === item.fileName);
    if (!matchedVideo) return { selectable: false, reason: 'Google Drive video file is missing from synced bank' };
    const readiness = getReadinessForItem(item.id);
    if (readiness?.level === 'blocked') return { selectable: false, reason: 'Upload is blocked. Check readiness info' };
    return { selectable: true };
  };

  const handleCheckboxClick = (item: QueueItem, disabled: boolean, reason?: string) => {
    if (disabled && reason) {
      showNotification(`Cannot select item: ${reason}`, 'info');
    }
  };

  const handleStartBatchUpload = async () => {
    if (selectedQueueIds.length === 0) return;
    if (selectedQueueIds.length > 3) {
      showNotification("ARC 10 allows up to 3 videos per batch for safety.", "error");
      return;
    }
    if (!selectedYtChannel) {
      showNotification("Please connect your YouTube channel first.", "error");
      return;
    }

    const confirmBatch = window.confirm(
      `Upload ${selectedQueueIds.length} selected video(s) to YouTube now? ARC 10 uploads manually and does not schedule yet.`
    );
    if (!confirmBatch) return;

    setBatchUploadActive(true);
    setBatchStatus('Running');
    setBatchTotalCount(selectedQueueIds.length);
    setBatchResults([]);

    const itemsToUpload = queue.filter(q => selectedQueueIds.includes(q.id));

    for (let i = 0; i < itemsToUpload.length; i++) {
      const item = itemsToUpload[i];
      setBatchCurrentIndex(i + 1);
      setBatchCurrentItemTitle(item.youtubeTitle || item.fileName);

      // Check if already uploaded (prevent duplicate upload)
      const freshQueue = [...queue]; // we can also read state directly inside the loop
      const freshItem = freshQueue.find(q => q.id === item.id) || item;
      if (freshItem.status === 'Uploaded') {
        setBatchResults(prev => [...prev, {
          id: item.id,
          title: item.youtubeTitle || item.fileName,
          status: 'Skipped',
          reason: 'Skipped because already uploaded.'
        }]);
        continue;
      }

      const selectCheck = isItemSelectable(freshItem);
      if (!selectCheck.selectable) {
        setBatchResults(prev => [...prev, {
          id: item.id,
          title: item.youtubeTitle || item.fileName,
          status: 'Skipped',
          reason: selectCheck.reason || 'Item is not eligible'
        }]);
        continue;
      }

      const isRetry = freshItem.status === 'Failed';

      try {
        setUploadingItemId(item.id);
        setUploadingStep(isRetry ? `Retrying upload... (${i + 1} of ${itemsToUpload.length})` : `Preparing upload... (${i + 1} of ${itemsToUpload.length})`);
        setUploadingPercent(15);

        if (isRetry) {
          if (isSupabaseConfigured) {
            try {
              await resetQueueItemForRetry(item.id);
            } catch (dbErr: any) {
              console.error("Failed to reset retry status in database for batch:", dbErr);
            }
          }
          setQueue(prev => prev.map(q => {
            if (q.id === item.id) {
              return {
                ...q,
                uploadError: null
              };
            }
            return q;
          }));
        }

        const matchedVideo = videos.find(v => v.id === item.videoId || v.driveFileId === item.videoId || v.fileName === item.fileName);
        const driveFileId = matchedVideo?.driveFileId || item.videoId?.replace('drive-', '');

        if (!driveFileId) {
          throw new Error("Missing Google Drive file ID. Real uploads require a Google Drive video.");
        }

        setUploadingStep(`Authorizing YouTube... (${i + 1} of ${itemsToUpload.length})`);
        setUploadingPercent(30);
        const uploadToken = await requestYouTubeUploadToken();

        setUploadingStep(`Downloading from Drive... (${i + 1} of ${itemsToUpload.length})`);
        setUploadingPercent(50);
        let driveToken = gDriveToken;
        if (!driveToken) {
          driveToken = await requestDriveAccessToken();
          setGDriveToken(driveToken);
          setGDriveStatus('Google Drive Connected');
        }

        const videoBlob = await downloadDriveFileAsBlob(driveFileId, driveToken);

        setUploadingStep(`Uploading to YouTube... (${i + 1} of ${itemsToUpload.length})`);
        setUploadingPercent(75);

        const result = await uploadVideoToYouTube({
          accessToken: uploadToken,
          videoBlob,
          fileName: item.fileName,
          title: item.youtubeTitle,
          description: `${item.description}\n\n${item.hashtags}`.trim(),
          visibility: item.visibility,
        });

        setUploadingStep(`Complete (${i + 1} of ${itemsToUpload.length})`);
        setUploadingPercent(100);

        if (isSupabaseConfigured) {
          await markQueueItemUploaded(item.id, {
            youtube_video_id: result.youtubeVideoId,
            youtube_video_url: result.youtubeVideoUrl,
            uploaded_at: new Date().toISOString()
          });

          if (matchedVideo && matchedVideo.source === 'drive') {
            try {
              await updateDriveVideoStatus(matchedVideo.id, 'Uploaded');
            } catch (driveErr) {}
          }
        }

        setQueue(prev => prev.map(q => {
          if (q.id === item.id) {
            return {
              ...q,
              status: 'Uploaded',
              youtubeVideoId: result.youtubeVideoId,
              youtubeVideoUrl: result.youtubeVideoUrl,
              uploadedAt: new Date().toISOString(),
              uploadError: null
            };
          }
          return q;
        }));

        setVideos(prev => prev.map(v => v.id === item.videoId ? { ...v, status: 'Uploaded' } : v));

        setBatchResults(prev => [...prev, {
          id: item.id,
          title: item.youtubeTitle || item.fileName,
          status: 'Success'
        }]);

      } catch (err: any) {
        console.error(`Batch upload failed for item ${item.id}:`, err);
        const errorMsg = err.message || "An unexpected error occurred.";

        if (isSupabaseConfigured) {
          try {
            await markQueueItemUploadFailed(item.id, errorMsg);
          } catch (dbErr) {}
        }

        setQueue(prev => prev.map(q => {
          if (q.id === item.id) {
            return {
              ...q,
              status: 'Failed',
              uploadError: errorMsg
            };
          }
          return q;
        }));

        setBatchResults(prev => [...prev, {
          id: item.id,
          title: item.youtubeTitle || item.fileName,
          status: 'Failed',
          error: errorMsg
        }]);

        if (batchStopOnError) {
          setBatchStatus('Failed/Stopped');
          setUploadingItemId(null);
          showNotification("Batch stopped after an upload failed.", "error");
          setBatchUploadActive(false);
          return; // STOP batch execution entirely!
        }
      }
    }

    setUploadingItemId(null);
    setBatchStatus('Complete');
    setBatchUploadActive(false);
    setSelectedQueueIds([]); // Clear selection upon batch complete
    showNotification("Batch upload complete.", "success");
  };

  const handleUploadToYouTube = async (item: QueueItem) => {
    // 1. Check readiness level first
    const readiness = getReadinessForItem(item.id);
    if (readiness?.level === 'blocked') {
      showNotification("Upload is blocked. Please resolve all blocked issues in the readiness check panel first.", "error");
      return;
    }

    const isRetry = item.status === 'Failed';

    // 2. Ask for manual upload confirmation
    const confirmUpload = window.confirm(
      isRetry
        ? `Retry uploading this failed video "${item.youtubeTitle}" to YouTube now?`
        : `Upload this video "${item.youtubeTitle}" to YouTube now? ARC 10 uploads manually and does not schedule yet.`
    );
    if (!confirmUpload) {
      return;
    }

    setUploadingItemId(item.id);
    setUploadingStep(isRetry ? 'Retrying upload... (using existing queue item)' : 'Preparing upload...');
    setUploadingPercent(10);

    if (isRetry) {
      // Clear upload_error in Supabase & local state before retry
      if (isSupabaseConfigured) {
        try {
          await resetQueueItemForRetry(item.id);
        } catch (dbErr: any) {
          console.error("Failed to reset retry status in database:", dbErr);
        }
      }
      setQueue(prev => prev.map(q => {
        if (q.id === item.id) {
          return {
            ...q,
            uploadError: null
          };
        }
        return q;
      }));
    }

    try {
      // 3. Find the associated video in bank to retrieve Google Drive file details
      const matchedVideo = videos.find(v => v.id === item.videoId || v.driveFileId === item.videoId || v.fileName === item.fileName);
      
      // Determine if mock/demo video or Drive video
      const isMock = matchedVideo?.source === 'mock' || !matchedVideo?.source;
      const driveFileId = matchedVideo?.driveFileId || item.videoId?.replace('drive-', '');

      let videoBlob: Blob;

      if (isMock) {
        // If it's a mock demo video, let's gracefully fail with a helpful notification or simulate successfully
        if (!driveFileId) {
          throw new Error("Missing Google Drive file ID. Real uploads require a Google Drive video from your synced bank.");
        }
      }

      if (!driveFileId) {
        throw new Error("Missing Google Drive file ID. Real uploads require a Google Drive video.");
      }

      // 4. Request Google YouTube upload scope token
      setUploadingStep('Authorizing YouTube upload scope...');
      setUploadingPercent(30);
      const uploadToken = await requestYouTubeUploadToken();

      // 5. Ensure we have Google Drive access token to download the file
      setUploadingStep('Downloading video from Google Drive...');
      setUploadingPercent(50);

      let driveToken = gDriveToken;
      if (!driveToken) {
        try {
          driveToken = await requestDriveAccessToken();
          setGDriveToken(driveToken);
          setGDriveStatus('Google Drive Connected');
        } catch (authErr: any) {
          throw new Error(`Google Drive authorization failed: ${authErr.message || authErr}`);
        }
      }

      // 6. Download file from Drive
      try {
        videoBlob = await downloadDriveFileAsBlob(driveFileId, driveToken);
      } catch (dlErr: any) {
        throw new Error(`Google Drive download failed: ${dlErr.message || dlErr}`);
      }

      // 7. Upload to YouTube using resumable upload API
      setUploadingStep('Uploading to YouTube...');
      setUploadingPercent(75);

      // Add a warning if there is a schedule saved
      if (item.publishDate || item.publishTime) {
        showNotification("Schedule date/time is saved but ARC 7 uploads manually now.", "info");
      }

      const result = await uploadVideoToYouTube({
        accessToken: uploadToken,
        videoBlob,
        fileName: item.fileName,
        title: item.youtubeTitle,
        description: `${item.description}\n\n${item.hashtags}`.trim(),
        visibility: item.visibility,
      });

      // 8. Handle successful upload
      setUploadingStep('Upload complete');
      setUploadingPercent(100);

      // Save upload results to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await markQueueItemUploaded(item.id, {
            youtube_video_id: result.youtubeVideoId,
            youtube_video_url: result.youtubeVideoUrl,
            uploaded_at: new Date().toISOString()
          });

          // Sync Drive video status if from Drive
          if (matchedVideo && matchedVideo.source === 'drive') {
            try {
              await updateDriveVideoStatus(matchedVideo.id, 'Uploaded');
            } catch (driveErr: any) {
              console.warn("Could not sync uploaded status to drive_videos table:", driveErr);
            }
          }
        } catch (dbErr: any) {
          console.error("Failed to update database upload status:", dbErr);
          showNotification(`Database save warning: ${dbErr.message}`, 'error');
        }
      }

      // Update local React state for immediate response
      setQueue(prev => prev.map(q => {
        if (q.id === item.id) {
          return {
            ...q,
            status: 'Uploaded',
            youtubeVideoId: result.youtubeVideoId,
            youtubeVideoUrl: result.youtubeVideoUrl,
            uploadedAt: new Date().toISOString(),
            uploadError: null
          };
        }
        return q;
      }));

      setVideos(prev => prev.map(v => v.id === item.videoId ? { ...v, status: 'Uploaded' } : v));

      showNotification(
        isRetry
          ? "Retry upload complete."
          : `Successfully uploaded to YouTube! Video URL: ${result.youtubeVideoUrl}`,
        'success'
      );

    } catch (error: any) {
      console.error("YouTube Upload process failed:", error);
      setUploadingStep('Upload failed');
      setUploadingPercent(100);

      const errorMsg = error.message || "An unexpected error occurred during the upload sequence.";
      
      // Save failure status to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await markQueueItemUploadFailed(item.id, errorMsg);
        } catch (dbErr: any) {
          console.error("Failed to mark database item as failed:", dbErr);
        }
      }

      // Update local React state
      setQueue(prev => prev.map(q => {
        if (q.id === item.id) {
          return {
            ...q,
            status: 'Failed',
            uploadError: errorMsg
          };
        }
        return q;
      }));

      showNotification(
        isRetry
          ? `Retry upload failed: ${errorMsg}`
          : `Upload failed: ${errorMsg}`,
        'error'
      );
    } finally {
      // Keep state visible for 5 seconds to let the user see progress outcomes
      setTimeout(() => {
        setUploadingItemId(null);
      }, 5000);
    }
  };

  // Drag and Drop simulation
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setMockVidTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
      setMockVidFileName(file.name);
      setMockVidDuration('0:15'); // default estimate
      setIsAddMockOpen(true);
      showNotification(`Captured file: ${file.name}. Configure details below.`);
    }
  };

  // Filtered Video Bank list
  const filteredVideos = useMemo(() => {
    return videos.filter(v => v.title.toLowerCase().includes(vBankSearch.toLowerCase()) || v.fileName.toLowerCase().includes(vBankSearch.toLowerCase()));
  }, [videos, vBankSearch]);

  return (
    <div className="min-h-screen bg-[#0F1115] text-slate-200 flex flex-col font-sans selection:bg-rose-500 selection:text-white relative overflow-hidden">
      
      {/* GLOWING AMBIENT TOP BARS */}
      <div className="absolute top-0 left-1/4 w-96 h-40 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute top-10 right-1/4 w-96 h-40 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/[0.02] backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-display tracking-tight text-white">AutoTube Lite</h1>
                <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                  ARC 10 Manual Batch Upload
                </span>
              </div>
              <p className="text-xs text-slate-400">Google Drive + YouTube Shorts Scheduler</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {isSupabaseConfigured ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400">
                  <CloudLightning className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span>Supabase Connected</span>
                </div>
                {driveSyncStatus === 'synced' && (
                  <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-sky-400">
                    <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                    <span>Drive Bank Synced</span>
                  </div>
                )}
                {driveSyncStatus === 'failed' && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-amber-500" title="Drive sync failed">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Drive Bank sync failed. You can still use local demo mode.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-amber-500" title="Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to persist uploads">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>Local Demo Mode — Supabase is not configured.</span>
              </div>
            )}
            
            <button 
              onClick={async () => {
                if (isSupabaseConfigured) {
                  try {
                    await clearUploadQueue();
                    await fetchQueue();
                    showNotification('Supabase queue purged successfully!', 'info');
                  } catch (err: any) {
                    showNotification(`Failed to purge Supabase: ${err.message}`, 'error');
                  }
                } else {
                  setVideos(INITIAL_VIDEOS.map(v => ({ ...v, source: 'mock' as const })));
                  setQueue([]);
                  setSelectedVideoId('vid-1');
                  setYtTitle('One Piece Theory - Joy Boy Secret 🔥');
                  setYtDescription('An incredible theory exploring Joy Boy secret. What was his true identity in the Void Century?');
                  setYtHashtags('#shorts #onepiece #animefacts');
                  setYtCoverGradient('bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600');
                  setYtVisibility('Public');
                  showNotification('Dashboard reset to factory settings.', 'info');
                }
              }}
              title="Reset state to initial seeds"
              className="px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.12] active:bg-white/[0.02] border border-white/10 rounded-xl text-xs flex items-center gap-1.5 transition-all text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL TOAST NOTIFICATION */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-xl flex items-center gap-3 border max-w-sm ${
            notification.type === 'error' 
              ? 'bg-rose-950/90 border-rose-800 text-rose-200' 
              : notification.type === 'info'
                ? 'bg-blue-950/90 border-blue-800 text-blue-200'
                : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
          }`}>
            {notification.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="text-xs font-medium">{notification.text}</span>
            <button onClick={() => setNotification(null)} className="ml-auto text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CORE WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col gap-6">
        
        {/* STATS DECK */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl relative overflow-hidden transition duration-300 hover:border-white/20 hover:bg-white/[0.08]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Draft Videos</p>
                <p className="text-3xl font-bold text-white mt-1 font-mono">{stats.drafts}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl text-slate-300 border border-white/5">
                <Film className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Demo only — not queued yet</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl relative overflow-hidden transition duration-300 hover:border-white/20 hover:bg-white/[0.08]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Jadwal Upload</p>
                <p className="text-3xl font-bold text-blue-400 mt-1 font-mono">{stats.scheduled}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl text-blue-400 border border-white/5">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Scheduled upload items</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl relative overflow-hidden transition duration-300 hover:border-white/20 hover:bg-white/[0.08]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Status Uploaded</p>
                <p className="text-3xl font-bold text-green-400 mt-1 font-mono">{stats.uploaded}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-xl text-green-400 border border-white/5">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Successfully simulated uploads</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl relative overflow-hidden transition duration-300 hover:border-white/20 hover:bg-white/[0.08] border-red-500/30 bg-red-550/5">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full pointer-events-none"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Failed</p>
                <p className="text-3xl font-bold text-red-500 mt-1 font-mono">{stats.failed}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-xl text-red-400 border border-red-500/15">
                <BadgeAlert className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Failed simulated uploads</p>
          </div>
        </section>

        {/* DOUBLE COLUMN: LEFT = BANK & QUEUE, RIGHT = METADATA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CHUNK (COL SPAN 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* VIDEO BANK CONTAINER */}
            <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-white/10 bg-white/5 -mx-5 -mt-5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-slate-300" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-white">Draft Videos</h2>
                </div>
                
                <button
                  onClick={() => setIsAddMockOpen(!isAddMockOpen)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-red-900/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Video</span>
                </button>
              </div>

              {/* GOOGLE DRIVE INTEGRATION CONTROL CARD */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition duration-200">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative">
                    <div className={`w-3 h-3 rounded-full ${
                      gDriveStatus === 'Google Drive Connected' 
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                        : gDriveStatus === 'Google Drive Error' 
                          ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                          : 'bg-slate-400'
                    }`} />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Google Integration</span>
                    <span className="text-xs font-semibold text-white">{gDriveStatus}</span>
                    {gDriveError && (
                      <span className="text-[10px] text-rose-400 font-mono mt-0.5 leading-tight max-w-[320px] line-clamp-2" title={gDriveError}>
                        ❌ {gDriveError}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePickFromGoogleDrive}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-xl text-xs transition transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-950/30 shrink-0"
                >
                  <Globe className="w-4 h-4 shrink-0 text-white" />
                  <span>Pick Videos from Google Drive</span>
                </button>
              </div>

              {/* YOUTUBE CHANNEL INTEGRATION CONTROL CARD */}
              <div className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 transition duration-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative">
                      <div className={`w-3 h-3 rounded-full ${
                        ytChannelStatus === 'YouTube Connected' 
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                          : ytChannelStatus === 'Connecting YouTube...'
                            ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                            : ytChannelStatus === 'YouTube Connect Error' 
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                              : 'bg-slate-400'
                      }`} />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1">
                        <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        YouTube Channel
                      </span>
                      <span className="text-xs font-semibold text-white">{ytChannelStatus}</span>
                      {ytChannelError && (
                        <span className="text-[10px] text-rose-400 font-mono mt-0.5 leading-tight max-w-[320px] line-clamp-2" title={ytChannelError}>
                          ❌ {ytChannelError}
                        </span>
                      )}
                    </div>
                  </div>

                  {ytChannelStatus === 'YouTube Connected' && selectedYtChannel ? (
                    <button
                      type="button"
                      onClick={handleDisconnectYouTube}
                      className="w-full sm:w-auto px-3 py-1.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-slate-300 font-semibold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectYouTube}
                      disabled={ytChannelStatus === 'Connecting YouTube...'}
                      className={`w-full sm:w-auto px-4 py-2.5 font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0 ${
                        ytChannelStatus === 'Connecting YouTube...'
                          ? 'bg-red-900/40 text-red-400/60 cursor-not-allowed border border-red-500/20'
                          : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-red-950/30'
                      }`}
                    >
                      <Youtube className="w-4 h-4 shrink-0" />
                      <span>{ytChannelStatus === 'Connecting YouTube...' ? 'Connecting...' : 'Connect YouTube'}</span>
                    </button>
                  )}
                </div>

                {/* Connected Channel Info */}
                {ytChannelStatus === 'YouTube Connected' && selectedYtChannel && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 bg-black/40 border border-white/5 rounded-xl animate-fadeIn">
                    <img 
                      src={selectedYtChannel.thumbnailUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'}
                      alt={selectedYtChannel.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border border-white/15 object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{selectedYtChannel.title}</h4>
                        {selectedYtChannel.customUrl && (
                          <span className="text-[10px] text-red-400 font-medium px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded font-mono">
                            {selectedYtChannel.customUrl}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate select-all">
                        ID: {selectedYtChannel.id}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-300">
                        {selectedYtChannel.subscriberCount !== undefined && (
                          <span className="flex items-center gap-1 font-medium font-mono text-slate-200">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {selectedYtChannel.subscriberCount.toLocaleString()} subs
                          </span>
                        )}
                        {selectedYtChannel.videoCount !== undefined && (
                          <span className="flex items-center gap-1 font-medium font-mono text-slate-200">
                            <VideoIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {selectedYtChannel.videoCount.toLocaleString()} videos
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selector if multiple channels exist */}
                    {ytChannelsList.length > 1 && (
                      <div className="w-full sm:w-auto shrink-0 flex flex-col gap-1 mt-2 sm:mt-0">
                        <label className="text-[9px] uppercase font-bold text-slate-400">Switch Channel</label>
                        <select
                          value={selectedYtChannel.id}
                          onChange={(e) => handleSelectYtChannel(e.target.value)}
                          className="bg-[#15181e] border border-white/10 text-xs text-white rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-red-500/50"
                        >
                          {ytChannelsList.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              {channel.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Helpful Warning Banner */}
                <div className="flex items-start gap-2.5 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl text-left">
                  <Info className="w-4 h-4 text-amber-500/85 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-amber-200/80 leading-normal">
                    <strong>Note:</strong> ARC 10 supports manual batch upload for up to 3 videos at a time. Uploads run one by one. Automatic scheduling is not active yet.
                  </span>
                </div>
              </div>

              {/* MOCK VIDEO INTAKE POPUP / EXPANDED FORM */}
              {isAddMockOpen && (
                <form onSubmit={handleCreateMockVideo} className="bg-black/30 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col gap-3 animate-fadeIn">
                  <div className="flex justify-between items-center pb-1 border-b border-white/10">
                    <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Mock Video Simulator
                    </span>
                    <button type="button" onClick={() => setIsAddMockOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Concept Name / Draft Title *</label>
                      <input 
                        type="text" 
                        value={mockVidTitle}
                        onChange={(e) => setMockVidTitle(e.target.value)}
                        placeholder="e.g. My Morning Setup"
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Estimated Duration (seconds) *</label>
                      <select 
                        value={mockVidDuration}
                        onChange={(e) => setMockVidDuration(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 text-slate-200 rounded-lg px-2 py-2 text-xs outline-none transition appearance-none"
                      >
                        <option value="0:15" className="bg-[#141722]">0:15 Sec</option>
                        <option value="0:24" className="bg-[#141722]">0:24 Sec</option>
                        <option value="0:30" className="bg-[#141722]">0:30 Sec</option>
                        <option value="0:45" className="bg-[#141722]">0:45 Sec</option>
                        <option value="0:59" className="bg-[#141722]">0:59 Sec (Max Short)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mock Filename (Optional)</label>
                    <input 
                      type="text" 
                      value={mockVidFileName}
                      onChange={(e) => setMockVidFileName(e.target.value)}
                      placeholder="e.g. final_render_022.mp4"
                      className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-white/10 hover:bg-white/20 active:bg-white/5 border border-white/10 text-white font-bold py-2.5 rounded-xl text-xs transition transition-all cursor-pointer shadow-md"
                  >
                    Confirm & Deposit as Draft
                  </button>
                </form>
              )}

              {/* Optional info note */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="leading-normal">
                  Drive videos are saved to your AutoTube Lite bank after selection and will stay available after refresh.
                </p>
              </div>

              {/* No Google Drive Videos Saved yet Alert */}
              {videos.filter(v => v.source === 'drive').length === 0 && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
                  <Film className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    Pick videos from Google Drive to build your reusable Drive Bank.
                  </p>
                </div>
              )}

              {/* SEARCH & FILTERS */}
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search local bank videos..."
                  value={vBankSearch}
                  onChange={(e) => setVBankSearch(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 border-none outline-none w-full placeholder-slate-500 font-medium"
                />
                {vBankSearch && (
                  <button onClick={() => setVBankSearch('')} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* DRAG AND DROP MOCK AREA */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-3 text-center transition ${
                  dragActive 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-white/10 bg-black/25 hover:border-white/20'
                }`}
              >
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <Upload className="w-3.5 h-3.5 text-red-500" />
                  <span>Drag & drop MP4 file here or click below</span>
                </p>
              </div>

              {/* DRAFT ITEMS GRAPHIC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {filteredVideos.length === 0 ? (
                  <div className="col-span-2 text-center p-8 bg-black/20 border border-white/10 rounded-xl">
                    <VideoOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No matching draft videos in bank.</p>
                  </div>
                ) : (
                  filteredVideos.map((video) => {
                    const isSelected = selectedVideoId === video.id;
                    const inQueue = queue.some(q => q.videoId === video.id);
                    
                    return (
                      <div 
                        key={video.id}
                        onClick={() => handleSelectVideo(video)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? 'bg-white/10 shadow-md shadow-white/5 border-white/20 ring-1 ring-white/10' 
                            : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.08] opacity-80 hover:opacity-100'
                        }`}
                      >
                        {/* Title and stats layout */}
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <span className="text-xs font-semibold text-white line-clamp-2 flex flex-col gap-1 text-left">
                              {video.source === 'drive' && (
                                <span className="inline-flex items-center gap-1 text-[9px] w-fit bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider mb-1 leading-none shadow-sm shadow-blue-950/20">
                                  🌐 Drive Video
                                </span>
                              )}
                              <span>{video.title}</span>
                            </span>
                            <span className="text-[10px] bg-white/10 text-slate-300 font-mono px-1.5 py-0.5 rounded shrink-0">
                              {video.duration}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-slate-400 block truncate" title={video.fileName}>
                            📁 {video.fileName}
                          </span>
                        </div>

                        {/* Status + CTA bar */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 mt-auto">
                          <span className="text-[9px] text-slate-400 font-mono">
                            {video.size} • {video.resolution}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {video.source === 'drive' && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleRemoveDriveVideo(video.id);
                                }}
                                className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-[10px] flex items-center justify-center gap-1 cursor-pointer font-bold px-1.5 transition-colors"
                                title="This only removes the video from AutoTube Lite, not from Google Drive."
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                <span>Remove from Bank</span>
                              </button>
                            )}

                            {video.status === 'Uploaded' ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded-full">
                                Published
                              </span>
                            ) : inQueue ? (
                              <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full">
                                Scheduled
                              </span>
                            ) : (
                              <span className="text-[9px] bg-white/10 text-slate-300 border border-white/10 font-bold px-2 py-0.5 rounded-full">
                                Draft
                              </span>
                            )}

                            {/* Select Visual indicator of active form config */}
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-red-500 text-white' 
                                : 'bg-white/10 text-slate-400'
                            }`}>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* QUEUE CONTAINER */}
            <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2 bg-white/5 -mx-5 -mt-5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-300" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-white">Upload Queue</h2>
                </div>

                <div className="flex flex-col items-end gap-1 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={queue.length === 0}
                      onClick={handleCheckAllQueue}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shadow-lg shadow-sky-900/10"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Check All Queue</span>
                    </button>
                    <button
                      disabled={simulationActive || queue.filter(q => q.status === 'Scheduled').length === 0}
                      onClick={runSchedulerSimulation}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-rose-600 text-white text-xs font-bold rounded-xl hover:from-purple-500 hover:to-rose-500 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shadow-lg shadow-purple-900/10"
                    >
                      <Zap className="w-3.5 h-3.5 fill-amber-300 stroke-amber-300" />
                      <span>Demo Upload Simulation</span>
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium">Demo simulation is separate from real upload. Use Upload to YouTube for one manual upload.</span>
                </div>
              </div>

              {queue.length > 0 && !dbLoading && !dbError && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-lg font-black text-emerald-300">{readinessSummary.ready}</p>
                    <p className="text-[9px] uppercase font-bold text-emerald-400">Ready</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-lg font-black text-amber-300">{readinessSummary.warning}</p>
                    <p className="text-[9px] uppercase font-bold text-amber-400">Needs Review</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <p className="text-lg font-black text-rose-300">{readinessSummary.blocked}</p>
                    <p className="text-[9px] uppercase font-bold text-rose-400">Blocked</p>
                  </div>
                  <div className="col-span-3 flex items-start gap-2.5 p-2.5 bg-sky-500/5 border border-sky-500/10 rounded-xl text-left">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-sky-100/80 leading-normal font-medium">
                      ARC 10 supports manual batch upload for up to 3 videos at a time. Uploads run one by one. Automatic scheduling is not active yet.
                      {readinessSummaryMessage ? ` Latest check: ${readinessSummaryMessage}` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* BATCH PROGRESS PANEL (ARC 10) */}
              {batchStatus !== 'Idle' && (
                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex flex-col gap-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className={`w-4 h-4 ${batchStatus === 'Running' ? 'text-rose-400 animate-spin' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">Batch Upload Progress</span>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                      batchStatus === 'Running'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse'
                        : batchStatus === 'Complete'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {batchStatus}
                    </span>
                  </div>

                  {batchStatus === 'Running' && (
                    <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-semibold text-rose-300">Uploading {batchCurrentIndex} of {batchTotalCount}</span>
                        <span className="font-mono text-[10px]">{Math.round((batchCurrentIndex / batchTotalCount) * 100)}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">Current: <span className="text-white">{batchCurrentItemTitle}</span></p>
                      <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${(batchCurrentIndex / batchTotalCount) * 100}%` }}></div>
                      </div>
                    </div>
                  )}

                  {batchResults.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Batch Results</p>
                      <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto pr-1">
                        {batchResults.map((res, rIdx) => (
                          <div key={`batch-res-${res.id}-${rIdx}`} className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-black/10 border border-white/5">
                            <span className="truncate text-slate-300 max-w-[70%]" title={res.title}>{res.title}</span>
                            <div className="flex items-center gap-1.5">
                              {res.status === 'Success' ? (
                                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-bold">Uploaded</span>
                              ) : res.status === 'Failed' ? (
                                <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold" title={res.error}>Failed</span>
                              ) : (
                                <span className="text-[8px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded uppercase font-bold" title={res.reason}>Skipped</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {batchStatus !== 'Running' && (
                    <button
                      type="button"
                      onClick={() => setBatchStatus('Idle')}
                      className="self-end px-2.5 py-1 text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                    >
                      Dismiss Progress
                    </button>
                  )}
                </div>
              )}

              {/* BATCH SELECTION CONTROLS (ARC 10) */}
              {queue.length > 0 && !dbLoading && !dbError && (
                <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-300">
                        Selected for batch: <span className="text-rose-400 font-bold font-mono">{selectedQueueIds.length}</span>
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="checkbox"
                          id="batchStopOnError"
                          checked={batchStopOnError}
                          disabled={batchUploadActive}
                          onChange={(e) => setBatchStopOnError(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-white/25 text-rose-500 focus:ring-rose-500/20 bg-black/20 cursor-pointer"
                        />
                        <label htmlFor="batchStopOnError" className="text-[10px] text-slate-400 select-none cursor-pointer hover:text-white transition">
                          Stop batch if one upload fails
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedQueueIds.length === 0 || batchUploadActive}
                        onClick={() => setSelectedQueueIds([])}
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Clear Selection
                      </button>
                      <button
                        type="button"
                        onClick={handleStartBatchUpload}
                        disabled={selectedQueueIds.length === 0 || selectedQueueIds.length > 3 || batchUploadActive || !selectedYtChannel}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-lg shadow-rose-900/10"
                        title={
                          !selectedYtChannel 
                            ? "Please connect your YouTube channel first" 
                            : selectedQueueIds.length > 3 
                              ? "Cannot upload more than 3 videos at once" 
                              : "Upload selected items"
                        }
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        <span>Upload Selected</span>
                      </button>
                    </div>
                  </div>
                  {selectedQueueIds.length > 3 && (
                    <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ARC 10 allows up to 3 videos per batch for safety. Please deselect some items.</span>
                    </p>
                  )}
                </div>
              )}

              {simulationActive && (
                <div className="bg-white/10 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs text-slate-200 backdrop-blur-md animate-fadeIn">
                  <CloudLightning className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[10px] uppercase tracking-wider font-mono text-slate-300 animate-pulse">Simulator firing:</p>
                    <p className="truncate text-white font-medium mt-0.5">{simLog}</p>
                  </div>
                </div>
              )}

              {dbLoading ? (
                <div className="text-center py-12 px-4 bg-black/25 border border-white/10 rounded-2xl flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-3">
                    <CloudLightning className="w-5 h-5 animate-bounce text-purple-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Syncing with Supabase...</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Fetching your scheduled upload pipeline from Supabase.
                  </p>
                </div>
              ) : dbError ? (
                <div className="text-center py-12 px-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <p className="text-sm font-semibold text-rose-300">Database Connection Failed</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
                    {dbError}
                  </p>
                  <button
                    onClick={fetchQueue}
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-600 font-bold active:scale-95 text-white rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Again Connection</span>
                  </button>
                </div>
              ) : queue.length === 0 ? (
                <div className="text-center py-12 px-4 bg-black/20 border border-white/10 rounded-2xl flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                    <Layers className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Queue is empty</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Your upload queue is empty. Add videos after filling metadata and schedule.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {queue.map((item) => {
                    const isProcessing = simulationActive && item.progress !== undefined;
                    const isUploaded = item.status === 'Uploaded';
                    const readiness = getReadinessForItem(item.id);
                    const readinessLabel = isUploaded 
                      ? 'Already Uploaded'
                      : readiness?.level === 'ready' 
                        ? 'Ready to Upload' 
                        : readiness?.level === 'warning' 
                          ? 'Needs Review' 
                          : 'Blocked';
                    const readinessClass = isUploaded
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : readiness?.level === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20'
                        : readiness?.level === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/20';
                    
                    return (
                      <div 
                        key={item.id}
                        className={`p-4 bg-white/5 border border-white/10 rounded-2xl relative transition-all duration-300 flex flex-col gap-3 ${
                          isProcessing 
                            ? 'bg-blue-500/5 border-blue-500/40 ring-1 ring-blue-500/20 shadow-lg' 
                            : item.status === 'Uploaded' 
                              ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/10' 
                              : 'hover:bg-white/[0.08]'
                        }`}
                      >
                        {/* Upper row: Video Info + Status Action Controls */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                          
                          {/* Video Info Layout */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Checkbox Selection (ARC 10) */}
                            {!isUploaded && !simulationActive && (
                              <div 
                                onClick={() => handleCheckboxClick(item, !isItemSelectable(item).selectable, isItemSelectable(item).reason)}
                                className="flex items-center justify-center self-center pr-1 shrink-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedQueueIds.includes(item.id)}
                                  disabled={!isItemSelectable(item).selectable || batchUploadActive}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedQueueIds(prev => [...prev, item.id]);
                                    } else {
                                      setSelectedQueueIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded border-white/25 text-rose-500 focus:ring-rose-500/20 focus:ring-offset-0 bg-black/20 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                  title={!isItemSelectable(item).selectable ? isItemSelectable(item).reason : "Select for batch upload"}
                                />
                              </div>
                            )}

                            {/* Mini vertical 9:16 card view representing visual cover icon */}
                            {(() => {
                              const [itemGradient, itemText] = item.thumbnail.includes('|||') 
                                ? item.thumbnail.split('|||') 
                                : [item.thumbnail, ''];
                              return (
                                <div className={`w-10 h-16 rounded-md ${itemGradient} flex flex-col justify-between p-1 text-[8px] font-mono shrink-0 shadow-sm border border-white/10 relative overflow-hidden`}>
                                  {itemText ? (
                                    <span className="absolute inset-x-0 top-0.5 text-[5px] text-yellow-300 font-extrabold uppercase truncate bg-black/75 px-0.5 text-center leading-normal">
                                      {itemText}
                                    </span>
                                  ) : (
                                    <span className="bg-black/60 text-white rounded px-0.5 self-start text-[6px]">SHORTS</span>
                                  )}
                                  <span className="text-[6px] text-white/90 truncate bg-slate-900/45 px-0.5 rounded text-center block max-w-full z-10">
                                    {item.duration}
                                  </span>
                                </div>
                              );
                            })()}

                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-white leading-tight truncate pr-6" title={item.youtubeTitle}>
                                {item.youtubeTitle || '(No Name Title)'}
                              </h3>
                              
                              <p className="text-[10px] text-slate-400 mt-1 truncate">
                                📁 Original: {item.fileName}
                              </p>

                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-[9px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/5">
                                  <Calendar className="w-2.5 h-2.5" />
                                  {item.publishDate}
                                </span>
                                <span className="text-[9px] font-mono bg-white/10 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-white/5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {item.publishTime}
                                </span>
                                <span className="text-[9px] font-mono bg-red-500/10 text-red-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-red-500/20 uppercase tracking-tighter">
                                  <Globe className="w-2.5 h-2.5 text-red-400" />
                                  {item.visibility}
                                </span>
                                {readiness && (
                                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 border uppercase tracking-tighter ${readinessClass}`}>
                                    {isUploaded ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> : readiness.level === 'ready' ? <CheckCircle className="w-2.5 h-2.5" /> : readiness.level === 'warning' ? <AlertTriangle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                                    {readinessLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Progress details & Actions */}
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 pl-0 md:pl-4 pt-2 md:pt-0 border-t md:border-t-0 border-white/10 min-w-[120px] md:min-w-[160px]">
                            
                            {/* Simulated status feedback */}
                            <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
                              {uploadingItemId === item.id ? (
                                <div className="flex flex-col items-start md:items-end gap-1 w-28">
                                  <span className="text-[9px] px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded uppercase font-bold flex items-center gap-1 animate-pulse">
                                    <Activity className="w-3 h-3 text-rose-400 animate-spin" />
                                    Progress {uploadingPercent}%
                                  </span>
                                  <span className="text-[8px] text-slate-400 font-mono text-left md:text-right truncate max-w-[120px]" title={uploadingStep}>
                                    {uploadingStep}
                                  </span>
                                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${uploadingPercent}%` }}></div>
                                  </div>
                                </div>
                              ) : item.status === 'Uploaded' ? (
                                <div className="flex flex-col items-start md:items-end gap-1">
                                  <span className="text-[9px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/20 rounded uppercase font-bold flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Uploaded
                                  </span>
                                </div>
                              ) : item.status === 'Failed' ? (
                                <div className="flex flex-col items-start md:items-end gap-1">
                                  <span className="text-[9px] px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/20 rounded uppercase font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Upload Failed
                                  </span>
                                  {item.uploadError && (
                                    <span className="text-[8px] text-red-400 font-medium max-w-[130px] text-left md:text-right truncate" title={item.uploadError}>
                                      {item.uploadError}
                                    </span>
                                  )}
                                  <span className="text-[7px] text-slate-400 italic">
                                    Retry uses the existing queue item.
                                  </span>
                                </div>
                              ) : isProcessing ? (
                                <div className="flex flex-col items-start md:items-end gap-1 w-24">
                                  <span className="text-[9px] px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded uppercase font-bold flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                                    Uploading {item.progress}%
                                  </span>
                                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                    <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start md:items-end gap-1">
                                  <span className="text-[9px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded uppercase font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Scheduled
                                  </span>
                                  {selectedQueueIds.includes(item.id) && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded uppercase font-bold flex items-center gap-1 mt-0.5">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
 
                            {/* Action buttons */}
                            {!simulationActive && uploadingItemId !== item.id && (
                              <div className="flex items-center md:items-end gap-1.5 flex-wrap justify-end">
                                {item.status === 'Uploaded' && item.youtubeVideoUrl && (
                                  <div className="flex items-center md:items-end gap-1 flex-wrap justify-end">
                                    <a
                                      href={item.youtubeVideoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1 text-[10px] text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Youtube className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span>View Video</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(item.youtubeVideoUrl!)}
                                      className="px-2 py-1 text-[10px] text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                      title="Copy YouTube video link"
                                    >
                                      <Copy className="w-3 h-3 text-sky-400 shrink-0" />
                                      <span>Copy Link</span>
                                    </button>
                                  </div>
                                )}
                                
                                {item.status !== 'Uploaded' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUploadToYouTube(item)}
                                    disabled={uploadingItemId !== null || readiness?.level === 'blocked' || batchUploadActive}
                                    className="px-2 py-1 text-[10px] text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-1 cursor-pointer font-semibold"
                                    title={
                                      readiness?.level === 'blocked'
                                        ? "Resolve blocked issues first"
                                        : item.status === 'Failed'
                                          ? "Retry uses the existing queue item"
                                          : "Upload to YouTube now"
                                    }
                                  >
                                    <Youtube className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                                    <span>{item.status === 'Failed' ? 'Retry Upload' : 'Upload to YouTube'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setReadinessOpenId(readinessOpenId === item.id ? null : item.id)}
                                  className="px-2 py-1 text-[10px] text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Check upload readiness"
                                >
                                  <Search className="w-3 h-3" />
                                  <span>Check Readiness</span>
                                </button>
                                
                                <button
                                  onClick={() => handleRemoveFromQueue(item.id, item.videoId)}
                                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                                  title="Delete from schedule queue"
                                >
                                  <X className="w-4 h-4" />
                                  <span className="md:hidden text-[10px]">Remove</span>
                                </button>
                              </div>
                            )}

                          </div>

                        </div>

                        {/* Lower row: Expanded Readiness detail block */}
                        {readinessOpenId === item.id && readiness && (
                          <div className="w-full bg-black/35 border border-white/10 rounded-xl p-3 text-[10px] text-left mt-2">
                            <div className="font-bold text-white mb-2 flex items-center gap-1.5">
                              {isUploaded ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : readiness.level === 'ready' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : readiness.level === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                              Upload Readiness: {readinessLabel}
                            </div>
                            {selectedYtChannel && (
                              <p className="text-slate-400 mb-2">Target channel: <span className="text-slate-200 font-semibold">{selectedYtChannel.title}</span></p>
                            )}
                            {isUploaded ? (
                              <div className="mb-1">
                                <p className="text-emerald-300 font-bold uppercase tracking-wider mb-1">Upload Complete</p>
                                <ul className="list-disc list-inside space-y-0.5 text-emerald-100/90 font-medium">
                                  <li>Uploaded successfully.</li>
                                  <li>This video has already been uploaded to YouTube. Duplicate uploads are disabled for safety.</li>
                                </ul>
                              </div>
                            ) : (
                              <>
                                {readiness.issues.length > 0 && (
                                  <div className="mb-2">
                                    <p className="text-rose-300 font-bold uppercase tracking-wider mb-1">Blocked issues</p>
                                    <ul className="list-disc list-inside space-y-0.5 text-rose-200/90">
                                      {readiness.issues.map((issue, index) => <li key={`issue-${item.id}-${index}`}>{issue}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {readiness.warnings.length > 0 && (
                                  <div>
                                    <p className="text-amber-300 font-bold uppercase tracking-wider mb-1">Warnings</p>
                                    <ul className="list-disc list-inside space-y-0.5 text-amber-100/90">
                                      {readiness.warnings.map((warning, index) => <li key={`warning-${item.id}-${index}`}>{warning}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {readiness.issues.length === 0 && readiness.warnings.length === 0 && (
                                  <p className="text-emerald-200">No blocked issues or warnings found. This item is ready for the next upload ARC.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* UPLOAD HISTORY & ERROR LOG SECTION (ARC 10) */}
            <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 flex-wrap gap-2 bg-white/5 -mx-5 -mt-5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-400" />
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-white">Upload History & Error Log</h2>
                </div>
                <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-md uppercase">
                  ARC 10 Log
                </span>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-base font-bold text-white font-mono">{queue.length}</p>
                  <p className="text-[8px] uppercase font-bold text-slate-400 mt-0.5">Total Queue</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                  <p className="text-base font-bold text-emerald-400 font-mono">
                    {queue.filter(q => q.status === 'Uploaded').length}
                  </p>
                  <p className="text-[8px] uppercase font-bold text-emerald-500/80 mt-0.5">Uploaded</p>
                </div>
                <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 text-center">
                  <p className="text-base font-bold text-red-400 font-mono">
                    {queue.filter(q => q.status === 'Failed').length}
                  </p>
                  <p className="text-[8px] uppercase font-bold text-red-500/80 mt-0.5 font-sans">Failed</p>
                </div>
                <div className="p-2.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                  <p className="text-base font-bold text-yellow-400 font-mono">
                    {queue.filter(q => q.status === 'Scheduled').length}
                  </p>
                  <p className="text-[8px] uppercase font-bold text-yellow-500/80 mt-0.5 font-sans">Scheduled</p>
                </div>
              </div>

              {/* Filters & Search Input */}
              <div className="flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center mt-1">
                {/* Filters */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['All', 'Uploaded', 'Failed', 'Scheduled'] as const).map(filterOpt => {
                    const isSelected = historyFilter === filterOpt;
                    return (
                      <button
                        key={`hist-filter-${filterOpt}`}
                        type="button"
                        onClick={() => setHistoryFilter(filterOpt)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {filterOpt}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[150px]">
                  <Search className="absolute left-2.5 top-2.5 w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="w-full bg-black/25 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* History list or empty state */}
              {queue.length === 0 ? (
                <div className="text-center py-8 px-4 bg-black/10 border border-white/5 rounded-2xl flex flex-col items-center">
                  <History className="w-6 h-6 text-slate-500 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-400">Upload history will appear after you add videos to the queue.</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-8 px-4 bg-black/10 border border-white/5 rounded-2xl flex flex-col items-center">
                  <Search className="w-6 h-6 text-slate-500 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-slate-400">No items found for this filter.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {filteredHistory.map(item => {
                    const hasUrl = !!item.youtubeVideoUrl;
                    const isUploaded = item.status === 'Uploaded';
                    const isFailed = item.status === 'Failed';

                    return (
                      <div
                        key={`history-card-${item.id}`}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col gap-2.5 ${
                          isUploaded
                            ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                            : isFailed
                              ? 'bg-rose-500/[0.03] border-rose-500/20'
                              : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                        {/* Upper line: Video Titles & Status Badging */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white leading-tight truncate" title={item.youtubeTitle}>
                              {item.youtubeTitle || '(No Title)'}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              📁 Original: {item.fileName} {item.videoTitle ? `(${item.videoTitle})` : ''}
                            </p>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isUploaded ? (
                              <span className="text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                                Uploaded
                              </span>
                            ) : isFailed ? (
                              <span className="text-[8px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                                Upload Failed
                              </span>
                            ) : (
                              <span className="text-[8px] font-mono font-bold bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-yellow-500" />
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mid section: Dates, times, visibility & details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[9px] font-mono text-slate-400 bg-black/20 p-2 rounded-xl border border-white/5">
                          <div className="flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5 text-slate-500" />
                            <span className="uppercase text-slate-300">{item.visibility}</span>
                          </div>
                          {(item.publishDate || item.publishTime) && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-slate-500" />
                              <span className="text-slate-300 font-medium">Publish: {item.publishDate || '--'} {item.publishTime || '--'}</span>
                            </div>
                          )}
                          {item.uploadedAt && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                              <span className="text-slate-300">Uploaded At: {new Date(item.uploadedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Failed error details */}
                        {isFailed && (
                          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-2.5 text-[9px]">
                            <p className="text-red-400 font-bold uppercase tracking-wider mb-1">Error Message</p>
                            <p className="text-rose-200/90 leading-relaxed font-mono break-words">{item.uploadError || 'No error details recorded.'}</p>
                            <p className="text-slate-400 mt-1.5 italic">
                              💡 You can review the error and retry this upload. Retry uses the existing queue item.
                            </p>
                          </div>
                        )}

                        {/* Actions line */}
                        {isUploaded && hasUrl && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <a
                              href={item.youtubeVideoUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Youtube className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>View Video</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(item.youtubeVideoUrl!)}
                              className="px-2.5 py-1 text-[10px] font-bold text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Copy YouTube video link"
                            >
                              <Copy className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>Copy Link</span>
                            </button>
                          </div>
                        )}

                        {isFailed && (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => handleUploadToYouTube(item)}
                              disabled={uploadingItemId !== null || batchUploadActive}
                              className="px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Retry uses the existing queue item."
                            >
                              <Youtube className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
                              <span>Retry Upload</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

          {/* RIGHT CHUNK: METADATA EDITOR & COVER PREVIEW (COL SPAN 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6 sticky lg:top-[90px]">

            {/* LIVE PREVIEW COVER CARD */}
            <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1 flex items-center gap-1.5">
                <MonitorPlay className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                Live 9:16 Shorts Cover Preview
              </span>

              {selectedVideoObj ? (
                <div className="flex justify-center py-2">
                  {/* Aspect ratio frame 9:16 representing YouTube Shorts Screen */}
                  <div className={`w-[190px] h-[338px] ${ytCoverGradient} rounded-2xl shadow-xl shadow-black/60 relative p-3 flex flex-col justify-between border border-white/20 select-none overflow-hidden transition-all duration-300`}>
                    
                    {/* Background decoration representing camera grid overlay or depth */}
                    <div className="absolute inset-0 bg-black/15 mix-blend-overlay pointer-events-none"></div>
                    
                    {/* Thumbnail Text Overlay */}
                    {ytThumbnailText && (
                      <div className="absolute inset-x-2 top-10 text-center z-10 pointer-events-none">
                        <span className="inline-block bg-black/85 text-yellow-400 font-extrabold text-[10px] px-2 py-1.5 rounded-lg border border-yellow-500/30 uppercase tracking-wider shadow-lg max-w-[170px] break-words">
                          {ytThumbnailText}
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 right-2 flex justify-between items-center text-[8px] font-mono bg-black/50 text-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg pointer-events-none border border-white/5">
                      <span className="flex items-center gap-1">
                        <Youtube className="w-2.5 h-2.5 text-red-500 shrink-0" />
                        Youtube Shorts
                      </span>
                      <span>{selectedVideoObj.duration}</span>
                    </div>

                    {/* Aesthetic center Play logo */}
                    <div className="my-auto mx-auto w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/40 text-white shadow-lg shadow-black/20 pointer-events-none">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>

                    {/* Simulated creator user tags and overlay content bottom */}
                    <div className="flex flex-col gap-1.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent absolute bottom-0 left-0 right-0 p-3 pt-8 pb-3 text-left pointer-events-none">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[7px] font-bold text-white">
                          A
                        </div>
                        <span className="text-[8px] text-white font-medium">@yourchannel</span>
                        <span className="bg-red-600 text-[6px] text-white px-1.5 py-0.2 rounded font-extrabold uppercase scale-90">
                          Live
                        </span>
                      </div>

                      {/* Displaying actual user input text with hashtags */}
                      <p className="text-[10px] text-white font-semibold leading-tight line-clamp-3">
                        {ytTitle || '(Draft Title)'}
                      </p>

                      <p className="text-[8px] font-mono font-medium text-slate-200 truncate">
                        {ytHashtags || '#shorts'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-48 bg-black/30 border border-white/10 rounded-2xl flex items-center justify-center text-center">
                  <p className="text-xs text-slate-400 p-4 font-medium">
                    Selecting a video in the Bank reveals a live cover rendering.
                  </p>
                </div>
              )}
            </section>

            {/* METADATA FORM CONTROL */}
            <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10 bg-white/5 -mx-5 -mt-5 px-5 py-4">
                <FileText className="w-4 h-4 text-slate-300" />
                <h2 className="font-semibold text-sm uppercase tracking-wider text-white">Metadata & Jadwal Upload</h2>
              </div>

              {!selectedVideoObj ? (
                <div className="text-center py-10 px-4 bg-black/20 border border-white/10 rounded-2xl flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
                    <VideoIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">No Draft Selected</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select a video from your Drive Bank or demo videos to prepare metadata.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleQueueSubmit} className="flex flex-col gap-4">
                  
                  {/* Selected Video details label */}
                  <div className="p-3 bg-black/40 rounded-xl border border-white/15 text-[11px] leading-relaxed flex items-center justify-between text-slate-300">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Selected Source:</span>
                      <strong className="text-white block truncate">{selectedVideoObj.title}</strong>
                    </div>
                    <span className="bg-white/10 text-slate-200 border border-white/10 rounded px-2.5 py-1 font-mono shrink-0 font-bold ml-2">
                      {selectedVideoObj.duration}
                    </span>
                  </div>

                  {/* Metadata Preset Section */}
                  <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Metadata Preset
                      </h3>
                      <span className="text-[9px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">
                        ARC 4
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      Presets help you fill metadata faster. You can still edit everything manually.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Preset Select */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Preset Template</label>
                        <select
                          value={selectedPresetIndex}
                          onChange={(e) => handlePresetChange(Number(e.target.value))}
                          className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition cursor-pointer"
                        >
                          {METADATA_PRESETS.map((preset, index) => (
                            <option key={preset.name} value={index} className="bg-[#15181e] text-white">
                              {preset.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Thumbnail Text Select */}
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Thumbnail Cover Text</label>
                        <select
                          value={selectedThumbnailText}
                          onChange={(e) => setSelectedThumbnailText(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition cursor-pointer"
                        >
                          {METADATA_PRESETS[selectedPresetIndex]?.thumbnailTextOptions.map((opt) => (
                            <option key={opt} value={opt} className="bg-[#15181e] text-white">
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      <button
                        type="button"
                        onClick={handleApplyPreset}
                        className="flex-1 min-w-[120px] bg-purple-650 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] transition uppercase tracking-wider shadow-md hover:shadow-purple-900/10 cursor-pointer"
                      >
                        Apply Preset
                      </button>
                      <button
                        type="button"
                        onClick={handleClearMetadata}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold py-1.5 px-3 rounded-xl text-[10px] transition uppercase tracking-wider cursor-pointer"
                      >
                        Clear Metadata
                      </button>
                    </div>

                    {/* Modular apply buttons */}
                    <div className="grid grid-cols-3 gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={handleApplyDescriptionOnly}
                        className="py-1 px-1.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-medium text-slate-300 transition cursor-pointer text-center"
                        title="Apply only description template"
                      >
                        Desc Only
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyHashtagsOnly}
                        className="py-1 px-1.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-medium text-slate-300 transition cursor-pointer text-center"
                        title="Apply only hashtags template"
                      >
                        Hashtags Only
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyThumbnailTextOnly}
                        className="py-1 px-1.5 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/5 hover:border-white/10 rounded-lg text-[9px] font-medium text-slate-300 transition cursor-pointer text-center"
                        title="Apply only thumbnail cover text"
                      >
                        Cover Only
                      </button>
                    </div>

                    {/* Small disabled future note */}
                    <div className="flex items-center gap-1.5 mt-1 border-t border-white/5 pt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      <span className="text-[9px] text-slate-400 font-medium">AI Metadata Generator — Later</span>
                    </div>
                  </div>

                  {/* YouTube title input */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">YouTube Video Title *</label>
                      <span className={`font-mono text-[10px] ${ytTitle.length > 100 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                        {ytTitle.length}/100 chars
                      </span>
                    </div>
                    
                    <input 
                      type="text" 
                      value={ytTitle}
                      onChange={(e) => setYtTitle(e.target.value)}
                      placeholder="Catchy hooks, capitalization, emoji..."
                      className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                      maxLength={115}
                      required
                    />
                    
                    {ytTitle.length > 100 && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 rounded" />
                        <span>Warning: YouTube Shorts Titles are limited to 100 characters.</span>
                      </p>
                    )}
                  </div>

                  {/* Description textarea */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 font-bold">Video Description</label>
                      <span className="font-mono text-[10px] text-slate-400">
                        {ytDescription.length}/5000 chars
                      </span>
                    </div>
                    
                    <textarea 
                      value={ytDescription}
                      onChange={(e) => setYtDescription(e.target.value)}
                      placeholder="Provide shorts context or social links..."
                      rows={3}
                      className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition resize-none"
                    />
                  </div>

                  {/* Hashtags field with fast helpers */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Hashtags</label>
                    <input 
                      type="text" 
                      value={ytHashtags}
                      onChange={(e) => setYtHashtags(e.target.value)}
                      placeholder="e.g. #shorts #viral"
                      className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
                    />

                    {/* Preloaded tags suggestion bar */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                       <span className="text-[9px] text-slate-400 font-bold uppercase self-center mr-1">Helpers:</span>
                      {PRESET_HASHTAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleAddHashtag(tag)}
                          className="px-2 py-0.5 bg-white/5 hover:bg-white/10 active:bg-white/20 hover:text-red-400 border border-white/5 rounded text-[9px] font-mono text-slate-300 transition cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thumbnail themes */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Shorts Cover Theme Gradient</label>
                    <div className="grid grid-cols-5 gap-1.5 font-sans">
                      {PRESET_MOCK_COVERS.map((cov) => {
                        const isMatch = ytCoverGradient === cov.gradient;
                        return (
                          <button
                            key={cov.id}
                            type="button"
                            onClick={() => setYtCoverGradient(cov.gradient)}
                            title={cov.name}
                            className={`h-9 rounded-lg ${cov.gradient} transition relative border cursor-pointer ${
                              isMatch ? 'border-white ring-2 ring-red-500/50' : 'border-black/50 hover:opacity-85'
                            }`}
                          >
                            {isMatch && (
                              <span className="absolute inset-x-0 bottom-0.5 text-center text-white text-[8px] font-bold drop-shadow-md">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Thumbnail Cover Text Overlay Input */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Thumbnail Cover Text Overlay</label>
                      <span className={`font-mono text-[10px] ${ytThumbnailText.length > 50 ? 'text-red-400' : 'text-slate-400'}`}>
                        {ytThumbnailText.length}/50 chars
                      </span>
                    </div>
                    <input 
                      type="text" 
                      value={ytThumbnailText}
                      onChange={(e) => setYtThumbnailText(e.target.value)}
                      placeholder="e.g. INI MASUK AKAL?, DARI NOL JADI MEWAH"
                      className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
                      maxLength={50}
                    />
                  </div>

                  {/* Visibility Select */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Standard Visibility</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: 'Public', label: 'Public', icon: Globe },
                        { val: 'Unlisted', label: 'Unlisted', icon: Eye },
                        { val: 'Private', label: 'Private', icon: Lock }
                      ].map((item) => {
                        const ActiveIcon = item.icon;
                        const isSelected = ytVisibility === item.val;
                        
                        return (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => setYtVisibility(item.val as any)}
                            className={`py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              isSelected 
                                ? 'bg-red-500 text-white border-white/20 shadow-md' 
                                : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300 hover:text-slate-100'
                            }`}
                          >
                            <ActiveIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Publish Datum and Zeit Schedule slots */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Release Date</label>
                      <input 
                        type="date"
                        value={ytPublishDate}
                        onChange={(e) => setYtPublishDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none transition font-sans"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Release Time</label>
                      <input 
                        type="time" 
                        value={ytPublishTime}
                        onChange={(e) => setYtPublishTime(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 focus:border-red-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none transition font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Submitting button adding to upload schedule queue */}
                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-900/10 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Add to Queue & Schedule</span>
                  </button>

                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    Note: Video scheduling states are managed in local demo state.
                  </p>
                </form>
              )}
            </section>

          </div>

        </div>
        
        {/* DOCUMENTATION & HELPFUL WALKTHROUGH NOTES */}
        <section className="bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-3xl shadow-xl">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
            <Info className="w-4 h-4 text-red-500" />
            AutoTube Lite Walkthrough
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
            <div className="bg-black/35 p-4 rounded-2xl border border-white/5">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded-full bg-blue-550/20 text-blue-400 flex items-center justify-center text-[9px] font-mono">1</span>
                Draft Videos & Custom Import
              </h3>
              <p>
                The <strong>Draft Videos</strong> library is pre-seeded with 5 creative vertical-format clips showcasing One Piece theories, anime facts, and satisfying timelapses. You can click <strong>Add Custom Video</strong> or drag-and-drop a real MP4 on your desktop to instantly inject a new draft slot.
              </p>
            </div>
            <div className="bg-black/35 p-4 rounded-2xl border border-white/5">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-[9px] font-mono">2</span>
                Form Validation Helpers
              </h3>
              <p>
                As you type within the Metadata form, the <strong>character meter</strong> keeps track of limits. Clicking Preset Suggestions appends hashtags instantly while the center card renders a live visual thumbnail.
              </p>
            </div>
            <div className="bg-black/35 p-4 rounded-2xl border border-white/5">
              <h3 className="font-bold text-slate-200 flex items-center gap-1.5 mb-1.5">
                <span className="w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[9px] font-mono">3</span>
                Upload Simulation Only
              </h3>
              <p>
                Clicking the <strong>Demo Upload Simulation</strong> button triggers a simulated upload progress loop. This is a local frontend-only demo and does not connect to actual YouTube servers yet.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/10 bg-black/40 backdrop-blur-md py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-400">© 2026 AutoTube Lite. Prototype only. Demo only.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-white cursor-help transition-all" title="Local Demo Only">Privacy Offline Policy</span>
            <span className="hover:text-white cursor-help transition-all" title="No credentials required for client prototype">System Credentials</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
