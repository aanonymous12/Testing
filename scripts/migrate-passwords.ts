import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function migratePasswords() {
  console.log('=== PASSWORD MIGRATION SCRIPT ===\n');

  const supabaseUrl = await question('Supabase URL: ');
  const supabaseKey = await question('Supabase Service Role Key: ');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get current passwords
  const { data: oldPasswords } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['cv_password', 'notepad_password']);

  if (!oldPasswords || oldPasswords.length === 0) {
    console.log('No passwords found in site_settings');
    return;
  }

  console.log(`\nFound ${oldPasswords.length} passwords to migrate`);

  for (const { key, value } of oldPasswords) {
    console.log(`\nMigrating: ${key}`);
    console.log(`Current plain-text value: ${value}`);

    const hashed = await bcrypt.hash(value, 12);

    const { error } = await supabase.from('secure_passwords').upsert({
      key,
      hashed_value: hashed,
      salt: 'auto',
      algorithm: 'bcrypt',
      rotation_required_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }, { onConflict: 'key' });

    if (error) {
      console.error(`Failed to migrate ${key}:`, error);
    } else {
      console.log(`✓ Migrated ${key}`);
    }
  }

  // Delete old passwords
  const shouldDelete = await question('\nDelete old plain-text passwords from site_settings? (yes/no): ');

  if (shouldDelete.toLowerCase() === 'yes') {
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .in('key', ['cv_password', 'notepad_password', 'admin_password']);

    if (error) {
      console.error('Failed to delete old passwords:', error);
    } else {
      console.log('✓ Deleted old passwords');
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  rl.close();
}

migratePasswords().catch(console.error);
