async function test() {
  // Get a JWT first
  const loginRes = await fetch('https://app.trustapollo.com/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'admin@trustapollo.com', password: 'GJ@G8tTd$5hQP5r6'})
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) { console.error('Login failed:', loginData); return; }
  console.log('Login OK, role:', loginData.user?.role);

  // Test infrastructure
  const infraRes = await fetch('https://app.trustapollo.com/api/d1/infrastructure', {
    headers: {Authorization: 'Bearer ' + token}
  });
  const infra = await infraRes.json();
  const profile = infra.profiles?.[0];
  if (profile) {
    console.log('Profile:', profile.profileName);
    console.log('  BMs:', profile.businessManagers?.length, 'business managers');
    console.log('  Pages:', profile.pages?.length, 'pages');
    const firstBm = profile.businessManagers?.[0];
    if (firstBm) {
      console.log('  First BM:', firstBm.bmName, '| AdAccs:', firstBm.adAccounts?.length, '| Pixels:', firstBm.pixels?.length);
    }
  } else {
    console.log('Infrastructure response:', JSON.stringify(infra).slice(0, 200));
  }

  // Test campaigns
  const campRes = await fetch('https://app.trustapollo.com/api/d1/campaigns', {
    headers: {Authorization: 'Bearer ' + token}
  });
  const camps = await campRes.json();
  const campWithVideos = camps.records?.find(c => c.videoIds?.length > 0);
  if (campWithVideos) {
    console.log('Campaign with videos:', campWithVideos.campaignName, '| videos:', campWithVideos.videoIds?.length, '| images:', campWithVideos.imageIds?.length);
  } else {
    console.log('Total campaigns:', camps.records?.length, '| None with videos');
  }
}
test().catch(console.error);
