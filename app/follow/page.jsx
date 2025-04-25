'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function FollowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');
  const tab = searchParams.get('tab') || 'posts'; // 기본값은 posts
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [followers, setFollowers] = useState([]); // 팔로워 목록
  const [following, setFollowing] = useState([]); // 팔로잉 목록
  const [profileUser, setProfileUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in and handle username parameter
    const checkUserAndParams = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('세션 에러:', sessionError);
        setError('세션을 확인하는 중 오류가 발생했습니다.');
        setLoading(false);
        return;
      }
      
      if (!session) {
        // Redirect to login if not logged in
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // 수정: username이 "null" 문자열인 경우 처리
      const actualUsername = username === "null" ? null : username;
      
      // If username is provided, fetch that user's profile
      if (actualUsername) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', actualUsername)
          .single();
          
        if (profileError) {
          console.error('프로필 조회 에러:', profileError);
          setError('사용자 프로필을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }
        
        setProfileUser(profileData);
        
        // Fetch data based on tab
        if (tab === 'following') {
          await fetchFollowing(profileData.id);
        } else if (tab === 'followers') {
          await fetchFollowers(profileData.id);
        } else {
          await fetchFollowedPosts(session.user.id);
        }
      } else {
        
        const { data: currentUserProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error('현재 사용자 프로필 조회 에러:', profileError);
          setError('프로필을 불러오는데 실패했습니다.');
          setLoading(false);
          return;
        }
        
        setProfileUser(currentUserProfile);
        
        // Fetch data based on tab
        if (tab === 'following') {
          await fetchFollowing(session.user.id);
        } else if (tab === 'followers') {
          await fetchFollowers(session.user.id);
        } else {
          // Default to showing posts from followed users
          await fetchFollowedPosts(session.user.id);
        }
      }
    };
    
    checkUserAndParams();
  }, [router, username, tab]);

  // Fetch users who follow the specified user (followers)
  const fetchFollowers = async (userId) => {
    try {
      setLoading(true);
      
      // 디버깅을 위한 로그 추가
      console.log('팔로워 조회 시작:', userId);
      
      // Get the list of users who follow the specified user
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);
      
      if (followError) {
        console.error('팔로워 목록 조회 에러:', followError);
        setError('팔로워 목록을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // 디버깅을 위한 로그 추가
      console.log('팔로워 데이터:', followData);
      
      // Extract follower IDs
      const followerIds = followData.map(item => item.follower_id);
      
      if (followerIds.length === 0) {
        // No followers
        console.log('팔로워가 없습니다');
        setFollowers([]);
        setLoading(false);
        return;
      }
      
      // Fetch profile information for each follower
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followerIds);
      
      if (profilesError) {
        console.error('팔로워 프로필 조회 에러:', profilesError);
        setError('팔로워 프로필을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // 디버깅을 위한 로그 추가
      console.log('팔로워 프로필 데이터:', profilesData);
      
      setFollowers(profilesData || []);
    } catch (error) {
      console.error('팔로워 정보 조회 실패:', error);
      setError('팔로워 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users that the specified user follows (following)
  const fetchFollowing = async (userId) => {
    try {
      setLoading(true);
      
      // 디버깅을 위한 로그 추가
      console.log('팔로잉 조회 시작:', userId);
      
      // Get the list of users that the specified user follows
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (followError) {
        console.error('팔로잉 목록 조회 에러:', followError);
        setError('팔로잉 목록을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // 디버깅을 위한 로그 추가
      console.log('팔로잉 데이터:', followData);
      
      // Extract following user IDs
      const followingIds = followData.map(item => item.following_id);
      
      if (followingIds.length === 0) {
        // No following users
        console.log('팔로잉하는 사용자가 없습니다');
        setFollowing([]);
        setLoading(false);
        return;
      }
      
      // Fetch profile information for each following user
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIds);
      
      if (profilesError) {
        console.error('팔로잉 프로필 조회 에러:', profilesError);
        setError('팔로잉 프로필을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // 디버깅을 위한 로그 추가
      console.log('팔로잉 프로필 데이터:', profilesData);
      
      setFollowing(profilesData || []);
    } catch (error) {
      console.error('팔로잉 정보 조회 실패:', error);
      setError('팔로잉 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch posts from followed users
  const fetchFollowedPosts = async (userId) => {
    try {
      setLoading(true);
      
      // Get the list of users that the current user follows
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);
      
      if (followError) {
        console.error('팔로우 목록 조회 에러:', followError);
        setError('팔로우 목록을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // Extract followed user IDs
      const followedIds = followData.map(item => item.following_id);
      
      if (followedIds.length === 0) {
        // No followed users
        setPosts([]);
        setLoading(false);
        return;
      }
      
      // Get posts from followed users
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('user_id', followedIds)
        .order('created_at', { ascending: false });
      
      if (postsError) {
        console.error('게시글 조회 에러:', postsError);
        setError('게시글을 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      // Fetch additional information for each post
      if (postsData && postsData.length > 0) {
        const postsWithDetails = await Promise.all(
          postsData.map(async (post) => {
            // Get comment count
            const { count: commentCount, error: commentError } = await supabase
              .from('comments')
              .select('id', { count: 'exact' })
              .eq('post_id', post.id);
            
            if (commentError) {
              console.error('댓글 수 조회 에러:', commentError);
            }
            
            // Get author information
            const { data: authorData, error: authorError } = await supabase
              .from('profiles')
              .select('username, full_name, avatar_url')
              .eq('id', post.user_id)
              .single();
            
            if (authorError && authorError.code !== 'PGRST116') {
              console.error('작성자 정보 조회 에러:', authorError);
            }
            
            return {
              ...post,
              comment_count: commentCount || 0,
              author: authorData || null
            };
          })
        );
        
        setPosts(postsWithDetails);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('게시글 조회 실패:', error);
      setError('게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Render UI based on the current tab
  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-10">
          <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10">
          <p className="text-red-400">{error}</p>
        </div>
      );
    }

    if (tab === 'followers') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">팔로워 목록</h2>
          {followers.length === 0 ? (
            <p className="text-center py-5 text-gray-400">팔로워가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {followers.map(follower => (
                <Link 
                  key={follower.id} 
                  href={`/profile/${follower.username}`}
                  className="flex items-center p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 mr-3">
                    {follower.avatar_url ? (
                      <img 
                        src={follower.avatar_url} 
                        alt={follower.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        👤
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{follower.full_name || follower.username}</p>
                    <p className="text-sm text-gray-400">@{follower.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (tab === 'following') {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">팔로잉 목록</h2>
          {following.length === 0 ? (
            <p className="text-center py-5 text-gray-400">팔로잉하는 사용자가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {following.map(followingUser => (
                <Link 
                  key={followingUser.id} 
                  href={`/profile/${followingUser.username}`}
                  className="flex items-center p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 mr-3">
                    {followingUser.avatar_url ? (
                      <img 
                        src={followingUser.avatar_url} 
                        alt={followingUser.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        👤
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{followingUser.full_name || followingUser.username}</p>
                    <p className="text-sm text-gray-400">@{followingUser.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default tab (posts)
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">팔로우 중인 사용자의 게시글</h2>
        {posts.length === 0 ? (
          <p className="text-center py-5 text-gray-400">게시글이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block"
              >
                <div className="bg-zinc-800 p-4 rounded-lg shadow hover:bg-zinc-700 transition-colors">
                  {post.author && (
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 mr-2">
                        {post.author.avatar_url ? (
                          <img 
                            src={post.author.avatar_url} 
                            alt={post.author.username} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                            👤
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-300">
                        {post.author.full_name || post.author.username}
                      </span>
                    </div>
                  )}
                  
                  <h3 className="text-xl text-white mb-2">{post.title}</h3>
                  
                  <div className="text-gray-400 max-h-32 overflow-hidden mb-3">
                    <p>{post.content}</p>
                  </div>
                  
                  {post.image_url && (
                    <div className="rounded-lg overflow-hidden max-h-96 flex justify-center mb-3">
                      <img
                        src={post.image_url}
                        alt="게시물 이미지"
                        className="max-w-full object-contain"
                        loading="lazy"
                        style={{ maxWidth: '550px' }}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end items-center mt-2">
                    <div className="flex space-x-4 text-gray-400">
                      <span className="flex items-center space-x-1">
                        <span>💬</span>
                        <span>{post.comment_count || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>❤️</span>
                        <span>{post.like_count || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex flex-col items-center px-4">
      <div className="w-full max-w-2xl mx-auto py-6">
        {profileUser && (
          <div className="mb-6">
            <Link href={`/profile/${profileUser.username}`} className="flex items-center mb-4 hover:underline">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 mr-3">
                {profileUser.avatar_url ? (
                  <img 
                    src={profileUser.avatar_url} 
                    alt={profileUser.username} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    👤
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold">{profileUser.full_name || profileUser.username}의 {
                tab === 'followers' ? '팔로워' : 
                tab === 'following' ? '팔로잉' : 
                '게시글'
              }</h1>
            </Link>
          </div>
        )}
        
        <div className="flex border-b border-zinc-700 mb-6">
          <Link 
            href={`/follow?username=${username !== "null" ? username : profileUser?.username}&tab=posts`}
            className={`px-4 py-2 ${tab === 'posts' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          >
            게시글
          </Link>
          <Link 
            href={`/follow?username=${username !== "null" ? username : profileUser?.username}&tab=followers`}
            className={`px-4 py-2 ${tab === 'followers' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          >
            팔로워
          </Link>
          <Link 
            href={`/follow?username=${username !== "null" ? username : profileUser?.username}&tab=following`}
            className={`px-4 py-2 ${tab === 'following' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
          >
            팔로잉
          </Link>
        </div>
        
        {renderTabContent()}
      </div>
    </main>
  );
}
