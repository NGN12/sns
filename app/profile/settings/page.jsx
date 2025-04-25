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
    avatar_url: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(false);
  
  // 기본 아바타 URL (필요에 따라 수정)
  const DEFAULT_AVATAR_URL = null; // null은 아바타 없음을 의미

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
            avatar_url: data.avatar_url || ''
          });
          
          if (data.avatar_url) {
            setAvatarPreview(data.avatar_url);
          }
        }
      } catch (error) {
        console.error('프로필 정보를 불러오는데 실패했습니다:', error);
        setMessage({ type: 'error', content: '프로필 정보를 불러오는데 실패했습니다.' });
      } finally {
        setLoading(false);
      }
    }
    
    getProfile();
  }, [router]);

  // URL에서 스토리지 파일 경로 추출 함수
  const extractFilePath = (url) => {
    if (!url) return null;
    try {
      // URL에서 파일 경로 부분만 추출
      // 예: https://xxxx.supabase.co/storage/v1/object/public/avatars/abc-123.jpg -> abc-123.jpg
      const matches = url.match(/\/avatars\/(.+)$/);
      return matches ? matches[1] : null;
    } catch (error) {
      console.error('파일 경로 추출 실패:', error);
      return null;
    }
  };

  // 기존 아바타 이미지 삭제 함수
  const deleteOldAvatar = async (oldAvatarUrl) => {
    try {
      const filePath = extractFilePath(oldAvatarUrl);
      if (!filePath) return;
      
      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);
      
      if (error) {
        console.error('이전 아바타 삭제 실패:', error);
      } else {
        console.log('이전 아바타 삭제 성공:', filePath);
      }
    } catch (error) {
      console.error('이전 아바타 삭제 중 오류:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleAvatarChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // 파일 크기 검사 (500KB = 512000 bytes)
    if (file.size > 512000) {
      setMessage({ type: 'error', content: '이미지 크기는 500KB 이하여야 합니다.' });
      return;
    }
    
    setAvatarFile(file);
    setUseDefaultAvatar(false); // 새 이미지를 선택하면 기본 이미지 사용 옵션 끄기
    
    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 기본 이미지 사용 버튼 처리 함수
  const handleUseDefaultAvatar = () => {
    setUseDefaultAvatar(true);
    setAvatarFile(null);
    setAvatarPreview(null); // 미리보기 이미지도 제거
  };

  const uploadAvatar = async () => {
    if (!avatarFile) return null;
    
    try {
      setUploading(true);
      
      // 파일 크기 다시 확인 (500KB = 512000 bytes)
      if (avatarFile.size > 512000) {
        setMessage({ type: 'error', content: '이미지 크기는 500KB 이하여야 합니다.' });
        return null;
      }
      
      // 파일명 생성 (고유한 이름을 위해 타임스탬프 추가)
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Storage에 이미지 업로드
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile);
      
      if (uploadError) throw uploadError;
      
      // 업로드된 이미지의 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('아바타 업로드 실패:', error);
      setMessage({ type: 'error', content: '이미지 업로드에 실패했습니다.' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // 사용자명 중복 확인
      if (profile.username) {
        const { data: existingUsers, error: usernameError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', profile.username)
          .neq('id', user.id); // 현재 사용자 제외
        
        if (usernameError) throw usernameError;
        
        if (existingUsers && existingUsers.length > 0) {
          setMessage({ type: 'error', content: '이미 사용 중인 사용자명입니다. 다른 사용자명을 선택해주세요.' });
          setLoading(false);
          return;
        }
      }
      
      // 기존 아바타 URL
      let currentAvatarUrl = profile.avatar_url;
      let avatar_url = currentAvatarUrl;
      
      // 기본 이미지 사용 옵션이 선택된 경우
      if (useDefaultAvatar) {
        // 기존 이미지가 있으면 삭제
        if (currentAvatarUrl) {
          await deleteOldAvatar(currentAvatarUrl);
        }
        avatar_url = DEFAULT_AVATAR_URL; // 기본 이미지로 설정 (null 또는 기본 이미지 URL)
      }
      // 새 이미지 업로드가 있는 경우
      else if (avatarFile) {
        // 파일 크기 확인 (500KB = 512000 bytes)
        if (avatarFile.size > 512000) {
          setMessage({ type: 'error', content: '이미지 크기는 500KB 이하여야 합니다.' });
          setLoading(false);
          return;
        }
        
        const newAvatarUrl = await uploadAvatar();
        if (newAvatarUrl) {
          // 성공적으로 새 이미지가 업로드되면 이전 이미지 삭제
          if (currentAvatarUrl) {
            await deleteOldAvatar(currentAvatarUrl);
          }
          avatar_url = newAvatarUrl;
        } else {
          // 업로드 실패 시 함수 종료
          setLoading(false);
          return;
        }
      }
      
      // 프로필 정보 업데이트
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: profile.username,
          full_name: profile.full_name,
          bio: profile.bio,
          website: profile.website,
          avatar_url,
          updated_at: new Date()
        });
      
      if (error) throw error;
      
      setMessage({ type: 'success', content: '프로필이 성공적으로 업데이트되었습니다.' });
      
      // 상태 업데이트하여 UI에 변경사항 반영
      setProfile(prev => ({ ...prev, avatar_url }));
      setUseDefaultAvatar(false);
      
    } catch (error) {
      console.error('프로필 업데이트 실패:', error);
      setMessage({ type: 'error', content: '프로필 업데이트에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">프로필 설정</h1>
      
      {message.content && (
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
          {message.content}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 프로필 이미지 */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-300">프로필 이미지</label>
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-700 rounded-full overflow-hidden">
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="프로필 이미지 미리보기" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {useDefaultAvatar ? "기본 이미지" : "이미지 없음"}
                </div>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <label 
                htmlFor="avatar-upload" 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer text-center"
              >
                이미지 선택
              </label>
              <button 
                type="button" 
                onClick={handleUseDefaultAvatar}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                기본 이미지 사용
              </button>
            </div>
          </div>
        </div>
        
        {/* 사용자명 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300">
            사용자명
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-zinc-700 bg-zinc-800 text-gray-400">
              @
            </span>
            <input
              type="text"
              id="username"
              name="username"
              value={profile.username}
              onChange={handleChange}
              className="block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-r-md text-white"
              placeholder="사용자명"
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            다른 사용자들이 볼 수 있는 고유한 사용자명입니다.
          </p>
        </div>
        
        {/* 이름 -> 닉네임으로 변경 */}
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-300">
            닉네임
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={profile.full_name}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            placeholder="닉네임을 입력하세요"
          />
        </div>
        
        {/* 자기소개 */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-300">
            자기소개
          </label>
          <textarea
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            placeholder="자기소개를 작성해주세요"
          />
        </div>
        
        {/* 웹사이트 */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-300">
            웹사이트
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={profile.website}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
            placeholder="https://example.com"
          />
        </div>
        
        {/* 제출 버튼 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md ${(loading || uploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            {loading || uploading ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </form>
    </div>
  );
}