import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isCreateOrgRoute = createRouteMatcher(["/create-organization(.*)"]);
const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, redirectToSignIn, sessionClaims } = await auth();

  // If the user is not signed in and tries to access a protected route, redirect to sign-in
  if (!userId && (isProtectedRoute(req) || isCreateOrgRoute(req))) {
    return redirectToSignIn();
  }

  // If the user is signed in but has no organization, and is trying to access dashboard
  if (userId && !orgId && isProtectedRoute(req)) {
    const orgSelection = new URL("/create-organization", req.url);
    return NextResponse.redirect(orgSelection);
  }

  // If the user is signed in, has an organization, and tries to access create-organization, redirect to dashboard
  if (userId && orgId && isCreateOrgRoute(req)) {
     const dashboard = new URL("/dashboard", req.url);
     return NextResponse.redirect(dashboard);
  }

  // Admin route protection: only users with role "admin" can access /dashboard/admin
  if (isAdminRoute(req)) {
    const role = (sessionClaims?.metadata as any)?.role;
    if (role !== 'admin') {
      const dashboard = new URL("/dashboard", req.url);
      return NextResponse.redirect(dashboard);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
