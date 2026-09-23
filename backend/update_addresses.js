const { getDB } = require('./database');

const addresses = {
  'APS SHANKAR VIHAR': '201, Peripheral Rd, opp. Metro Station, Shankar Vihar, New Delhi, Delhi 110010',
  'ARMY PUBLIC SCHOOL DAHULA KAUAN SD': 'Ridge Road, Dhaula Kuan, Delhi Cantonment, New Delhi, Delhi 110010',
  'ARMY PUBLIC SCHOOL DHAULA KAUN JD': 'Ridge Road, Dhaula Kuan, Delhi Cantonment, New Delhi, Delhi 110010',
  'APS DK': 'Ridge Road, Dhaula Kuan, Delhi Cantonment, New Delhi, Delhi 110010',
  'CHINMAYA VIDHYALAYA SR SEC PUBLIC SCHOOL': 'Vasant Vihar, New Delhi, Delhi 110057',
  'CM SHRI SCHOOL BINDAPUR': 'Bindapur, Pocket 3, Uttam Nagar, New Delhi, Delhi 110059',
  'CONVENT OF GAGAN BHARTI SCHOOL': 'Om Vihar, Phase 5, Uttam Nagar, New Delhi, Delhi 110059',
  'DELHI INTERNATIONAL SCHOOL EDGE': 'Sector 18, Dwarka, New Delhi, Delhi 110075',
  'DELHI POLICE PUBLIC SCHOOL': 'B-Block, Safdarjung Enclave, New Delhi, Delhi 110029',
  'DR BR AMBEDKAR CM SHRI SCHOOL DWARKA': 'Sector 19, Dwarka, New Delhi, Delhi 110075',
  'FAIRFIELD INSTITUTE MANAGEMENT TECH': 'FIMT Campus, Kapashera, New Delhi, Delhi 110037',
  'GANGA INTERNATIONAL SCHOOL': 'Hiran Kudna, Rohtak Road, New Delhi, Delhi 110041',
  'GBSSS MOTIBAGH': 'Government Boys Sr. Sec. School, Moti Bagh, New Delhi, Delhi 110021',
  'GD GOENKA PUBLIC SCHOOL DWARKA SEC': 'Sector 10, Dwarka, New Delhi, Delhi 110075',
  'GOVT BOYS SR SEC SCHOOL GHITORNI': 'Ghitorni, Mehrauli-Gurgaon Road, New Delhi, Delhi 110030',
  'GOVT BOYS SSS TUGLAKBAD': 'Tughlakabad Extension, New Delhi, Delhi 110019',
  'GOVT CO ED SEC SCHOOL RAJAPUR KHURD': 'Rajapur Khurd, Uttam Nagar, New Delhi, Delhi 110059',
  'GOVT CO ED SSS AMBEDKAR NAGAR': 'Sector 5, Ambedkar Nagar, New Delhi, Delhi 110062',
  'GOVT CO ED SSS BINDAPUR EXTN DELHI': 'Bindapur Extension, Uttam Nagar, New Delhi, Delhi 110059',
  'GOVT COED SARVODAYA VIDYALAYA NETAJI RK PURAM': 'Sector 8, R.K. Puram, New Delhi, Delhi 110022',
  'GOVTCOED SR SEC SCHOOL MALIKPUR': 'Malikpur, Najafgarh, New Delhi, Delhi 110073',
  'GREEN FIELDS SCHOOL': 'A-Block, Safdarjung Enclave, New Delhi, Delhi 110029',
  'GURU GOVIND SINGH INDRAPRASTH UNIVERSITY': 'Sector 16C, Dwarka, New Delhi, Delhi 110078',
  'GURU HARIKISHAN PUBLIC SCHOOL': 'Vasant Vihar, New Delhi, Delhi 110057',
  'JAMIA SENIOR SECONDARY SCHOOL': 'Jamia Nagar, Okhla, New Delhi, Delhi 110025',
  'JAWAHAR NAVODYA VID JAFARPUR': 'Jafarpur Kalan, New Delhi, Delhi 110073',
  'JAWAHARLAL NEHRU UNIVERSITY': 'JNU Ring Road, New Delhi, Delhi 110067',
  'KENDERIYA VIDAYLAYA RANGPURI': 'Rangpuri, Vasant Kunj, New Delhi, Delhi 110037',
  'LALIT MAHAJAN SVM SSS': 'Vasant Vihar, New Delhi, Delhi 110057',
  'MODEN SCHOOL VASANT VIHAR': 'Poorvi Marg, Vasant Vihar, New Delhi, Delhi 110057',
  'MODERN SCHOOL BARAKHAMBA': 'Barakhamba Road, Connaught Place, New Delhi, Delhi 110001',
  'MOUNT CARMEL SCHOOL': 'Sector 22, Dwarka, New Delhi, Delhi 110077',
  'MOUNT SAINT MARYS SCHOOL': '75, Parade Road, Delhi Cantonment, New Delhi, Delhi 110010',
  'PM SHRI KENDERIYA VIDALAYA DELHI CANTT': 'Near GGR, Delhi Cantonment, New Delhi, Delhi 110010',
  'RAHUL MODEL PUBLIC SCHOOL': 'Sadh Nagar, Palam Colony, New Delhi, Delhi 110045',
  'SARVODAYA BAL VIDHAYALA RAJAKORI': 'Rajokri, Near NH-8, New Delhi, Delhi 110038',
  'SARVODYA BAL VIDALAYA FATEHPUR BERI': 'Fatehpur Beri, New Delhi, Delhi 110074',
  'SBS AF PREP SCH JHARODA': 'Jharoda Kalan, Najafgarh, New Delhi, Delhi 110072',
  'SBV VCSG SAKET': 'Block J, Saket, New Delhi, Delhi 110017',
  'SHAYAMA PRASAD VIDALAYA SR SEC SCHOOL': 'Lodhi Estate, New Delhi, Delhi 110003',
  'ST THOMAS SR SEC SCHOOL': 'Goyla Mode, Najafgarh, New Delhi, Delhi 110071',
  'UNIVERSAL PUBLIC SCHOOL': 'Preet Vihar, Delhi 110092',
  'VANDHANA INTERNATIONAL SR SEC SCHOOL': 'Sector 10, Dwarka, New Delhi, Delhi 110075',
  'VIDYA BHAWAN MAHA LODHI ESTATE': 'Lodhi Estate, Max Mueller Marg, New Delhi, Delhi 110003'
};

async function updateAddresses() {
  const db = await getDB();
  const rows = await db.all('SELECT id, institution_name FROM institutions');
  let updated = 0;

  for (const row of rows) {
    const key = Object.keys(addresses).find(k => k.trim().toUpperCase() === row.institution_name.trim().toUpperCase());
    const addr = key ? addresses[key] : `${row.institution_name.trim()}, Delhi Cantonment, New Delhi, Delhi 110010`;
    await db.run('UPDATE institutions SET complete_address = ? WHERE id = ?', [addr, row.id]);
    updated++;
  }

  console.log(`Updated ${updated} institution addresses in database successfully.`);
}

updateAddresses().catch(console.error);
