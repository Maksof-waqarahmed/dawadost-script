import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { createOrAppendFile, csvBufferToJson } from '../lib';
import path from "path";
import fs from "fs";
import { client } from '../db/db'
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const file = fs.readFileSync(path.join(__dirname, "../files/medicines.csv"))
const medicines = csvBufferToJson(file);

const schema = z.object({
    primary_keywords: z.object({
        gujrati: z.array(z.string()),
    }),
    secondary_keywords: z.object({
        gujrati: z.array(z.string()),
    }),
    mostly_searched_words: z.object({
        gujrati: z.array(z.string()),
    }),
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateKeyWords(data: { name: string, route_name: string, language: string }) {
    const prompt = `Generate primary keywords, secondary keywords, and mostly searched words related to the disease, problem, or use in ${data.language} treated by the medicine "${data.name}". Do not include explanations, comments, or extra text outside or inside the JSON object.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: prompt,
                }
            ],
            response_format: zodResponseFormat(schema, 'event'),
            temperature: 0,
        });

        await createOrAppendFile({ language: data.language, rName: data.route_name, tToken: response.usage!.total_tokens })
        return response.choices[0]?.message?.content || "{}";
    } catch (error: any) {
        console.error("ChatGPT API Error:", error.response?.data || error.message);
        return "{}";
    }
}

let i = 1;
// export async function generateMetaKeywords(language: string) {
//     for (let medicineRoute of medicines) {
//         try {
//             const { rows: medicineName } = await client.query(`SELECT name FROM medicines_details WHERE route_name = $1 AND language = $2`, [medicineRoute.route_name, language]);

//             let keyWords: any = await generateKeyWords({ language: language, name: medicineName[0].name, route_name: medicineRoute.route_name });

//             if (typeof keyWords === "string") {
//                 keyWords = JSON.parse(keyWords);
//             }

//             const setQuery = `UPDATE medicines_details SET meta_keywords = $1 WHERE route_name = $2 AND language = $3`;

//             await client.query(setQuery, [
//                 JSON.stringify({
//                     primary: keyWords.primary_keywords?.gujrati,
//                     secondary: keyWords.secondary_keywords?.gujrati,
//                     mostly_searched: keyWords.mostly_searched_words?.gujrati,
//                 }),
//                 medicineRoute.route_name,
//                 language,
//             ]);

//             console.log(i++ + ") " + medicineRoute.route_name + " updated!");
//         } catch (error: any) {
//             console.error("Database Error:", error.message);
//         }
//     }
// }

// generateMetaKeywords("gujrati");

export async function generateMetaKeywords(language: string, routeName: string) {
    try {
        const { rows: medicineName } = await client.query(`SELECT name FROM medicines_details WHERE route_name = $1 AND language = $2`, [routeName, language]);

        if (medicineName.length === 0) {
            console.log(`No medicine found for route: ${routeName} in language: ${language}`);
            return;
        }

        let keyWords: any = await generateKeyWords({ language: language, name: medicineName[0].name, route_name: routeName });

        if (typeof keyWords === "string") {
            keyWords = JSON.parse(keyWords);
        }

        const setQuery = `UPDATE medicines_details SET meta_keywords = $1 WHERE route_name = $2 AND language = $3`;

        await client.query(setQuery, [
            JSON.stringify({
                primary: keyWords.primary_keywords?.gujrati,
                secondary: keyWords.secondary_keywords?.gujrati,
                mostly_searched: keyWords.mostly_searched_words?.gujrati,
            }),
            routeName,
            language,
        ]);

        console.log(i++ + ") " + routeName + " Keywords updated!");
    } catch (error: any) {
        console.error("Database Error:", error.message);
    }
}