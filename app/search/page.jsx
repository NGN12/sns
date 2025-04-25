'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all') // 'all', 'posts', 'users'
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const searchTimeoutRef = useRef(null);

  // 페이지 로드 시 URL 파라미터에서 검색어 가져오기
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const type = params.get('type') || 'all';
    
    if (query) {
      setSearchQuery(query);
      setSearchType(type);
      handleSearch(null, query, type);
    }
  }, []);

  // 검색어나 검색 타입이 변경될 때마다 디바운스 검색 실행
  useEffect(() => {
    // 이전 타이머가 있다면 취소
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 검색어가 비어있으면 검색하지 않음
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // 0.5초 후에 검색 실행
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(null, searchQuery, searchType);
    }, 500);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchType]);

  const handleSearch = async (e, initialQuery = null, initialType = null) => {
    if (e) e.preventDefault();
    
    const query = initialQuery || searchQuery;
    const type = initialType || searchType;
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    // URL 업데이트 (검색 히스토리 저장)
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('type', type);
    window.history.pushState({}, '', `?${params.toString()}`);
    
    setLoading(true);
    setError(null);
    
    try {
      let postsResults = [];
      let usersResults = [];
      
      // 게시글 검색 (제목과 내용에서 검색)
      if (type === 'all' || type === 'posts') {
        // 먼저 게시글만 검색
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .order('created_at', { ascending: false });
        
        if (postsError) {
          console.error('게시글 검색 오류:', postsError);
          throw postsError;
        }
        
        if (posts && posts.length > 0) {
          console.log('게시글 검색 결과:', posts);
          
          // 각 게시글 작성자의 프로필 정보 가져오기
          const postsWithProfiles = await Promise.all(
            posts.map(async (post) => {
              // 게시글 작성자 정보 가져오기
              const { data: authorData, error: authorError } = await supabase
                .from('profiles')
                .select('username, full_name, avatar_url')
                .eq('id', post.user_id)
                .single();
                
              if (authorError && authorError.code !== 'PGRST116') {
                console.error('작성자 정보 로딩 실패:', authorError);
              }
              
              return {
                ...post,
                profiles: authorData || null,
                type: 'post'
              };
            })
          );
          
          postsResults = postsWithProfiles;
        }
      }
      
      // 사용자 검색 (사용자명과 이름에서 검색)
      if (type === 'all' || type === 'users') {
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
        
        if (usersError) {
          console.error('사용자 검색 오류:', usersError);
          throw usersError;
        }
        
        if (users && users.length > 0) {
          console.log('사용자 검색 결과:', users);
          usersResults = users.map(user => ({
            ...user,
            type: 'user'
          }));
        }
      }
      
      // 결과 합치기
      const combinedResults = [...postsResults, ...usersResults];
      console.log('검색 결과 총 개수:', combinedResults.length);
      setSearchResults(combinedResults);
      
    } catch (error) {
      console.error('검색 오류:', error);
      setError('검색 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">검색</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            />
            {loading && (
              <p className="text-sm text-gray-400 mt-1">검색 중...</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            >
              <option value="all">전체</option>
              <option value="posts">게시글</option>
              <option value="users">사용자</option>
            </select>
            
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              검색
            </button>
          </div>
        </div>
      </form>
      
      {error && (
        <div className="p-4 mb-6 rounded bg-red-500/20 text-red-200">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {searchQuery && (
            <h2 className="text-xl font-semibold mb-4">
              "{searchQuery}" 검색 결과 ({searchResults.length})
            </h2>
          )}
          
          {searchResults.length === 0 && searchQuery ? (
            <div className="text-center py-12 bg-zinc-800 rounded-lg">
              <p className="text-gray-400">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.map((result) => (
                <div key={`${result.type}-${result.id}`} className="bg-zinc-800 p-4 rounded-lg shadow">
                  {result.type === 'post' ? (
                    // 게시글 결과
                    <Link href={`/posts/${result.id}`} className="block hover:bg-zinc-700 transition-colors rounded-lg p-2">
                      <div className="mb-2">
                        <h3 className="text-xl text-white">{result.title}</h3>
                        <p className="text-gray-400 line-clamp-2">{result.content}</p>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>작성자: {result.profiles?.username || '알 수 없음'}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(result.created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  ) : (
                    // 사용자 결과
                    <Link href={`/profile/${result.username}`} className="flex items-center space-x-4 hover:bg-zinc-700 transition-colors p-2 rounded-lg">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-700">
                        {result.avatar_url ? (
                          <img 
                            src={result.avatar_url} 
                            alt={result.username || '사용자'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-400">
                            👤
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          @{result.username || '사용자명 없음'}
                        </p>
                        {result.full_name && (
                          <p className="text-gray-400">{result.full_name}</p>
                        )}
                      </div>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}