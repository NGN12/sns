'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfileLink() {
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        // 현재 로그인한 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('세션 에러:', sessionError);
          return;
        }
        
        if (!session) {
          // 로그인되지 않은 경우 기본 프로필 페이지로 연결
          setUsername(null);
          setLoading(false);
          return;
        }
        
        // 사용자의 프로필 정보를 데이터베이스에서 가져오기
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', session.user.id)
          .single();
        
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('프로필 조회 에러:', profileError);
        }
        
        // 프로필 데이터가 있고 username이 있는 경우
        if (profileData && profileData.username) {
          setUsername(profileData.username);
        } else {
          // 프로필이 없거나 username이 설정되지 않은 경우
          setUsername(null);
        }
      } catch (error) {
        console.error('프로필 불러오기 오류:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserProfile();
  }, []);

  const handleProfileClick = (e) => {
    if (!username) {
      e.preventDefault();
      router.push('/profile/settings');
    }
  };

  if (loading) {
    return <div className="opacity-50">프로필</div>;
  }

  return (
    <Link 
      href={username ? `/profile/${username}` : '#'} 
      onClick={handleProfileClick}
      className="flex items-center gap-2 hover:text-zinc-300"
    >
      <span className="text-xl">👤</span>
      <span className="hidden md:inline">프로필</span>
    </Link>
  );
}