import React, { useState, useEffect } from 'react';
import { Rss, CheckCircle, Clock } from 'lucide-react';
import { fetchSocialPosts } from '../services/api';
import type { SocialPost } from '../../../types';

export function SocialFeedTab() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetchSocialPosts();
      console.log('Raw response from /api/social:', response.data);
      setPosts(response.data);
      console.log('Posts set in state:', response.data);
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        setError('Twitter rate limit reached, please try again later.');
      } else {
        setError('Error fetching social media posts.');
      }
      setPosts([]);
      console.error("Error fetching social media posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPosts();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Rss size={20} />
          Social Media Feed
        </h2>
        <button
          onClick={getPosts}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && (
        <div className="p-4 text-center text-red-600 bg-red-50 border-b border-red-200">{error}</div>
      )}
      <div className="divide-y">
        {loading ? (
          <p className="p-6 text-center">Loading feed...</p>
        ) : posts.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No social posts available.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{post.username}</span>
                    <span className="text-gray-500 text-sm">({post.platform})</span>
                  </div>
                  <p className="mt-1">{post.content}</p>
                </div>
                {post.verified && <CheckCircle size={20} className="text-green-500" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <Clock size={16} />
                <span>{new Date(post.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 