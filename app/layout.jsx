// app/layout.jsx
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import ProfileSection from './components/ProfileSection'
import ProfileLink from './components/ProfileLink'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'SNS',
  description: 'A social networking site built with Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 text-gray-100`}>
        <div className="flex">
          {/* 사이드바 */}
          <header className="w-1/5 h-screen fixed bg-zinc-900 text-gray-100 p-6 flex flex-col justify-between">
            <div>
              <div className="mb-6">
                {/* 로고 또는 서비스 이름 */}
                <Link href="/" className="text-xl font-bold">SNS</Link>
              </div>
              
              <nav className="space-y-6 text-lg font-medium">
                {/* 기존 네비게이션 링크들 */}
                <Link href="/" className="flex items-center gap-2 hover:text-zinc-300">
                  <span className="text-xl">🏠</span>
                  <span className="hidden md:inline">홈</span>
                </Link>
                <Link href="/search" className="flex items-center gap-2 hover:text-zinc-300">
                  <span className="text-xl">🔍</span>
                  <span className="hidden md:inline">검색</span>
                </Link>
                <Link href="/follow" className="flex items-center gap-2 hover:text-zinc-300">
                  <span className="text-xl">👥</span>
                  <span className="hidden md:inline">팔로우</span>
                </Link>
                {/* 프로필 링크를 클라이언트 컴포넌트로 변경 */}
                <ProfileLink />
              </nav>
            </div>
            
            {/* 하단에 프로필 섹션 추가 - 클라이언트 컴포넌트 */}
            <ProfileSection />
          </header>

          {/* 메인 컨텐츠 */}
          <div className="ml-[20%] w-[80%] min-h-screen p-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}