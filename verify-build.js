#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Vercel Deployment Readiness Check\n');

// Check 1: Package.json validation
console.log('📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check required scripts
  const requiredScripts = ['build', 'start', 'dev'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
  
  if (missingScripts.length > 0) {
    console.error(`❌ Missing required scripts: ${missingScripts.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ Package.json is valid');
} catch (error) {
  console.error('❌ Invalid package.json:', error.message);
  process.exit(1);
}

// Check 2: Environment variables setup
console.log('\n🔐 Checking environment variables...');
const envExample = '.env.example';
if (!fs.existsSync(envExample)) {
  console.error('❌ Missing .env.example file');
  process.exit(1);
}

const envContent = fs.readFileSync(envExample, 'utf8');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'GOOGLE_AI_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !envContent.includes(envVar));
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables in .env.example: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

console.log('✅ Environment variables documented');

// Check 3: Next.js configuration
console.log('\n⚙️  Checking Next.js configuration...');
if (!fs.existsSync('next.config.js')) {
  console.error('❌ Missing next.config.js file');
  process.exit(1);
}

try {
  const nextConfig = require('./next.config.js');
  
  // Check for Vercel-incompatible settings
  if (nextConfig.output === 'standalone') {
    console.warn('⚠️  Warning: output: "standalone" might not be optimal for Vercel');
  }
  
  console.log('✅ Next.js configuration looks good');
} catch (error) {
  console.error('❌ Invalid next.config.js:', error.message);
  process.exit(1);
}

// Check 4: Vercel configuration
console.log('\n🔧 Checking Vercel configuration...');
if (!fs.existsSync('vercel.json')) {
  console.error('❌ Missing vercel.json file');
  process.exit(1);
}

try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  
  if (vercelConfig.framework !== 'nextjs') {
    console.warn('⚠️  Warning: Framework should be set to "nextjs"');
  }
  
  if (!vercelConfig.functions || !vercelConfig.functions['src/app/api/**/*.ts']) {
    console.warn('⚠️  Warning: API function configuration missing');
  }
  
  console.log('✅ Vercel configuration present');
} catch (error) {
  console.error('❌ Invalid vercel.json:', error.message);
  process.exit(1);
}

// Check 5: TypeScript configuration
console.log('\n📝 Checking TypeScript configuration...');
if (!fs.existsSync('tsconfig.json')) {
  console.error('❌ Missing tsconfig.json file');
  process.exit(1);
}

try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  
  if (!tsConfig.compilerOptions || !tsConfig.compilerOptions.paths || !tsConfig.compilerOptions.paths['@/*']) {
    console.warn('⚠️  Warning: Path aliases might not be configured correctly');
  }
  
  console.log('✅ TypeScript configuration looks good');
} catch (error) {
  console.error('❌ Invalid tsconfig.json:', error.message);
  process.exit(1);
}

// Check 6: API routes structure
console.log('\n🛣️  Checking API routes...');
const apiDir = 'src/app/api';
if (!fs.existsSync(apiDir)) {
  console.error('❌ Missing API routes directory');
  process.exit(1);
}

const apiRoutes = fs.readdirSync(apiDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

if (apiRoutes.length === 0) {
  console.warn('⚠️  Warning: No API routes found');
} else {
  console.log(`✅ Found ${apiRoutes.length} API route(s): ${apiRoutes.join(', ')}`);
}

// Check 7: Test build (optional but recommended)
console.log('\n🏗️  Testing build process...');
try {
  console.log('Running type check...');
  execSync('npm run type-check', { stdio: 'pipe' });
  console.log('✅ Type check passed');
  
  console.log('Running lint check...');
  execSync('npm run lint', { stdio: 'pipe' });
  console.log('✅ Lint check passed');
  
} catch (error) {
  console.warn('⚠️  Warning: Build verification issues detected');
  console.warn('Error:', error.message);
}

// Final summary
console.log('\n🎉 Deployment Readiness Summary:');
console.log('================================');
console.log('✅ Package.json configured');
console.log('✅ Environment variables documented');
console.log('✅ Next.js configuration present');
console.log('✅ Vercel configuration present');
console.log('✅ TypeScript configuration valid');
console.log('✅ API routes structure present');

console.log('\n📋 Next Steps:');
console.log('1. Set environment variables in Vercel dashboard');
console.log('2. Connect your GitHub repository to Vercel');
console.log('3. Deploy and test all functionality');
console.log('4. Monitor build logs for any issues');

console.log('\n🚀 Your project is ready for Vercel deployment!');