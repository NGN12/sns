'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function Comment({ comment, currentUser, onDelete, onReply, level = 0, parentId = null }) {
  const [author, setAuthor] = useState(null)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replies, setReplies] = useState([])
  const [showReplies, setShowReplies] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [likes, setLikes] = useState(comment.like_count || 0)
  const [isLiked, setIsLiked] = useState(false)

  useEffect(() => {
    // 댓글 작성자 정보 가져오기
    const fetchAuthor = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', comment.user_id)
        .single()

      if (error) {
        console.error('댓글 작성자 정보 로딩 실패:', error)
      } else if (data) {
        setAuthor(data)
      }
    }

    // 대댓글 가져오기
    const fetchReplies = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('대댓글 로딩 실패:', error)
      } else if (data) {
        setReplies(data)
      }
    }

    // 좋아요 상태 확인
    const checkLikeStatus = async () => {
      if (!currentUser) return

      // 현재 사용자의 좋아요 상태 확인
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('comment_id', comment.id)
        .single()

      if (!error && data) {
        setIsLiked(true)
      }
    }

    fetchAuthor()
    fetchReplies()
    if (currentUser) {
      checkLikeStatus()
    }
  }, [comment, currentUser])

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !currentUser || isSubmitting) return

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: comment.post_id,
            user_id: currentUser.id,
            content: replyText,
            parent_id: comment.id
          }
        ])
        .select()

      if (error) throw error

      // 대댓글 목록 업데이트
      setReplies([...replies, data[0]])
      setReplyText('')
      setShowReplyForm(false)
      setShowReplies(true)
      
      // 부모 컴포넌트에 알림
      if (onReply) onReply(data[0])
    } catch (error) {
      console.error('대댓글 작성 실패:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!currentUser || isDeleting) return
    if (comment.user_id !== currentUser.id) return

    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)

      if (error) throw error

      // 부모 컴포넌트에 알림
      if (onDelete) onDelete(comment.id)
    } catch (error) {
      console.error('댓글 삭제 실패:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    if (!currentUser) return

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('comment_id', comment.id)

        if (error) throw error

        // 댓글의 좋아요 수 감소
        const { error: updateError } = await supabase
          .from('comments')
          .update({ like_count: Math.max(0, likes - 1) })
          .eq('id', comment.id)

        if (updateError) throw updateError

        setIsLiked(false)
        setLikes(prev => Math.max(0, prev - 1))
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('likes')
          .insert([
            {
              user_id: currentUser.id,
              comment_id: comment.id
            }
          ])

        if (error) throw error

        // 댓글의 좋아요 수 증가
        const { error: updateError } = await supabase
          .from('comments')
          .update({ like_count: likes + 1 })
          .eq('id', comment.id)

        if (updateError) throw updateError

        setIsLiked(true)
        setLikes(prev => prev + 1)
      }
    } catch (error) {
      console.error('좋아요 처리 실패:', error)
    }
  }

  return (
    <div className={`mb-4 ${level > 0 ? 'ml-8 border-l-2 border-zinc-700 pl-4' : ''}`}>
      <div className="bg-zinc-800 p-4 rounded-lg">
        {/* 댓글 헤더 - 작성자 정보 */}
        <div className="flex items-center mb-2">
          {author ? (
            <>
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                <img
                  src={author.avatar_url || '/default-profile.png'}
                  alt={author.username || '사용자'}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
              <Link href={`/profile/${author.username}`} className="font-medium text-blue-400 hover:underline">
                {author.username || '사용자'}
              </Link>
            </>
          ) : (
            <div className="w-8 h-8 bg-zinc-600 rounded-full mr-2"></div>
          )}
          <span className="text-xs text-zinc-400 ml-2">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>

        {/* 댓글 내용 */}
        <p className="text-gray-200 mb-3">{comment.content}</p>

        {/* 댓글 액션 버튼 */}
        <div className="flex items-center text-sm text-zinc-400 space-x-4">
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)} 
            className="hover:text-zinc-200"
          >
            답글
          </button>
          
          <button 
            onClick={handleLike} 
            className={`flex items-center hover:text-zinc-200 ${isLiked ? 'text-blue-400' : ''}`}
          >
            <span>{isLiked ? '좋아요 취소' : '좋아요'}</span>
            {likes > 0 && <span className="ml-1">({likes})</span>}
          </button>
          
          {replies.length > 0 && (
            <button 
              onClick={() => setShowReplies(!showReplies)} 
              className="hover:text-zinc-200"
            >
              {showReplies ? '답글 숨기기' : `답글 ${replies.length}개 보기`}
            </button>
          )}
          
          {currentUser && comment.user_id === currentUser.id && (
            <button 
              onClick={handleDelete} 
              className="text-red-400 hover:text-red-300"
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>

        {/* 답글 폼 */}
        {showReplyForm && currentUser && (
          <form onSubmit={handleReply} className="mt-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="답글을 작성하세요..."
              className="w-full p-2 rounded-lg bg-zinc-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-zinc-500"
              rows="2"
              required
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                type="button"
                onClick={() => setShowReplyForm(false)}
                className="px-3 py-1 bg-zinc-600 text-white rounded hover:bg-zinc-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '등록 중...' : '답글 등록'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 대댓글 목록 */}
      {showReplies && replies.length > 0 && (
        <div className="mt-2">
          {replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onDelete={(id) => {
                setReplies(replies.filter(r => r.id !== id))
              }}
              level={level + 1}
              parentId={comment.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}