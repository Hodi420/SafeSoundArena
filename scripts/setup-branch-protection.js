const { Octokit } = require('@octokit/rest');
const core = require('@actions/core');

async function setupBranchProtection() {
  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    // Branch protection rules
    const protectionConfig = {
      owner,
      repo,
      branch: 'main', // or 'develop' for the develop branch
      required_status_checks: {
        strict: true,
        contexts: ['test', 'lint', 'build'],
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: true,
      },
      restrictions: null, // Set to null to allow all users with push access
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
    };

    // Apply protection to main branch
    await octokit.repos.updateBranchProtection({
      ...protectionConfig,
      branch: 'main',
    });

    // Apply protection to develop branch
    await octokit.repos.updateBranchProtection({
      ...protectionConfig,
      branch: 'develop',
    });

    console.log('Branch protection rules applied successfully!');
  } catch (error) {
    console.error('Error setting up branch protection:', error);
    process.exit(1);
  }
}

setupBranchProtection();
