import { createBrowserRouter, Navigate } from 'react-router-dom'

import { SessionBootstrap } from '@/app/bootstrap/SessionBootstrap'
import { RequireAuth } from '@/app/guards/RequireAuth'
import { privateModules, publicModules } from '@/app/router/moduleRegistry'
import { ConsoleShell } from '@/widgets/console-shell/ConsoleShell'

const publicRoutes = publicModules.flatMap(module => module.routes)
const privateRoutes = privateModules.flatMap(module => module.routes)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SessionBootstrap />,
    children: [
      ...publicRoutes,
      {
        element: <RequireAuth />,
        children: [
          {
            element: <ConsoleShell />,
            children: [
              { index: true, element: <Navigate to="/overview" replace /> },
              ...privateRoutes,
            ],
          },
        ],
      },
    ],
  },
])
