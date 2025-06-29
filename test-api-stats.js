const fetch = require('node-fetch');

async function testStatsAPI() {
    try {
        console.log('Testando API de estatísticas...');
        
        const response = await fetch('http://localhost:3000/api/users/admin/stats', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGhpYWdvQGV4YW1wbGUuY29tIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNzM1NDIwNjEwfQ.example',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', response.headers.raw());
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Erro na resposta:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('Dados recebidos:');
        console.log(JSON.stringify(data, null, 2));
        
    } catch (error) {
        console.error('Erro ao testar API:', error);
    }
}

testStatsAPI();