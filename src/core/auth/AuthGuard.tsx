import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { CircularProgress, Box } from '@mui/material';
export function RequireAuth() {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
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
    const { user } = useAuth();

    if (user) {
        if (user.role === 'video editor') {
            return <Navigate to="/videos" replace />;
        }
        return <Navigate to="/ops" replace />;
    }

    return <Outlet />;
}

export function RootRedirect() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return null; // Let RequireAuth handle the loading spinner if wrapped, or show nothing
    }

    if (user?.role === 'video editor') {
        return <Navigate to="/videos" replace />;
    }

    return <Navigate to="/ops" replace />;
}
