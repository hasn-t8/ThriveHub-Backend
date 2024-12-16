import { isUserTypesTableEmpty, addUserType } from '../models/user-types.models';

export const seedUserTypes = async (): Promise<void> => {
  const userTypes = ['registered-user', 'business-owner', 'team-member', 'admin'];

  try {
    const isEmpty = await isUserTypesTableEmpty();

    if (!isEmpty) {
      console.log('User types table already contains data. Skipping seeding.');
      return;
    }

    for (const type of userTypes) {
      await addUserType(type);
    }

    console.log('User types seeder ran successfully.');
  } catch (error) {
    console.error('Error seeding user types:', error);
    throw error;
  }
};
