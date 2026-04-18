import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pos/:path*",
    "/orders/:path*",
    "/kitchen/:path*",
    "/menu/:path*",
    "/inventory/:path*",
    "/reports/:path*",
    "/customers/:path*",
    "/staff/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
