import { NextFunction, Request, Response } from "express";
import ApiResponse from "../utils/apiResponse.js";
import { verifyToken } from "../utils/tokens.js";
import ApiError from "../utils/apiError.js";

export const jwtAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json(new ApiResponse(401, {}, "Unauthorized: No token provided"));
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json(new ApiResponse(401, {}, "Unauthorized: No token provided"));
    }
    const payload = verifyToken(token)
    req.user = payload
    console.log("req.user: ", req.user)
    next()
}