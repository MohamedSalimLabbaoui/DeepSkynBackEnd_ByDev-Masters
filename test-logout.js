const axios = require('axios');

async function testLogout() {
    try {
        console.log('1. Logging in to get tokens...');
        const loginResponse = await axios.post('http://localhost:3000/auth/login', {
            username: 'admin',
            password: 'admin'
        });

        const refreshToken = loginResponse.data.data.refresh_token;
        console.log('Login successful! Refresh token obtained.');

        console.log('2. Testing logout...');
        const logoutResponse = await axios.post('http://localhost:3000/auth/logout', {
            refreshToken: refreshToken
        });

        console.log('Logout successful!');
        console.log(JSON.stringify(logoutResponse.data, null, 2));
    } catch (error) {
        console.error('Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testLogout();
