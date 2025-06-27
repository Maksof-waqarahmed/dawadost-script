import * as XLSX from "xlsx";
import fs from 'fs';
import path from 'path';

export const csvBufferToJson = <T = any>(buffer: Buffer): T[] => {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData as T[];
};

export async function createOrAppendFile(data: { language: string, rName: string, tToken: number }) {
    const filePath = path.join(__dirname, `${data.language}.txt`);
    const content =
        `Route Name     : ${data.rName}
Language       : ${data.language}
Total Tokens   : ${data.tToken}
-------------------------------
`;

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, 'utf8');
        // console.log("Created File");
    } else {
        fs.appendFileSync(filePath, '\n' + content, 'utf8');
        // console.log("Appended File");
    }
}

export function extractRouteName(urls: string): string | null {
    const match = urls.match(/\/medicine\/([^?]+)/);
    return match ? match[1] : null;
}

export function validateFormat(original: any, translated: any): boolean {
    try {
        // Check type match
        if (Array.isArray(original)) {
            if (!Array.isArray(translated)) return false;

            // Further check: if array of objects
            if (typeof original[0] === "object" && original[0] !== null) {
                if (typeof translated[0] !== "object") return false;

                // Special: for safety_advice, check `risk` key is preserved as-is
                if (original[0].risk && translated[0].risk !== original[0].risk) return false;
            }
        } else if (typeof original === "object") {
            if (typeof translated !== "object") return false;
        } else if (typeof original === "string") {
            if (typeof translated !== "string") return false;

            // Extra check: no wrapping brackets or JSON markers
            if (/^\s*[\[\{]/.test(translated) && !/^\s*[\[\{]/.test(original)) return false;
            if (/[\]\}]$/.test(translated) && !/[\]\}]$/.test(original)) return false;
            if (/json|template/i.test(translated)) return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

