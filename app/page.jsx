'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Link from 'next/link'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const observerRef = useRef(null)
  const POSTS_PER_PAGE = 20 // 트위터 스타일로 한 번에 20개 로드
  const loadedPostIds = useRef(new Set()) // 이미 로드된 게시물 ID를 추적하기 위한 Set

  // 게시물 데이터 가져오기 - useCallback으로 래핑하여 의존성 명확히 하기
  const fetchPosts = useCallback(async () => {
    if (loading || !hasMore) return
    
    setLoading(true)
    try {
      const from = page * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1
      
      console.log(`Fetching posts from ${from} to ${to}`)
      
      // 게시물 데이터 가져오기
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) {
        console.error('게시물 가져오기 오류:', error)
        return
      }
      
      // 더 불러올 게시물이 없는 경우
      if (!data || data.length < POSTS_PER_PAGE) {
        setHasMore(false)
      }
      
      // 각 게시물의 댓글 수 가져오기
      if (data && data.length > 0) {
        // 중복 게시물 필터링
        const uniquePosts = data.filter(post => !loadedPostIds.current.has(post.id))
        
        // 새로운 게시물 ID를 Set에 추가
        uniquePosts.forEach(post => loadedPostIds.current.add(post.id))
        
        if (uniquePosts.length === 0) {
          // 새로운 게시물이 없으면 다음 페이지로 넘어감
          setPage(prevPage => prevPage + 1)
          setLoading(false)
          return
        }
        
        const postsWithCommentCounts = await Promise.all(
          uniquePosts.map(async (post) => {
            const { count, error: countError } = await supabase
              .from('comments')
              .select('id', { count: 'exact' })
              .eq('post_id', post.id)
            
            if (countError) {
              console.error('댓글 수 가져오기 오류:', countError)
              return { ...post, comment_count: 0 }
            }
            
            return { ...post, comment_count: count || 0 }
          })
        )
        
        setPosts(prevPosts => [...prevPosts, ...postsWithCommentCounts])
      }
    } catch (err) {
      console.error('게시물 로딩 중 오류 발생:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page])

  // 현재 로그인한 사용자 확인
  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setUser(session.user)
    }
  }

  // 페이지가 변경될 때만 fetchPosts 호출
  useEffect(() => {
    fetchPosts()
  }, [page, fetchPosts])

  // 초기 로딩 시 사용자 확인만 수행
  useEffect(() => {
    checkUser()
  }, [])

  // 무한 스크롤 설정 - 스크롤이 80%에 도달하면 미리 다음 데이터 로드
  useEffect(() => {
    const options = {
      root: null, // viewport를 루트로 사용
      rootMargin: '0px 0px 500px 0px', // 하단에서 500px 전에 트리거
      threshold: 0 // 타겟 요소가 0%만 보여도 콜백 실행
    }

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries
      if (entry.isIntersecting && !loading && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    }, options)

    const currentObserver = observerRef.current
    if (currentObserver) {
      observer.observe(currentObserver)
    }

    return () => {
      if (currentObserver) {
        observer.unobserve(currentObserver)
      }
    }
  }, [loading, hasMore])

  // 스크롤 진행률 표시 (선택 사항)
  const [scrollProgress, setScrollProgress] = useState(0)
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const scrollPercent = scrollTop / (docHeight - winHeight) * 100
      setScrollProgress(scrollPercent)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex flex-col items-center px-4">
      {/* 최대 너비를 늘린 컨테이너 */}
      <div className="w-full max-w-2xl mx-auto pb-20">
        <div className="w-full flex justify-between items-center sticky top-0 pt-4 pb-4 bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-white">최신 게시글</h2>
         
          {user && (
            <Link
              href="/create-post"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <span className="mr-1">+</span> 새 게시물
            </Link>
          )}
        </div>

        {posts.length === 0 && !loading ? (
          <div className="text-center py-12 w-full bg-zinc-800 rounded-lg">
            <p className="text-white mb-4">아직 게시글이 없습니다.</p>
            {user ? (
              <Link
                href="/create-post"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                첫 게시물 작성하기
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                로그인하여 글쓰기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4 w-full">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block"
              >
                <div className="bg-zinc-800 p-4 rounded-lg shadow hover:bg-zinc-700 transition-colors">
                  <h3 className="text-xl text-white mb-2">{post.title}</h3>
                  
                  <div className="text-gray-400 max-h-32 overflow-hidden mb-3">
                    <p>{post.content}</p>
                  </div>
                  
                  {post.image_url && (
                    <div className="rounded-lg overflow-hidden max-h-96 flex justify-center mb-3">
                      <img
                        src={post.image_url}
                        alt="게시물 이미지"
                        className="max-w-full object-contain"
                        loading="lazy" // 이미지 지연 로딩
                        style={{ maxWidth: '550px' }}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end items-center mt-2">
                    <div className="flex space-x-4 text-gray-400">
                      <span className="flex items-center space-x-1">
                        <span>💬</span>
                        <span>{post.comment_count || 0}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>❤️</span>
                        <span>{post.like_count || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* 옵저버 타겟 - 스크롤 감지용 요소 */}
            <div 
              ref={observerRef} 
              className="h-10 flex items-center justify-center"
            >
              {loading && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              )}
              {!hasMore && posts.length > 0 && (
                <p className="text-gray-400 text-sm py-4">모든 게시물을 불러왔습니다</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 스크롤 진행률 표시 바 (선택사항) */}
      <div className="fixed top-0 left-0 w-full h-1 bg-zinc-800 z-50">
        <div 
          className="h-full bg-blue-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        ></div>
      </div>
    </main>
  )
}