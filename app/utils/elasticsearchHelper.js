import { Client } from "@elastic/elasticsearch";
import { readFileSync } from "fs";

const elasticsearchClient = new Client({
  node: "https://localhost:9200/",
  auth: {
    username: "elastic",
    password: "CGvDuJHt*-R7qXS1lbWD",
  },
  tls: {
    ca: readFileSync("/Users/aishwaryavenkatesan/http_ca.crt"),
    rejectUnauthorized: false,
  },
});

let info = await elasticsearchClient.info();
console.log(info);
export default elasticsearchClient;
