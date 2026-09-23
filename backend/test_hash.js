const bcrypt = require('bcryptjs');

async function testHash() {
  const hash = '$2a$10$Mh.2Cf97gCDW0k2BOVOt7.jI9UgX0Ow7YOhKnTQFlvWLSjUT3qNou';
  const match = await bcrypt.compare('password123', hash);
  console.log('password123 match:', match);
  const match2 = await bcrypt.compare('admin@123', hash);
  console.log('admin@123 match:', match2);
  const match3 = await bcrypt.compare('admin', hash);
  console.log('admin match:', match3);
  const match4 = await bcrypt.compare('ADMIN', hash);
  console.log('ADMIN match:', match4);
}

testHash();
