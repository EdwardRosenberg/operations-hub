import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';
import AdmZip from 'adm-zip';
import fs from 'fs/promises';
import path from 'path';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function fetchForService(service) {
  const [owner, repo] = service.repo.split('/');
  const outPath = path.join('content', service.id, 'test-results.xml');
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  try {
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner, repo, workflow_id: service.gha_workflow, branch: service.branch,
      status: 'success', per_page: 1,
    });
    if (!runs.workflow_runs.length) throw new Error('no successful runs found');

    const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
      owner, repo, run_id: runs.workflow_runs[0].id,
    });
    const artifact = artifacts.artifacts.find((a) => a.name === 'test-results');
    if (!artifact) throw new Error('no artifact named "test-results"');

    const { data: zipData } = await octokit.actions.downloadArtifact({
      owner, repo, artifact_id: artifact.id, archive_format: 'zip',
    });

    const zip = new AdmZip(Buffer.from(zipData));
    const xmlEntry = zip.getEntries().find((e) => e.entryName.endsWith('.xml'));
    if (!xmlEntry) throw new Error('no .xml in artifact zip');

    await fs.writeFile(outPath, xmlEntry.getData().toString('utf8'));
    console.log(`[fetch-results] ${service.id}: wrote test-results.xml`);
  } catch (err) {
    console.warn(`[fetch-results] ⚠️  ${service.id}: ${err.message} — writing empty results`);
    await fs.writeFile(outPath, '<testsuites/>');
  }
}

const { services } = yaml.load(await fs.readFile('registry.yml', 'utf8'));
for (const service of services) await fetchForService(service);
