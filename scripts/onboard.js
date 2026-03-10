import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';

const { HUB_REPO, SERVICE_ID, SERVICE_REPO, SERVICE_LABEL,
        SERVICE_BRANCH = 'main', GH_WORKFLOW = 'ci.yml', GH_TOKEN } = process.env;

if (!HUB_REPO || !SERVICE_ID || !SERVICE_REPO || !GH_TOKEN) {
  console.error('Required: HUB_REPO, SERVICE_ID, SERVICE_REPO, GH_TOKEN');
  process.exit(1);
}

const [hubOwner, hubRepo] = HUB_REPO.split('/');
const octokit = new Octokit({ auth: GH_TOKEN });

const { data: fileData } = await octokit.repos.getContent({ owner: hubOwner, repo: hubRepo, path: 'registry.yml' });
const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
const registry = yaml.load(currentContent);

if (registry.services.find((s) => s.id === SERVICE_ID)) {
  console.log(`[onboard] ${SERVICE_ID} already registered.`);
  process.exit(0);
}

// Resolve latest hub tag for pre-commit rev
let hubTag = 'main';
try {
  const { data: tags } = await octokit.repos.listTags({ owner: hubOwner, repo: hubRepo, per_page: 1 });
  if (tags.length) hubTag = tags[0].name;
} catch { /* no tags yet */ }

registry.services.push({
  id: SERVICE_ID,
  label: SERVICE_LABEL ?? SERVICE_ID.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  repo: SERVICE_REPO,
  branch: SERVICE_BRANCH,
  docs_path: 'docs/',
  manifest_path: 'ops-hub/features.yml',
  gha_workflow: GH_WORKFLOW,
  manifest_coverage: { warn_threshold: 60, fail_threshold: null },
  observability: { grafana_base: '', kibana_base: '' },
});

const updatedContent = yaml.dump(registry, { lineWidth: 120 });
const { data: ref } = await octokit.git.getRef({ owner: hubOwner, repo: hubRepo, ref: 'heads/main' });
const branchName = `onboard/${SERVICE_ID}`;

await octokit.git.createRef({ owner: hubOwner, repo: hubRepo, ref: `refs/heads/${branchName}`, sha: ref.object.sha });
await octokit.repos.createOrUpdateFileContents({
  owner: hubOwner, repo: hubRepo, path: 'registry.yml',
  message: `chore: onboard ${SERVICE_ID}`,
  content: Buffer.from(updatedContent).toString('base64'),
  sha: fileData.sha, branch: branchName,
});

const { data: pr } = await octokit.pulls.create({
  owner: hubOwner, repo: hubRepo,
  title: `chore: onboard ${SERVICE_ID}`,
  head: branchName, base: 'main',
  body: `Registers **${SERVICE_ID}** (\`${SERVICE_REPO}\`) with the operations hub.\n\nMerge to include this service in the nightly aggregation and site build.`,
});

console.log(`[onboard] PR opened: ${pr.html_url}`);
