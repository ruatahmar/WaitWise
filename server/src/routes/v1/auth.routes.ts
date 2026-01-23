import { Router } from "express";
import { login } from "../../controllers/v1/auth.controller.js";
import { register } from "node:module";

const app = Router();

app.post("/login", login);
app.post("/register", register)

export default app;
