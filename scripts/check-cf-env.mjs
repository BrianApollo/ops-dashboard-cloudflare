const res = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/1b61024eb1ac5521d490185855ece11f/pages/projects/ops-dashboard',
  { headers: { 'Authorization': 'Bearer WbBvZv_lb1RnDZo1Een_bgXwK1uhOKVQWRJwnR6p' } }
);
const data = await res.json();
console.log('success:', data.success);
console.log('errors:', JSON.stringify(data.errors));
if (data.result) {
  const { name, subdomain, domains, latest_deployment } = data.result;
  console.log('name:', name, '| subdomain:', subdomain);
  console.log('domains:', domains);
  console.log('latest_deployment:', latest_deployment?.id, latest_deployment?.url);
  // Print deployment configs if present
  const cfg = data.result.deployment_configs;
  if (cfg) {
    for (const env of ['production', 'preview']) {
      const ev = cfg[env]?.env_vars ?? {};
      const secrets = Object.entries(ev);
      console.log(`\n${env} env_vars (${secrets.length}):`);
      for (const [k, v] of secrets) {
        console.log(`  ${k}: type=${v.type}`);
      }
    }
  }
} else {
  console.log('Full result:', JSON.stringify(data, null, 2).slice(0, 2000));
}
