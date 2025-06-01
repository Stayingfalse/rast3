#!/usr/bin/env node

/**
 * Build performance analyzer and optimizer
 * This script helps identify build bottlenecks and suggests optimizations
 */

const fs = require('fs');
const path = require('path');

class BuildOptimizer {
  constructor() {
    this.packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    this.results = {
      suggestions: [],
      warnings: [],
      optimizations: []
    };
  }

  analyzeDependencies() {
    const deps = this.packageJson.dependencies || {};
    const devDeps = this.packageJson.devDependencies || {};
    
    // Check for heavy dependencies
    const heavyDeps = [
      'lodash', 'moment', 'babel-polyfill', 'core-js'
    ];
    
    Object.keys(deps).forEach(dep => {
      if (heavyDeps.includes(dep)) {
        this.results.suggestions.push({
          type: 'dependency',
          message: `Consider lighter alternatives to ${dep}`,
          impact: 'Bundle size reduction'
        });
      }
    });

    // Check for unused dev dependencies in production
    const prodOnlyDeps = ['tsx', 'nodemon', 'ts-node'];
    Object.keys(deps).forEach(dep => {
      if (prodOnlyDeps.includes(dep)) {
        this.results.warnings.push({
          type: 'dependency',
          message: `${dep} should be in devDependencies`,
          impact: 'Docker image size'
        });
      }
    });
  }

  analyzeDockerfile() {
    if (fs.existsSync('Dockerfile')) {
      const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
      
      // Check for multi-stage builds
      if (!dockerfile.includes('AS deps') || !dockerfile.includes('AS builder')) {
        this.results.suggestions.push({
          type: 'docker',
          message: 'Use multi-stage builds for better layer caching',
          impact: 'Build time reduction'
        });
      }

      // Check for cache mounts
      if (!dockerfile.includes('--mount=type=cache')) {
        this.results.optimizations.push({
          type: 'docker',
          message: 'Add BuildKit cache mounts for npm/node_modules',
          impact: 'Significant build time reduction'
        });
      }
    }
  }
  analyzeNextConfig() {
    if (fs.existsSync('next.config.js')) {
      const nextConfig = fs.readFileSync('next.config.js', 'utf8');
      
      // Check for deprecated swcMinify (no longer needed in Next.js 13+)
      if (nextConfig.includes('swcMinify')) {
        this.results.warnings.push({
          type: 'nextjs',
          message: 'swcMinify is deprecated and enabled by default in Next.js 13+',
          impact: 'Remove deprecated configuration'
        });
      }

      // Check for deprecated experimental.turbo
      if (nextConfig.includes('experimental') && nextConfig.includes('turbo')) {
        this.results.warnings.push({
          type: 'nextjs',
          message: 'experimental.turbo is deprecated, use turbopack instead',
          impact: 'Configuration warning fix'
        });
      }

      // Check for standalone output
      if (!nextConfig.includes('standalone')) {
        this.results.optimizations.push({
          type: 'nextjs',
          message: 'Enable standalone output for smaller Docker images',
          impact: 'Docker image size reduction'
        });
      }

      // Check for bundle analyzer
      if (!nextConfig.includes('bundle-analyzer')) {
        this.results.suggestions.push({
          type: 'nextjs',
          message: 'Consider adding @next/bundle-analyzer for bundle optimization',
          impact: 'Bundle analysis and optimization'
        });
      }
    }
  }

  generateReport() {
    console.log('\n🔍 Build Performance Analysis Report\n');
    console.log('=====================================\n');

    if (this.results.optimizations.length > 0) {
      console.log('🚀 Optimizations Available:');
      this.results.optimizations.forEach((opt, i) => {
        console.log(`${i + 1}. [${opt.type.toUpperCase()}] ${opt.message}`);
        console.log(`   Impact: ${opt.impact}\n`);
      });
    }

    if (this.results.suggestions.length > 0) {
      console.log('💡 Suggestions:');
      this.results.suggestions.forEach((sug, i) => {
        console.log(`${i + 1}. [${sug.type.toUpperCase()}] ${sug.message}`);
        console.log(`   Impact: ${sug.impact}\n`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach((warn, i) => {
        console.log(`${i + 1}. [${warn.type.toUpperCase()}] ${warn.message}`);
        console.log(`   Impact: ${warn.impact}\n`);
      });
    }

    if (this.results.optimizations.length === 0 && 
        this.results.suggestions.length === 0 && 
        this.results.warnings.length === 0) {
      console.log('✅ Your build configuration looks optimized!\n');
    }

    console.log('🛠️  Additional Optimization Tips:');
    console.log('- Use npm ci instead of npm install in CI/CD');
    console.log('- Enable Docker BuildKit for faster builds');
    console.log('- Consider using a .dockerignore file');
    console.log('- Use Next.js bundle analyzer to optimize client bundle');
    console.log('- Enable compression in your production server\n');
  }

  run() {
    console.log('Analyzing build configuration...');
    this.analyzeDependencies();
    this.analyzeDockerfile();
    this.analyzeNextConfig();
    this.generateReport();
  }
}

// Run the analyzer
const optimizer = new BuildOptimizer();
optimizer.run();
