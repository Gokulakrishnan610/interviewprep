import { ReactNode } from "react";

const AuthLayout = async ({ children }: { children: ReactNode }) => {
  // Temporarily disable auth check for testing
  // const isUserAuthenticated = await isAuthenticated();
  // if (isUserAuthenticated) redirect("/");

  return <div className="auth-layout">{children}</div>;
};

export default AuthLayout;
