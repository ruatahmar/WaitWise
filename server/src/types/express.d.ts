import { TokenPayload } from "../utils/tokens";


//this is so i can store things in user after jwtAuth
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
