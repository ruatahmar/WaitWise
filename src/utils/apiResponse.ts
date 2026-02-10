class ApiResponse<T = unknown> {
  constructor(
    public statusCode: number,
    public data: T,
    public message: string = "Success",
  ) { }
}

export default ApiResponse;
