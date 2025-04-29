'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

export default function ProfileSection() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogout, setShowLogout] = useState(false);

  // Supabase 인증 상태 변경 리스너
  useEffect(() => {
    // 페이지 로드 시 사용자 정보 가져오기
    fetchUserProfile();
    
    // 인증 상태 변경을 감지하는 리스너 설정
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          // 로그인 시 사용자 정보 가져오기
          fetchUserProfile();
        } else if (event === 'SIGNED_OUT') {
          // 로그아웃 시 사용자 정보 초기화
          setUser(null);
        }
      }
    );

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (authListener && typeof authListener.unsubscribe === 'function') {
        authListener.unsubscribe();
      }
    };
  }, []);

  // 프로필 변경 감지를 위한 실시간 구독 설정 
  useEffect(() => {
    if (!user) return;

    // 기존 채널 이름을 고유하게 변경
    const channelName = `profile-changes-${user.id}`;
    
    console.log('프로필 변경 구독 설정:', user.id);
    
    // profiles 테이블의 변경사항을 구독
    const profileSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*',  // UPDATE 대신 모든 이벤트 감지
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('프로필 업데이트 감지:', payload);
          // 프로필이 업데이트되면 사용자 정보 다시 가져오기
          fetchUserProfile();
        }
      )
      .subscribe((status) => {
        console.log('구독 상태:', status);
      });

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      console.log('구독 해제:', channelName);
      supabase.removeChannel(profileSubscription);
    };
  }, [user?.id]);

  // 클릭 이벤트가 컴포넌트 외부에서 발생했을 때 로그아웃 메뉴 닫기
  useEffect(() => {
    function handleClickOutside(event) {
      // ProfileSection 컴포넌트 내부를 클릭한 것이 아니라면 로그아웃 메뉴 닫기
      if (showLogout && !event.target.closest('.profile-section')) {
        setShowLogout(false);
      }
    }

    // 문서 전체에 클릭 이벤트 리스너 추가
    document.addEventListener('mousedown', handleClickOutside);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLogout]);

  // 사용자 프로필 정보 가져오기
  async function fetchUserProfile() {
    try {
      setLoading(true);
      
      // 현재 로그인한 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('세션 에러:', sessionError);
        return;
      }
      
      if (!session) {
        console.log('로그인된 세션이 없습니다.');
        setUser(null);
        return;
      }
      
      // 사용자의 프로필 정보를 데이터베이스에서 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('프로필 조회 에러:', profileError);
      }
      
      // 프로필 데이터가 있는 경우
      if (profileData) {
        // avatar_url이 Supabase Storage에 업로드된 이미지 URL이라면
        let avatarUrl = profileData.avatar_url;

        // avatar_url이 없으면 기본 프로필 이미지 URL을 사용
        if (!avatarUrl) {
          avatarUrl = '/default-profile.png';
        }

        // 캐시 방지를 위한 타임스탬프 추가
        const timestamp = new Date().getTime();
        const imageUrlWithTimestamp = avatarUrl.includes('?') 
          ? `${avatarUrl}&t=${timestamp}` 
          : `${avatarUrl}?t=${timestamp}`;

        setUser({
          id: session.user.id,
          username: profileData.username,  // username 속성 추가
          nickname: profileData.username || profileData.nickname || session.user.email,
          profileImage: imageUrlWithTimestamp,  // 캐시 방지 타임스탬프 추가
          hasProfile: true
        });
        
        console.log('프로필 정보 업데이트됨:', profileData.username, imageUrlWithTimestamp);
      } else {
        // 프로필 데이터가 없는 경우 - 로그인은 되어 있지만 프로필이 없음
        setUser({
          id: session.user.id,
          email: session.user.email,
          hasProfile: false
        });
      }
    } catch (error) {
      console.error('프로필 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      setLoading(true); // 로그아웃 프로세스 시작 시 로딩 상태로 설정
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      console.log('로그아웃 성공');
      setUser(null); // 사용자 상태 즉시 초기화
      setShowLogout(false); // 로그아웃 메뉴 닫기
      
      // 로그인 페이지로 리다이렉트하기 전에 페이지 새로고침
      window.location.href = '/login'; // 페이지를 새로고침하면서 로그인 페이지로 이동
    } catch (error) {
      console.error('로그아웃 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  // 로딩 중이거나 사용자 정보가 없는 경우
  if (loading) {
    return (
      <div className="mt-auto pt-4 opacity-50">
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 animate-pulse"></div>
          <div className="hidden md:block h-4 w-20 bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우
  if (!user) {
    return (
      <div className="mt-auto pt-4">
        <Link 
          href="/login"
          className="flex items-center gap-3 hover:bg-zinc-800 p-3 rounded-full transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
            <span>?</span>
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-sm">로그인</p>
          </div>
        </Link>
      </div>
    );
  }

  // 로그인은 되었지만 프로필이 없는 경우
  if (user && !user.hasProfile) {
    return (
      <div className="mt-auto pt-4 relative profile-section">
        <div className="flex items-center gap-3 p-3 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
             onClick={() => setShowLogout(!showLogout)}>
          <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-white">
            <span>!</span>
          </div>
          <div className="hidden md:block">
            <p className="font-medium text-sm text-yellow-500">프로필 설정 필요</p>
          </div>
        </div>
        
        {/* 프로필 설정 및 로그아웃 메뉴 */}
        {showLogout && (
          <div className="absolute bottom-full mb-2 w-full bg-zinc-900 rounded-md shadow-lg overflow-hidden">
            <Link
              href="/profile/settings"
              className="w-full text-left flex items-center gap-3 hover:bg-zinc-800 p-3 transition-colors text-blue-400"
              onClick={() => setShowLogout(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm">프로필 설정</span>
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-3 hover:bg-zinc-800 p-3 transition-colors text-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10 1H3v12h10V4z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-sm">로그아웃</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 로그인된 사용자 정보 표시 (프로필이 있는 경우)
  return (
    <div className="mt-auto pt-4 relative profile-section">
      {/* 프로필 정보 표시 - 클릭하면 로그아웃 버튼 토글 */}
      <div 
        className="flex items-center gap-3 p-3 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
        onClick={() => setShowLogout(!showLogout)}
      >
        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
          {user.profileImage && (
            <Image 
              src={user.profileImage}
              alt="프로필" 
              width={40} 
              height={40} 
              className="object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/default-profile.png';
              }}
            />
          )}
        </div>
        <div className="hidden md:block">
          <p className="font-medium text-sm">{user.nickname}</p>
        </div>
      </div>
      
      {/* 로그아웃 버튼 - 클릭 시에만 표시 */}
      {showLogout && (
        <div className="absolute bottom-full mb-2 w-full bg-zinc-900 rounded-md shadow-lg overflow-hidden">
          <Link 
            href={user.username ? `/profile/${user.username}` : "/profile/settings"} 
            className="w-full text-left flex items-center gap-3 hover:bg-zinc-800 p-3 transition-colors text-blue-400"
            onClick={() => setShowLogout(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-sm">내 프로필</span>
          </Link>
          
          <Link 
            href="/profile/settings" 
            className="w-full text-left flex items-center gap-3 hover:bg-zinc-800 p-3 transition-colors text-green-400"
            onClick={() => setShowLogout(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-sm">프로필 설정</span>
          </Link>
          
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-3 hover:bg-zinc-800 p-3 transition-colors text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10 1H3v12h10V4z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-sm">로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
}