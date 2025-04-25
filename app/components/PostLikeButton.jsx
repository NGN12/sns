'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

export default function PostLikeButton({ postId, currentUser }) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 게시물 좋아요 상태 및 개수 확인
    const checkLikeStatus = async () => {
      if (!currentUser || !postId) return

      try {
        // 현재 사용자의 좋아요 상태 확인
        const { data, error } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('post_id', postId)
          .is('comment_id', null)
          .single()

        if (!error && data) {
          setIsLiked(true)
        }

        // 게시물의 총 좋아요 수 가져오기
        const { count, error: countError } = await supabase
          .from('likes')
          .select('*', { count: 'exact' })
          .eq('post_id', postId)
          .is('comment_id', null)

        if (!countError) {
          setLikeCount(count || 0)
        }
      } catch (error) {
        console.error('좋아요 상태 확인 실패:', error)
      }
    }

    checkLikeStatus()
  }, [postId, currentUser])

  const handleLike = async () => {
    if (!currentUser || loading) return
    
    setLoading(true)

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId)
          .is('comment_id', null)

        if (error) throw error

        // 게시물의 좋아요 수 업데이트
        const { error: updateError } = await supabase
          .from('posts')
          .update({ like_count: Math.max(0, likeCount - 1) })
          .eq('id', postId)

        if (updateError) throw updateError

        setIsLiked(false)
        setLikeCount(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('likes')
          .insert([
            {
              user_id: currentUser.id,
              post_id: postId,
              comment_id: null
            }
          ])

        if (error) throw error

        // 게시물의 좋아요 수 업데이트
        const { error: updateError } = await supabase
          .from('posts')
          .update({ like_count: likeCount + 1 })
          .eq('id', postId)

        if (updateError) throw updateError

        setIsLiked(true)
        setLikeCount(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading || !currentUser}
      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
        isLiked 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-zinc-400 hover:text-zinc-300'
      } disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
    >
      <span className="text-xl">{isLiked ? '❤️' : '🤍'}</span>
      {likeCount > 0 && <span>{likeCount}</span>}
    </button>
  )
}