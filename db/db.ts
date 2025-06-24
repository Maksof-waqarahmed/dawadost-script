import 'dotenv/config';
import { Client } from "pg";

export const client = new Client({
    connectionString: "postgres://postgres:oQ9>fC5*oL9,oV3,bW5&gJ@35.244.56.58:5432/dawaadost-prod",
});

client.connect()
    .then(() => console.log("Database connected successfully!"))
    .catch(err => console.error("Database connection error:", err));


