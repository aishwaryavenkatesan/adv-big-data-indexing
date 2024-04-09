import { Client } from "@elastic/elasticsearch";
import { readFileSync } from "fs";

const elasticsearchClient = new Client({
  node: "https://localhost:9200/",
  auth: {
    username: "elastic",
    password: "qgn9CqKCaZGT9Snzy5On",
  },
  tls: {
    ca: readFileSync("/Users/aishwaryavenkatesan/http_ca.crt"),
    rejectUnauthorized: false,
  },
});

let info = await elasticsearchClient.info();
console.log(info);
// await elasticsearchClient.ping("error", (err) => {
//   console.log("elasticsearch is down", err);
// });

export default elasticsearchClient;
