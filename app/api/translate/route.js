import { NextResponse } from 'next/server';
import { translateText } from '@/app/lib/translate';

export async function POST(request) {
  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { text, targetLanguage, sourceLanguage } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: '번역할 텍스트가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    // 번역 대상 언어가 없으면 원본 반환
    if (!targetLanguage) {
      return NextResponse.json({ translatedText: text });
    }
    
    // lib/translate.js의 translateText 함수 사용
    const translatedText = await translateText(text, targetLanguage, sourceLanguage || '');
    
    return NextResponse.json({ translatedText });
    
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: '번역 중 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    );
  }
}