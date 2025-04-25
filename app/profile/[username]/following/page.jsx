'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function FollowingPage() {
  const params = useParams();
  const username = params.username;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState([]);
  const [profileUser, setProfileUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 현재 로그인한 사용자 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('세션 에러:', sessionError);
          setError('세션을 확인하는 중 오류가 발생했습니다.');
          setLoading(false);
          return;
        }
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        setCurrentUser(session.user);
        
        // 프로필 사용자 정보 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
          
        if (profileError) {
          console.error('프로필 조회 에러:', profileError);
          setError('사용자 프로필을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }
        
        setProfileUser(profileData);
        
        // 팔로잉 목록 가져오기
        await fetchFollowing(profileData.id);
      } catch (error) {
        console.error('데이터 로딩 에러:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [username, router]);

  // 팔로잉 목록 가져오기
  const fetchFollowing = async (userId) => {
    try {
      // 팔로잉 ID 목록 가져오기
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
      
      // 팔로잉이 없는 경우
      if (!followData || followData.length === 0) {
        setFollowing([]);
        setLoading(false);
        return;
      }
      
      // 팔로잉 ID 추출
      const followingIds = followData.map(item => item.following_id);
      
      // 팔로잉 프로필 정보 가져오기
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
      
      setFollowing(profilesData || []);
    } catch (error) {
      console.error('팔로잉 정보 조회 실패:', error);
      setError('팔로잉 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
              <h1 className="text-xl font-bold">{profileUser.full_name || profileUser.username}의 팔로잉</h1>
            </Link>
            
            <div className="flex border-b border-zinc-700 mb-6">
              <Link 
                href={`/profile/${username}`}
                className="px-4 py-2 text-gray-400"
              >
                프로필
              </Link>
              <Link 
                href={`/profile/${username}/followers`}
                className="px-4 py-2 text-gray-400"
              >
                팔로워
              </Link>
              <Link 
                href={`/profile/${username}/following`}
                className="px-4 py-2 border-b-2 border-blue-500 text-blue-400"
              >
                팔로잉
              </Link>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
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
        )}
      </div>
    </main>
  );
}