// app/profile/settings/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Image from 'next/image'

export default function ProfileSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    username: '',
    full_name: '',
    bio: '',
    website: '',
    avatar_url: '',
    language: 'en' // 기본값 추가
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(false);
  
  // 기본 아바타 URL (필요에 따라 수정)
  const DEFAULT_AVATAR_URL = null; // null은 아바타 없음을 의미

  // 지원하는 언어 목록
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh-CN', name: '中文(简体)' },
    { code: 'fr', name: 'Français' }
  ];

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        
        // 현재 로그인한 사용자 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session) {
          // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
          router.push('/login');
          return;
        }
        
        setUser(session.user);
        
        // 프로필 정보 가져오기
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          setProfile({
            username: data.username || '',
            full_name: data.full_name || '',
            bio: data.bio || '',
            website: data.website || '',
            avatar_url: data.avatar_url || '',
            language: data.language || 'en' // 언어 정보 추가
          });
          
          if (data.avatar_url) {
            setAvatarPreview(data.avatar_url);
          }
        }
      } catch (error) {
        console.error('프로필 정보를 불러오는데 실패했습니다:', error);
        setMessage({
          type: 'error',
          content: '프로필 정보를 불러오는데 실패했습니다.'
        });
      } finally {
        setLoading(false);
      }
    }
    
    getProfile();
  }, [router]);

  // 프로필 정보 업데이트
  const updateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (!user) return;
      
      // 사용자명 유효성 검사
      if (!profile.username.trim()) {
        setMessage({
          type: 'error',
          content: '사용자명은 필수 입력 항목입니다.'
        });
        return;
      }
      
      // 사용자명 중복 확인 (자신의 사용자명은 제외)
      const { data: existingUser, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profile.username)
        .neq('id', user.id)
        .single();
      
      if (existingUser) {
        setMessage({
          type: 'error',
          content: '이미 사용 중인 사용자명입니다.'
        });
        return;
      }
      
      // 아바타 이미지 업로드 (파일이 선택된 경우)
      let avatarUrl = profile.avatar_url;
      
      if (useDefaultAvatar) {
        // 기본 아바타 사용 선택 시
        avatarUrl = DEFAULT_AVATAR_URL;
      } else if (avatarFile) {
        setUploading(true);
        
        // 파일 이름 생성 (사용자 ID + 타임스탬프)
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        // Storage에 파일 업로드
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);
        
        if (uploadError) {
          throw uploadError;
        }
        
        // 업로드된 이미지의 공개 URL 가져오기
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
        
        setUploading(false);
      }
      
      // 프로필 정보 업데이트
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
          website: profile.website,
          avatar_url: avatarUrl,
          language: profile.language // 언어 정보 업데이트
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setMessage({
        type: 'success',
        content: '프로필이 성공적으로 업데이트되었습니다.'
      });
      
      // 아바타 미리보기 업데이트
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
      }
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      setMessage({
        type: 'error',
        content: '프로필 업데이트에 실패했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  // 아바타 이미지 선택 처리
  const handleAvatarChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    setAvatarFile(file);
    
    // 이미지 미리보기 생성
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUseDefaultAvatar(false);
    
    // 컴포넌트 언마운트 시 URL 해제
    return () => URL.revokeObjectURL(objectUrl);
  };

  // 기본 아바타 사용 선택
  const handleUseDefaultAvatar = () => {
    setUseDefaultAvatar(true);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // 입력 필드 변경 처리
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">프로필 설정</h1>
      
      {message.content && (
        <div className={`p-4 mb-4 rounded ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
          {message.content}
        </div>
      )}
      
      <form onSubmit={updateProfile} className="space-y-6 bg-zinc-800 p-6 rounded-lg">
        {/* 아바타 업로드 섹션 */}
        <div className="mb-6">
          <label className="block text-white mb-2">프로필 사진</label>
          
          <div className="flex items-center space-x-4">
            {/* 현재 아바타 또는 미리보기 표시 */}
            <div className="w-24 h-24 bg-zinc-700 rounded-full overflow-hidden flex items-center justify-center">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="프로필 미리보기" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-zinc-400">👤</span>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              {/* 파일 업로드 버튼 */}
              <label className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
                이미지 선택
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              
              {/* 기본 이미지 사용 버튼 */}
              <button
                type="button"
                onClick={handleUseDefaultAvatar}
                className="px-4 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-700"
              >
                기본 이미지 사용
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF 형식 (최대 10MB)</p>
        </div>
        
        {/* 사용자명 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
            사용자명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={profile.username}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-400">
            다른 사용자가 @username으로 당신을 찾을 수 있습니다.
          </p>
        </div>
        
        {/* 이름 */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-1">
            이름
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 자기소개 */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">
            자기소개
          </label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows="3"
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>
        
        {/* 웹사이트 */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">
            웹사이트
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={profile.website}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>
        
        {/* 언어 선택 */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-1">
            선호하는 언어
          </label>
          <select
            id="language"
            name="language"
            value={profile.language}
            onChange={handleChange}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-400">
            선택한 언어로 사이트 인터페이스가 표시됩니다.
          </p>
        </div>
        
        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || uploading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  );
}