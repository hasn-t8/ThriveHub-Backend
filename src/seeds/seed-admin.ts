import { findUserByEmail, createUser } from '../models/user';
import { attachPolicyToType } from '../models/policy';
import { addUserType, assignUserType } from '../models/user-types';

export const seedAdmin = async (): Promise<void> => {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123'; // Replace with a hashed password in production
  const adminType = 'admin'; // Define the admin user type

  // Ensure the admin user type exists
  await addUserType(adminType);

  // Check if the admin user already exists
  const admin = await findUserByEmail(adminEmail);

  if (!admin) {
    console.log('Admin user not found. Creating admin user...');

    // Create admin user
    const adminId = await createUser(adminEmail, adminPassword);

    // Assign the admin type to the user
    await assignUserType(adminId, adminType);

    // Attach policies to the admin type
    const adminPolicy = {
      id: 'admin-policy', // Unique ID for the policy
      effect: 'Allow',
      actions: ['*'], // Admin can perform all actions
      resources: ['*'], // Admin has access to all resources
    };

    await attachPolicyToType(adminType, adminPolicy);

    console.log('Admin user created successfully with admin policies.');
  } else {
    console.log('Admin user already exists.');
  }
};
