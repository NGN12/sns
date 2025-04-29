import { TranslationServiceClient } from '@google-cloud/translate';

// Google Cloud Translation API 클라이언트 생성
const translationClient = new TranslationServiceClient({
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
});

/**
 * 텍스트를 지정된 언어로 번역합니다.
 * @param {string} text - 번역할 텍스트
 * @param {string} targetLanguage - 번역 대상 언어 코드 (예: 'ko', 'en', 'ja')
 * @param {string} sourceLanguage - 원본 텍스트 언어 코드 (자동 감지하려면 생략)
 * @returns {Promise<string>} 번역된 텍스트
 */
export async function translateText(text, targetLanguage, sourceLanguage = '') {
  try {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다.');
    }
    
    // Google Translate API v2 사용 (API 키 방식)
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    
    const requestBody = {
      q: text,
      target: targetLanguage,
      format: 'text'
    };
    
    // 원본 언어가 지정된 경우 추가
    if (sourceLanguage) {
      requestBody.source = sourceLanguage;
    }
    
    // API 호출
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Google API 오류:', data);
      throw new Error(data.error?.message || '번역 API 오류');
    }
    
    // 번역 결과 반환
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('번역 오류:', error);
    throw new Error('번역 중 오류가 발생했습니다: ' + error.message);
  }
}