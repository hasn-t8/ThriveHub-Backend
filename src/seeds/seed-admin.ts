import { findUserByEmail, createUser } from '../models/user';
import { attachPolicyToUser } from '../models/policy';

export const seedAdmin = async (): Promise<void> => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123'; // Replace with a hashed password in production

  const admin = await findUserByEmail(adminEmail);

  if (!admin) {
    console.log('Admin user not found. Creating admin user...');

    // Create admin user
    await createUser(adminEmail, adminPassword);

    // Attach admin policies
    const adminPolicy = {
      id: 'admin-policy', // Add a unique id for the policy
      effect: 'Allow',
      actions: ['*'], // Admin can perform all actions
      resources: ['*'], // Admin has access to all resources
    };

    await attachPolicyToUser(adminEmail, adminPolicy);

    console.log('Admin user created successfully.');
  } else {
    console.log('Admin user already exists.');
  }
};
