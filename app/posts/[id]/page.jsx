'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'
// 컴포넌트 import
import PostLikeButton from '@/app/components/PostLikeButton'
import CommentSection from '@/app/components/CommentSection'

export default function PostDetail({ params }) {
  const router = useRouter();
  const { id } = params;
  const [post, setPost] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);  // 사용자가 본인의 게시물인지 체크
  const [currentUser, setCurrentUser] = useState(null);
  // Remove these state variables as they're now handled in CommentSection
  // const [comments, setComments] = useState([]);
  // const [commentText, setCommentText] = useState('');
  // const [commentAuthors, setCommentAuthors] = useState({});
  // const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPostAndAuthor() {
      try {
        // 현재 로그인한 사용자 확인
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentUser(session.user);
        }
        
        // 게시물 정보 가져오기
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();
        
        if (postError) {
          throw postError;
        }
        
        if (!postData) {
          setError('게시물을 찾을 수 없습니다.');
          return;
        }
        
        setPost(postData);
        
        // 작성자 프로필 정보 가져오기
        const { data: authorData, error: authorError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', postData.user_id)
          .single();
        
        if (authorError && authorError.code !== 'PGRST116') {
          console.error('작성자 정보 로딩 실패:', authorError);
        } else if (authorData) {
          setAuthor(authorData);
        }

        // 게시물 작성자가 현재 로그인한 사용자와 같은지 확인
        if (session && postData.user_id === session.user.id) {
          setIsOwner(true);  // 본인의 게시물일 경우 삭제 가능
        }
        
        // Remove this as it's now handled in CommentSection
        // await fetchComments();
        
      } catch (error) {
        console.error('게시물 로딩 실패:', error);
        setError('게시물을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchPostAndAuthor();
    }
  }, [id]);

  // Remove these functions as they're now handled in CommentSection
  // const fetchComments = async () => { ... }
  // const handleCommentSubmit = async (e) => { ... }
  // const handleDeleteComment = async (commentId) => { ... }

  const handleDelete = async () => {
    try {
      if (window.confirm('정말로 이 게시물을 삭제하시겠습니까?')) {
        // 이미지가 있는 경우 스토리지에서 이미지 삭제
        if (post.image_url) {
          const imagePath = post.image_url.split('/').pop();
          const { error: storageError } = await supabase.storage
            .from('post_images') // 실제 버킷 이름으로 변경해야 합니다
            .remove([imagePath]);
          
          if (storageError) {
            console.error('이미지 삭제 실패:', storageError);
            // 이미지 삭제 실패해도 게시물 삭제는 계속 진행
          }
        }
        
        // 게시물 삭제 (댓글은 ON DELETE CASCADE로 자동 삭제됨)
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        // 게시물 삭제 후 메인 페이지로 리다이렉트
        router.push('/');
      }
    } catch (error) {
      console.error('게시물 삭제 실패:', error);
      setError('게시물 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-xl text-gray-400 mb-4">{error || '게시물을 찾을 수 없습니다.'}</p>
        <Link 
          href="/" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          메인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-zinc-400">로딩 중...</p>
        </div>
      ) : error ? (
        <div className="bg-zinc-800 p-6 rounded-lg shadow-lg text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
            홈으로 돌아가기
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-zinc-800 rounded-lg shadow-lg overflow-hidden mb-6">
            {/* 게시물 헤더 */}
            <div className="p-6 border-b border-zinc-700">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-white">{post.title}</h1>
                
                {/* 게시물 작성자만 볼 수 있는 수정/삭제 버튼 */}
                {isOwner && (
                  <div className="flex space-x-2">
                    <Link 
                      href={`/posts/${id}/edit`}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      수정
                    </Link>
                    <button 
                      onClick={handleDelete}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
              
              {/* 작성자 정보 */}
              <div className="flex items-center mb-2">
                {author ? (
                  <>
                    <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-zinc-700">
                      {author.avatar_url ? (
                        <img 
                          src={author.avatar_url} 
                          alt={author.username || '사용자'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          👤
                        </div>
                      )}
                    </div>
                    <Link href={`/profile/${author.username}`} className="text-blue-400 hover:underline">
                      {author.username || author.full_name || '사용자'}
                    </Link>
                  </>
                ) : (
                  <span className="text-zinc-400">알 수 없는 사용자</span>
                )}
                <span className="text-zinc-400 text-sm ml-2">
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </div>
              
              {/* 좋아요 버튼 */}
              <div className="mt-2">
                <PostLikeButton postId={post.id} currentUser={currentUser} />
              </div>
            </div>
            
            {/* 게시물 내용 */}
            <div className="p-6">
              <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>
              
              {/* 게시물 이미지가 있는 경우 표시 */}
              {post.image_url && (
                <div className="mt-4">
                  <img 
                    src={post.image_url} 
                    alt="게시물 이미지" 
                    className="max-w-full rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* 댓글 섹션 */}
          <div className="bg-zinc-800 rounded-lg shadow-lg p-6">
            <CommentSection postId={post.id} currentUser={currentUser} />
          </div>
        </>
      )}
    </div>
  );
}
