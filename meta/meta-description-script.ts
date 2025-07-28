import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

import { client } from '../db/db';
import { createOrAppendFile, csvBufferToJson, extractRouteName } from '../lib';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Constants
const CSV_FILE_PATH = path.join(__dirname, '../files/meta.csv');
const fileBuffer = fs.readFileSync(CSV_FILE_PATH);
const medicinesData = csvBufferToJson(fileBuffer);

// Zod schema for AI response
const metaSchema = z.object({
    meta_description: z.string(),
});

// OpenAI initialization
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Entry point
(async function processMetaDescriptions() {
    for (const [index, record] of medicinesData.entries()) {
        const routeName = extractRouteName(record.URL);

        if (!routeName) {
            console.warn(`[${index}] ❌ No route name for URL: ${record.URL}`);
            continue;
        }

        try {
            const { rows } = await client.query(
                `SELECT name FROM medicines_details WHERE language IN ('hindi', 'english') AND route_name = $1`,
                [routeName]
            );

            if (rows.length === 0) {
                console.warn(`[${index}] ⚠️ No medicine found for route: ${routeName}`);
                continue;
            }

            // Split into English and Hindi based on Unicode characters
            const englishNames = rows.filter(row => /^[\x00-\x7F]*$/.test(row.name)).map(row => row.name);
            const hindiNames = rows.filter(row => !/^[\x00-\x7F]*$/.test(row.name)).map(row => row.name);

            const metaTitle = `${hindiNames[0]} (${englishNames[0]} uses in Hindi) – उपयोग व फायदे जानिए`;
            const metaDescription = await generateMetaDescription(hindiNames[0]);

            if (!metaDescription) {
                console.warn(`[${index}] ⚠️ No meta description generated for ${hindiNames[0]}`);
                continue;
            }

            // Update the database with meta description
            await client.query(
                `UPDATE medicines_details SET meta_description = $1, meta_title = $2 WHERE route_name = $3`,
                [metaDescription, metaTitle, routeName]
            );

            console.log(`[${index}] ✅ Meta description saved for: ${routeName}`);
        } catch (err: any) {
            console.error(`[${index}] 🔴 Error processing ${routeName}: ${err.message}`);
        }
    }
})();

// Function: Generate meta description using OpenAI
async function generateMetaDescription(medicineName: string): Promise<string | null> {
    if (!medicineName) throw new Error("Medicine name is required");

    const prompt = `
Create a meta description in Hindi (max 150-160 characters) for the medicine ${medicineName}. Use simple and clear Hindi. Briefly mention:
1. इसका मुख्य उपयोग (main medical use),
2. प्रमुख फायदे (key benefits),
3. जरूरी सावधानियां (important precautions).
Make it suitable for Hindi-speaking users searching for medicine information online.
  `;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'system', content: prompt }],
            response_format: zodResponseFormat(metaSchema, 'event'),
            temperature: 0.5,
        });

        const description = JSON.parse(response.choices[0]?.message?.content || '{}')?.meta_description;

        // Track tokens used
        await createOrAppendFile({
            language: 'hindi-meta-desc',
            rName: medicineName,
            tToken: response.usage?.total_tokens || 0,
        });

        return description;
    } catch (error: any) {
        console.error(`🔴 GPT Error for ${medicineName}:`, error.response?.data || error.message);
        return null;
    }
}
