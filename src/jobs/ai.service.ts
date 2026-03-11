import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(private configService: ConfigService) {
        const rawKey = this.configService.get<string>('GEMINI_API_KEY') || '';
        const apiKey = rawKey.trim();
        console.log('Gemini API Key loaded:', apiKey ? `Yes (Starts with ${apiKey.substring(0, 4)}...)` : 'No');

        this.genAI = new GoogleGenerativeAI(apiKey);
        // Using 'gemini-flash-latest' as it's more stable across environment updates
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
        });
    }

    async analyzeJobPosting(text: string) {
        const currentTime = new Date().toISOString();
        const prompt = `
Extract job posting information from the following text and return it in JSON format.
Rules:
- category: One of ["필라테스", "요가", "PT", "기타"]. 
- title: Concise job title.
- type: One of ["sub" (대타/급구), "short" (단기), "regular" (정규직)].
- workDate: Start date (YYYY-MM-DD). Use relative terms like "내일", "오늘", "모레" based on current local time.
- workEndDate: End date (YYYY-MM-DD). If it's a single day or range is not specified, same as workDate.
- isToday: Boolean. True if "당일", "오늘", "하루", "원데이" mentioned.
- daysSelected: Array of strings (e.g., ["월", "화"]).
- workTime: One of ["morning", "afternoon", "all"].
- workTimeNote: Specific time range or note (e.g., "14:00~16:00", "3타임").
- pay: Numeric string without commas (e.g., "40000").
- payDate: One of ["당일", "다음날", "주급", "월급", "직접입력"].
- taxDeduction: Boolean. True if "3.3%", "원천징수", "세공" mentioned.
- studio: Center name.
- agencyName: Business name.
- address: City/District level (e.g., "서울 강남구"). Do not include widespread regions like "서울전체".
- addressDetail: Specific street address, floor, etc.
- centerPhone: Phone number.
- equipment: Array of strings from ["리포머", "바렐", "체어", "캐딜락", "스프링보드", "소도구"].
- customEquipment: Array of strings for other equipment not in the standard list.
- description: Concise summary of remaining meaningful description not covered by fields above.

Current Server Time (ISO): ${currentTime}
Job Posting Text: "${text}"

Return ONLY valid JSON.
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let content = response.text();

            if (!content) {
                throw new InternalServerErrorException('AI returned empty content.');
            }

            // Clean markdown code blocks if present
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(content);
        } catch (error) {
            console.error('Gemini Analysis Error Detail:', error);
            // SDK error message is usually comprehensive
            const message = error.message || 'AI extraction failed.';
            throw new InternalServerErrorException(message);
        }
    }
}
