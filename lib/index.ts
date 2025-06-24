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

