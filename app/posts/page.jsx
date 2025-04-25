'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Posts() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    // 글 목록을 가져오기
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false }) // 최신 글부터 표시

      if (error) {
        console.error(error)
        return
      }
      setPosts(data)
    }

    fetchPosts()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex flex-col items-center justify-center px-4 space-y-4">
      <h2 className="text-xl font-bold text-center text-white">글 목록</h2>
      
      {posts.length === 0 ? (
        <p className="text-white">게시글이 없습니다.</p>
      ) : (
        <div className="space-y-4 w-full">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-800 p-4 rounded-lg shadow space-y-2"
            >
              <h3 className="text-xl text-white">{post.title}</h3>
              <p className="text-gray-400">{post.content.substring(0, 100)}...</p>
              <Link href={`/posts/${post.id}`} className="text-zinc-400 hover:text-zinc-300 hover:underline">
                더 보기
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
