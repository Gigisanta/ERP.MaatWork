const fetch = require('node-fetch');

async function probarLogin() {
  console.log('🧪 Probando login en la API...\n');

  try {
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@cactus.com',
        password: 'admin123'
      })
    });

    const data = await response.text();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Response: ${data}`);

    if (response.ok) {
      console.log('✅ Login exitoso!');
    } else {
      console.log('❌ Error en login');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

probarLogin();



