'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import Link from 'next/link'

export default function EditPost() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPostAndCheckPermission() {
      try {
        setLoading(true);
        
        // 현재 로그인한 사용자 확인
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // 로그인되지 않은 경우 로그인 페이지로 리다이렉트
          router.push('/login');
          return;
        }
        
        setCurrentUser(session.user);
        
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
        
        // 게시물 작성자가 현재 로그인한 사용자와 같은지 확인
        if (postData.user_id !== session.user.id) {
          setError('이 게시물을 수정할 권한이 없습니다.');
          return;
        }
        
        // 게시물 정보 설정
        setPost(postData);
        setTitle(postData.title);
        setContent(postData.content);
        
        if (postData.image_url) {
          setCurrentImageUrl(postData.image_url);
          setImagePreview(postData.image_url);
        }
        
      } catch (error) {
        console.error('게시물 로딩 실패:', error);
        setError('게시물을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchPostAndCheckPermission();
    }
  }, [id, router]);

  // 이미지 파일 선택 처리
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 파일 크기 확인 (50MB = 50 * 1024 * 1024 bytes)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError('이미지 크기가 50MB를 초과합니다. 더 작은 이미지를 선택해주세요.');
      e.target.value = ''; // 파일 선택 초기화
      return;
    }
    
    setImageFile(file);
    setRemoveImage(false);
    
    // 이미지 미리보기 생성
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => setImagePreview(reader.result);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const uploadImage = async () => {
    if (!imageFile && !removeImage) return currentImageUrl;
    
    // 이미지를 제거하는 경우
    if (removeImage) {
      // 기존 이미지가 있다면 스토리지에서 삭제
      if (currentImageUrl) {
        const imagePath = currentImageUrl.split('/').pop();
        try {
          const { error: removeError } = await supabase.storage
            .from('post-images')
            .remove([imagePath]);
          
          if (removeError) {
            console.error('이미지 삭제 실패:', removeError);
          }
        } catch (error) {
          console.error('이미지 삭제 중 오류:', error);
        }
      }
      return null;
    }
    
    // 새 이미지를 업로드하는 경우
    try {
      setUploading(true);
      
      // 기존 이미지가 있다면 스토리지에서 삭제
      if (currentImageUrl) {
        const imagePath = currentImageUrl.split('/').pop();
        const { error: removeError } = await supabase.storage
          .from('post-images')
          .remove([imagePath]);
        
        if (removeError) {
          console.error('기존 이미지 삭제 실패:', removeError);
        }
      }
      
      // 새 이미지 업로드
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${currentUser.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, imageFile);
      
      if (uploadError) throw uploadError;
      
      // 업로드된 이미지의 공개 URL 가져오기
      const { data: publicURL } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);
      
      return publicURL.publicUrl;
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
      
      // 이미지 업로드 (필요한 경우)
      let imageUrl = currentImageUrl;
      if (imageFile || removeImage) {
        imageUrl = await uploadImage();
      }
      
      // 게시물 업데이트
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content: content.trim(),
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // 수정 완료 후 게시물 상세 페이지로 리다이렉트
      router.push(`/posts/${id}`);
      
    } catch (error) {
      console.error('게시물 수정 실패:', error);
      setError('게시물 수정에 실패했습니다.');
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
            href={id ? `/posts/${id}` : '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {id ? '게시물로 돌아가기' : '홈으로 돌아가기'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">게시물 수정</h1>
      
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
            href={`/posts/${id}`}
            className="px-4 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-700"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting || uploading ? '처리 중...' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}