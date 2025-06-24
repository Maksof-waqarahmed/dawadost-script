import path from "path";
import fs from "fs";
import { csvBufferToJson, createOrAppendFile, extractRouteName } from "../lib";
import { client } from '../db/db'
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const file = fs.readFileSync(path.join(__dirname, "../files/medicines.csv"))
const medicines = csvBufferToJson(file);

// let i = 1;

// async function englishToHindhiConvert() {
//     for (const { route_name } of medicines) {

//         try {
//             const query = `SELECT name, company, composition, sku_packaging, introduction, benefits,
//                how_to_use, how_it_works, uses, side_effects, safety_advice,
//                storage_advice, special_precautions, missed_a_dose, drug_interaction,
//                food_interaction, disease_explanation, health_and_lifestyle, sources,
//                disease_interaction, meta_title, meta_description, patient_concern,
//                usage, patient_also_ask, product_information, tips, fact_box, storage,
//                dosage, synopsis
//             FROM medicines_details
//             WHERE route_name = $1 AND language = 'english'`;

//             const { rows } = await client.query(query, [route_name]);

//             if (rows.length === 0) {
//                 console.log(route_name + " Medicine not found");
//                 continue;
//             }

//             const getHindhiKeyWords = `SELECT meta_keywords FROM medicines_details WHERE route_name = $1 AND language = 'bengali'`;

//             const keywords = await client.query(getHindhiKeyWords, [route_name]);

//             if (keywords.rows.length === 0) {
//                 console.log("Keywords not found for", route_name);
//                 continue;
//             }

//             const medicineData = rows[0];

//             const arr = Object.entries(medicineData);
//             const translatedData = await Promise.all(
//                 arr.map(async ([key, value]) => {
//                     if (value === null) return [key, value];
//                     return [
//                         key,
//                         await translateToHindi(value as string, keywords.rows[0].meta_keywords, route_name),
//                     ];
//                 })
//             );
//             const translatedObject = Object.fromEntries(translatedData);

//             const updateQuery = `UPDATE medicines_details
//       SET
//           name = $2,
//           company = $3,
//           composition = $4,
//           sku_packaging = $5,
//           introduction = $6,
//           benefits = $7,
//           how_to_use = $8,
//           how_it_works = $9,
//           uses = $10,
//           side_effects = $11,
//           safety_advice = $12,
//           storage_advice = $13,
//           special_precautions = $14,
//           missed_a_dose = $15,
//           drug_interaction = $16,
//           food_interaction = $17,
//           disease_explanation = $18,
//           health_and_lifestyle = $19,
//           sources = $20,
//           disease_interaction = $21,
//           meta_title = $22,
//           meta_description = $23,
//           patient_concern = $24,
//           usage = $25,
//           patient_also_ask = $26,
//           product_information = $27,
//           tips = $28,
//           fact_box = $29,
//           storage = $30,
//           dosage = $31,
//           synopsis = $32,
//           gpt_introduction = $33,
//           gpt_how_to_use = $34,
//           gpt_how_it_works = $35,
//           gpt_safety_advice = $36
//       WHERE route_name = $1 AND language = 'bengali'`;

//             const values = [
//                 route_name,
//                 translatedObject.name,
//                 translatedObject.company,
//                 translatedObject.composition,
//                 translatedObject.sku_packaging,
//                 translatedObject.introduction,
//                 translatedObject.benefits,
//                 translatedObject.how_to_use,
//                 translatedObject.how_it_works,
//                 translatedObject.uses,
//                 translatedObject.side_effects,
//                 translatedObject.safety_advice,
//                 translatedObject.storage_advice,
//                 translatedObject.special_precautions,
//                 translatedObject.missed_a_dose,
//                 translatedObject.drug_interaction,
//                 translatedObject.food_interaction,
//                 translatedObject.disease_explanation,
//                 translatedObject.health_and_lifestyle,
//                 translatedObject.sources,
//                 translatedObject.disease_interaction,
//                 translatedObject.meta_title,
//                 translatedObject.meta_description,
//                 translatedObject.patient_concern,
//                 translatedObject.usage,
//                 translatedObject.patient_also_ask,
//                 translatedObject.product_information,
//                 translatedObject.tips,
//                 translatedObject.fact_box,
//                 translatedObject.storage,
//                 translatedObject.dosage,
//                 translatedObject.synopsis,
//                 translatedObject.introduction,
//                 translatedObject.how_to_use,
//                 translatedObject.how_it_works,
//                 translatedObject.safety_advice,
//             ];
//             await client.query(updateQuery, values);
//             console.log(i++ + ") " + route_name + " updated!");
//         } catch (error: any) {
//             console.error("Database Error:", error.message);
//         }
//     }
// }

// englishToHindhiConvert()

// async function translateToHindi(text: string, keywords: any, routeName: string) {

//     if (!text || !keywords) return "";
//     const prompt = `Translate the given English content into Bengali (use simple and commonly understandable words in regular Bengali script). preserving natural Bengali text flow. Maintain the structure of the original content (if content is in array, return in array; if content is in string, return in string). Do not explain any word, heading, or FAQ, and do not alter the meaning. If a paragraph consists of a single word, translate it directly without adding anything. If the content is related to "safety_advice" and it's in array of object format, do not translate the value of the 'risk' key also do not add any other things after and before it. like (json words etc). Keywords must fit naturally in the translated text without changing the context. Do not translate this prompt itself. ${keywords}. Text to Translate: ${text}. do not add any other words like json or other things like template literals before and after any content.

// If the content is in an array, return in array.
// If the content is in string, return in string.
// If the content is in array of objects, return in array of objects.
// Do not translate the key 'risk'.
// process and translate the following keys if they exist in the input:
// name: return in string.
// company: return in string.
// composition: return in string.
// sku_packaging: return in string.
// introduction: return in string with attached tags.
// benefits: return in an array of strings.
// how_to_use: return in an array of strings.
// how_it_works: return in string.
// uses: return in an array of strings.
// side_effects: return in an array of strings.
// safety_advice: return in an array of objects (do not translate the value of the 'risk' key.Do not add any other words like JSON or template literals before or after any content.).
// storage_advice: return in an array of strings.
// special_precautions: return in an array of strings.
// missed_a_dose: return in string with attached tags.
// drug_interaction: return in an array of strings.
// food_interaction: return in an array of strings.
// disease_explanation: return in string.
// health_and_lifestyle: return in string.
// disease_interaction: return in string with attached tags.
// meta_title: return in string.
// meta_description: return in string.
// tips: return in an array of strings.
// fact_box: return in string with attached tags.
// storage: return in string with attached tags.
// dosage: return in an array of strings.
// synopsis: return in string with attached tags.
// For any other keys that are not listed above, return them in their original format with translation.

// Do not explain any word, heading, or FAQ, and do not alter the meaning.
// If a paragraph consists of a single word, translate it directly without adding anything.
// Keywords must fit naturally in the translated text without changing the context.
// Do not translate this prompt itself.
// ${keywords}. Text to Translate: ${text}.
// Do not add any other words like JSON or template literals before or after any content. do not add extra spaces or new lines. do not create any grammer mistake especially where image is available.
// `
//     try {
//         const response = await axios.post(
//             process.env.URL_CHATGPT ?? "",
//             {
//                 model: "gpt-4o",
//                 messages: [
//                     {
//                         role: "system",
//                         content: prompt,
//                     },
//                 ],
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//                     "Content-Type": "application/json",
//                 },
//             }
//         );

//         await createOrAppendFile({ language: "bengali-content", rName: routeName, tToken: response.data.usage.total_tokens })
//         return response.data.choices[0]?.message?.content.trim() || "";
//     } catch (error: any) {
//         console.error("Translation Error:", error.response?.data || error.message);
//         return text;
//     }
// }

async function getIncompleteEnglishRouteNames() {
    const codes = medicines.map(m => extractRouteName(m.route_name || "")?.trim()).filter(Boolean);

    if (codes.length === 0) {
        console.log("❌ No valid dd_item_code found.");
        return;
    }

    // Get all route_names for these codes
    // const { rows: routeRows } = await client.query(
    //     `SELECT route_name FROM medicines WHERE pos_item_code = ANY($1::text[])`,
    //     [codes]
    // );

    // const routeNames = routeRows.map(row => row.route_name);
    const routeNames = codes;

    if (routeNames.length === 0) {
        console.log("❌ No route_names found for provided dd_item_codes.");
        return;
    }

    // Get all route_names with incomplete English content
    const query = `
        SELECT route_name FROM medicines_details
        WHERE language = 'english'
        AND route_name = ANY($1)
        AND (
            introduction IS NULL
            OR how_it_works IS NULL
            OR how_to_use IS NULL
            OR benefits IS NULL
            OR side_effects IS NULL
        )
    `;

    try {
        const { rows } = await client.query(query, [routeNames]);

        const incompleteRoutes = rows.map(
            row => `https://www.dawaadost.com/medicine/${row.route_name}`
        );

        if (incompleteRoutes.length === 0) {
            console.log("✅ All English content is complete.");
            return;
        }

        console.log("❌ Incomplete route_names:");
        console.log(incompleteRoutes);

        // Save to file
        fs.writeFileSync("incomplete_route_names.json", JSON.stringify(incompleteRoutes, null, 2));
        console.log("✅ Saved to incomplete_route_names.json");

    } catch (error: any) {
        console.error("❌ Error while fetching incomplete route_names:", error.message);
    }
}

getIncompleteEnglishRouteNames();