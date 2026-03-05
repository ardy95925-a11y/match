import React, { useState, useEffect, useRef } from 'react';
import { Search, Heart, Clock, Play, X, Share2, Download } from 'lucide-react';

const YouTubeClient = () => {
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('youtube_history') || '[]');
    } catch {
      return [];
    }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('youtube_favorites') || '[]');
    } catch {
      return [];
    }
  });
  const [view, setView] = useState('search'); // 'search', 'history', 'favorites'
  const searchInputRef = useRef(null);

  // Using Invidious API (free, no API key needed, no quota limits)
  // Invidious is a free, open-source YouTube frontend
  const INVIDIOUS_INSTANCES = [
    'https://invidious.jfreedomland.com',
    'https://yewtu.be',
    'https://invidious.nerdvpn.de',
  ];

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (!views) return '0';
    const num = parseInt(views);
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const searchVideos = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    let success = false;

    // Try each instance until one works
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const response = await fetch(
          `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&maxResults=12`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const videosWithDetails = data.map((item) => {
            const duration = item.lengthSeconds ? formatDuration(item.lengthSeconds) : 'N/A';
            const thumbnail = item.videoThumbnails && item.videoThumbnails.length > 0
              ? item.videoThumbnails[item.videoThumbnails.length - 1].url
              : 'https://via.placeholder.com/320x180';
            
            return {
              id: item.videoId,
              title: item.title,
              description: item.description || '',
              thumbnail: thumbnail,
              channelTitle: item.author || 'Unknown',
              publishedAt: new Date(item.publishedText || Date.now()).toISOString(),
              viewCount: formatViews(item.viewCount),
              likeCount: '0',
              duration: duration,
            };
          });
          
          setVideos(videosWithDetails);
          setView('search');
          success = true;
          break;
        }
      } catch (error) {
        console.log(`Instance ${instance} failed, trying next...`);
        continue;
      }
    }

    if (!success) {
      console.error('All search instances failed');
    }
    
    setLoading(false);
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    // Add to history
    const newHistory = [
      { ...video, viewedAt: new Date().toISOString() },
      ...history.filter(h => h.id !== video.id)
    ].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem('youtube_history', JSON.stringify(newHistory));
  };

  const toggleFavorite = (video) => {
    const isFavorited = favorites.some(fav => fav.id === video.id);
    const newFavorites = isFavorited
      ? favorites.filter(fav => fav.id !== video.id)
      : [...favorites, video];
    setFavorites(newFavorites);
    localStorage.setItem('youtube_favorites', JSON.stringify(newFavorites));
  };

  const isFavorited = (videoId) => favorites.some(fav => fav.id === videoId);

  const handleSearch = (e) => {
    e.preventDefault();
    searchVideos(searchQuery);
  };

  const displayVideos = 
    view === 'history' ? history.slice(0, 50) :
    view === 'favorites' ? favorites :
    videos;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/40 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">CineView</h1>
          </div>
          
          <nav className="hidden md:flex gap-1 bg-white/5 rounded-full p-1">
            <button
              onClick={() => setView('search')}
              className={`px-6 py-2 rounded-full transition-all font-medium text-sm ${
                view === 'search'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-6 py-2 rounded-full transition-all font-medium text-sm flex items-center gap-2 ${
                view === 'history'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Clock className="w-4 h-4" /> History
            </button>
            <button
              onClick={() => setView('favorites')}
              className={`px-6 py-2 rounded-full transition-all font-medium text-sm flex items-center gap-2 ${
                view === 'favorites'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-4 h-4" /> Saved
            </button>
          </nav>
        </div>
      </header>

      {/* Search Bar */}
      {view === 'search' && (
        <div className="sticky top-16 z-30 bg-black/20 backdrop-blur-sm border-b border-white/5 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-xl pl-12 pr-4 py-3 border border-white/20 focus:border-white/40 focus:bg-white/15 transition-all outline-none text-base"
              />
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {selectedVideo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative bg-black aspect-video md:aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 rounded-full p-2 transition-colors z-10 md:hidden"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="p-6 md:p-8">
                <div className="flex gap-3 mb-4 flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight">{selectedVideo.title}</h2>
                    <p className="text-white/60 text-sm">{selectedVideo.channelTitle}</p>
                  </div>
                  <button
                    onClick={() => {
                      toggleFavorite(selectedVideo);
                      setSelectedVideo({ ...selectedVideo });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-all font-medium self-start"
                  >
                    <Heart className={`w-5 h-5 ${isFavorited(selectedVideo.id) ? 'fill-current' : ''}`} />
                    {isFavorited(selectedVideo.id) ? 'Saved' : 'Save'}
                  </button>
                </div>

                <p className="text-white/70 text-sm md:text-base mb-6 leading-relaxed">{selectedVideo.description.substring(0, 300)}...</p>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Views</p>
                    <p className="text-lg font-bold text-white">{selectedVideo.viewCount}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Duration</p>
                    <p className="text-lg font-bold text-white">{selectedVideo.duration}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Published</p>
                    <p className="text-lg font-bold text-white">{new Date(selectedVideo.publishedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${selectedVideo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
                  >
                    <Play className="w-5 h-5" /> Watch on YouTube
                  </a>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty States */}
        {displayVideos.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="mb-6 opacity-30">
              {view === 'search' && <Search className="w-20 h-20 mx-auto" strokeWidth={1} />}
              {view === 'history' && <Clock className="w-20 h-20 mx-auto" strokeWidth={1} />}
              {view === 'favorites' && <Heart className="w-20 h-20 mx-auto" strokeWidth={1} />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {view === 'search' && 'Start searching for videos'}
              {view === 'history' && 'No watch history yet'}
              {view === 'favorites' && 'No saved videos yet'}
            </h3>
            <p className="text-white/50">
              {view === 'search' && 'Enter a search term above to get started'}
              {view === 'history' && 'Videos you watch will appear here'}
              {view === 'favorites' && 'Save videos to watch them later'}
            </p>
          </div>
        )}

        {/* Videos Grid */}
        {displayVideos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {displayVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className="group cursor-pointer text-left transition-all duration-300 hover:scale-105"
              >
                <div className="relative overflow-hidden rounded-2xl mb-4 aspect-video bg-white/5 border border-white/10 group-hover:border-white/30 transition-all">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-white" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(video);
                    }}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Heart
                      className={`w-5 h-5 ${isFavorited(video.id) ? 'fill-current text-red-500' : 'text-white'}`}
                    />
                  </button>
                </div>
                <h3 className="font-bold text-white text-sm md:text-base leading-snug line-clamp-2 group-hover:text-white/80 transition-colors">
                  {video.title}
                </h3>
                <p className="text-white/50 text-xs md:text-sm mt-2">{video.channelTitle}</p>
                <div className="flex gap-2 text-xs text-white/40 mt-2">
                  <span>{video.viewCount} views</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <p className="text-white/60">Loading videos...</p>
            </div>
          </div>
        )}
      </main>

      {/* Mobile View Toggle */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 flex gap-2 bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/10">
        <button
          onClick={() => setView('search')}
          className={`flex-1 py-2 rounded-xl transition-all text-sm font-medium ${
            view === 'search' ? 'bg-white text-black' : 'text-white'
          }`}
        >
          Search
        </button>
        <button
          onClick={() => setView('history')}
          className={`flex-1 py-2 rounded-xl transition-all text-sm font-medium ${
            view === 'history' ? 'bg-white text-black' : 'text-white'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setView('favorites')}
          className={`flex-1 py-2 rounded-xl transition-all text-sm font-medium ${
            view === 'favorites' ? 'bg-white text-black' : 'text-white'
          }`}
        >
          Saved
        </button>
      </div>
    </div>
  );
};

export default YouTubeClient;
