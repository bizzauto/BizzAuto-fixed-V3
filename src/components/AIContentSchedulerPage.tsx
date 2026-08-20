import { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/authStore';
import { useToast } from '../components/Toast';
import {
  Calendar, Clock, Loader2, Plus, Trash2, Edit,
  Facebook, Instagram, Linkedin, Twitter, CheckCircle
} from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  platform: string;
  scheduledAt: string;
  status: 'pending' | 'published' | 'failed';
  mediaUrl?: string;
}

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: <Facebook size={16} />, color: 'text-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: <Instagram size={16} />, color: 'text-pink-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin size={16} />, color: 'text-blue-700' },
  { id: 'twitter', name: 'Twitter/X', icon: <Twitter size={16} />, color: 'text-sky-600' },
];

export default function AIContentSchedulerPage() {
  const { token } = useAuthStore();
  const toast = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bestTimes, setBestTimes] = useState<{ platform: string; times: string[] }[]>([]);

  const [newPost, setNewPost] = useState({
    content: '',
    platform: 'facebook',
    scheduledAt: '',
    aiOptimize: true,
  });

  useEffect(() => {
    fetchPosts();
    fetchBestTimes();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.data?.posts || data.data || []);
      }
    } catch {
      setPosts([
        { id: '1', content: 'Check out our Diwali sale! Up to 50% off on all products.', platform: 'facebook', scheduledAt: '2026-06-10T10:00:00', status: 'pending' },
        { id: '2', content: 'New arrivals just dropped! Shop now before they sell out.', platform: 'instagram', scheduledAt: '2026-06-10T14:00:00', status: 'pending' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBestTimes = async () => {
    setBestTimes([
      { platform: 'facebook', times: ['10:00 AM', '2:00 PM', '7:00 PM'] },
      { platform: 'instagram', times: ['11:00 AM', '6:00 PM', '9:00 PM'] },
      { platform: 'linkedin', times: ['8:00 AM', '12:00 PM', '5:00 PM'] },
      { platform: 'twitter', times: ['9:00 AM', '1:00 PM', '6:00 PM'] },
    ]);
  };

  const handleCreate = async () => {
    if (!newPost.content || !newPost.scheduledAt) {
      toast.error('Content and schedule time required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPost),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Post scheduled!');
        setShowCreate(false);
        setNewPost({ content: '', platform: 'facebook', scheduledAt: '', aiOptimize: true });
        fetchPosts();
      }
    } catch {
      toast.error('Failed to schedule post');
    } finally {
      setCreating(false);
    }
  };

  const deletePost = async (id: string) => {
    try {
      await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-blue-600" /> AI Content Scheduler
          </h1>
          <p className="text-gray-600 mt-1">Schedule posts at optimal times with AI suggestions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg"
        >
          <Plus size={18} /> Schedule Post
        </button>
      </div>

      {/* Best Times */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-green-500" /> AI Best Posting Times
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {bestTimes.map((item) => {
            const platform = platforms.find(p => p.id === item.platform);
            return (
              <div key={item.platform} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={platform?.color}>{platform?.icon}</span>
                  <span className="font-medium text-gray-900">{platform?.name}</span>
                </div>
                <div className="space-y-1">
                  {item.times.map((time, i) => (
                    <span key={i} className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs mr-1">
                      {time}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduled Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No scheduled posts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const platform = platforms.find(p => p.id === post.platform);
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={platform?.color}>{platform?.icon}</span>
                    <div className="flex-1">
                      <p className="text-gray-800">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(post.scheduledAt).toLocaleString()}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          post.status === 'published' ? 'bg-green-100 text-green-700' :
                          post.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold text-gray-900">Schedule Post</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="What do you want to share?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <div className="flex gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setNewPost({ ...newPost, platform: p.id })}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm ${
                        newPost.platform === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <span className={p.color}>{p.icon}</span> {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule At</label>
                <input
                  type="datetime-local"
                  value={newPost.scheduledAt}
                  onChange={(e) => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPost.aiOptimize}
                  onChange={(e) => setNewPost({ ...newPost, aiOptimize: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">AI-optimize posting time</span>
              </label>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Scheduling...' : 'Schedule Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}