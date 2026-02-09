import { Response, Request, NextFunction, response } from "express";
import ApiError from "../utils/apiError.js";

const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof ApiError) {
        console.log(err)
        return res.status(err.statusCode).json({
            status: err.statusCode,
            message: err.message
        })
    }
    console.log(err)
    return res.status(500).json({
        status: 500,
        message: "Internal Server Error"
    });
}

export default globalErrorHandler;