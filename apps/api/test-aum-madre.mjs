import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testAumMadre() {
  try {
    console.log('🧪 Probando endpoint AUM Madre...');
    
    const form = new FormData();
    form.append('file', fs.createReadStream('../../Balanz Cactus 2025 - AUM Balanz.csv'));
    form.append('snapshotDate', '2025-10-11');
    
    const response = await fetch('http://localhost:3001/api/etl/aum-madre', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAumMadre();
