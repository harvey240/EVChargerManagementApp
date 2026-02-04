import { headers } from "next/headers";

export interface User {
  email: string;
  name?: string;
  id?: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    const mockEmail = process.env.MOCK_USER_EMAIL || "test@company.com";
    return {
      email: mockEmail,
      name: mockEmail.split("@")[0].split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    };
  }

  const headersList = await headers();
  const userEmail = headersList.get("x-ms-client-principal-name");

  // Return null if not authenticated
  if (!userEmail) {
    return null;
  }

  const principalHeader = headersList.get("x-ms-client-principal");
  let userName = userEmail.split("@")[0].split(".").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  let userId = undefined;

  if (principalHeader) {
    try {
      // decode base64 and parse json
      const principalJson = Buffer.from(principalHeader, "base64").toString(
        "utf-8"
      );
      const principal = JSON.parse(principalJson);

      userName =
        principal.claims?.find((c: any) => c.typ === "name")?.val || userName;
      userId = principal.userId;
    } catch (error) {
      console.error("Error parsing X-MS-CLIENT-PRINCIPAL:", error);
    }
  }

  return {
    email: userEmail,
    name: userName,
    id: userId,
  };
}


// Requires authentication - throws error if user is not logged in
// Use this in API routes that need authentication
export async function requireAuth(): Promise<User> {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Authentication Required");
    }

    return user;
}
