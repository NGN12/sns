'use client'

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function TranslateButton({ postContent, onTranslate }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  
  const handleTranslate = async () => {
    try {
      setIsTranslating(true);
      
      // 이미 번역된 상태라면 원래 내용으로 복원
      if (isTranslated) {
        onTranslate(null); // 원본 내용으로 복원
        setIsTranslated(false);
        return;
      }
      
      // 현재 사용자 세션 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('번역 기능을 사용하려면 로그인이 필요합니다.');
        setIsTranslating(false);
        return;
      }
      
      // 사용자 프로필에서 선호 언어 가져오기
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.error('프로필 정보 로딩 실패:', profileError);
        alert('사용자 언어 설정을 불러올 수 없습니다.');
        setIsTranslating(false);
        return;
      }
      
      const targetLanguage = profileData.language || 'en';
      
      // 번역 API 호출
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: postContent,
          targetLanguage,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '번역 요청 실패');
      }
      
      const data = await response.json();
      
      // 번역된 텍스트를 부모 컴포넌트로 전달
      onTranslate(data.translatedText);
      setIsTranslated(true);
      
    } catch (error) {
      console.error('번역 오류:', error);
      alert('번역 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsTranslating(false);
    }
  };
  
  return (
    <button
      onClick={handleTranslate}
      disabled={isTranslating}
      className={`px-3 py-1 rounded-md text-sm ${
        isTranslated 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-blue-600 hover:bg-blue-700'
      } text-white transition-colors disabled:opacity-50`}
    >
      {isTranslating ? '번역 중...' : isTranslated ? '원문 보기' : '번역하기'}
    </button>
  );
}