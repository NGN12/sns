'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CommentSection({ postId, currentUser }) {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [commentAuthors, setCommentAuthors] = useState({});
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  // 댓글 및 대댓글 가져오기
  const fetchComments = async () => {
    try {
      setLoading(true);
      
      // 모든 댓글 가져오기 (대댓글 포함)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // 댓글과 대댓글 구분하기
      const parentComments = [];
      const childComments = {};
      
      data.forEach(comment => {
        if (comment.parent_id === null) {
          // 부모 댓글
          parentComments.push({
            ...comment,
            replies: []
          });
        } else {
          // 대댓글
          if (!childComments[comment.parent_id]) {
            childComments[comment.parent_id] = [];
          }
          childComments[comment.parent_id].push(comment);
        }
      });
      
      // 대댓글을 부모 댓글에 연결
      parentComments.forEach(comment => {
        if (childComments[comment.id]) {
          comment.replies = childComments[comment.id];
        }
      });
      
      setComments(parentComments);
      
      // 댓글 작성자 정보 가져오기
      const userIds = [...new Set(data.map(comment => comment.user_id))];
      await fetchCommentAuthors(userIds);
      
    } catch (error) {
      console.error('댓글 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 댓글 작성자 정보 가져오기
  const fetchCommentAuthors = async (userIds) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);
      
      if (error) throw error;
      
      const authors = {};
      data.forEach(profile => {
        authors[profile.id] = profile;
      });
      
      setCommentAuthors(authors);
    } catch (error) {
      console.error('댓글 작성자 정보 로딩 실패:', error);
    }
  };

  // 댓글 작성 처리
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    
    if (!commentText.trim()) return;
    
    try {
      setSubmitting(true);
      
      // 댓글 추가
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            content: commentText.trim(),
            parent_id: null
          }
        ])
        .select();
      
      if (error) throw error;
      
      // 댓글 작성 후 입력창 초기화
      setCommentText('');
      
      // 댓글 목록 새로고침
      await fetchComments();
      
    } catch (error) {
      console.error('댓글 작성 실패:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 대댓글 작성 처리
  const handleReplySubmit = async (parentId) => {
    if (!currentUser) {
      alert('댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    
    const replyContent = replyText[parentId];
    if (!replyContent || !replyContent.trim()) return;
    
    try {
      setSubmitting(true);
      
      // 대댓글 추가
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: currentUser.id,
            content: replyContent.trim(),
            parent_id: parentId
          }
        ])
        .select();
      
      if (error) throw error;
      
      // 대댓글 작성 후 입력창 초기화
      setReplyText(prev => ({
        ...prev,
        [parentId]: ''
      }));
      setReplyingTo(null);
      
      // 댓글 목록 새로고침
      await fetchComments();
      
    } catch (error) {
      console.error('대댓글 작성 실패:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 댓글 삭제 처리
  const handleDeleteComment = async (commentId) => {
    if (!currentUser) return;
    
    if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?')) return;
    
    try {
      // 댓글 삭제 (ON DELETE CASCADE로 대댓글도 자동 삭제됨)
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      // 댓글 목록 새로고침
      await fetchComments();
      
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
    }
  };

  // 대댓글 입력창 토글
  const toggleReplyForm = (commentId) => {
    if (replyingTo === commentId) {
      setReplyingTo(null);
    } else {
      setReplyingTo(commentId);
      // 해당 댓글에 대한 대댓글 입력 상태 초기화
      if (!replyText[commentId]) {
        setReplyText(prev => ({
          ...prev,
          [commentId]: ''
        }));
      }
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">댓글</h3>
      
      {/* 댓글 작성 폼 */}
      {currentUser ? (
        <form onSubmit={handleCommentSubmit} className="mb-6">
          <div className="flex flex-col space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 작성하세요..."
              className="w-full p-3 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '게시 중...' : '댓글 작성'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-zinc-800 rounded-lg text-center">
          <p className="text-zinc-400">
            댓글을 작성하려면 <Link href="/login" className="text-blue-400 hover:underline">로그인</Link>이 필요합니다.
          </p>
        </div>
      )}
      
      {/* 댓글 목록 */}
      {loading ? (
        <div className="text-center py-4">
          <p className="text-zinc-400">댓글을 불러오는 중...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-zinc-400">아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-zinc-800 rounded-lg p-4">
              {/* 댓글 헤더 */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  {commentAuthors[comment.user_id] ? (
                    <>
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-zinc-700">
                        {commentAuthors[comment.user_id].avatar_url ? (
                          <img 
                            src={commentAuthors[comment.user_id].avatar_url} 
                            alt={commentAuthors[comment.user_id].username || '사용자'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400">
                            👤
                          </div>
                        )}
                      </div>
                      <Link href={`/profile/${commentAuthors[comment.user_id].username}`} className="text-blue-400 hover:underline">
                        {commentAuthors[comment.user_id].username || commentAuthors[comment.user_id].full_name || '사용자'}
                      </Link>
                    </>
                  ) : (
                    <span className="text-zinc-400">알 수 없는 사용자</span>
                  )}
                  <span className="text-zinc-500 text-xs ml-2">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                
                {/* 댓글 삭제 버튼 (본인 댓글만) */}
                {currentUser && currentUser.id === comment.user_id && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-zinc-500 hover:text-red-500"
                  >
                    삭제
                  </button>
                )}
              </div>
              
              {/* 댓글 내용 */}
              <p className="text-white mb-2 whitespace-pre-wrap">{comment.content}</p>
              
              {/* 대댓글 버튼 */}
              {currentUser && (
                <button
                  onClick={() => toggleReplyForm(comment.id)}
                  className="text-sm text-zinc-400 hover:text-zinc-300"
                >
                  {replyingTo === comment.id ? '취소' : '답글 달기'}
                </button>
              )}
              
              {/* 대댓글 작성 폼 */}
              {replyingTo === comment.id && (
                <div className="mt-2 pl-4 border-l-2 border-zinc-700">
                  <div className="flex flex-col space-y-2">
                    <textarea
                      value={replyText[comment.id] || ''}
                      onChange={(e) => setReplyText(prev => ({
                        ...prev,
                        [comment.id]: e.target.value
                      }))}
                      placeholder="답글을 작성하세요..."
                      className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      disabled={submitting}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleReplySubmit(comment.id)}
                        disabled={submitting || !(replyText[comment.id] && replyText[comment.id].trim())}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? '게시 중...' : '답글 작성'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 대댓글 목록 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-zinc-700 space-y-3">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="bg-zinc-800 rounded-lg p-3">
                      {/* 대댓글 헤더 */}
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                          {commentAuthors[reply.user_id] ? (
                            <>
                              <div className="w-6 h-6 rounded-full overflow-hidden mr-2 bg-zinc-700">
                                {commentAuthors[reply.user_id].avatar_url ? (
                                  <img 
                                    src={commentAuthors[reply.user_id].avatar_url} 
                                    alt={commentAuthors[reply.user_id].username || '사용자'} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                                    👤
                                  </div>
                                )}
                              </div>
                              <Link href={`/profile/${commentAuthors[reply.user_id].username}`} className="text-blue-400 hover:underline text-sm">
                                {commentAuthors[reply.user_id].username || commentAuthors[reply.user_id].full_name || '사용자'}
                              </Link>
                            </>
                          ) : (
                            <span className="text-zinc-400 text-sm">알 수 없는 사용자</span>
                          )}
                          <span className="text-zinc-500 text-xs ml-2">
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        {/* 대댓글 삭제 버튼 (본인 댓글만) */}
                        {currentUser && currentUser.id === reply.user_id && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            className="text-zinc-500 hover:text-red-500 text-sm"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                      
                      {/* 대댓글 내용 */}
                      <p className="text-white text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}