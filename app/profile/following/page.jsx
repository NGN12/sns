'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'

export default function FollowingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [followingUsers, setFollowingUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
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
      
      // Fetch following users
      await fetchFollowingUsers(session.user.id);
    };
    
    checkUser();
  }, [router]);

  // Fetch users that the current user follows
  const fetchFollowingUsers = async (userId) => {
    try {
      // Get the list of users that the current user follows
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
      
      // Extract followed user IDs
      const followingIds = followData.map(item => item.following_id);
      
      if (followingIds.length === 0) {
        // No following users
        setLoading(false);
        return;
      }
      
      // Fetch profile information for each following user
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIds);
      
      if (profilesError) {
        console.error('프로필 정보 조회 에러:', profilesError);
        setError('팔로잉 사용자 정보를 불러오는데 실패했습니다.');
        setLoading(false);
        return;
      }
      
      setFollowingUsers(profilesData || []);
      
    } catch (error) {
      console.error('팔로잉 정보 조회 실패:', error);
      setError('팔로잉 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex flex-col items-center px-4">
      <div className="w-full max-w-2xl mx-auto py-8">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.back()} 
            className="mr-4 text-gray-400 hover:text-white"
          >
            ← 뒤로
          </button>
          <h2 className="text-xl font-bold text-white">팔로잉</h2>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-lg mb-6">
            {error}
          </div>
        ) : followingUsers.length === 0 ? (
          <div className="text-center py-12 w-full bg-zinc-800 rounded-lg">
            <p className="text-white mb-4">아직 팔로우한 사용자가 없습니다.</p>
            <Link
              href="/search"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              사용자 검색하기
            </Link>
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {followingUsers.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.username}`}
                className="block"
              >
                <div className="bg-zinc-800 p-4 rounded-lg shadow hover:bg-zinc-700 transition-colors flex items-center">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700 mr-4">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.username || '사용자'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400">
                        👤
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white">
                      {profile.username || '사용자'}
                    </h3>
                    {profile.full_name && (
                      <p className="text-gray-400">{profile.full_name}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}