'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

export default function FollowButton({ targetUserId, currentUser }) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 팔로우 상태 확인
  useEffect(() => {
    async function checkFollowStatus() {
      if (!currentUser || !targetUserId) {
        setLoading(false);
        return;
      }

      try {
        // 이미 팔로우 중인지 확인
        const { data, error } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('팔로우 상태 확인 오류:', error);
          setError(error.message);
        } else {
          // 팔로우 중이면 true, 아니면 false
          setIsFollowing(!!data);
        }
      } catch (error) {
        console.error('팔로우 상태 확인 중 오류 발생:', error);
        setError('팔로우 상태를 확인하는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    checkFollowStatus();
  }, [currentUser, targetUserId]);

  // 팔로우/언팔로우 처리
  const handleFollowToggle = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.id === targetUserId) {
      return; // 자기 자신은 팔로우할 수 없음
    }

    setLoading(true);

    try {
      if (isFollowing) {
        // 언팔로우 처리
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        // 팔로워 수 감소
        await updateFollowerCount(targetUserId, -1);
        await updateFollowingCount(currentUser.id, -1);

        setIsFollowing(false);
      } else {
        // 팔로우 처리
        const { error } = await supabase
          .from('follows')
          .insert([
            {
              follower_id: currentUser.id,
              following_id: targetUserId
            }
          ]);

        if (error) throw error;

        // 팔로워 수 증가
        await updateFollowerCount(targetUserId, 1);
        await updateFollowingCount(currentUser.id, 1);

        setIsFollowing(true);
      }

      // 프로필 페이지 새로고침 (팔로워 수 업데이트를 위해)
      router.refresh();
    } catch (error) {
      console.error('팔로우 상태 변경 중 오류 발생:', error);
      setError('팔로우 상태를 변경하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 팔로워 수 업데이트
  const updateFollowerCount = async (userId, increment) => {
    try {
      // 현재 프로필 정보 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // 현재 팔로워 수
      const currentCount = profileData.followers_count || 0;
      
      // 팔로워 수 업데이트 (음수가 되지 않도록)
      const newCount = Math.max(0, currentCount + increment);

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ followers_count: newCount })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('팔로워 수 업데이트 중 오류 발생:', error);
    }
  };

  // 팔로잉 수 업데이트
  const updateFollowingCount = async (userId, increment) => {
    try {
      // 현재 프로필 정보 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('following_count')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // 현재 팔로잉 수
      const currentCount = profileData.following_count || 0;
      
      // 팔로잉 수 업데이트 (음수가 되지 않도록)
      const newCount = Math.max(0, currentCount + increment);

      // 프로필 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ following_count: newCount })
        .eq('id', userId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('팔로잉 수 업데이트 중 오류 발생:', error);
    }
  };

  if (error) {
    return (
      <button 
        className="px-4 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
        disabled
      >
        오류 발생
      </button>
    );
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading || currentUser?.id === targetUserId}
      className={`px-4 py-1 rounded-full transition-colors ${
        isFollowing 
          ? 'bg-gray-700 text-white hover:bg-red-600' 
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  );
}