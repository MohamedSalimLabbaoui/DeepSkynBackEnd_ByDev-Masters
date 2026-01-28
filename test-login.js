const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login with admin/admin...');
        const response = await axios.post('http://localhost:3000/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        console.log('Login successful!');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Login failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testLogin();
