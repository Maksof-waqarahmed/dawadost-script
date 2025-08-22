import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from 'dotenv';
import { csvBufferToJson, extractRouteName } from "./lib";
import { client } from "./db/db";
dotenv.config({ path: '../.env' });

const medicines = [
    "https://www.dawaadost.com/medicine/manforce-100mg-tablet-4s",
    "https://www.dawaadost.com/medicine/augmentin-duo-oral-suspension-30ml",
    "https://www.dawaadost.com/medicine/augmentin-625-duo-tablet-10s",
    "https://www.dawaadost.com/medicine/zerodol-sp-tablet-10s"
]

const language = 'Bhojpuri'
async function englishToHindhiConvert() {
    let i = 1;


    for (const url of medicines) {
        const routeName = extractRouteName(url);

        if (!routeName) {
            console.log("Route name not found for:", routeName);
            continue;
        }

        try {
            let { rows: keywordRows } = await client.query(
                `SELECT meta_keywords FROM medicines_details WHERE route_name = $1 AND language = $2`,
                [routeName, language]
            );

            const query = `
                SELECT name, company, composition, sku_packaging, introduction, benefits,
                    how_to_use, how_it_works, uses, side_effects, safety_advice,
                    storage_advice, special_precautions, missed_a_dose, drug_interaction,
                    food_interaction, disease_explanation, health_and_lifestyle, sources,
                    disease_interaction, meta_title, meta_description, patient_concern,
                    usage, patient_also_ask, product_information, tips, fact_box, storage,
                    dosage, synopsis
                FROM medicines_details
                WHERE route_name = $1 AND language = 'english';
            `;
            const { rows } = await client.query(query, [routeName]);
            if (rows.length === 0) {
                console.log(routeName + " medicine not found");
                continue;
            }


            const medicineData = rows[0];
            const keyword = keywordRows[0]?.meta_keywords;
            const arr = Object.entries(medicineData);

            // 🧠 Full translation wrapped in try-catch so if one key fails, entire medicine is skipped
            const translatedData: [string, any][] = [];

            for (const [key, value] of arr) {
                if (value === null) {
                    translatedData.push([key, null]);
                    continue;
                }

                const translated = await translateToHindi(value as string, "keyword", routeName);
                translatedData.push([key, translated]);
            }

            const translatedObject = Object.fromEntries(translatedData);
            console.log("translatedObject", translatedObject)

            console.log(`${i++}) ${routeName} content updated successfully.`);
        } catch (error: any) {
            console.error(`❌ Skipped medicine: ${routeName} — ${error.message}`);
            continue;
        }
    }
}

englishToHindhiConvert()

async function translateToHindi(text: string, keywords: any, routeName: string) {

    if (!text || !keywords) return "";
    const prompt = `Translate the given English content into Bhojpuri (use simple and commonly understandable words in regular Bhojpuri script). preserving natural Bhojpuri text flow. Maintain the structure of the original content (if content is in array, return in array; if content is in string, return in string). Do not explain any word, heading, or FAQ, and do not alter the meaning. If a paragraph consists of a single word, translate it directly without adding anything. If the content is related to "safety_advice" and it's in array of object format, do not translate the value of the 'risk' key also do not add any other things after and before it. like (json words etc). Text to Translate: ${text}. do not add any other words like json or other things like template literals before and after any content.

If the content is in an array, return in array.
If the content is in string, return in string.
If the content is in array of objects, return in array of objects.
Do not translate the key 'risk'.
process and translate the following keys if they exist in the input:
name: return in string.
company: return in string.
composition: return in string.
sku_packaging: return in string.
introduction: return in string with attached tags.
benefits: return in an array of strings.
how_to_use: return in an array of strings.
how_it_works: return in string.
uses: return in an array of strings.
side_effects: return in an array of strings.
safety_advice: return in an array of objects (do not translate the value of the 'risk' key.Do not add any other words like JSON or template literals before or after any content.).
storage_advice: return in an array of strings.
special_precautions: return in an array of strings.
missed_a_dose: return in string with attached tags.
drug_interaction: return in an array of strings.
food_interaction: return in an array of strings.
disease_explanation: return in string.
health_and_lifestyle: return in string.
disease_interaction: return in string with attached tags.
meta_title: return in string.
meta_description: return in string.
tips: return in an array of strings.
fact_box: return in string with attached tags.
storage: return in string with attached tags.
dosage: return in an array of strings.
synopsis: return in string with attached tags.
For any other keys that are not listed above, return them in their original format with translation.

Do not explain any word, heading, or FAQ, and do not alter the meaning.
If a paragraph consists of a single word, translate it directly without adding anything.
Do not translate this prompt itself.
Text to Translate: ${text}.
Do not add any other words like JSON or template literals before or after any content. do not add extra spaces or new lines. do not create any grammer mistake especially where image is available.
`
    try {
        const response = await axios.post(
            process.env.URL_CHATGPT ?? "",
            {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: prompt,
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        return response.data.choices[0]?.message?.content.trim() || "";
    } catch (error: any) {
        console.error("Translation Error:", error.response?.data || error.message);
        return text;
    }
}