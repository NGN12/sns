'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false) // 클라이언트에서만 렌더링되도록 하는 상태
  const router = useRouter()

  useEffect(() => {
    // 클라이언트에서만 렌더링되도록 설정
    setIsClient(true)

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/') // 로그인 상태면 홈으로 리다이렉트
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: session, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/') // 로그인 성공 후 홈으로 리다이렉트
    setLoading(false)
  }

  // 클라이언트에서만 렌더링되는 부분
  if (!isClient) {
    return <div>Loading...</div> // 클라이언트에서만 렌더링되기 전에는 "Loading..." 표시
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="bg-zinc-800 p-6 rounded-xl shadow max-w-md mx-auto space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-white">로그인</h2>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 rounded-lg bg-zinc-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-zinc-500"
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 rounded-lg bg-zinc-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-zinc-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white transition"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <p className="text-center text-sm text-gray-400">
          아직 계정이 없나요?{' '}
          <a href="/emailsignup" className="text-zinc-400 hover:text-zinc-300 hover:underline">
            회원가입
          </a>
        </p>
      </form>
    </main>
  )
}
