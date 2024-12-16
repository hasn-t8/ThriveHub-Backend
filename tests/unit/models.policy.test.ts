import { attachPolicyToUser, getPoliciesForUser } from "../../src/models/policy.models";
import pool from "../../src/config/db";

describe("Policy Model", () => {
  let mockUserId: number;
  let mockPolicyId: string;

  beforeEach(async () => {
    // Create a unique user in the database for testing
    const userResult = await pool.query(
      "INSERT INTO users (email, password, is_active, token_version) VALUES ($1, $2, $3, $4) RETURNING id",
      [`testuser_${Date.now()}@example.com`, "securepassword", true, 0]
    );

    mockUserId = userResult.rows[0].id;

    // Assign a unique policy ID for testing
    mockPolicyId = `test-policy-${Date.now()}`;
  });

  afterEach(async () => {
    // Clean up test-created policies and users
    await pool.query("DELETE FROM policies WHERE user_id = $1", [mockUserId]);
    await pool.query("DELETE FROM users WHERE id = $1", [mockUserId]);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("should attach a policy to a user", async () => {
    const mockPolicy = {
      id: mockPolicyId,
      effect: "Allow",
      actions: ["read"],
      resources: ["profile"],
    };

    await attachPolicyToUser(mockUserId, mockPolicy);

    // Verify the policy is correctly attached in the database
    const result = await pool.query("SELECT * FROM policies WHERE user_id = $1 AND effect = $2", [
      mockUserId,
      mockPolicy.effect,
    ]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        user_id: mockUserId,
        effect: "Allow",
        actions: ["read"],
        resources: ["profile"],
      })
    );
  });

  it("should fetch policies for a user", async () => {
    const mockPolicy = {
      id: mockPolicyId,
      effect: "Allow",
      actions: ["read"],
      resources: ["profile"],
    };

    // Insert the policy directly into the database
    await pool.query(
      "INSERT INTO policies (user_id, effect, actions, resources) VALUES ($1, $2, $3, $4)",
      [
        mockUserId,
        mockPolicy.effect,
        JSON.stringify(mockPolicy.actions),
        JSON.stringify(mockPolicy.resources),
      ]
    );

    // Fetch the policies using the function
    const policies = await getPoliciesForUser(mockUserId);

    // Verify the fetched policies match what was inserted
    expect(policies).toEqual([
      {
        effect: "Allow",
        actions: ["read"],
        resources: ["profile"],
      },
    ]);
  });
});
