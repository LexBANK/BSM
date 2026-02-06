/**
 * LexChat Image Processing Worker
 * يعالج الصور باستخدام Cloudflare AI وR2 Storage
 * 
 * @author BSM Platform
 * @version 1.0.0
 */

export interface Env {
  BUCKET: R2Bucket;
  AI: Ai;
  // Environment variables - never exposed to frontend
  OPENAI_API_KEY?: string;
  ADMIN_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

interface ImageProcessingRequest {
  imageUrl?: string;
  imageData?: string; // base64
  operation: 'analyze' | 'caption' | 'ocr' | 'resize';
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
}

interface ImageProcessingResponse {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
  metadata?: {
    size?: number;
    format?: string;
    dimensions?: { width: number; height: number };
  };
}

/**
 * CORS Headers - آمن ومحدود
 */
function getCorsHeaders(origin: string, allowedOrigins: string): HeadersInit {
  const origins = allowedOrigins.split(',').map(o => o.trim());
  const isAllowed = origins.includes(origin) || origins.includes('*');
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : origins[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * معالج OPTIONS للـ preflight requests
 */
function handleOptions(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigins = env.ALLOWED_ORIGINS || 'https://lexdo.uk,https://www.lexdo.uk';
  
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, allowedOrigins),
  });
}

/**
 * التحقق من صحة الطلب
 */
function validateRequest(request: Request, env: Env): { valid: boolean; error?: string } {
  const contentType = request.headers.get('Content-Type');
  
  if (!contentType?.includes('application/json')) {
    return { valid: false, error: 'Content-Type must be application/json' };
  }
  
  // Optional: Token validation for admin operations
  const authHeader = request.headers.get('Authorization');
  if (env.ADMIN_TOKEN && authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token !== env.ADMIN_TOKEN) {
      return { valid: false, error: 'Invalid authorization token' };
    }
  }
  
  return { valid: true };
}

/**
 * تحليل الصورة باستخدام Cloudflare AI
 */
async function analyzeImage(
  imageData: ArrayBuffer | string,
  env: Env
): Promise<any> {
  try {
    // استخدام نموذج Vision من Cloudflare AI
    const response = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: imageData,
      prompt: 'Analyze this image and provide a detailed description',
      max_tokens: 512,
    });
    
    return response;
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error('Failed to analyze image with AI');
  }
}

/**
 * استخراج النص من الصورة (OCR)
 */
async function performOCR(
  imageData: ArrayBuffer | string,
  env: Env
): Promise<any> {
  try {
    // استخدام نموذج OCR
    const response = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: imageData,
      prompt: 'Extract all text from this image',
      max_tokens: 1024,
    });
    
    return response;
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error('Failed to perform OCR');
  }
}

/**
 * توليد caption للصورة
 */
async function generateCaption(
  imageData: ArrayBuffer | string,
  env: Env
): Promise<string> {
  try {
    const response = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
      image: imageData,
      prompt: 'Generate a concise caption for this image',
      max_tokens: 128,
    });
    
    return response.description || 'Image';
  } catch (error) {
    console.error('Caption generation error:', error);
    throw new Error('Failed to generate caption');
  }
}

/**
 * حفظ الصورة في R2 Storage
 */
async function storeImage(
  imageData: ArrayBuffer,
  filename: string,
  env: Env,
  metadata?: Record<string, string>
): Promise<string> {
  try {
    const key = `images/${Date.now()}-${filename}`;
    
    await env.BUCKET.put(key, imageData, {
      httpMetadata: {
        contentType: metadata?.contentType || 'image/jpeg',
      },
      customMetadata: metadata,
    });
    
    return key;
  } catch (error) {
    console.error('Storage error:', error);
    throw new Error('Failed to store image');
  }
}

/**
 * جلب الصورة من R2 Storage
 */
async function retrieveImage(key: string, env: Env): Promise<ArrayBuffer | null> {
  try {
    const object = await env.BUCKET.get(key);
    if (!object) return null;
    
    return await object.arrayBuffer();
  } catch (error) {
    console.error('Retrieval error:', error);
    return null;
  }
}

/**
 * معالج الطلبات الرئيسي
 */
async function handleImageProcessing(
  request: Request,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigins = env.ALLOWED_ORIGINS || 'https://lexdo.uk,https://www.lexdo.uk';
  
  try {
    // التحقق من صحة الطلب
    const validation = validateRequest(request, env);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validation.error,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin, allowedOrigins),
          },
        }
      );
    }
    
    // قراءة البيانات
    const body: ImageProcessingRequest = await request.json();
    const { operation, imageUrl, imageData, options } = body;
    
    if (!operation) {
      throw new Error('Operation is required');
    }
    
    // جلب البيانات
    let imageBuffer: ArrayBuffer;
    
    if (imageUrl) {
      // جلب من URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }
      imageBuffer = await response.arrayBuffer();
    } else if (imageData) {
      // تحويل base64 إلى ArrayBuffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;
    } else {
      throw new Error('Either imageUrl or imageData is required');
    }
    
    // معالجة حسب العملية المطلوبة
    let result: any;
    
    switch (operation) {
      case 'analyze':
        result = await analyzeImage(imageBuffer, env);
        break;
        
      case 'caption':
        result = await generateCaption(imageBuffer, env);
        break;
        
      case 'ocr':
        result = await performOCR(imageBuffer, env);
        break;
        
      case 'resize':
        // معالجة تغيير الحجم (يمكن إضافة المنطق لاحقاً)
        result = { message: 'Resize operation not yet implemented' };
        break;
        
      default:
        throw new Error('Invalid operation');
    }
    
    const processingTime = Date.now() - startTime;
    
    const response: ImageProcessingResponse = {
      success: true,
      data: result,
      processingTime,
      metadata: {
        size: imageBuffer.byteLength,
      },
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin, allowedOrigins),
      },
    });
    
  } catch (error: any) {
    console.error('Processing error:', error);
    
    const response: ImageProcessingResponse = {
      success: false,
      error: error.message || 'Internal server error',
      processingTime: Date.now() - startTime,
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCorsHeaders(origin, allowedOrigins),
      },
    });
  }
}

/**
 * معالج الطلبات الأساسي للـ Worker
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // معالج OPTIONS للـ CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }
    
    // معالج الصحة
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({
          status: 'healthy',
          service: 'lexchat-image-processing',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // معالج معالجة الصور
    if (url.pathname === '/process' && request.method === 'POST') {
      return handleImageProcessing(request, env);
    }
    
    // معالج تخزين الصور
    if (url.pathname.startsWith('/store') && request.method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          return new Response(
            JSON.stringify({ success: false, error: 'No file provided' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        const buffer = await file.arrayBuffer();
        const key = await storeImage(buffer, file.name, env, {
          contentType: file.type,
          originalName: file.name,
        });
        
        return new Response(
          JSON.stringify({
            success: true,
            key,
            url: `${url.origin}/retrieve/${key}`,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // معالج استرجاع الصور
    if (url.pathname.startsWith('/retrieve/') && request.method === 'GET') {
      const key = url.pathname.replace('/retrieve/', '');
      const imageBuffer = await retrieveImage(key, env);
      
      if (!imageBuffer) {
        return new Response('Image not found', { status: 404 });
      }
      
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
    
    // 404 للمسارات غير المعرفة
    return new Response('Not Found', { status: 404 });
  },
};
