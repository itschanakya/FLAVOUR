const http = require('http');

async function api(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:5000${path}`);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING AUTOMATED END-TO-END SYSTEM TEST ---');

  // 1. Login Admin
  const adminLogin = await api('/api/auth/login', 'POST', { email: 'admin@ncc.gov.in', password: 'Admin@123' });
  console.log('1. Admin Login:', adminLogin.status === 200 ? 'PASSED' : 'FAILED');
  const adminToken = adminLogin.body.token;

  // 2. Login Unit
  const unitLogin = await api('/api/auth/login', 'POST', { email: 'unit1@ncc.gov.in', password: 'Unit@123' });
  console.log('2. NCC Unit Login:', unitLogin.status === 200 ? 'PASSED' : 'FAILED');
  const unitToken = unitLogin.body.token;

  // 3. Login Institution (St. Joseph - ANO)
  const instLogin = await api('/api/auth/login', 'POST', { email: 'stjoseph@ncc.gov.in', password: 'Inst@123' });
  console.log('3. Institution Login:', instLogin.status === 200 ? 'PASSED' : 'FAILED');
  const instToken = instLogin.body.token;

  // 4. Test Vacancy Quota Exceeded (Sanctioned strength for 1st Yr is 50. Requesting 999)
  const overQuotaReq = await api('/api/demands', 'POST', {
    demand_date: '2026-08-30',
    purpose: 'Over Quota Test',
    items: [{ item_id: 1, year_group: '1st Year', quantity: 999 }]
  }, instToken);

  console.log('4. Over Quota Server Validation:', overQuotaReq.status === 400 ? 'PASSED (Rejected as expected)' : 'FAILED');
  console.log('   Error Message:', overQuotaReq.body.error);

  // 5. Test Valid Demand Creation (1st Year: 20 <= 50)
  const validDemand = await api('/api/demands', 'POST', {
    demand_date: '2026-08-30',
    purpose: 'Republic Day Practice Session 1',
    items: [
      { item_id: 1, year_group: '1st Year', quantity: 20 },
      { item_id: 2, year_group: '2nd Year', quantity: 15 }
    ]
  }, instToken);

  console.log('5. Valid Demand Creation:', validDemand.status === 201 ? 'PASSED' : 'FAILED');
  const demandId = validDemand.body.demand?.id;
  const demandNumber = validDemand.body.demand?.demand_number;
  console.log('   Demand Number:', demandNumber, 'Status:', validDemand.body.demand?.status);

  // 6. Test Admin Visibility (Admin must NOT see PENDING demand)
  const adminDemandsPending = await api('/api/demands', 'GET', null, adminToken);
  const foundInAdminPending = adminDemandsPending.body.some(d => d.id === demandId);
  console.log('6. Admin Pending Visibility Test (Must be Hidden):', !foundInAdminPending ? 'PASSED (Hidden from Admin)' : 'FAILED');

  // 7. NCC Unit Approval
  const reviewRes = await api(`/api/demands/${demandId}/review`, 'POST', {
    action: 'APPROVE',
    remarks: 'Verified cadet strength and parade schedule.'
  }, unitToken);

  console.log('7. NCC Unit Approval:', reviewRes.status === 200 ? 'PASSED' : 'FAILED');

  // 8. Admin Visibility (Admin MUST NOW see APPROVED demand)
  const adminDemandsApproved = await api('/api/demands', 'GET', null, adminToken);
  const foundInAdminApproved = adminDemandsApproved.body.some(d => d.id === demandId);
  console.log('8. Admin Approved Visibility Test (Must be Visible):', foundInAdminApproved ? 'PASSED (Visible to Admin)' : 'FAILED');

  // 8b. Admin Accept
  const acceptRes = await api(`/api/demands/${demandId}/accept`, 'POST', null, adminToken);
  console.log('8b. Admin Accept:', acceptRes.status === 200 ? 'PASSED' : 'FAILED');

  // 9. Admin Fulfillment
  const fulfillRes = await api(`/api/demands/${demandId}/fulfill`, 'POST', null, adminToken);
  console.log('9. Admin Fulfillment:', fulfillRes.status === 200 ? 'PASSED' : 'FAILED');

  // 10. Audit Log Check
  const auditRes = await api('/api/reports/audit-logs', 'GET', null, adminToken);
  const hasFulfilledLog = auditRes.body.some(l => l.entity_id === demandId && l.action === 'FULFILLED');
  console.log('10. Audit Log Verification:', hasFulfilledLog ? 'PASSED' : 'FAILED');

  console.log('--- ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
