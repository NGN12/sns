// app/profile/[username]/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
// 기존 import 문에 추가
import FollowButton from '@/app/components/FollowButton'

export default function Profile() {
  const params = useParams();
  const username = params.username;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        
        // 현재 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          setCurrentUser(session.user);
        }
        
        // URL의 username으로 프로필 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        
        if (profileError) {
          if (profileError.code === 'PGRST116') {
            setError('프로필을 찾을 수 없습니다.');
          } else {
            throw profileError;
          }
          return;
        }
        
        // 현재 보고 있는 프로필이 자신의 프로필인지 확인
        if (session && profileData.id === session.user.id) {
          setIsOwnProfile(true);
        }
        
        // 해당 사용자가 작성한 게시물 가져오기
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', profileData.id)
          .order('created_at', { ascending: false });
        
        if (postsError) {
          throw postsError;
        }
        
        if (postsData) {
          // 각 게시물의 댓글 수를 가져오기 위한 추가 쿼리
          const postsWithCommentCounts = await Promise.all(
            postsData.map(async (post) => {
              const { count, error: countError } = await supabase
                .from('comments')
                .select('id', { count: 'exact' })
                .eq('post_id', post.id);
              
              if (countError) {
                console.error('댓글 수 가져오기 오류:', countError);
                return { ...post, comment_count: 0 };
              }
              
              return { ...post, comment_count: count || 0 };
            })
          );
          
          setPosts(postsWithCommentCounts);
        }

        // 팔로워 수 가져오기
        const { count: followerCount, error: followerCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', profileData.id);
        
        // 팔로잉 수 가져오기
        const { count: followingCount, error: followingCountError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', profileData.id);
        
        // 프로필 데이터에 카운트 추가
        setProfile({
          ...profileData,
          follower_count: followerCount || 0,
          following_count: followingCount || 0
        });

        // 실시간 프로필 업데이트를 위한 구독 설정
        const profileSubscription = supabase
          .channel(`profile:${profileData.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${profileData.id}`
          }, (payload) => {
            console.log('프로필 업데이트:', payload);
            // 프로필 정보 업데이트
            setProfile(prev => ({
              ...prev,
              ...payload.new
            }));
          })
          .subscribe();

        // 컴포넌트 언마운트 시 구독 해제
        return () => {
          supabase.removeChannel(profileSubscription);
        };
      } catch (error) {
        console.error('프로필 정보를 불러오는데 실패했습니다:', error);
        setError('프로필 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    
    if (username) {
      fetchProfile();
    }
  }, [username, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-xl text-gray-400 mb-4">{error || '프로필 정보를 찾을 수 없습니다.'}</p>
        <Link 
          href="/" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  // 프로필 헤더 부분 수정
  return (
    <div className="max-w-2xl mx-auto">
      {/* 프로필 헤더 */}
      <div className="mb-8">
        <div className="h-40 bg-gradient-to-r from-blue-900 to-purple-900 rounded-t-lg"></div>
        <div className="px-6 pb-6 bg-zinc-800 rounded-b-lg shadow-md">
          <div className="flex justify-between items-end -mt-12">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-700">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.username || '프로필'} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-400">
                  👤
                </div>
              )}
            </div>
            {/* 자신의 프로필일 경우에만 편집 버튼 표시, 아닐 경우 팔로우 버튼 표시 */}
            {isOwnProfile ? (
              <Link 
                href="/profile/settings" 
                className="px-4 py-1 border border-gray-500 text-gray-300 rounded-full hover:bg-gray-700"
              >
                프로필 편집
              </Link>
            ) : (
              <FollowButton 
                targetUserId={profile.id}
                currentUser={currentUser}
              />
            )}
          </div>
          
          <div className="mt-4">
            <h1 className="text-2xl font-bold">{profile.full_name || '이름 없음'}</h1>
            <p className="text-gray-400">@{profile.username}</p>
            
            {profile.bio && (
              <p className="mt-4 text-gray-200">{profile.bio}</p>
            )}
            
            {profile.website && (
              <div className="mt-2">
                <a 
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-400 hover:underline"
                >
                  🔗 {profile.website.replace(/(^\w+:|^)\/\//, '')}
                </a>
              </div>
            )}
            
            <div className="mt-4 flex space-x-4 text-gray-300">
              <Link href={`/profile/${profile.username}/following`} className="hover:underline">
                <span className="font-bold">{profile.following_count || 0}</span> 팔로잉
              </Link>
              <Link href={`/profile/${profile.username}/followers`} className="hover:underline">
                <span className="font-bold">{profile.follower_count || 0}</span> 팔로워
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* 게시물 목록 */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">
          {isOwnProfile ? '내 게시물' : `${profile.username}님의 게시물`}
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800 rounded-lg">
            <p className="text-gray-400">
              {isOwnProfile 
                ? '아직 작성한 게시물이 없습니다.' 
                : `${profile.username}님이 아직 게시물을 작성하지 않았습니다.`}
            </p>
            {isOwnProfile && (
              <Link 
                href="/create-post" 
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                첫 게시물 작성하기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link 
                key={post.id} 
                href={`/posts/${post.id}`}
                className="block p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username || '프로필'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-400">
                        👤
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-gray-400">@{profile.username}</p>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mb-2">{post.title}</h3>
                <p className="text-gray-200 line-clamp-3">{post.content}</p>
                
                {post.image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden">
                    <img 
                      src={post.image_url} 
                      alt="게시물 이미지" 
                      className="w-full h-auto max-h-48 object-cover"
                    />
                  </div>
                )}
                
                {/* 게시물 목록 */}
                
                {/* ... 기존 코드 ... */}
                
                <div className="mt-4 flex space-x-6 text-gray-400">
                  <div className="flex items-center space-x-1">
                    <span>💬</span>
                    <span>{post.comment_count || 0}</span>
                  </div>
                  {/* 리트윗 버튼 제거 
                  <div className="flex items-center space-x-1">
                    <span>🔄</span>
                    <span>{post.repost_count || 0}</span>
                  </div>
                  */}
                  <div className="flex items-center space-x-1">
                    <span>❤️</span>
                    <span>{post.like_count || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
