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
  VideoOff
} from 'lucide-react';
import { Video, QueueItem, mapToQueueItem, mapToDbItem } from './types';
import { INITIAL_VIDEOS, PRESET_HASHTAGS, PRESET_MOCK_COVERS } from './data/mockVideos';
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
  clearUploadQueue
} from './services/uploadQueueService';
import {
  loadGoogleScripts,
  ensurePickerLoaded,
  requestDriveAccessToken,
  openGooglePicker,
  checkGoogleConfigured
} from './services/googleDrivePickerService';

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

  // Selected Draft Video for Metadata Editing
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>('vid-1');
  const [vBankSearch, setVBankSearch] = useState('');

  // Form State variables linked to currently Selected Video
  const [ytTitle, setYtTitle] = useState('One Piece Theory - Joy Boy Secret 🔥');
  const [ytDescription, setYtDescription] = useState('An incredible theory exploring Joy Boy secret. What was his true identity in the Void Century?');
  const [ytHashtags, setYtHashtags] = useState('#shorts #onepiece #animefacts');
  const [ytCoverGradient, setYtCoverGradient] = useState('bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600');
  const [ytVisibility, setYtVisibility] = useState<'Private' | 'Unlisted' | 'Public'>('Public');
  const [ytPublishDate, setYtPublishDate] = useState('2026-06-23');
  const [ytPublishTime, setYtPublishTime] = useState('12:00');

  // Interactive Upload simulation state
  const [simulationActive, setSimulationActive] = useState(false);
  const [simLog, setSimLog] = useState<string | null>(null);

  // Quick form state for "Creating own custom mocked Video"
  const [isAddMockOpen, setIsAddMockOpen] = useState(false);
  const [mockVidTitle, setMockVidTitle] = useState('');
  const [mockVidDuration, setMockVidDuration] = useState('0:30');
  const [mockVidFileName, setMockVidFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Success alert states
  const [notification, setNotification] = useState<{ id: string; text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ id: String(Date.now()), text, type });
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
      return;
    }
    setDbLoading(true);
    setDbError(null);
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
    } catch (err: any) {
      setDbError(err.message || 'Unknown database error occurred');
      showNotification('Failed to load data from Supabase', 'error');
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
      thumbnail: ytCoverGradient,
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
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                  ARC 2 Prototype
                </span>
              </div>
              <p className="text-xs text-slate-400">YouTube Shorts Upload & Scheduler (Supabase Edition)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-400">
                <CloudLightning className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Supabase Connected</span>
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
                  className="px-3 py-1.5 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-red-900/10 cursor-pointer"
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
                  Drive videos are saved after selection and will remain available after refresh.
                </p>
              </div>

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
                                title="Remove from Bank (Does not delete Google Drive file)"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                <span>Remove</span>
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
                  <button
                    disabled={simulationActive || queue.filter(q => q.status === 'Scheduled').length === 0}
                    onClick={runSchedulerSimulation}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-rose-600 text-white text-xs font-bold rounded-xl hover:from-purple-500 hover:to-rose-500 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer shadow-lg shadow-purple-900/10"
                  >
                    <Zap className="w-3.5 h-3.5 fill-amber-300 stroke-amber-300" />
                    <span>Demo Upload Simulation</span>
                  </button>
                  <span className="text-[9px] text-slate-400 font-medium">Prototype only — this does not upload to YouTube yet.</span>
                </div>
              </div>

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
                    Select any video draft in the Draft Videos above, update the metadata, and choose "Add to Queue" to build your schedule!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {queue.map((item) => {
                    const isProcessing = simulationActive && item.progress !== undefined;
                    
                    return (
                      <div 
                        key={item.id}
                        className={`p-4 bg-white/5 border border-white/10 rounded-2xl relative transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isProcessing 
                            ? 'bg-blue-500/5 border-blue-500/40 ring-1 ring-blue-500/20 shadow-lg' 
                            : item.status === 'Uploaded' 
                              ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/10' 
                              : 'hover:bg-white/[0.08]'
                        }`}
                      >
                        {/* Video Info Layout */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Mini vertical 9:16 card view representing visual cover icon */}
                          <div className={`w-10 h-16 rounded-md ${item.thumbnail} flex flex-col justify-between p-1 text-[8px] font-mono shrink-0 shadow-sm border border-white/10 relative overflow-hidden`}>
                            <span className="bg-black/60 text-white rounded px-0.5 self-start text-[6px]">SHORTS</span>
                            <span className="text-[6px] text-white/90 truncate bg-slate-900/45 px-0.5 rounded text-center block max-w-full">
                              {item.duration}
                            </span>
                          </div>

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
                            </div>
                          </div>
                        </div>

                        {/* Status Progress details & Remove Option */}
                        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2 md:gap-1 pl-4 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
                          
                          {/* Simulated status feedback */}
                          <div className="flex flex-col items-end gap-1">
                            {item.status === 'Uploaded' ? (
                              <span className="text-[9px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/20 rounded uppercase font-bold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Uploaded
                              </span>
                            ) : isProcessing ? (
                              <div className="flex flex-col items-end gap-1 w-24">
                                <span className="text-[9px] px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded uppercase font-bold flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                                  Uploading {item.progress}%
                                </span>
                                <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                                  <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${item.progress}%` }}></div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] px-2 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded uppercase font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Scheduled
                              </span>
                            )}
                          </div>

                          {/* Action button */}
                          {!simulationActive && (
                            <button
                              onClick={() => handleRemoveFromQueue(item.id, item.videoId)}
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                              title="Delete from schedule queue"
                            >
                              <X className="w-4 h-4" />
                              <span className="md:hidden text-[10px]">Remove</span>
                            </button>
                          )}
                        </div>

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
                    Choose a draft video from the bank above to customize its metadata and scheduling options. Demo only.
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
                    className="w-full bg-red-650 hover:bg-red-700 active:bg-red-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-900/10 cursor-pointer"
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
