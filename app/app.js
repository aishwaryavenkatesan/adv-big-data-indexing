import express from "express";
import cors from "cors";
import planRouter from "./routes/planRoute.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());

app.use("/plan", planRouter);

export default app;
