import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./auth/authContext"
import MyQueues from "./pages/myQueues"
import Login from "./pages/login"
import { QueueStatus } from "./pages/queueStatus"
import Register from "./pages/register"
import MyQueuesPage from "./pages/bruh"
function App() {


  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/queues" element={<MyQueuesPage />} />
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
