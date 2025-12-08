import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { MessageSquare, ThumbsUp, Send, Plus, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

// Forum Page component - discussion board for logged-in users
export function ForumPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('authToken');

  useEffect(() => {
    // If not logged in, redirect to login page
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    // Mock data - replace with API call to backend
    // TODO: Replace with: api.getForumPosts()
    const mockPosts: ForumPost[] = [
      {
        id: '1',
        authorName: 'CodeChef Mike',
        title: 'What\'s your favorite item on the menu?',
        content: 'I\'m new to Byte&Bite and trying to figure out what to order. The Async Ramen looks amazing but I\'m also tempted by the Code Burger. What do you all recommend?',
        category: 'general',
        likes: 24,
        commentCount: 8,
        createdAt: '2024-12-06T10:30:00Z',
        isLiked: false,
      },
      {
        id: '2',
        authorName: 'DevDiner Sarah',
        title: 'Suggestion: Vegan options?',
        content: 'Love the concept and the food! Would be great to see more vegan options on the menu. Anyone else interested in this?',
        category: 'suggestions',
        likes: 42,
        commentCount: 15,
        createdAt: '2024-12-05T14:20:00Z',
        isLiked: false,
      },
      {
        id: '3',
        authorName: 'StackOverflow Sam',
        title: 'Just tried the Debug Tacos - Mind Blown! 🌮',
        content: 'Seriously, these are the best tacos I\'ve had in years. The spice level is perfect and the presentation is amazing. Props to the kitchen team!',
        category: 'reviews',
        likes: 67,
        commentCount: 22,
        createdAt: '2024-12-04T18:45:00Z',
        isLiked: true,
      },
      {
        id: '4',
        authorName: 'ByteBot Betty',
        title: 'Question about delivery times',
        content: 'Does anyone know if they deliver to the downtown area? The app says 30-45 minutes but I want to make sure before ordering.',
        category: 'questions',
        likes: 12,
        commentCount: 5,
        createdAt: '2024-12-06T12:00:00Z',
        isLiked: false,
      },
    ];

    setPosts(mockPosts);
    setLoading(false);
  }, [isLoggedIn, navigate]);

  // Handle creating a new post
  const handleCreatePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newPost: ForumPost = {
      id: Date.now().toString(),
      authorName: JSON.parse(localStorage.getItem('user') || '{}').name || 'Anonymous',
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as string,
      likes: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      isLiked: false,
    };

    // TODO: Replace with API call: api.createForumPost(newPost)
    setPosts([newPost, ...posts]);
    setShowNewPostForm(false);
    e.currentTarget.reset();
  };

  // Handle liking a post
  const handleLikePost = (postId: string) => {
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
    // TODO: Replace with API call: api.likeForumPost(postId)
  };

  // Handle viewing post details
  const handleViewPost = (post: ForumPost) => {
    setSelectedPost(post);
    // Mock comments - replace with API call
    // TODO: Replace with: api.getPostComments(post.id)
    const mockComments: Comment[] = [
      {
        id: '1',
        postId: post.id,
        authorName: 'TechFoodie Joe',
        content: 'I totally agree! The Code Burger is a solid choice for first-timers.',
        createdAt: '2024-12-06T11:00:00Z',
      },
      {
        id: '2',
        postId: post.id,
        authorName: 'PixelPizza Pat',
        content: 'Can\'t go wrong with the Async Ramen though. It\'s a fan favorite!',
        createdAt: '2024-12-06T11:30:00Z',
      },
    ];
    setComments(mockComments);
  };

  // Handle adding a comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;

    const comment: Comment = {
      id: Date.now().toString(),
      postId: selectedPost.id,
      authorName: JSON.parse(localStorage.getItem('user') || '{}').name || 'Anonymous',
      content: newComment,
      createdAt: new Date().toISOString(),
    };

    // TODO: Replace with API call: api.createComment(comment)
    setComments([...comments, comment]);
    setNewComment('');
    
    // Update comment count
    setPosts(posts.map(post => 
      post.id === selectedPost.id 
        ? { ...post, commentCount: post.commentCount + 1 }
        : post
    ));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Filter posts by category
  const filteredPosts = filter === 'all' 
    ? posts 
    : posts.filter(post => post.category === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
        <div className="text-white">Loading forum...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white mb-2">Community Forum</h1>
          <p className="text-white/70">
            Connect with other Byte&Bite fans, share reviews, and ask questions
          </p>
        </div>

        {/* Create Post Button and Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' 
                ? 'bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90' 
                : 'border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]'}
            >
              All Posts
            </Button>
            <Button
              variant={filter === 'general' ? 'default' : 'outline'}
              onClick={() => setFilter('general')}
              className={filter === 'general' 
                ? 'bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90' 
                : 'border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]'}
            >
              General
            </Button>
            <Button
              variant={filter === 'reviews' ? 'default' : 'outline'}
              onClick={() => setFilter('reviews')}
              className={filter === 'reviews' 
                ? 'bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90' 
                : 'border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]'}
            >
              Reviews
            </Button>
            <Button
              variant={filter === 'suggestions' ? 'default' : 'outline'}
              onClick={() => setFilter('suggestions')}
              className={filter === 'suggestions' 
                ? 'bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90' 
                : 'border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]'}
            >
              Suggestions
            </Button>
            <Button
              variant={filter === 'questions' ? 'default' : 'outline'}
              onClick={() => setFilter('questions')}
              className={filter === 'questions' 
                ? 'bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90' 
                : 'border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]'}
            >
              Questions
            </Button>
          </div>
          <Button
            onClick={() => setShowNewPostForm(!showNewPostForm)}
            className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Post
          </Button>
        </div>

        {/* New Post Form */}
        {showNewPostForm && (
          <Card className="p-6 mb-6 bg-[#0f1f3a] border-[#00ff88]/20">
            <h2 className="mb-4 text-white">Create New Post</h2>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <Label htmlFor="category" className="text-white/90">Category</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="w-full mt-1 p-2 bg-[#1a2f4a] border border-[#00ff88]/20 rounded-md text-white"
                >
                  <option value="general">General</option>
                  <option value="reviews">Reviews</option>
                  <option value="suggestions">Suggestions</option>
                  <option value="questions">Questions</option>
                </select>
              </div>
              <div>
                <Label htmlFor="title" className="text-white/90">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Enter post title"
                  required
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <Label htmlFor="content" className="text-white/90">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  placeholder="Share your thoughts..."
                  required
                  rows={4}
                  className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90">
                  Post
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPostForm(false)}
                  className="border-[#00ff88]/20 text-white hover:bg-[#1a2f4a]"
                >
                  Cancel
                </Button>
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
                <p className="text-white/70">No posts in this category yet. Be the first to post!</p>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className={`p-6 bg-[#0f1f3a] border-[#00ff88]/20 cursor-pointer transition-all hover:border-[#00ff88]/40 ${
                    selectedPost?.id === post.id ? 'border-[#00ff88]' : ''
                  }`}
                  onClick={() => handleViewPost(post)}
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#00ff88]" />
                      </div>
                      <div>
                        <p className="text-white">{post.authorName}</p>
                        <p className="text-white/50 text-sm">{formatDate(post.createdAt)}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-[#00ff88]/10 text-[#00ff88] text-sm rounded-full">
                      {post.category}
                    </span>
                  </div>

                  {/* Post Content */}
                  <h3 className="text-white mb-2">{post.title}</h3>
                  <p className="text-white/70 mb-4">{post.content}</p>

                  {/* Post Actions */}
                  <div className="flex items-center gap-4 text-white/70">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLikePost(post.id);
                      }}
                      className={`flex items-center gap-1 hover:text-[#00ff88] transition-colors ${
                        post.isLiked ? 'text-[#00ff88]' : ''
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.commentCount}</span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Post Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPost ? (
              <Card className="p-6 bg-[#0f1f3a] border-[#00ff88]/20 sticky top-20">
                <h3 className="text-white mb-4">Comments</h3>
                <Separator className="mb-4 bg-[#00ff88]/20" />

                {/* Comments List */}
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-[#1a2f4a] p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-[#00ff88]/20 rounded-full flex items-center justify-center">
                          <User className="w-3 h-3 text-[#00ff88]" />
                        </div>
                        <p className="text-white text-sm">{comment.authorName}</p>
                        <p className="text-white/50 text-xs ml-auto">{formatDate(comment.createdAt)}</p>
                      </div>
                      <p className="text-white/80 text-sm">{comment.content}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-white/50 text-center py-4">No comments yet. Be the first!</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-[#1a2f4a] border-[#00ff88]/20 text-white placeholder:text-white/40"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-[#00ff88] text-[#0a1628] hover:bg-[#00ff88]/90"
                    disabled={!newComment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </Card>
            ) : (
              <Card className="p-6 bg-[#0f1f3a] border-[#00ff88]/20 sticky top-20">
                <p className="text-white/70 text-center">
                  Select a post to view comments
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
