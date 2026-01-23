import { Response, Request, NextFunction, response } from "express";
import apiError from "../utils/apiError.js";

const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof apiError) {
        return res.status(err.statusCode).json({
            status: err.statusCode,
            message: err.message
        })
    }
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error"
    });
}

export default globalErrorHandler;