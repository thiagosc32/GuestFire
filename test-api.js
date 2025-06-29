const http = require('http');

// Configuração da requisição
const options = {
    hostname: '192.168.1.77',
    port: 3000,
    path: '/api/feed/posts',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJpYXQiOjE3MzQxMjk2MDcsImV4cCI6MTczNDIxNjAwN30.Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7Ej7'
    }
};

// Fazer a requisição
const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('\n=== RESPOSTA DA API ===');
            console.log('Status:', res.statusCode);
            console.log('Success:', response.success);
            
            if (response.posts && response.posts.length > 0) {
                console.log('\n=== POSTS RETORNADOS ===');
                response.posts.forEach((post, index) => {
                    console.log(`\n${index + 1}. Post ID: ${post.id}`);
                    console.log(`   Tipo: ${post.type}`);
                    console.log(`   Conteúdo: ${post.content}`);
                    console.log(`   Autor: ${post.author_name}`);
                    console.log(`   Data: ${post.created_at}`);
                });
            } else {
                console.log('\nNenhum post encontrado.');
            }
        } catch (error) {
            console.error('Erro ao parsear JSON:', error.message);
            console.log('Resposta bruta:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Erro na requisição:', e.message);
});

req.end();