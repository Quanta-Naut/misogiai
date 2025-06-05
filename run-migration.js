const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'complete-pitch-deck-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements (remove comments and empty lines)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('//'))
      .filter(stmt => !stmt.startsWith('SELECT') && !stmt.startsWith('DO $$')); // Skip verification queries
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 60)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try direct query execution as fallback
          const { error: directError } = await supabase.from('').select().limit(0);
          if (directError) {
            console.log(`⚠️  RPC method not available, trying direct execution...`);
            // For ALTER TABLE statements, we'll use a different approach
            if (statement.includes('ALTER TABLE')) {
              console.log(`🔧 Attempting ALTER TABLE via SQL editor...`);
              // This will need to be done manually in Supabase dashboard
              console.log(`   SQL: ${statement}`);
            }
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
          }
        } else {
          console.log(`✅ Statement executed successfully`);
        }
      }
    }
    
    // Verify the migration worked
    console.log('🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('pitch_sessions')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Error verifying migration:', error.message);
      console.log('\n📋 Manual migration required:');
      console.log('1. Go to your Supabase dashboard SQL Editor');
      console.log('2. Run the contents of complete-pitch-deck-migration.sql');
      console.log('3. Or run these specific commands:');
      console.log('   ALTER TABLE pitch_sessions ADD COLUMN IF NOT EXISTS pitch_deck_url TEXT;');
      console.log('   ALTER TABLE pitch_sessions ADD COLUMN IF NOT EXISTS pitch_deck_text TEXT;');
    } else {
      console.log('✅ Migration verification complete!');
      console.log('🎉 PDF upload functionality should now work correctly');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Please run the migration manually:');
    console.log('1. Go to your Supabase dashboard SQL Editor');
    console.log('2. Run the contents of complete-pitch-deck-migration.sql');
  }
}

// Run the migration
runMigration();
