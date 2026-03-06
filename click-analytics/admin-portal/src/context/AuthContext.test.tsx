import { useState } from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

function Harness() {
  const auth = useAuth();
  const [result, setResult] = useState("");

  return (
    <div>
      <div data-testid="is-auth">{auth.isAuthenticated ? "yes" : "no"}</div>
      <div data-testid="user-email">{auth.user?.email || ""}</div>
      <div data-testid="result">{result}</div>

      <button
        onClick={() =>
          setResult(JSON.stringify(auth.login("alex@clickpulse.dev", "demo1234")))
        }
      >
        LoginSuccess
      </button>
      <button
        onClick={() =>
          setResult(JSON.stringify(auth.login("alex@clickpulse.dev", "wrong-password")))
        }
      >
        LoginFail
      </button>
      <button
        onClick={() =>
          setResult(
            JSON.stringify(auth.register("New User", "alex@clickpulse.dev", "password"))
          )
        }
      >
        RegisterDuplicate
      </button>
      <button
        onClick={() =>
          setResult(
            JSON.stringify(auth.register("New User", "new@clickpulse.dev", "password"))
          )
        }
      >
        RegisterSuccess
      </button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("throws when useAuth is used outside provider", () => {
    expect(() => render(<Harness />)).toThrow("useAuth must be used within AuthProvider");
  });

  it("hydrates from localStorage", () => {
    localStorage.setItem(
      "clickpulse_auth",
      JSON.stringify({
        id: "usr_1",
        name: "Saved User",
        email: "saved@example.com",
        company: "Saved Co",
        avatar: "SU",
        websites: [],
      })
    );

    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    expect(screen.getByTestId("is-auth")).toHaveTextContent("yes");
    expect(screen.getByTestId("user-email")).toHaveTextContent("saved@example.com");
  });

  it("handles login success and failure", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await user.click(screen.getByText("LoginFail"));
    expect(screen.getByTestId("result")).toHaveTextContent("Invalid email or password");
    expect(screen.getByTestId("is-auth")).toHaveTextContent("no");

    await user.click(screen.getByText("LoginSuccess"));
    expect(screen.getByTestId("is-auth")).toHaveTextContent("yes");
    expect(localStorage.getItem("clickpulse_auth")).toContain("alex@clickpulse.dev");
  });

  it("blocks duplicate registration and supports new registration + logout", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    );

    await user.click(screen.getByText("RegisterDuplicate"));
    expect(screen.getByTestId("result")).toHaveTextContent(
      "An account with this email already exists"
    );

    await user.click(screen.getByText("RegisterSuccess"));
    expect(screen.getByTestId("is-auth")).toHaveTextContent("yes");
    expect(screen.getByTestId("user-email")).toHaveTextContent("new@clickpulse.dev");

    await user.click(screen.getByText("Logout"));
    expect(screen.getByTestId("is-auth")).toHaveTextContent("no");
    expect(localStorage.getItem("clickpulse_auth")).toBeNull();
  });
});
