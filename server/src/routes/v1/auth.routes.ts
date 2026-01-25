import { Router } from "express";
import { login, register } from "../../controllers/v1/auth.controller.js";


const app = Router();

app.post("/login", login);
app.post("/register", register)

export default app;
