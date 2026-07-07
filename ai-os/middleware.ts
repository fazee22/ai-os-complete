import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/chat/:path*",
    "/notes/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/files/:path*",
    "/knowledge-base/:path*",
    "/settings/:path*",
  ],
};
