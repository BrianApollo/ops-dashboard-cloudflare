import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';
export function RequireAuth() {
    const { user, isLoading, isInitializing } = useAuth();
    const location = useLocation();

    // Wait for the cookie-session restore before deciding anything, or a hard
    // refresh on a deep link bounces to /login and loses the destination.
    if (isLoading || isInitializing) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        // Redirect to login page but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Video editors have no access to /ops routes. The sidebar hides those links
    // for them; this guards direct-URL access by sending them to their portal
    // instead of showing a 403 page.
    if (user.role === 'video editor' && location.pathname.startsWith('/ops')) {
        return <Navigate to="/videos" replace />;
    }

    return <Outlet />;
}

export function RedirectIfAuthenticated() {
    const { user, isInitializing } = useAuth();

    if (isInitializing) {
        return null;
    }

    if (user) {
        if (user.role === 'video editor') {
            return <Navigate to="/videos" replace />;
        }
        return <Navigate to="/ops" replace />;
    }

    return <Outlet />;
}

export function RootRedirect() {
    const { user, isLoading, isInitializing } = useAuth();

    if (isLoading || isInitializing) {
        return null; // Let RequireAuth handle the loading spinner if wrapped, or show nothing
    }

    if (user?.role === 'video editor') {
        return <Navigate to="/videos" replace />;
    }

    return <Navigate to="/ops" replace />;
}
