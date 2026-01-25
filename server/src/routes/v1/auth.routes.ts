import { Router } from "express";
import { login, logout, logoutAllDevices, refresh, register } from "../../controllers/v1/auth.controller.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";


const app = Router();

app.post("/login", login);
app.post("/register", register)
app.post("/logout", jwtAuth, logout)
app.post("/logoutAll", jwtAuth, logoutAllDevices)
app.post("/refresh", refresh)

export default app;
