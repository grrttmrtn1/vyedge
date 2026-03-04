
import axios from 'axios';

async function testLogin() {
  try {
    console.log("Testing login with admin/admin123...");
    const response = await axios.post('http://localhost:3000/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    console.log("Login Success:", response.data);
  } catch (error: any) {
    console.log("Login Failed Status:", error.response?.status);
    console.log("Login Failed Data:", error.response?.data);
  }
}

testLogin();
