import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs/promises';
import path from 'path';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function readRegistry() {
  return yaml.load(await fs.readFile('registry.yml', 'utf8'));
}

async function downloadServiceContent(service) {
  const [owner, repo] = service.repo.split('/');
  const outDir = path.join('content', service.id);
  console.log(`[aggregate] ${service.id}: fetching from ${service.repo}`);

  let tree;
  try {
    const { data } = await octokit.git.getTree({ owner, repo, tree_sha: service.branch, recursive: '1' });
    tree = data.tree;
  } catch (err) {
    console.warn(`[aggregate] ⚠️  ${service.repo}: ${err.message}`);
    return;
  }

  const targets = tree.filter(
    (item) => item.type === 'blob' &&
      (item.path.startsWith(service.docs_path) || item.path === service.manifest_path)
  );

  for (const item of targets) {
    const { data: blob } = await octokit.git.getBlob({ owner, repo, file_sha: item.sha });
    const content = Buffer.from(blob.content, 'base64').toString('utf8');
    const dest = path.join(outDir, item.path);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content, 'utf8');
  }

  const meta = { id: service.id, label: service.label, observability: service.observability ?? {} };
  await fs.writeFile(path.join(outDir, 'service-meta.json'), JSON.stringify(meta, null, 2));
  console.log(`[aggregate] ${service.id}: wrote ${targets.length} files`);
}

function parseTestResults(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const parsed = parser.parse(xml);
  const suites = [parsed.testsuites?.testsuite ?? parsed.testsuite ?? []].flat();
  const result = {};
  for (const suite of suites) {
    const name = suite['@_name'] ?? 'unknown';
    const tests = parseInt(suite['@_tests'] ?? '0', 10);
    const failures = parseInt(suite['@_failures'] ?? '0', 10) + parseInt(suite['@_errors'] ?? '0', 10);
    result[name] = { total: tests, passing: tests - failures, failing: failures };
  }
  return result;
}

function computeTestStatus(feature, testMap) {
  if (!feature.tests?.length) return { status: 'not_covered', total: 0, passing: 0 };
  let total = 0, passing = 0;
  for (const t of feature.tests) {
    const suite = testMap[t.class];
    if (!suite) continue;
    const count = t.cases?.length ?? suite.total;
    const ratio = suite.total > 0 ? suite.passing / suite.total : 0;
    total += count;
    passing += Math.round(count * ratio);
  }
  if (total === 0) return { status: 'not_covered', total: 0, passing: 0 };
  return { status: passing === total ? 'passing' : 'failing', total, passing };
}

async function buildFeatureIndex(registry) {
  const allFeatures = [], byId = {};

  for (const service of registry.services) {
    const manifestPath = path.join('content', service.id, service.manifest_path);
    let features = [];
    try {
      features = yaml.load(await fs.readFile(manifestPath, 'utf8'))?.features ?? [];
    } catch {
      console.warn(`[aggregate] ⚠️  No manifest for ${service.id}`);
      continue;
    }

    let testMap = {};
    try {
      testMap = parseTestResults(await fs.readFile(path.join('content', service.id, 'test-results.xml'), 'utf8'));
    } catch { /* no test results yet */ }

    const meta = JSON.parse(await fs.readFile(path.join('content', service.id, 'service-meta.json'), 'utf8').catch(() => '{}'));

    for (const feature of features) {
      const { status, total, passing } = computeTestStatus(feature, testMap);
      const enriched = {
        ...feature,
        service_id: service.id,
        service_label: meta.label ?? service.id,
        doc_url: `/${service.id}/${feature.id}`,
        test_status: status,
        test_cases_total: total,
        test_cases_passing: passing,
        observability: {
          grafana: feature.observability?.grafana ? (meta.observability?.grafana_base ?? '') + feature.observability.grafana : null,
          kibana:  feature.observability?.kibana  ? (meta.observability?.kibana_base  ?? '') + feature.observability.kibana  : null,
        },
      };
      allFeatures.push(enriched);
      byId[`${service.id}:${feature.id}`] = enriched;
    }
  }

  await fs.mkdir('content', { recursive: true });
  await fs.writeFile('content/features-index.json', JSON.stringify(allFeatures, null, 2));
  await fs.writeFile('content/features-by-id.json', JSON.stringify(byId, null, 2));
  console.log(`[aggregate] features-index.json — ${allFeatures.length} features`);
}

const registry = await readRegistry();
for (const service of registry.services) await downloadServiceContent(service);
await buildFeatureIndex(registry);
