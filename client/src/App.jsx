import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./auth/authContext"
import MyQueues from "./pages/myQueues"
import Login from "./pages/login"
import { QueueStatus } from "./pages/queueStatus"
import Register from "./pages/register"
import ProtectedRoute from "./routes/ProtectedRoutes"
import PublicRoute from "./routes/PublicRoutes"
import RootRedirect from "./routes/rootRedirect"
import MyLinePage from "./pages/myLine"
import AdminControlPage from "./pages/adminControlPage"

function App() {


  return (
    <>

      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            {/* Public */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/queues" element={<MyQueues />} />
              <Route path="/tickets" element={<MyLinePage />} />
              <Route path="/queues/:queueId" element={<AdminControlPage />} />
              <Route path="/queues/:queueId/:queueUserId" element={<QueueStatus />} />
            </Route>

          </Routes>
        </AuthProvider>
      </BrowserRouter >
    </>
  )
}

export default App
