'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

// 사용자 데이터를 캐싱하기 위한 전역 변수
let cachedUsername = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

export default function ProfileLink() {
  const [username, setUsername] = useState(cachedUsername);
  const [loading, setLoading] = useState(!cachedUsername);
  const [isNavigating, setIsNavigating] = useState(false); // 탐색 중인지 상태 추가
  const router = useRouter();
  const pathname = usePathname();
  
  // 현재 경로가 프로필 관련 페이지인지 확인
  const isActive = pathname?.startsWith('/profile');

  // 사용자 프로필 정보 가져오기
  async function fetchUserProfile() {
    const now = Date.now();
    
    // 캐시가 유효하면 API 호출 건너뛰기
    if (cachedUsername !== null && (now - lastFetchTime) < CACHE_DURATION) {
      setUsername(cachedUsername);
      setLoading(false);
      return cachedUsername;
    }
    
    try {
      // 현재 로그인한 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('세션 에러:', sessionError);
        setLoading(false);
        return null;
      }
      
      if (!session) {
        // 로그인되지 않은 경우
        cachedUsername = null;
        lastFetchTime = now;
        setUsername(null);
        setLoading(false);
        return null;
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
      
      // 캐시 업데이트
      if (profileData && profileData.username) {
        cachedUsername = profileData.username;
      } else {
        cachedUsername = null;
      }
      lastFetchTime = now;
      
      // UI 업데이트
      setUsername(cachedUsername);
      setLoading(false);
      
      // 데이터 반환
      return cachedUsername;
    } catch (error) {
      console.error('프로필 불러오기 오류:', error);
      setLoading(false);
      return null;
    }
  }

  useEffect(() => {
    // 컴포넌트 마운트 시 데이터 로드
    if (!cachedUsername) {
      fetchUserProfile();
    }
    
    // 브라우저 환경에서만 실행 - 로컬 스토리지에서 캐시 복원
    if (typeof window !== 'undefined' && cachedUsername === null) {
      const storedUsername = localStorage.getItem('cached_username');
      const storedTime = localStorage.getItem('username_fetch_time');
      
      if (storedUsername && storedTime) {
        const fetchTime = parseInt(storedTime, 10);
        const now = Date.now();
        
        // 캐시 유효성 확인
        if ((now - fetchTime) < CACHE_DURATION) {
          cachedUsername = storedUsername;
          lastFetchTime = fetchTime;
          setUsername(storedUsername);
          setLoading(false);
        }
      }
    }
  }, []);

  // 캐시 업데이트 시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && cachedUsername !== null) {
      localStorage.setItem('cached_username', cachedUsername);
      localStorage.setItem('username_fetch_time', lastFetchTime.toString());
    }
  }, [username]);

  // 탐색 상태 변경 시 페이지 이동 처리
  useEffect(() => {
    if (isNavigating && !loading) {
      // 로딩이 끝나고 탐색 플래그가 설정되어 있으면 페이지 이동
      const url = username ? `/profile/${username}` : '/profile/settings';
      setIsNavigating(false); // 탐색 상태 초기화
      router.push(url);
    }
  }, [isNavigating, loading, username, router]);

  const handleClick = async (e) => {
    e.preventDefault(); // 기본 링크 동작 방지
    
    if (isNavigating) {
      return; // 이미 탐색 중이면 중복 클릭 무시
    }
    
    if (loading) {
      // 로딩 중이면 탐색 플래그 설정 후 로딩 완료 대기
      setIsNavigating(true);
      return;
    }
    
    // 이미 데이터가 있는 경우 바로 페이지 이동
    if (username) {
      router.push(`/profile/${username}`);
    } else {
      // 데이터 새로 조회 후 이동 (캐시가 만료되었거나 없는 경우)
      setLoading(true);
      setIsNavigating(true);
      const result = await fetchUserProfile();
      
      // 조회가 즉시 완료된 경우 바로 이동 (useEffect에서 처리하지 않도록)
      if (!loading && result !== null) {
        router.push(`/profile/${result}`);
        setIsNavigating(false);
      } else if (!loading && result === null) {
        router.push('/profile/settings');
        setIsNavigating(false);
      }
      // 아직 로딩 중이면 useEffect에서 완료 후 이동
    }
  };

  return (
    <a 
      href="#"
      onClick={handleClick}
      className={`flex items-center gap-2 hover:text-zinc-300 ${isActive ? 'text-blue-400' : ''} ${loading && isNavigating ? 'opacity-50 cursor-wait' : ''}`}
    >
      <span className="text-xl">👤</span>
      <span className="hidden md:inline">
        {isNavigating && loading ? '로딩 중...' : '프로필'}
      </span>
    </a>
  );
}