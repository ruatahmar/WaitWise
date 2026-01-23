class apiResponse {
    constructor(
        public statusCode: number,
        public data: Record<string, unknown>,
        public message: string = "Success"
    ) { }
}

export default apiResponse;