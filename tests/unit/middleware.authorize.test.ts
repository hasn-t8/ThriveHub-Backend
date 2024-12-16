import { authorize } from "../../src/middleware/authorize";
import { Response } from "express";
import { getPoliciesForUser } from "../../src/models/policy.models";

jest.mock("../../src/models/policy.models");

describe("authorize middleware", () => {
  it("should allow access if user has appropriate policies", async () => {
    const mockPolicies = [{ effect: "Allow", actions: ["*"], resources: ["*"] }];
    (getPoliciesForUser as jest.Mock).mockResolvedValue(mockPolicies);

    const req = { user: { id: 1 } } as any;
    const res = {} as Response;
    const next = jest.fn();

    const middleware = authorize("read", "profile");
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should deny access if user lacks appropriate policies", async () => {
    const mockPolicies = [{ effect: "Deny", actions: ["read"], resources: ["profile"] }];
    (getPoliciesForUser as jest.Mock).mockResolvedValue(mockPolicies);

    const req = { user: { id: 1 } } as any;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
    const next = jest.fn();

    const middleware = authorize("write", "profile");
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: You do not have the required permissions" });
  });
});
