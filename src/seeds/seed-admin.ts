import { findUserByUsername, createUser } from '../models/user';
import { attachPolicyToUser } from '../models/policy';

export const seedAdmin = async (): Promise<void> => {
  const adminUsername = 'admin';
  const adminPassword = 'admin123'; // Replace with a hashed password in production
  const adminRole = 'admin';

  const admin = await findUserByUsername(adminUsername);

  if (!admin) {
    console.log('Admin user not found. Creating admin user...');

    // Create admin user
    await createUser(adminUsername, adminPassword, adminRole);

    // Attach admin policies
    const adminPolicy = {
      id: 'admin-policy',
      effect: 'Allow',
      actions: ['*'],
      resources: ['*'],
    };
    await attachPolicyToUser(adminUsername, adminPolicy);

    console.log('Admin user created successfully.');
  } else {
    console.log('Admin user already exists.');
  }
};
