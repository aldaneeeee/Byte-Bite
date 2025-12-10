import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { MessageSquare, ThumbsUp, Send, Plus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api'; // Import api

// Interface for forum post
interface ForumPost {
  id: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
}

// Interface for comment
interface Comment {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export function ForumPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const isLoggedIn = localStorage.getItem('authToken');

  // Load Posts on Mount
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadPosts();
  }, [isLoggedIn, navigate]);

  const loadPosts = async () => {
      try {
          const res = await api.getForumPosts();
          if (res.success) {
              setPosts(res.posts);
          }
      } catch (err) {
          console.error("Failed to load posts", err);
      } finally {
          setLoading(false);
      }
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const postData = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        category: formData.get('category') as string,
    };

    try {
        const res = await api.createForumPost(postData);
        if (res.success) {
            setShowNewPostForm(false);
            loadPosts(); // Refresh list
        }
    } catch (err) {
        console.error("Failed to create post", err);
    }
  };

  const handleLikePost = async (postId: string) => {
    // Optimistic UI update
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
          isLiked: !post.isLiked,
        };
      }
      return post;
    }));

    try {
        await api.likeForumPost(postId);
        // We can reload to be sure, or trust the optimistic update
        // loadPosts(); 
    } catch (err) {
        console.error("Like failed", err);
        loadPosts(); // Revert on error
    }
  };

  const handleViewPost = async (post: ForumPost) => {
    setSelectedPost(post);
    // Load comments
    try {
        const res = await api.getPostComments(post.id);
        if (res.success) {
            setComments(res.comments);
        }
    } catch (err) {
        console.error("Failed to load comments", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;

    try {
        const res = await api.createComment(selectedPost.id, newComment);
        if (res.success) {
            setNewComment('');
            // Reload comments
            const commentsRes = await api.getPostComments(selectedPost.id);
            if (commentsRes.success) setComments(commentsRes.comments);
            
            // Update comment count in post list locally
            setPosts(posts.map(p => 
                p.id === selectedPost.id ? { ...p, commentCount: p.commentCount + 1 } : p
            ));
        }
    } catch (err) {
        console.error("Failed to post comment", err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => post.category === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading community...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-white mb-2">Community Forum</h1>
          <p className="text-white/70">Connect with other Byte&Bite fans, share reviews, and ask questions</p>
        </div>

        {/* Filters & Create Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'general', 'reviews', 'suggestions', 'questions'].map(cat => (
                <Button
                    key={cat}
                    variant={filter === cat ? 'default' : 'outline'}
                    onClick={() => setFilter(cat)}
                    className={filter === cat ? 'bg-[#00ff88] text-[#0a1628]' : 'border-[#00ff88]/20 text-white'}
                >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
            ))}
          </div>
          <Button onClick={() => setShowNewPostForm(!showNewPostForm)} className="bg-[#00ff88] text-[#0a1628]">
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        </div>

        {/* Create Post Form */}
        {showNewPostForm && (
          <Card className="p-6 mb-6 bg-[#0f1f3a] border-[#00ff88]/20">
            <h2 className="mb-4 text-white">Create New Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <Label className="text-white/90">Category</Label>
                <select name="category" className="w-full mt-1 p-2 bg-[#1a2f4a] border border-[#00ff88]/20 rounded-md text-white">
                  <option value="general">General</option>
                  <option value="reviews">Reviews</option>
                  <option value="suggestions">Suggestions</option>
                  <option value="questions">Questions</option>
                </select>
              </div>
              <div>
                <Label className="text-white/90">Title</Label>
                <Input name="title" required className="bg-[#1a2f4a] border-[#00ff88]/20 text-white" />
              </div>
              <div>
                <Label className="text-white/90">Content</Label>
                <Textarea name="content" required rows={4} className="bg-[#1a2f4a] border-[#00ff88]/20 text-white" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#00ff88] text-[#0a1628]">Post</Button>
                <Button type="button" variant="outline" onClick={() => setShowNewPostForm(false)} className="border-[#00ff88]/20 text-white">Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Posts List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredPosts.length === 0 ? (
              <Card className="p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20">
                <p className="text-white/70">No posts found. Be the first to start a conversation!</p>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className={`p-6 bg-[#0f1f3a] border-[#00ff88]/20 cursor-pointer transition-all hover:border-[#00ff88]/40 ${selectedPost?.id === post.id ? 'border-[#00ff88]' : ''}`}
                  onClick={() => handleViewPost(post)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#00ff88]" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{post.authorName}</p>
                        <p className="text-white/50 text-sm">{formatDate(post.createdAt)}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-[#00ff88]/10 text-[#00ff88] text-sm rounded-full">{post.category}</span>
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">{post.title}</h3>
                  <p className="text-white/70 mb-4 line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 text-white/70">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLikePost(post.id); }}
                      className={`flex items-center gap-1 hover:text-[#00ff88] transition-colors ${post.isLiked ? 'text-[#00ff88]' : ''}`}
                    >
                      <ThumbsUp className="w-4 h-4" /> {post.likes}
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> {post.commentCount}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Comment Section (Right Side) */}
          <div className="lg:col-span-1">
            {selectedPost ? (
              <Card className="p-6 bg-[#0f1f3a] border-[#00ff88]/20 sticky top-24 max-h-[80vh] flex flex-col">
                <h3 className="text-white mb-4 font-semibold">Comments</h3>
                <Separator className="mb-4 bg-[#00ff88]/20" />
                
                <div className="space-y-4 mb-4 overflow-y-auto flex-1 pr-2">
                  {comments.length === 0 && <p className="text-white/50 text-center py-4">No comments yet.</p>}
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-[#1a2f4a] p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#00ff88] font-bold text-xs">{comment.authorName}</span>
                        <span className="text-white/40 text-xs ml-auto">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="text-white/80 text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 mt-auto pt-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white"
                  />
                  <Button type="submit" size="icon" className="bg-[#00ff88] text-[#0a1628]" disabled={!newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            ) : (
              <div className="hidden lg:block sticky top-24">
                <Card className="p-8 text-center bg-[#0f1f3a] border-[#00ff88]/20 border-dashed">
                  <p className="text-white/50">Select a post to view comments</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}