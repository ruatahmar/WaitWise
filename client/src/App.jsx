import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./auth/authContext"
import MyQueues from "./pages/myQueues"
import Login from "./pages/login"
import { QueueStatus } from "./pages/queueStatus"
import Register from "./pages/register"
function App() {


  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/queues" element={<MyQueues />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/queues/:queueId/:queueUserId" element={<QueueStatus />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

export default App
