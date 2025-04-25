'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function EmailSignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // 추가된 비밀번호 확인 상태
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccessMessage('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-gray-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSignUp}
        className="bg-zinc-800 p-6 rounded-xl shadow max-w-md mx-auto space-y-4"
      >
        <h2 className="text-xl font-bold text-center text-white">회원가입</h2>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        {successMessage && <p className="text-green-400 text-sm text-center">{successMessage}</p>}

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

        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full p-2 rounded-lg bg-zinc-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-zinc-500"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white transition"
        >
          {loading ? '회원가입 중...' : '회원가입'}
        </button>

        <p className="text-center text-sm text-gray-400">
          이미 계정이 있나요?{' '}
          <a href="/login" className="text-zinc-400 hover:text-zinc-300 hover:underline">
            로그인
          </a>
        </p>
      </form>
    </main>
  )
}
