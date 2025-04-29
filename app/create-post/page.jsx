'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'

export default function CreatePost() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkUser() {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('세션 확인 실패:', error);
        setError('세션 확인에 실패했습니다.');
        setLoading(false);
        return;
      }
      if (!session) {
        router.push('/login');
        return;
      }
      
      // 사용자 프로필 정보 확인
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();
      
      // 프로필 에러가 있거나 username이 없는 경우
      if ((profileError && profileError.code !== 'PGRST116') || 
          !profileData || !profileData.username) {
        console.log('프로필 설정이 필요합니다.');
        router.push('/profile/settings');
        return;
      }
      
      setUser(session.user);
      setLoading(false);
    }
    checkUser();
  }, [router]);

  // 나머지 코드는 그대로 유지
  // 이미지 파일 선택 처리
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 파일 크기 확인 (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('이미지 크기가 10MB를 초과합니다. 더 작은 이미지를 선택해주세요.');
      e.target.value = ''; // 파일 선택 초기화
      return;
    }
    
    setImageFile(file);
    
    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setImagePreview(reader.result);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      setUploading(true);
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 이미지 업로드 (있는 경우)
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage();
      }
      
      // 게시물 생성
      const { data, error: insertError } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            user_id: user.id,
            image_url: imageUrl
          }
        ])
        .select();
      
      if (insertError) throw insertError;
      
      // 생성된 게시물 페이지로 이동
      if (data && data.length > 0) {
        router.push(`/posts/${data[0].id}`);
      } else {
        router.push('/');
      }
      
    } catch (error) {
      console.error('게시물 작성 실패:', error);
      setError('게시물 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-zinc-800 p-6 rounded-lg shadow-lg text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link 
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">새 게시물 작성</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            제목
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="제목을 입력하세요"
            required
          />
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-1">
            내용
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="내용을 입력하세요"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            이미지 (선택사항)
          </label>
          
          {imagePreview && (
            <div className="mb-3">
              <div className="relative w-full h-48 bg-zinc-700 rounded-md overflow-hidden">
                <img
                  src={imagePreview}
                  alt="미리보기"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {!imagePreview && (
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-600 rounded-lg cursor-pointer bg-zinc-700 hover:bg-zinc-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <p className="mb-2 text-sm text-gray-400">
                    <span className="font-semibold">클릭하여 이미지 업로드</span>
                  </p>
                  <p className="text-xs text-gray-400">PNG, JPG, GIF (최대 10MB)</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <Link
            href="/"
            className="px-4 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-700"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || uploading ? '처리 중...' : '게시물 작성'}
          </button>
        </div>
      </form>
    </div>
  );
}